# Bevyly Project Status

> Auto-updated status file for Claude Code context

**Last Updated:** January 22, 2026

## Quick Reference

### Current Branch
- Working on: `develop`
- Last sync: January 22, 2026

### Services Status
| Service | Port | Status |
|---------|------|--------|
| Frontend | 3010 | Ready |
| Gateway | 3000 | Running |
| Auth | 3001 | Running |
| CRM | 3002 | Running |
| Email | 3003 | Running |
| Calendar | 3004 | Running |
| Sequences | 3005 | Running |
| Activities | 3006 | Running |

### Database
- Provider: Supabase
- Migrations: Up to date
- SSL Note: Requires `NODE_TLS_REJECT_UNAUTHORIZED=0`

## Implementation Progress

### Phase 1.5 Frontend Enhancements (Current)

#### Completed
- [x] Contacts detail page with tabs
- [x] Opportunities Kanban board
- [x] Accounts detail enhancements
- [x] Health score indicator
- [x] Account edit modal
- [x] Custom fields section
- [x] Playwright E2E tests
- [x] **Settings Module Complete** (Jan 22, 2026)
  - [x] Settings - Profile page
  - [x] Settings - Team page
  - [x] Settings - Integrations page
  - [x] Settings - Notifications page
  - [x] Settings - Appearance page
  - [x] Settings Playwright E2E tests

#### In Progress
- [ ] Briefing page enhancements

#### Next Up (Priority 2)
- [ ] Email compose UI
- [ ] Email templates
- [ ] Calendar grid view
- [ ] Sequences visual builder

### Known Issues

1. **Branding**: Some backend files still reference "SalesOS" (13 locations)
2. **SSL**: Supabase requires TLS workaround for migrations
3. **npm Token**: May be expired (run `npm login` if needed)

## Quick Commands

```bash
# Start backend services
cd backend && NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev:services

# Start frontend
cd frontend && npm run dev

# Run migrations
cd backend && NODE_TLS_REJECT_UNAUTHORIZED=0 npm run db:migrate

# Run tests
cd frontend && npm run test
```

## File Locations

### Key Frontend Files
- `frontend/src/app/(app)/contacts/[id]/page.tsx` - Contacts detail
- `frontend/src/app/(app)/opportunities/components/KanbanBoard.tsx` - Kanban
- `frontend/src/app/(app)/accounts/[id]/AccountDetailContent.tsx` - Accounts detail
- `frontend/src/app/(app)/settings/` - Settings pages (6 pages complete)

### Key Backend Files
- `backend/src/gateway/index.ts` - API Gateway
- `backend/src/modules/` - All service modules
- `backend/src/shared/db/schema/` - Database schemas

## Planning Notes

### For Next Session
1. Briefing page enhancements (agent activity feed, pipeline snapshot)
2. Email compose UI with rich text editor
3. Calendar grid view
4. Sequences visual builder

### Technical Decisions Made
- Using @dnd-kit for drag-and-drop (Kanban)
- Health scores calculated client-side with utility functions
- Playwright for E2E testing
- Tabbed interface pattern for detail pages
