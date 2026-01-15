# Bevyly Frontend

A modern, tokenized dashboard built with Next.js 15 (App Router), Tailwind CSS, and TypeScript.

## Features

- **Secure Authentication**: BFF pattern with HttpOnly cookies, login/signup flows
- **Semantic Theme Tokens**: Light/dark mode with CSS custom properties
- **Responsive Layout**: Mobile-first with collapsible sidebar
- **Accessible Components**: ARIA-compliant UI components
- **Real-time Data**: Connected to the SalesOS backend API
- **Visual Testing**: Playwright snapshot tests at multiple breakpoints

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with ThemeProvider
│   │   ├── page.tsx                # Redirects based on auth status
│   │   ├── (auth)/                 # Auth route group
│   │   │   ├── login/page.tsx      # Login page
│   │   │   └── signup/page.tsx     # Signup page
│   │   ├── (app)/                  # Protected app route group
│   │   │   ├── layout.tsx          # App layout with DashboardShell
│   │   │   ├── dashboard/          # Dashboard page
│   │   │   ├── accounts/           # Accounts list & detail
│   │   │   ├── contacts/           # Contacts list & detail
│   │   │   ├── opportunities/      # Opportunities list & detail
│   │   │   ├── emails/             # Emails list & compose
│   │   │   ├── calendar/meetings/  # Calendar meetings
│   │   │   ├── sequences/          # Sequences list & builder
│   │   │   ├── activities/         # Activity feed
│   │   │   └── settings/           # Settings pages
│   │   └── api/auth/               # BFF auth route handlers
│   ├── components/
│   │   ├── ui/                     # Reusable UI primitives
│   │   ├── charts/                 # Chart components
│   │   ├── dashboard/              # Dashboard-specific components
│   │   ├── ThemeProvider.tsx
│   │   └── ThemeSwitch.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   └── server.ts           # Server-side API client
│   │   └── auth/
│   │       ├── cookies.ts          # Cookie management
│   │       └── types.ts            # Auth types
│   ├── data/
│   │   └── dashboard.sample.ts     # Fallback/sample data
│   └── styles/
│       ├── globals.css             # Tailwind directives
│       └── tokens.css              # CSS custom properties
├── tests/
│   ├── auth-smoke.spec.ts          # Auth flow tests
│   ├── navigation-smoke.spec.ts    # Navigation tests
│   └── visual-snapshots.spec.ts    # Visual regression tests
├── middleware.ts                   # Route protection middleware
├── tailwind.config.js
├── playwright.config.ts
└── next.config.js
```

## Authentication

### BFF Pattern

The frontend uses a Backend-for-Frontend pattern with HttpOnly cookies:

1. **Login/Signup** pages call Next.js route handlers (`/api/auth/*`)
2. Route handlers forward requests to the backend (`/api/v1/auth/*`)
3. On success, tokens are stored in HttpOnly cookies (never exposed to JS)
4. Protected routes are guarded by `middleware.ts`
5. Server components read cookies via the server-side API client

### Cookie Configuration

```typescript
// For local development
{
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  path: '/'
}
```

### Route Protection

The middleware protects these routes:
- `/dashboard`, `/accounts`, `/contacts`, `/opportunities`
- `/emails`, `/calendar`, `/sequences`, `/activities`
- `/settings`

Unauthenticated users are redirected to `/login?redirect=...`

## API Integration

### Server-Side API Client

The server API client (`lib/api/server.ts`) automatically:
- Reads access token from cookies
- Adds Authorization header
- Handles 401 by attempting token refresh
- Provides typed endpoints for all modules

```tsx
// Server Component usage
import { accountsApi } from '@/lib/api/server';

async function AccountsPage() {
  const result = await accountsApi.list({ page: 1, limit: 10 });
  // ... render with result.data
}
```

### Available API Modules

| Module | Endpoints |
|--------|-----------|
| `accountsApi` | list, get, create, update, delete, getContacts, getOpportunities |
| `contactsApi` | list, get, create, update, delete |
| `opportunitiesApi` | list, get, create, update, delete, getPipeline, addContact |
| `emailsApi` | list, get, send, draft |
| `meetingsApi` | list, get, upcoming, propose, confirm, cancel, complete, noShow |
| `sequencesApi` | list, get, create, update, delete, enroll, pauseEnrollment, resumeEnrollment |
| `activitiesApi` | list, getAccountTimeline, getContactTimeline, createNote, logCall |
| `apiKeysApi` | list, create, delete |

## Theme System

### CSS Tokens

All colors are defined in `src/styles/tokens.css`:

```css
:root {
  --color-primary-500: #595959;
  --color-secondary-500: #b5d7ce;
  /* ... */
}

.dark {
  --color-primary-500: #bbbbbb;
  --color-secondary-500: #8fbfb3;
  /* ... */
}
```

### Using in Components

```tsx
<div className="bg-surface text-text-primary border border-border">
  <button className="bg-primary-700 hover:bg-primary-900">
    Click me
  </button>
</div>
```

## Testing

### Run Playwright Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run specific test file
npx playwright test tests/auth-smoke.spec.ts

# Update visual snapshots
npx playwright test --update-snapshots
```

### Test Categories

| File | Description |
|------|-------------|
| `auth-smoke.spec.ts` | Login/signup page rendering, validation |
| `navigation-smoke.spec.ts` | Protected route access, sidebar navigation |
| `visual-snapshots.spec.ts` | Visual regression screenshots |

## Development

### Prerequisites

- Node.js 18+
- Backend server running on port 3000

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | `http://localhost:3000` | Backend API URL |

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3001 |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Playwright tests |
| `npm run test:ui` | Run Playwright with UI |

## Accessibility

All components follow WCAG 2.1 guidelines:

- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Visible focus indicators
- Color contrast compliance
- Screen reader compatible

## License

Private - Bevyly/SalesOS
