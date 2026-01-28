/**
 * AI-Powered Card Streaming Endpoint
 *
 * Uses Vercel AI SDK to intelligently select and order Action Cards
 * from a controlled registry based on recommendations.
 */
import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { CardRegistry, ALLOWED_CARD_TYPES } from '@/components/intent/CardRegistry';

// Schema for the AI response
const cardSelectionSchema = z.object({
  cards: z.array(
    z.object({
      cardType: z.enum(ALLOWED_CARD_TYPES as [string, ...string[]]),
      props: z.record(z.string(), z.any()),
      reasoning: z.string().describe('Brief explanation of why this card was selected'),
    })
  ),
  summary: z.string().describe('A brief summary of the overall recommendations'),
});

// Create a string representation of the card registry for the system prompt
function getRegistryDescription(): string {
  return Object.entries(CardRegistry)
    .map(([name, config]) => {
      const schemaKeys = Object.keys(config.propsSchema.shape);
      return `- ${name}: ${config.description}. Props: ${schemaKeys.join(', ')}`;
    })
    .join('\n');
}

export async function POST(req: Request) {
  try {
    const { recommendations, signals } = await req.json();

    // If no OpenAI API key, return deterministic fallback
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({
        success: true,
        data: {
          cards: mapRecommendationsToCards(recommendations || []),
          summary: 'Showing priority-sorted recommendations',
          mode: 'deterministic',
        },
      });
    }

    // Stream object from AI
    const result = await streamObject({
      model: openai('gpt-4o-mini'),
      schema: cardSelectionSchema,
      system: `You are a sales assistant helping users prioritize their work.
Given a list of recommendations and signals, select which Action Cards to display from the registry.

IMPORTANT RULES:
1. Only use cards from this allowed list: ${ALLOWED_CARD_TYPES.join(', ')}
2. Prioritize high-severity items first
3. Group related items together
4. Limit to maximum 5 most important cards
5. Each card must have valid props matching its schema

Available Cards:
${getRegistryDescription()}

Return the cards in order of importance with valid props for each.`,
      prompt: `
Here are the current recommendations:
${JSON.stringify(recommendations, null, 2)}

Here are the active signals:
${JSON.stringify(signals, null, 2)}

Select the most relevant Action Cards to show, ordered by priority.
`,
    });

    // Return streaming response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI stream error:', error);

    // Fallback to deterministic response on any error
    const { recommendations } = await req.json().catch(() => ({ recommendations: [] }));
    return Response.json({
      success: true,
      data: {
        cards: mapRecommendationsToCards(recommendations || []),
        summary: 'Showing priority-sorted recommendations (fallback mode)',
        mode: 'deterministic',
      },
    });
  }
}

// Deterministic fallback: map recommendations directly to cards
function mapRecommendationsToCards(recommendations: Array<{
  id: string;
  cardType: string;
  cardProps: Record<string, unknown>;
  priority: string;
  title: string;
}>): Array<{
  cardType: string;
  props: Record<string, unknown>;
  reasoning: string;
}> {
  const priorityOrder = { high: 1, medium: 2, low: 3 };

  return recommendations
    .filter((rec) => ALLOWED_CARD_TYPES.includes(rec.cardType as any))
    .sort((a, b) => (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 3))
    .slice(0, 5)
    .map((rec) => ({
      cardType: rec.cardType,
      props: rec.cardProps || {},
      reasoning: `Priority: ${rec.priority} - ${rec.title}`,
    }));
}
