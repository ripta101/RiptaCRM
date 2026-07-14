# RiptaCRM

A modular CRM application built as independent React micro-frontend (MFE) modules, each with its own backend-for-frontend (BFF) where needed.

## Modules

### Host (Shell)
The application frame everything else runs inside.
- Login screen
- Top bar with profile menu (Profile, Settings, Logout)
- Left-hand navigation
- Dashboard with summary widgets
- Persistent tabs for open customer interactions — switching tabs doesn't lose your place
- `Customers`, `Settings`, and `Profile` pages are placeholder "coming soon" screens for now

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
   pnpm --filter @riptacrm/customer-api db:push
   pnpm --filter @riptacrm/customer-api db:seed
   ```

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

## Stopping the Application

Press `Ctrl+C` in the terminal running `pnpm dev` — this stops all three services together.

If you started any service in its own separate terminal (e.g. `pnpm --filter @riptacrm/host dev`), press `Ctrl+C` in each of those terminals individually.
