# RiptaCRM

A modular CRM application built as independent React micro-frontend (MFE) modules, each with its own backend-for-frontend (BFF) where needed.

## Modules

### Host (Shell)
The application frame everything else runs inside. Every user's access is driven entirely by their admin-assigned **Profile** (see the Access Management module) — there's no hardcoded role anymore:
- Login screen — backed by a real database (the Auth module), with bcrypt-hashed passwords and a JWT session token. If a user holds more than one Profile, a second "choose a profile" step appears after a correct password, and the session is scoped to whichever one they pick; a single-profile user's login is unchanged, one step
- Top bar with a hamburger menu and a profile menu (Profile, Settings, Logout)
- Which top-level menu items appear, which dashboard layout renders ("frontline"-style or "admin"-style), and whether "New Interaction" is available are all determined by the active session's Profile — not a fixed role
- A profile with the frontline-style dashboard gets case widgets and (if its "can start interactions" capability is on) a way to start customer interactions (persistent tabs — switching tabs doesn't lose your place), split into "Dashboard" and "Worklist" tabs
- A profile with the admin-style dashboard gets a Dashboard showing recent configuration changes instead
- Routes are guarded per nav item — each menu's page is only reachable if the active profile grants that specific nav item
- The Dashboard's "Worklist" tab lists the logged-in user's own assigned open cases (case type, stage, customer account, SLA due, breach status) — read-only for now, no click-through to the customer interaction yet
- `IT Support`, `Settings`, `Profile`, and the WebChat / Email configuration pages are placeholder "coming soon" screens for now
- The "Open Cases" widget shows a live count of cases assigned to the logged-in user, sourced from the Case Management module
- Every Dashboard shows an "Announcements" panel on the right, sourced from the Message Broadcast module (filtered to the active profile) and auto-refreshing

### Customer
Find a customer and see their history. Opens inside a new interaction tab (not a standalone menu item).
- Search by first name, last name, phone number, date of birth, email, account ID, or company
- View a customer's full profile: open cases (live from the Case Management module) and recent interactions
- If a search finds no one, create a new customer on the spot — the form pre-fills from your search, and the account ID is generated automatically
- Confirm a customer to open the interaction workspace: a box per confirmed customer (Customer Profile, Amend Customer, Lodge a Case) plus a generic box to search and confirm additional customers into the same interaction
- Wrap up an interaction (via the Wrap Up button or the tab's close button) to review each confirmed customer's actions and add notes before ending it
- "Lodge a Case" creates a real case instance in the Case Management module: pick from any published case type (shown as cards with their description), fill in that type's fields, and submit — the customer's account ID and email are attached automatically. If the case's starting stage has a queue assigned, the new case is auto-assigned to you if you're a member of that queue, otherwise it's routed to the queue and you're told so

### Case Management
Lets a business admin design how cases work for the business, then runs the resulting SLA/automation engine.
- Create case types (e.g. "Complaint", "Service Request"), each with its own configurable fields (text, number, date, select, textarea, checkbox — with required flags and select options), drag-and-drop-orderable stages, and a per-stage SLA
- Configure exactly which stages a stage can move to next via a visual flow diagram (e.g. a "Level 1" stage can be allowed to reach "Level 2" or "Closed" but not skip straight to "Level 3 Escalation") — a stage with no configured outgoing transitions allows no moves out of it, so case flows are locked-down by default until deliberately designed
- Configure automated actions per stage, triggered before/at/after an SLA breach — currently one action type ("Send Email"), which is simulated and recorded to an Action Log rather than actually sent
- Every case type's design (fields + stages + SLA + actions) is versioned as one bundle: admins edit a **draft**, and nothing changes for cases already in progress until the admin explicitly **publishes** it — each case stays pinned to the exact version it was created under, forever
- A background scheduler checks in-progress cases against their SLA due times and fires configured actions automatically
- Includes a minimal admin-only screen for creating test case instances (not the polished frontline case-working experience — that's still to come) and an Action Log viewer
- **Queues**: create named queues, add users as members (by picking from a list, not typing raw IDs), and assign a queue to any stage. When a frontline user lodges a case via the Customer module and the case's starting stage has a queue, the case auto-assigns to them if they're a member, or routes to the queue if not. Each queue's own screen lists its unassigned cases and lets an admin hand each one to a specific member — that's how queue-routed work actually gets allocated

### Auth
Backend-only module — issues sessions for the Host's login screen; not a module you see directly.
- `POST /api/auth/login` validates a username/password against a database of users (bcrypt-hashed passwords), then calls the Access Management module server-to-server to resolve which Profile(s) that user holds. Exactly one profile → a signed JWT + user session comes back immediately. Zero profiles → 403 (no access). More than one → a `choose-profile` response with a short-lived pre-auth token and the list of profile names, finalized by `POST /api/auth/select-profile`
- Unlike every other cross-service read in this codebase (which fails soft), this profile lookup **fails loud**: if Access Management is unreachable, login returns 503 rather than silently issuing a profile-less, effectively-locked-out session
- The Host decodes and checks the token's expiry client-side (no network call on every page load); the token is what future SAML/SSO integration would replace or bridge into, without needing to change how the rest of the app consumes `useAuth()`
- `GET /api/users` lists users (no password data) — used by the Case Management and Access Management modules' member pickers, proxied server-to-server rather than called directly from any browser
- Seeded with 12 demo users, all password `Passw0rd154@`: `test` and `test1`-`test10` (assigned the "Frontline User" profile — e.g. for populating profile/queue membership with multiple distinct members) and `admin` (assigned the protected "Business Admin" profile)

### Access Management
Lets a business admin control who can access what, replacing what used to be a hardcoded role.
- Create, rename, and soft-delete ("archive") **Profiles** — each one bundles a dashboard type (frontline-style or admin-style), a "can start customer interactions" capability, and a set of top-level menu items it grants
- Assign any number of users to a Profile, and any user to any number of Profiles (many-to-many) — picked from a real user list, not typed IDs, same as the Case Management module's Queues
- If a user holds more than one Profile, they pick which one to use for that session at login (a session is always scoped to exactly one active Profile — nothing merges)
- One seeded Profile ("Business Admin") is **protected**: it can be renamed and have its other menu items changed, but it can never be archived/deleted, and it can never lose the menu item that grants access to Access Management itself — so an admin can't accidentally lock everyone (including themselves) out
- Archiving or deleting a Profile is blocked while it still has members assigned — unassign them first
- A read-only "Users" tab shows every user and which Profile(s) they currently hold, since membership is many-to-many and isn't otherwise visible in one place

### Message Broadcast
Lets a business admin push announcements to logged-in users.
- Compose a title and a rich HTML message body (bold/italic/lists/links, plus an emoji picker) via a WYSIWYG editor
- Target one or more Profiles (fetched live from the Access Management module) — easy to extend as more profiles are added later, no code change needed
- Set a validity window (start/end date and time); optionally set a priority (Low/Normal/High) to control display order — unprioritized messages sort by post date, newest first
- Displays on the right-hand side of every logged-in user's Dashboard, filtered to their active session's Profile, and auto-refreshes every 45 seconds via polling — no page reload needed to see a new announcement or have an expired one disappear
- Admins can edit a broadcast or cancel it early from the admin list; a message stops displaying the moment its validity window ends or it's canceled

`packages/` holds code shared across modules (UI theme, shared types, auth) — not a module in its own right.

See [docs/architecture.md](docs/architecture.md) for a diagram of how the modules connect (Module Federation wiring, REST calls between services, ports).

## Tech Stack

- React + Vite, composed at runtime via Module Federation
- MUI (Material UI) component library
- Express + Prisma + SQLite for the Customer, Case Management, Auth, Message Broadcast, and Access Management modules' backends
- jsonwebtoken + bcryptjs for the Auth module's JWT session tokens and password hashing
- node-cron for the Case Management module's SLA scheduler
- @xyflow/react for the Case Management module's stage-transition flow diagram; @dnd-kit for drag-and-drop stage reordering
- TipTap for the Message Broadcast composer's rich text editing; emoji-picker-react for its emoji picker; sanitize-html to strip unsafe HTML from broadcast messages before they're stored
- Turborepo + pnpm workspaces

## Prerequisites (one-time setup)

1. Install [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).
2. Install dependencies:
   ```
   pnpm install
   ```
3. Set up the Customer module's database:
   ```
   cp apps/customer-api/.env.example apps/customer-api/.env
   pnpm --filter @riptacrm/customer-api db:migrate
   ```
   This applies all versioned migrations and seeds the sample data in one step.
4. Set up the Case Management module's database:
   ```
   cp apps/case-management-api/.env.example apps/case-management-api/.env
   pnpm --filter @riptacrm/case-management-api db:migrate
   ```
   Same as above — applies migrations and seeds sample case types in one step.
5. Set up the Access Management module's database:
   ```
   cp apps/access-management-api/.env.example apps/access-management-api/.env
   pnpm --filter @riptacrm/access-management-api db:migrate
   ```
   Applies the migration and seeds the two starter Profiles ("Business Admin", protected, and "Frontline User"), assigned to the Auth module's seeded users. Set this up **before** the Auth module below — login depends on it being reachable.
6. Set up the Auth module's database:
   ```
   cp apps/auth-api/.env.example apps/auth-api/.env
   pnpm --filter @riptacrm/auth-api db:migrate
   ```
   Applies the migration and seeds 12 demo users (all password `Passw0rd154@`) with bcrypt-hashed passwords.
7. Set up the Message Broadcast module's database:
   ```
   cp apps/message-broadcast-api/.env.example apps/message-broadcast-api/.env
   pnpm --filter @riptacrm/message-broadcast-api db:migrate
   ```
   Applies the migration and seeds a few sample announcements (active, scheduled, expired, and canceled) so the Dashboard panel and admin list have something to show right away.
8. (Optional) `cp apps/host/.env.example apps/host/.env` — only needed if you want to point the Host at a non-default Auth API or Message Broadcast API URL.

## Starting the Application

From the project root:
```
pnpm dev
```
This starts all ten services together:
- Host — http://localhost:5173
- Customer module — http://localhost:5174
- Customer API — http://localhost:4310
- Case Management module — http://localhost:5175
- Case Management API — http://localhost:4311
- Auth API — http://localhost:4312
- Message Broadcast module — http://localhost:5176
- Message Broadcast API — http://localhost:4313
- Access Management module — http://localhost:5177
- Access Management API — http://localhost:4314

The Customer API calls the Case Management API server-to-server to populate a customer's "Open Cases" panel; the Host calls the Auth API to log in; the Auth API calls the Access Management API server-to-server on every login to resolve the user's Profile(s) (and fails the login loudly, not softly, if that call fails); the Host calls the Message Broadcast API to show and poll the Dashboard's Announcements panel; and the Message Broadcast API calls the Access Management API to populate its composer's "target profiles" picker — start them all (`pnpm dev` does this automatically) for the full app to work.

Open http://localhost:5173 and log in with one of:
- `test` / `Passw0rd154@` — Frontline User profile
- `admin` / `Passw0rd154@` — Business Admin profile (protected)

**Note**: login now requires both the Auth API and the Access Management API to be running. If you run `apps/host` standalone in its own terminal instead of `pnpm dev` from the root, also start `apps/auth-api` and `apps/access-management-api` (`pnpm --filter @riptacrm/auth-api dev` and `pnpm --filter @riptacrm/access-management-api dev`) separately, or login will fail with a network error (or a 503, if only Access Management is missing).

## Changing the Database Schema

The Customer, Case Management, Auth, Message Broadcast, and Access Management modules' databases all use [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate) — every schema change is a versioned, timestamped SQL file in each app's `prisma/migrations/`, committed to git. Each database tracks which migrations it has already applied, so "catching up" is always the same command (substitute the package name for whichever module you're working on), on any machine:

- **You pulled code that includes new migrations** (someone else changed the schema): run
  ```
  pnpm --filter @riptacrm/customer-api db:migrate
  pnpm --filter @riptacrm/case-management-api db:migrate
  pnpm --filter @riptacrm/access-management-api db:migrate
  pnpm --filter @riptacrm/auth-api db:migrate
  pnpm --filter @riptacrm/message-broadcast-api db:migrate
  ```
  This applies only the migrations your local database doesn't have yet.
- **You're changing the schema yourself**: edit the app's `prisma/schema.prisma`, then run the same `db:migrate` command. Prisma detects the change, generates a new migration file, and applies it locally. Commit the new `prisma/migrations/<timestamp>_<name>/` folder along with your code change so everyone else picks it up next time they run `db:migrate`.
- **CI or any future non-local environment**: use `db:deploy` instead — applies pending migrations only, never prompts, never generates new ones.
- **Start completely clean**: `db:reset` — drops the local database, replays every migration from scratch, and reseeds the sample data.

`db:push` (schema sync with no migration file) still exists for quick, throwaway local experiments, but any change you intend to commit should go through `db:migrate` instead.

## Stopping the Application

Press `Ctrl+C` in the terminal running `pnpm dev` — this stops all ten services together.

If you started any service in its own separate terminal (e.g. `pnpm --filter @riptacrm/host dev`), press `Ctrl+C` in each of those terminals individually.
