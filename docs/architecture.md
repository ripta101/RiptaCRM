# RiptaCRM Architecture

How the modules are wired together at runtime: which frontends load which via Module Federation, which backends they call, and which shared packages each depends on.

```mermaid
graph LR
    subgraph Frontend["Frontend (Module Federation)"]
        Host["Host shell<br/>:5173"]
        CustomerMFE["Customer MFE<br/>:5174"]
        CaseMFE["Case Management MFE<br/>:5175"]
    end

    subgraph Backend["Backend APIs"]
        CustomerAPI["customer-api<br/>:4310<br/>Express + Prisma"]
        CaseAPI["case-management-api<br/>:4311<br/>Express + Prisma + node-cron"]
    end

    subgraph Data["Databases"]
        CustomerDB[("customer-api<br/>SQLite")]
        CaseDB[("case-management-api<br/>SQLite")]
    end

    subgraph Shared["Shared Packages"]
        Types["@riptacrm/shared-types"]
        Auth["@riptacrm/auth-client"]
        UI["@riptacrm/ui"]
    end

    Host -. "loads remoteEntry.js" .-> CustomerMFE
    Host -. "loads remoteEntry.js" .-> CaseMFE

    CustomerMFE -- "HTTP REST" --> CustomerAPI
    CaseMFE -- "HTTP REST" --> CaseAPI
    CustomerAPI -- "HTTP REST (server-to-server,<br/>fails soft)" --> CaseAPI
    Host -- "HTTP REST (direct,<br/>OpenCasesWidget only)" --> CaseAPI

    CustomerAPI --> CustomerDB
    CaseAPI --> CaseDB

    Types -.-> Host
    Types -.-> CustomerMFE
    Types -.-> CaseMFE
    Types -.-> CustomerAPI
    Types -.-> CaseAPI
    Auth -.-> Host
    UI -.-> Host
    UI -.-> CustomerMFE
    UI -.-> CaseMFE
```

## Nodes

| Node | Tech | Port | Role |
|---|---|---|---|
| Host | React + Vite + MUI + react-router, Module Federation **host** | 5173 | Shell app: login, nav, dashboard, hosts the two remotes |
| Customer MFE | React + Vite, Module Federation **remote** (`customer`) | 5174 | Customer search / create / detail UI |
| Case Management MFE | React + Vite, Module Federation **remote** (`caseManagement`) | 5175 | Case-type / workflow admin config UI + action log viewer |
| customer-api | Express + Prisma + SQLite | 4310 | Customer & interaction-history REST API |
| case-management-api | Express + Prisma + SQLite + node-cron | 4311 | Case type / workflow / instance / SLA REST API + SLA scheduler |

## Shared packages

| Package | Contains | Consumed by |
|---|---|---|
| `@riptacrm/shared-types` | Cross-cutting TS types/DTOs (customer, case, interaction, nav, user) | All 5 services |
| `@riptacrm/auth-client` | Auth context + mock/dev auth provider (`useAuth()`) | Host only |
| `@riptacrm/ui` | Shared MUI theme | Host, Customer MFE, Case Management MFE |

## The one asymmetric edge

Every other cross-service call is straightforward — each MFE talks only to its own backend, and `customer-api` calls `case-management-api` server-to-server to embed a customer's open cases into `GET /api/customers/:id`.

The Host's Dashboard **"Open Cases" widget is the exception**: it calls `case-management-api` directly from the browser (`GET /api/case-instances?assignedToUserId=...&status=OPEN`), bypassing both `customer-api` and the Case Management MFE entirely. This is intentional — the widget needs cases assigned to the logged-in user, not tied to a specific customer, so routing it through `customer-api` wouldn't make sense. Don't "fix" this into a Module Federation call or a customer-api proxy without checking why it's a direct call first.

Each API owns its own isolated SQLite database via its own Prisma schema — there is no shared database and no direct DB-to-DB access.
