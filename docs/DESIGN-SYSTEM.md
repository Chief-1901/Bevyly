# Bevyly - Design System

> UI components, colors, typography, and visual identity

---

## Design Philosophy

Bevyly's design system prioritizes:

1. **Clarity** - Information hierarchy that guides action
2. **Speed** - Fast to scan, fast to act
3. **Confidence** - Users trust what they see
4. **Personality** - Distinctive, not generic

---

## Brand Identity

### Name

**Bevyly** (pronounced BEV-uh-lee)

- Drop "SalesOS" branding
- Single word, memorable
- Suggests a group (bevy) working together

### Tagline

**"Your AI Sales Team That Never Sleeps"**

### Voice & Tone

| Context | Voice |
|---------|-------|
| Marketing | Confident, ambitious, slightly playful |
| Product | Clear, helpful, action-oriented |
| Error states | Empathetic, solution-focused |
| Success | Celebratory but brief |

---

## Color Palette

### Primary Colors

Moving away from generic teal to a distinctive palette:

```css
:root {
  /* Primary - Deep Indigo */
  --color-primary-50: #eef2ff;
  --color-primary-100: #e0e7ff;
  --color-primary-200: #c7d2fe;
  --color-primary-300: #a5b4fc;
  --color-primary-400: #818cf8;
  --color-primary-500: #6366f1;  /* Main */
  --color-primary-600: #4f46e5;
  --color-primary-700: #4338ca;
  --color-primary-800: #3730a3;
  --color-primary-900: #312e81;

  /* Secondary - Warm Orange (Accent) */
  --color-accent-50: #fff7ed;
  --color-accent-100: #ffedd5;
  --color-accent-200: #fed7aa;
  --color-accent-300: #fdba74;
  --color-accent-400: #fb923c;
  --color-accent-500: #f97316;  /* Main */
  --color-accent-600: #ea580c;
  --color-accent-700: #c2410c;
  --color-accent-800: #9a3412;
  --color-accent-900: #7c2d12;
}
```

### Semantic Colors

```css
:root {
  /* Success */
  --color-success-50: #f0fdf4;
  --color-success-500: #22c55e;
  --color-success-700: #15803d;

  /* Warning */
  --color-warning-50: #fffbeb;
  --color-warning-500: #f59e0b;
  --color-warning-700: #b45309;

  /* Error */
  --color-error-50: #fef2f2;
  --color-error-500: #ef4444;
  --color-error-700: #b91c1c;

  /* Info */
  --color-info-50: #eff6ff;
  --color-info-500: #3b82f6;
  --color-info-700: #1d4ed8;
}
```

### Neutral Colors

```css
:root {
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
}
```

### Dark Mode

```css
[data-theme="dark"] {
  --color-background: #0f0f10;
  --color-surface: #18181b;
  --color-surface-elevated: #27272a;
  --color-border: #3f3f46;
  --color-text-primary: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-text-muted: #71717a;
}
```

---

## Typography

### Font Stack

Moving away from Inter to a more distinctive combination:

```css
:root {
  /* Headings - Geometric sans */
  --font-display: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;

  /* Body - Humanist sans */
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  /* Mono - Code */
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Type Scale

```css
:root {
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
  --text-5xl: 3rem;       /* 48px */
}
```

### Font Weights

```css
:root {
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

### Usage Guidelines

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Page title | Display | 3xl | Bold |
| Section heading | Display | 2xl | Semibold |
| Card title | Display | lg | Semibold |
| Body text | Body | base | Normal |
| Labels | Body | sm | Medium |
| Helper text | Body | sm | Normal |
| Code | Mono | sm | Normal |

---

## Spacing

### Base Scale

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
}
```

### Component Spacing

| Context | Padding | Gap |
|---------|---------|-----|
| Page | 24-32px | - |
| Card | 16-24px | 16px |
| Form field | 12px | 8px |
| Button | 8-12px horiz | - |
| Table cell | 12px | - |

---

## Elevation & Shadows

### Shadow Scale

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}
```

### Elevation Usage

| Level | Shadow | Use Case |
|-------|--------|----------|
| 0 | None | Page background |
| 1 | sm | Cards, inputs |
| 2 | md | Dropdowns, tooltips |
| 3 | lg | Modals, popovers |
| 4 | xl | Dialogs |

---

## Border Radius

```css
:root {
  --radius-none: 0;
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.375rem;  /* 6px */
  --radius-lg: 0.5rem;    /* 8px */
  --radius-xl: 0.75rem;   /* 12px */
  --radius-2xl: 1rem;     /* 16px */
  --radius-full: 9999px;
}
```

### Usage

| Element | Radius |
|---------|--------|
| Buttons | lg |
| Cards | xl |
| Inputs | md |
| Badges | full |
| Avatars | full |
| Modals | 2xl |

---

## Components

### Buttons

```tsx
// Primary
<Button variant="primary">Save Changes</Button>

// Secondary
<Button variant="secondary">Cancel</Button>

// Ghost
<Button variant="ghost">Learn More</Button>

// Destructive
<Button variant="destructive">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

**Styling:**
```css
.button-primary {
  background: var(--color-primary-500);
  color: white;
  border-radius: var(--radius-lg);
  padding: var(--space-2) var(--space-4);
  font-weight: var(--font-medium);
  transition: background 150ms ease;
}

.button-primary:hover {
  background: var(--color-primary-600);
}
```

### Inputs

```tsx
<Input
  label="Email address"
  type="email"
  placeholder="you@example.com"
  error="Please enter a valid email"
/>
```

**Styling:**
```css
.input {
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.input:focus {
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
  outline: none;
}

.input-error {
  border-color: var(--color-error-500);
}
```

### Cards

```tsx
<Card>
  <CardHeader>
    <CardTitle>Pipeline Overview</CardTitle>
    <CardDescription>Your sales pipeline at a glance</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    <Button>View Details</Button>
  </CardFooter>
</Card>
```

**Styling:**
```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.card-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.card-content {
  padding: var(--space-6);
}
```

### Tables

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Score</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Acme Corp</TableCell>
      <TableCell><Badge>New</Badge></TableCell>
      <TableCell>85</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Badges

```tsx
<Badge variant="default">Default</Badge>
<Badge variant="success">Converted</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Rejected</Badge>
```

### Action Cards (Briefing)

```tsx
<ActionCard
  priority="high"
  title="12 leads ready for review"
  description="Lead Source Agent found companies matching your ICP"
  action={{ label: "Review leads", href: "/leads?status=new" }}
/>
```

**Styling:**
```css
.action-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary-500);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.action-card-high {
  border-left-color: var(--color-error-500);
}

.action-card-medium {
  border-left-color: var(--color-warning-500);
}

.action-card-low {
  border-left-color: var(--color-success-500);
}
```

---

## Layout

### Page Structure

```tsx
<DashboardShell>
  <Header />
  <div className="flex">
    <Sidebar />
    <main className="flex-1">
      <PageHeader title="Leads" />
      <PageContent>
        {/* Page content */}
      </PageContent>
    </main>
  </div>
</DashboardShell>
```

### Grid System

Using CSS Grid with Tailwind:

```tsx
// Two column layout
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <Card>Left</Card>
  <Card>Right</Card>
</div>

// Dashboard grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard />
  <StatCard />
  <StatCard />
  <StatCard />
</div>
```

### Responsive Breakpoints

```css
/* Tailwind defaults */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

---

## Motion & Animation

### Timing Functions

```css
:root {
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
}
```

### Durations

```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
}
```

### Common Animations

```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Scale in */
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Icons

### Icon Library

Using Lucide React for consistent, customizable icons:

```tsx
import { Users, Mail, Phone, Calendar } from 'lucide-react';

<Users className="h-5 w-5" />
<Mail className="h-4 w-4 text-gray-500" />
```

### Icon Sizes

| Size | Use Case |
|------|----------|
| 16px (h-4) | Inline with text, buttons |
| 20px (h-5) | Navigation, list items |
| 24px (h-6) | Cards, empty states |
| 32px+ | Hero sections, large callouts |

---

## Signature Elements

### Gradient Accent

Subtle gradient for distinctive touch:

```css
.gradient-accent {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500));
}

.text-gradient {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Glow Effects

For interactive elements:

```css
.glow-primary {
  box-shadow: 0 0 20px -5px var(--color-primary-500);
}

.glow-success {
  box-shadow: 0 0 20px -5px var(--color-success-500);
}
```

### Dot Indicators

Status dots used throughout:

```tsx
<span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
```

---

## Accessibility

### Color Contrast

All text meets WCAG 2.1 AA standards:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum

### Focus States

```css
:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

### Skip Links

```tsx
<a href="#main" className="skip-link">
  Skip to main content
</a>
```

### Aria Labels

```tsx
<button aria-label="Close dialog">
  <X className="h-5 w-5" />
</button>
```

---

## Implementation Notes

### Tailwind Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          500: '#6366f1',
          // ... full scale
        },
        accent: {
          50: '#fff7ed',
          500: '#f97316',
          // ... full scale
        },
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
};
```

### CSS Variables

Define in `globals.css`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 239 84% 67%;
    /* ... */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... */
  }
}
```
