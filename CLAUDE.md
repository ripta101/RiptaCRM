# Project Context

This project is to build modular and highly customisable CRM application. The app module is build on React MFE/BFF technology, each epic is its own module.
All fields the frontline user records, and displays are configurable by a business admin.

# About Me

I am a technical engineer. I prefer clear, jargon-free output.

# Rules

- Always ask clarifying questions before starting a complex task
- Show your plan and steps before executing
- Keep reports and summarise concise - bullet points over paragraphs
- The modules created must make sense as an epic level module that makes sense to business function e.g. Email, WebChat, Case Management - do not go crazy generating every single function as a module
- The modules must have its own MFE folder, and can be modified/deployed independently
- Database changes and sample data must have versioning
- Review and update README.md everytime you add/modify/remove modules and features
- All pages must be responsive, can be viewed in desktop computer, laptop, and mobile devices
- Always verify end-to-end in the running app before calling something done
- Never commit/push without an explicit, standalone request
- Favor mature, established tools over custom-built solutions
- New business logic (route handlers, scheduler/SLA math, mappers, anything with branching)
  must ship with Vitest unit tests in the same package, colocated as `*.test.ts`
- New user-facing flows must be added as committed Playwright specs under `e2e/tests/` —
  never as ad hoc scratch scripts; if you wrote one to verify manually, convert it into a
  spec before calling the task done
- Before calling a task done, run `pnpm test` and the relevant `e2e` spec(s) in addition to
  manual verification
- If verification finds a bug, fix it in the same task and call it out explicitly
- When creating a test data as part of verification, make sure to delete the test data you created after the verification
- For visual/UX polish, responsive layout, and cross-browser checks that don't belong in
  Playwright, use and update `docs/testing/manual-checklist.md`
- All displayed dates/timestamps must use DD-Mon-YYYY hh:mm AM/PM (e.g. `07-Jan-2027 02:30 PM`),
  via `formatDateTime`/`formatDateOnly` from `@riptacrm/ui` — never `toLocaleString()`/
  `toLocaleDateString()` directly, since the locale-default format is ambiguous (US-style
  M/D/YYYY). Use `formatDateOnly` only for genuinely date-only fields with no meaningful
  time-of-day (e.g. date of birth); everything else uses `formatDateTime`.

# Project Structure

Follow standard MFE monorepo project structure:
- apps/ - top level folder for the MFEs
  - `host` - shell app (login, nav, dashboard); loads the remotes below via Module Federation
  - `customer` - Customer Lookup MFE
  - `case-management` - Case Management MFE (admin config for case types/stages/SLA)
  - `customer-api` - BFF for the Customer module (Express + Prisma + SQLite)
  - `case-management-api` - BFF for the Case Management module (Express + Prisma + SQLite + SLA scheduler)
  - `message-broadcast` - Message Broadcast MFE (admin composer/list for broadcast announcements)
  - `message-broadcast-api` - BFF for the Message Broadcast module (Express + Prisma + SQLite)
- packages/ - shared libraries across MFEs
  - `shared-types` - cross-cutting TS types/DTOs, consumed by every app
  - `auth-client` - shared auth context/provider, consumed by the host
  - `ui` - shared MUI theme, dynamic form renderer, and date/time formatting helpers, consumed by the frontend apps
- package.json - Workspace dependencies
- turbo.json / nx.json - Monorepo task orchestration
- tsconfig.json - Global typescript config

See `docs/architecture.md` for the full architecture diagram and service wiring (ports, Module Federation remotes, REST calls between services).