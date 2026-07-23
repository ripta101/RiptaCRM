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
- The Dashboard's "Worklist" tab is a generic list, not just cases: it merges the logged-in user's own assigned open cases (case type, stage, customer account, SLA due, breach status — read-only, no click-through yet) with, for anyone granted `webchat-agent`, their assigned WebChat conversations plus any unclaimed conversation in a queue they belong to (with a "Claim" action)
- `IT Support`, `Settings`, `Profile`, and the Email configuration page are placeholder "coming soon" screens for now; WebChat's config page is real (see the WebChat module below)
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
- Search Customer, Create Customer, Customer Profile, Amend Customer, and Lodge a Case are each their own admin-grantable Profile permission (not top-level menu items — they only make sense inside an active interaction). Search, Create, and Lodge a Case are enforced on the backend too, not just hidden in the UI — see "Authorization" in `docs/architecture.md`

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
- Every route across all 5 backends (this module's `GET /api/users` included) now requires either the caller's session JWT or a trusted service-to-service key — not just a UI-level check. See "Authorization" in `docs/architecture.md` for the full model

### Access Management
Lets a business admin control who can access what, replacing what used to be a hardcoded role.
- Create, rename, and soft-delete ("archive") **Profiles** — each one bundles a dashboard type (frontline-style or admin-style), a "can start customer interactions" capability, and a set of top-level menu items it grants
- Assign any number of users to a Profile, and any user to any number of Profiles (many-to-many) — picked from a real user list, not typed IDs, same as the Case Management module's Queues
- If a user holds more than one Profile, they pick which one to use for that session at login (a session is always scoped to exactly one active Profile — nothing merges)
- One seeded Profile ("Business Admin") is **protected**: it can be renamed and have its other menu items changed, but it can never be archived/deleted, and it can never lose the menu item that grants access to Access Management itself — so an admin can't accidentally lock everyone (including themselves) out
- Archiving or deleting a Profile is blocked while it still has members assigned — unassign them first
- A read-only "Users" tab shows every user and which Profile(s) they currently hold, since membership is many-to-many and isn't otherwise visible in one place
- **Menu Items**: create custom menu entries at runtime and grant them to Profiles exactly like the built-in ones. Each one is either an **embedded webpage** (any URL, rendered in an iframe — no allowlist, admin's responsibility) or a **Module Federation remote loaded dynamically at runtime** (admin enters a remote entry URL, the remote's own declared federation name, and an exposed module — not limited to the app's 4 built-in remotes). A dynamically-loaded remote runs unsandboxed in the Host's own origin and is handed the viewing user's full session (including their auth token) as a prop, since it already has ambient access to that origin's `sessionStorage` the moment it's loaded regardless — see `docs/architecture.md` for the full reasoning. Deleting a menu item that's still granted to a Profile is always allowed; it just stops appearing in that Profile's menu next login
- **Supervised Queues / Supervised Profiles**: per-Profile grants powering WebChat's Supervisor Dashboard — which WebChat Queues and which other Profiles that Profile's members may see agent status/interaction counts for. A Profile isn't a fixed "Supervisor" type; any Profile granted the `webchat-supervisor` menu item plus a scope becomes a supervisor, so multiple independently-scoped supervisor Profiles can coexist

### Message Broadcast
Lets a business admin push announcements to logged-in users.
- Compose a title and a rich HTML message body (bold/italic/lists/links, plus an emoji picker) via a WYSIWYG editor
- Target one or more Profiles (fetched live from the Access Management module) — easy to extend as more profiles are added later, no code change needed
- Set a validity window (start/end date and time); optionally set a priority (Low/Normal/High) to control display order — unprioritized messages sort by post date, newest first
- Displays on the right-hand side of every logged-in user's Dashboard, filtered to their active session's Profile, and auto-refreshes every 45 seconds via polling — no page reload needed to see a new announcement or have an expired one disappear
- Admins can edit a broadcast or cancel it early from the admin list; a message stops displaying the moment its validity window ends or it's canceled

### WebChat
Lets a customer website embed live chat, routes inbound conversations to agents, and lets agents work them either as a screen-popped interaction or a claimed Worklist item.
- **Two embed mechanisms** on any customer site: a `<script src="…/loader.js" data-site-key="…">` tag (injects a floating bubble backed by a hidden iframe — works on any site regardless of stack) or a Module Federation remote (`webChatWidget/WebChatWidgetModule`), loaded dynamically the same way Access Management's custom MFE menu items are
- **Path-based routing**: an admin defines Routing Rules per Site (`EXACT` or `PREFIX` match against the visitor's page path, e.g. `/support.html`), each pointing at a target Queue and carrying its own one-shot auto-reply text sent as a system message the moment a conversation starts. No match falls back to the Site's default queue
- **Status-gated, round-robin auto-assignment**: a new conversation is routed to whichever eligible member of the matched queue has gone longest without being assigned one — not whoever has the most spare capacity, so a high-capacity agent doesn't stay "sticky" for every chat. Eligibility requires both spare room under the agent's effective `maxConcurrentChats` (a Profile-level default, overridable per-agent) and an admin-configured status flagged "Available for chats"; a conversation is left unassigned (queued) if nobody qualifies
- **Agent status**: agents pick their own status (e.g. Available, Lunch, Administration — admin-configurable under the Agent Statuses tab) from a selector in the Host's top bar; only statuses flagged "Available for chats" make them eligible to auto-receive or claim conversations. Status is cleared server-side on every login and logout, so it's always a conscious per-session choice, never stale
- **Self-claim**: agents can also claim an unassigned conversation themselves from their Worklist, not just wait for an admin hand-off — race-safe (a losing concurrent claim gets a 409, not a silent double-assignment) and blocked with a 409 if the agent's own status isn't currently "Available for chats"
- **Auto-popup vs. Worklist-only** is a per-Queue toggle: queues with it on screen-pop a new "Web Chat" interaction tab to the assigned agent in real time (via a WebSocket); queues with it off just add the chat to the agent's Worklist for them to open when ready
- **Combined customer workspace**: a webchat interaction tab looks like a normal new interaction — the same Search Customer → identify → profile/amend/lodge-case workflow — with the chat pinned in a persistent, sticky right-hand rail for the life of the tab, so the agent can work the customer record without losing sight of the conversation. Identifying a customer mid-chat renames the tab (with a chat-icon prefix, so it's still distinguishable from a plain customer interaction) and links that customer to the conversation (`customerAccountId`); the customer side's wrap-up screen owns closing the tab, not the chat panel, so clicking the tab's X always goes through the normal end-of-interaction flow
- Real-time delivery (both directions — visitor and agent) is a genuine WebSocket connection (`socket.io`), not polling; starting a chat, sending a message, assigning, and claiming all still go through ordinary REST calls that emit a socket event once the write commits
- Chat continuity across a page reload/re-visit is a browser-stored (`localStorage`) conversation id — no customer login exists yet
- Admin config MFE covers Sites (siteKey + embed snippet, regenerate key), Queues (members + auto-popup + capacity overrides), Routing Rules (per site), and Agent Statuses (the pickable status list + which ones count as available for chats)
- Agents can mark a conversation **Closed** from their chat panel once resolved (a live conversation isn't otherwise auto-closed); the visitor's widget surfaces a clear error if they try to send another message afterward
- **Supervisor Dashboard** (`webchat-supervisor` nav item, its own MFE module, page at `/supervisor`): a live roster of agent status, active-interaction count, and a date-range "chats answered" count, filterable by Queue, Profile, or a specific agent. Which Queues and which other Profiles a Profile's members can see is admin-granted per-Profile (Access Management → a Profile's Supervised Queues/Profiles sections) — visibility is a union of both grants, so multiple differently-scoped Supervisor profiles can coexist (e.g. one per team/region)
- A realistic multi-page sample site (`apps/webchat-sample-site` — Home / Pricing / Support / a React+MF embed demo page) demonstrates both embed paths end-to-end
- WebChat owns its **own** Queue/QueueMember-shaped tables — a deliberate duplicate of Case Management's Queues, not a reuse, so live chat routing has no runtime dependency on another module's database
- The public, visitor-facing endpoints (`webchat-api`'s `/api/public/*`) are the app's first genuinely unauthenticated surface — a visitor has no session at all. Trust is a per-Site `siteKey` (not secret) plus a dynamic CORS origin check and rate limiting, not `requirePermission()`. See "WebChat: the first public, unauthenticated endpoints" in `docs/architecture.md`

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
- socket.io + socket.io-client for WebChat's real-time visitor/agent messaging; express-rate-limit to throttle its public, unauthenticated endpoints
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
   Applies the migration and seeds three starter Profiles ("Business Admin", protected; "Frontline User"; and "Supervisor", scoped to the seeded "General Support" queue and "Frontline User" profile), assigned to the Auth module's seeded users. Set this up **before** the Auth module below — login depends on it being reachable.
6. Set up the Auth module's database:
   ```
   cp apps/auth-api/.env.example apps/auth-api/.env
   pnpm --filter @riptacrm/auth-api db:migrate
   ```
   Applies the migration and seeds 13 demo users (all password `Passw0rd154@`) with bcrypt-hashed passwords, including `supervisor1` for the Supervisor Dashboard.
7. Set up the Message Broadcast module's database:
   ```
   cp apps/message-broadcast-api/.env.example apps/message-broadcast-api/.env
   pnpm --filter @riptacrm/message-broadcast-api db:migrate
   ```
   Applies the migration and seeds a few sample announcements (active, scheduled, expired, and canceled) so the Dashboard panel and admin list have something to show right away.
8. Set up the WebChat module's database:
   ```
   cp apps/webchat-api/.env.example apps/webchat-api/.env
   pnpm --filter @riptacrm/webchat-api db:migrate
   ```
   Applies the migration and seeds a demo Site (fixed `siteKey`, embedded directly in `apps/webchat-sample-site`'s pages), a "General Support" queue with `autoPopup` on, and three routing rules targeting the sample site's Home/Pricing/Support pages.
9. (Optional) `cp apps/host/.env.example apps/host/.env` — only needed if you want to point the Host at a non-default Auth API or Message Broadcast API URL.

## Starting the Application

From the project root:
```
pnpm dev
```
This starts all services together:
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
- WebChat admin config module — http://localhost:5178
- WebChat API — http://localhost:4315
- WebChat widget — http://localhost:5179 (not a single "app": serves three build artifacts — `/loader/loader.js`, `/iframe/`, `/mfe/remoteEntry.js` — from one static server)
- WebChat sample customer site — http://localhost:5180

The Customer API calls the Case Management API server-to-server to populate a customer's "Open Cases" panel; the Host calls the Auth API to log in; the Auth API calls the Access Management API server-to-server on every login to resolve the user's Profile(s) (and fails the login loudly, not softly, if that call fails); the Host calls the Message Broadcast API to show and poll the Dashboard's Announcements panel; the Message Broadcast API calls the Access Management API to populate its composer's "target profiles" picker; the WebChat API calls the Access Management API server-to-server to resolve an agent's default chat capacity, failing closed (capacity `0`, chat stays queued) if that call fails; the WebChat API also calls the Access Management API to resolve a Supervisor's granted scope (queues/profiles) for the Supervisor Dashboard, failing soft (an empty dashboard) since this only powers a display; the Access Management API calls the WebChat API server-to-server to show real queue names in a Profile's Supervised Queues picker, also failing soft; and the WebChat sample site's embedded widget (loaded from the WebChat widget's static server) talks to the WebChat API over both REST and WebSocket — start them all (`pnpm dev` does this automatically) for the full app to work.

Open http://localhost:5173 and log in with one of:
- `test` / `Passw0rd154@` — Frontline User profile
- `admin` / `Passw0rd154@` — Business Admin profile (protected)
- `supervisor1` / `Passw0rd154@` — Supervisor profile (WebChat Supervisor Dashboard)

**Note**: login now requires both the Auth API and the Access Management API to be running. If you run `apps/host` standalone in its own terminal instead of `pnpm dev` from the root, also start `apps/auth-api` and `apps/access-management-api` (`pnpm --filter @riptacrm/auth-api dev` and `pnpm --filter @riptacrm/access-management-api dev`) separately, or login will fail with a network error (or a 503, if only Access Management is missing).

## Changing the Database Schema

The Customer, Case Management, Auth, Message Broadcast, Access Management, and WebChat modules' databases all use [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate) — every schema change is a versioned, timestamped SQL file in each app's `prisma/migrations/`, committed to git. Each database tracks which migrations it has already applied, so "catching up" is always the same command (substitute the package name for whichever module you're working on), on any machine:

- **You pulled code that includes new migrations** (someone else changed the schema): run
  ```
  pnpm --filter @riptacrm/customer-api db:migrate
  pnpm --filter @riptacrm/case-management-api db:migrate
  pnpm --filter @riptacrm/access-management-api db:migrate
  pnpm --filter @riptacrm/auth-api db:migrate
  pnpm --filter @riptacrm/message-broadcast-api db:migrate
  pnpm --filter @riptacrm/webchat-api db:migrate
  ```
  This applies only the migrations your local database doesn't have yet.
- **You're changing the schema yourself**: edit the app's `prisma/schema.prisma`, then run the same `db:migrate` command. Prisma detects the change, generates a new migration file, and applies it locally. Commit the new `prisma/migrations/<timestamp>_<name>/` folder along with your code change so everyone else picks it up next time they run `db:migrate`.
- **CI or any future non-local environment**: use `db:deploy` instead — applies pending migrations only, never prompts, never generates new ones.
- **Start completely clean**: `db:reset` — drops the local database, replays every migration from scratch, and reseeds the sample data.

`db:push` (schema sync with no migration file) still exists for quick, throwaway local experiments, but any change you intend to commit should go through `db:migrate` instead.

## Stopping the Application

Press `Ctrl+C` in the terminal running `pnpm dev` — this stops all services together.

If you started any service in its own separate terminal (e.g. `pnpm --filter @riptacrm/host dev`), press `Ctrl+C` in each of those terminals individually.
