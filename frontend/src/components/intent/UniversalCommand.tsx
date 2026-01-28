'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface AgentRunResult {
  runId: string;
  status: string;
  agentType: string;
  startedAt: string;
}

interface ParsedCriteria {
  criteria: {
    industries?: string[];
    locations?: { city?: string; state?: string; country?: string }[];
    employeeRange?: { min?: number; max?: number };
    keywords?: string[];
    technologies?: string[];
    signals?: string[];
  };
  confidence: number;
  reasoning: string;
}

type CommandState = 'idle' | 'parsing' | 'preview' | 'running' | 'completed' | 'error';

export function UniversalCommand() {
  const router = useRouter();
  const { addToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState('');
  const [state, setState] = useState<CommandState>('idle');
  const [parsedCriteria, setParsedCriteria] = useState<ParsedCriteria | null>(null);
  const [runResult, setRunResult] = useState<AgentRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParsePrompt = useCallback(async () => {
    if (!prompt.trim() || prompt.length < 10) {
      addToast({
        type: 'warning',
        title: 'Prompt too short',
        message: 'Please provide more details about the leads you want to find.',
      });
      return;
    }

    setState('parsing');
    setError(null);

    try {
      const response = await fetch('/api/v1/agents/parse-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setParsedCriteria(data.data);
        setState('preview');
      } else {
        setError(data.error?.message || 'Failed to parse prompt');
        setState('error');
      }
    } catch (err) {
      console.error('Parse error:', err);
      setError('Failed to connect to the server');
      setState('error');
    }
  }, [prompt, addToast]);

  const handleRunAgent = useCallback(async () => {
    if (!parsedCriteria) return;

    setState('running');
    setError(null);

    try {
      const response = await fetch('/api/v1/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: 'discovery',
          prompt,
          criteria: parsedCriteria.criteria,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRunResult(data.data);
        setState('completed');
        addToast({
          type: 'success',
          title: 'Discovery started',
          message: 'Lead discovery is running. You will be notified when complete.',
        });
        // Refresh briefing to show new signals
        router.refresh();
      } else {
        setError(data.error?.message || 'Failed to start discovery');
        setState('error');
      }
    } catch (err) {
      console.error('Run error:', err);
      setError('Failed to connect to the server');
      setState('error');
    }
  }, [parsedCriteria, prompt, router, addToast]);

  const handleReset = useCallback(() => {
    setPrompt('');
    setState('idle');
    setParsedCriteria(null);
    setRunResult(null);
    setError(null);
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (state === 'idle') {
          handleParsePrompt();
        } else if (state === 'preview') {
          handleRunAgent();
        }
      } else if (e.key === 'Escape') {
        handleReset();
      }
    },
    [state, handleParsePrompt, handleRunAgent, handleReset]
  );

  const placeholderExamples = [
    'Find SaaS companies in Austin with 50-200 employees hiring engineers',
    'Discover fintech startups in NYC that recently raised funding',
    'Search for healthcare tech companies using React and AWS',
  ];

  const randomPlaceholder = placeholderExamples[Math.floor(Math.random() * placeholderExamples.length)];

  return (
    <Card className="p-4 bg-gradient-to-r from-primary-500/5 to-primary-600/5 border-primary-500/20">
      <div className="space-y-4">
        {/* Command Input */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <SparklesIcon className="h-5 w-5 text-primary-500" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={randomPlaceholder}
            disabled={state === 'parsing' || state === 'running'}
            className={clsx(
              'block w-full rounded-lg border border-primary-500/30',
              'bg-surface text-text-primary placeholder:text-text-muted',
              'h-12 pl-12 pr-24 text-sm',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
            {prompt && (
              <button
                type="button"
                onClick={handleReset}
                className="p-2 text-text-muted hover:text-text-primary transition-colors"
                aria-label="Clear"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
            <Button
              size="sm"
              onClick={state === 'preview' ? handleRunAgent : handleParsePrompt}
              disabled={!prompt.trim() || state === 'parsing' || state === 'running'}
              leftIcon={
                state === 'parsing' || state === 'running' ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <PaperAirplaneIcon className="h-4 w-4" />
                )
              }
            >
              {state === 'parsing'
                ? 'Parsing...'
                : state === 'preview'
                ? 'Start Discovery'
                : state === 'running'
                ? 'Running...'
                : 'Find Leads'}
            </Button>
          </div>
        </div>

        {/* Preview State */}
        {state === 'preview' && parsedCriteria && (
          <div className="p-4 rounded-lg bg-surface border border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-text-primary">Understood criteria:</h4>
                  <span
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded-full',
                      parsedCriteria.confidence >= 0.8
                        ? 'bg-success/10 text-success'
                        : parsedCriteria.confidence >= 0.6
                        ? 'bg-warning/10 text-warning'
                        : 'bg-danger/10 text-danger'
                    )}
                  >
                    {Math.round(parsedCriteria.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-sm text-text-muted">{parsedCriteria.reasoning}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {parsedCriteria.criteria.industries?.map((industry) => (
                    <span
                      key={industry}
                      className="text-xs px-2 py-1 rounded-full bg-primary-500/10 text-primary-500"
                    >
                      {industry}
                    </span>
                  ))}
                  {parsedCriteria.criteria.locations?.map((loc, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded-full bg-info/10 text-info"
                    >
                      {[loc.city, loc.state, loc.country].filter(Boolean).join(', ')}
                    </span>
                  ))}
                  {parsedCriteria.criteria.employeeRange && (
                    <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">
                      {parsedCriteria.criteria.employeeRange.min || 0}-
                      {parsedCriteria.criteria.employeeRange.max || '+'} employees
                    </span>
                  )}
                  {parsedCriteria.criteria.keywords?.map((keyword) => (
                    <span
                      key={keyword}
                      className="text-xs px-2 py-1 rounded-full bg-neutral-500/10 text-text-muted"
                    >
                      {keyword}
                    </span>
                  ))}
                  {parsedCriteria.criteria.signals?.map((signal) => (
                    <span
                      key={signal}
                      className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setState('idle');
                  inputRef.current?.focus();
                }}
              >
                Edit
              </Button>
            </div>
          </div>
        )}

        {/* Completed State */}
        {state === 'completed' && runResult && (
          <div className="p-4 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                <SparklesIcon className="h-4 w-4 text-success" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-text-primary">Discovery started</h4>
                <p className="text-xs text-text-muted">
                  Run ID: {runResult.runId} - We'll notify you when leads are found
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={handleReset}>
                New Search
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && error && (
          <div className="p-4 rounded-lg bg-danger/5 border border-danger/20">
            <div className="flex items-center gap-3">
              <p className="flex-1 text-sm text-danger">{error}</p>
              <Button size="sm" variant="secondary" onClick={handleReset}>
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Help Text */}
        {state === 'idle' && !prompt && (
          <p className="text-xs text-text-muted text-center">
            Describe the leads you want to find. Press Enter to search or Escape to clear.
          </p>
        )}
      </div>
    </Card>
  );
}

export default UniversalCommand;
