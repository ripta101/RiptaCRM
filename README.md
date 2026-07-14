# RiptaCRM

A modular CRM application built as independent React micro-frontend (MFE) modules, each with its own backend-for-frontend (BFF) where needed.

## Modules

### Host (Shell)
The application frame everything else runs inside.
- Login screen
- Top bar with a hamburger menu (Home, Worklist, IT Support) and a profile menu (Profile, Settings, Logout)
- Dashboard with summary widgets
- Persistent tabs for open customer interactions — switching tabs doesn't lose your place
- `Worklist`, `IT Support`, `Settings`, and `Profile` pages are placeholder "coming soon" screens for now

### Customer
Find a customer and see their history. Opens inside a new interaction tab (not a standalone menu item).
- Search by first name, last name, phone number, date of birth, email, account ID, or company
- View a customer's full profile: open cases and recent interactions

`packages/` holds code shared across modules (UI theme, shared types, auth) — not a module in its own right.

## Tech Stack

- React + Vite, composed at runtime via Module Federation
- MUI (Material UI) component library
- Express + Prisma + SQLite for the Customer module's backend
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

## Starting the Application

From the project root:
```
pnpm dev
```
This starts all three services together:
- Host — http://localhost:5173
- Customer module — http://localhost:5174
- Customer API — http://localhost:4310

Open http://localhost:5173 and log in with `test` / `test`.

## Changing the Database Schema

The Customer module's database uses [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate) — every schema change is a versioned, timestamped SQL file in `apps/customer-api/prisma/migrations/`, committed to git. Each database tracks which migrations it has already applied, so "catching up" is always the same command, on any machine:

- **You pulled code that includes new migrations** (someone else changed the schema): run
  ```
  pnpm --filter @riptacrm/customer-api db:migrate
  ```
  This applies only the migrations your local database doesn't have yet.
- **You're changing the schema yourself**: edit `apps/customer-api/prisma/schema.prisma`, then run the same `db:migrate` command. Prisma detects the change, generates a new migration file, and applies it locally. Commit the new `prisma/migrations/<timestamp>_<name>/` folder along with your code change so everyone else picks it up next time they run `db:migrate`.
- **CI or any future non-local environment**: use `pnpm --filter @riptacrm/customer-api db:deploy` instead — applies pending migrations only, never prompts, never generates new ones.
- **Start completely clean**: `pnpm --filter @riptacrm/customer-api db:reset` — drops the local database, replays every migration from scratch, and reseeds the sample data.

`db:push` (schema sync with no migration file) still exists for quick, throwaway local experiments, but any change you intend to commit should go through `db:migrate` instead.

## Stopping the Application

Press `Ctrl+C` in the terminal running `pnpm dev` — this stops all three services together.

If you started any service in its own separate terminal (e.g. `pnpm --filter @riptacrm/host dev`), press `Ctrl+C` in each of those terminals individually.
