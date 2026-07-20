# RiptaCRM

A modular CRM application built as independent React micro-frontend (MFE) modules, each with its own backend-for-frontend (BFF) where needed.

## Modules

### Host (Shell)
The application frame everything else runs inside. Two roles, two different experiences:
- Login screen — backed by a real database (the Auth module), with bcrypt-hashed passwords and a JWT session token
- Top bar with a hamburger menu and a profile menu (Profile, Settings, Logout)
- **Frontline users** get a Dashboard with case widgets and a way to start customer interactions (persistent tabs — switching tabs doesn't lose your place), plus a Worklist and IT Support menu
- **Business admins** get a Dashboard showing recent configuration changes instead, cannot start interactions, and get a WebChat / Email configuration menu (still placeholders) plus a real Case Management configuration screen
- Routes are guarded by role — each menu's pages are only reachable by the role they belong to
- `Worklist`, `IT Support`, `Settings`, `Profile`, and the WebChat / Email configuration pages are placeholder "coming soon" screens for now
- The frontline Dashboard's "Open Cases" widget shows a live count of cases assigned to the logged-in user, sourced from the Case Management module
- Both roles' Dashboards show an "Announcements" panel on the right, sourced from the Message Broadcast module and auto-refreshing

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
- **Queues**: create named queues, add users as members (by picking from a list, not typing raw IDs), and assign a queue to any stage. When a frontline user lodges a case via the Customer module and the case's starting stage has a queue, the case auto-assigns to them if they're a member, or routes to the queue (visible in the case list's Assigned to column) if not

### Auth
Backend-only module — issues sessions for the Host's login screen; not a module you see directly.
- `POST /api/auth/login` validates a username/password against a database of users (bcrypt-hashed passwords) and returns a signed JWT + user profile
- The Host decodes and checks the token's expiry client-side (no network call on every page load); the token is what future SAML/SSO integration would replace or bridge into, without needing to change how the rest of the app consumes `useAuth()`
- `GET /api/users` lists users (no password data) — used by the Case Management module's queue-member picker, proxied server-to-server rather than called directly from any browser
- Seeded with two demo users (`test`/`Passw0rd154@` frontline, `admin`/`Passw0rd154@` business admin) — no user-management UI yet, that's a future feature

### Message Broadcast
Lets a business admin push announcements to logged-in users.
- Compose a title and a rich HTML message body (bold/italic/lists/links, plus an emoji picker) via a WYSIWYG editor
- Target one or more profiles (today: frontline, business admin — easy to extend as more profiles are added later)
- Set a validity window (start/end date and time); optionally set a priority (Low/Normal/High) to control display order — unprioritized messages sort by post date, newest first
- Displays on the right-hand side of every logged-in user's Dashboard, filtered to their profile, and auto-refreshes every 45 seconds via polling — no page reload needed to see a new announcement or have an expired one disappear
- Admins can edit a broadcast or cancel it early from the admin list; a message stops displaying the moment its validity window ends or it's canceled

`packages/` holds code shared across modules (UI theme, shared types, auth) — not a module in its own right.

See [docs/architecture.md](docs/architecture.md) for a diagram of how the modules connect (Module Federation wiring, REST calls between services, ports).

## Tech Stack

- React + Vite, composed at runtime via Module Federation
- MUI (Material UI) component library
- Express + Prisma + SQLite for the Customer, Case Management, Auth, and Message Broadcast modules' backends
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
5. Set up the Auth module's database:
   ```
   cp apps/auth-api/.env.example apps/auth-api/.env
   pnpm --filter @riptacrm/auth-api db:migrate
   ```
   Applies the migration and seeds the two demo users (`test`/`Passw0rd154@`, `admin`/`Passw0rd154@`) with bcrypt-hashed passwords.
6. Set up the Message Broadcast module's database:
   ```
   cp apps/message-broadcast-api/.env.example apps/message-broadcast-api/.env
   pnpm --filter @riptacrm/message-broadcast-api db:migrate
   ```
   Applies the migration and seeds a few sample announcements (active, scheduled, expired, and canceled) so the Dashboard panel and admin list have something to show right away.
7. (Optional) `cp apps/host/.env.example apps/host/.env` — only needed if you want to point the Host at a non-default Auth API or Message Broadcast API URL.

## Starting the Application

From the project root:
```
pnpm dev
```
This starts all eight services together:
- Host — http://localhost:5173
- Customer module — http://localhost:5174
- Customer API — http://localhost:4310
- Case Management module — http://localhost:5175
- Case Management API — http://localhost:4311
- Auth API — http://localhost:4312
- Message Broadcast module — http://localhost:5176
- Message Broadcast API — http://localhost:4313

The Customer API calls the Case Management API server-to-server to populate a customer's "Open Cases" panel, the Host calls the Auth API to log in, and the Host calls the Message Broadcast API to show and poll the Dashboard's Announcements panel — start them all (`pnpm dev` does this automatically) for the full app to work.

Open http://localhost:5173 and log in with one of:
- `test` / `Passw0rd154@` — frontline user
- `admin` / `Passw0rd154@` — business admin

**Note**: login now requires the Auth API to be running. If you run `apps/host` standalone in its own terminal instead of `pnpm dev` from the root, also start `apps/auth-api` (`pnpm --filter @riptacrm/auth-api dev`) separately, or login will fail with a network error.

## Changing the Database Schema

The Customer, Case Management, Auth, and Message Broadcast modules' databases all use [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate) — every schema change is a versioned, timestamped SQL file in each app's `prisma/migrations/`, committed to git. Each database tracks which migrations it has already applied, so "catching up" is always the same command (substitute the package name for whichever module you're working on), on any machine:

- **You pulled code that includes new migrations** (someone else changed the schema): run
  ```
  pnpm --filter @riptacrm/customer-api db:migrate
  pnpm --filter @riptacrm/case-management-api db:migrate
  pnpm --filter @riptacrm/auth-api db:migrate
  pnpm --filter @riptacrm/message-broadcast-api db:migrate
  ```
  This applies only the migrations your local database doesn't have yet.
- **You're changing the schema yourself**: edit the app's `prisma/schema.prisma`, then run the same `db:migrate` command. Prisma detects the change, generates a new migration file, and applies it locally. Commit the new `prisma/migrations/<timestamp>_<name>/` folder along with your code change so everyone else picks it up next time they run `db:migrate`.
- **CI or any future non-local environment**: use `db:deploy` instead — applies pending migrations only, never prompts, never generates new ones.
- **Start completely clean**: `db:reset` — drops the local database, replays every migration from scratch, and reseeds the sample data.

`db:push` (schema sync with no migration file) still exists for quick, throwaway local experiments, but any change you intend to commit should go through `db:migrate` instead.

## Stopping the Application

Press `Ctrl+C` in the terminal running `pnpm dev` — this stops all eight services together.

If you started any service in its own separate terminal (e.g. `pnpm --filter @riptacrm/host dev`), press `Ctrl+C` in each of those terminals individually.
