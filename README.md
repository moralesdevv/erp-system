# ERP + POS System

> Business platform for retail operations: sales, inventory, purchases, customers, credit and multi-branch control.
![Next.js](https://img.shields.io/badge/Next.js-14-111827?style=flat-square&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)

## Overview

ERP + POS is a project aimed at retail businesses in Guatemala. Its goal is to centralize the daily operations of a company in a single platform: sell at the point of sale, track stock per branch, manage customers and suppliers, record purchases, handle credit and consult operational indicators.

The system is built as a **modular monolith**: it keeps a single deployable application, but separates business capabilities into modules that can evolve independently. This decision preserves the operational simplicity of a monolith while leaving clear boundaries for future growth.

## Demo for recruiters

The visual demo is independent of the main system and does not require Node.js, Docker or a database.

1. Open [demo/index.html](demo/index.html) in the browser.
2. Try searching for products, adding them to the cart and confirming a sale.
3. Review the demo code: it is commented and uses a simple separation between state, calculations and rendering.

The demo represents the POS flow with local data. The full project also includes the NestJS backend, PostgreSQL persistence, authentication, RBAC and the business modules described below.

## Main capabilities

| Area | Capabilities |
| --- | --- |
| Dashboard | KPIs, sales trends, comparison between branches and recent activity |
| POS | Search by name, SKU or barcode; cart; payment methods; change calculation |
| Inventory | Stock per branch, kardex, movements, lots, expirations, adjustments and transfers |
| Sales | History, detail, voids, daily summary and operational filters |
| Purchases | Purchase orders, goods reception, costs and suppliers |
| Customers | Directory, sales history, credit limit and credit balance |
| Credit | Accounts receivable, partial payments, due dates and aging report |
| Audit | Log of relevant actions, actor, resource, date and operation context |
| Access | JWT, rotating refresh tokens, Argon2id, lockout after failed attempts and RBAC |
| Operations | Multi-branch, notifications, WebSockets and configuration ready for deployment with Nginx |

## Architecture

```text
┌──────────────────────┐
│ Next.js 14 / React   │  App Router, TypeScript, TailwindCSS
└──────────┬───────────┘
            │ REST / cookies / WebSocket
┌──────────▼───────────┐
│ NestJS modular API   │  Auth, RBAC, sales, inventory, purchases...
└──────────┬───────────┘
            │ Prisma ORM
┌──────────▼───────────┐       ┌──────────────────────┐
│ PostgreSQL 16        │       │ Redis 7              │
│ transactional data   │       │ cache & ephemeral    │
└──────────────────────┘       └──────────────────────┘
```

The code is organized by business capability in [backend/src](backend/src) and [frontend/src](frontend/src). The schema and migrations live in [backend/prisma](backend/prisma).

## Tech stack

### Frontend

- Next.js 14 with App Router.
- React and strict TypeScript.
- TailwindCSS and reusable UI components.
- Framer Motion for targeted interactions.
- Axios as the HTTP client.
- `jose` for access token validation in middleware.
- Recharts for visualizations.

### Backend

- NestJS 10.
- TypeScript.
- Prisma ORM.
- PostgreSQL 16.
- Redis 7 and Ioredis.
- Socket.IO for real-time events.
- Argon2id for password hashing.
- Helmet, CORS, throttling and input sanitization.
- Winston with daily log rotation.

### Infrastructure

- Docker Compose for development.
- Separate Dockerfiles for development and production.
- Nginx as reverse proxy.
- Configuration ready for HTTPS, Cloudflare and WebSockets.
- Firewall, SSL, backup and Fail2Ban scripts.

## Backend modules

```text
backend/src/
├── auth/             # Login, registration, refresh tokens and sessions
├── users/            # Users and password changes
├── roles/            # Roles and permissions
├── branches/         # Branches
├── products/         # Catalog, SKU and barcode
├── inventory/        # Stock, kardex, lots and transfers
├── sales/            # Sales and voids
├── purchases/        # Purchases and goods reception
├── customers/        # Customers and credit
├── suppliers/        # Suppliers
├── credits/          # Payments and due dates
├── dashboard/        # Indicators and aggregations
├── notifications/    # System notifications
├── audit/            # Operation auditing
├── upload/           # Validated files
├── events/           # Socket.IO gateway
└── common/           # Guards, filters, middleware and tasks
```

## Security implemented

- Short-lived JWT access token and rotating refresh token.
- Refresh tokens stored as SHA-256 hashes.
- Passwords protected with Argon2id.
- Temporary lockout after failed authentication attempts.
- RBAC with the roles `super_admin`, `admin`, `manager`, `cashier`, `inventory` and `sales`.
- Global authentication guards and specific role/permission guards.
- CORS with an origin allowlist.
- Helmet and security headers.
- Global throttling and stricter limits for login, registration and uploads.
- HTML input sanitization.
- Validation of file extension, MIME type and size.
- Auditing of logins, user changes, permissions, uploads, sales and movements.

## Data model

The Prisma model covers the main entities of an ERP/POS:

```text
User ── UserRole ── Role ── RolePermission ── Permission
  │
  ├── Sales ── SaleItem ── Product ── Stock ── Branch
  ├── Purchases ── PurchaseItem ── Supplier
  ├── Credits ── CreditPayment ── Customer
  └── AuditLog / RefreshToken / Notification
```

Monetary operations use `Decimal` in Prisma, and inventory movements record the previous balance, the resulting balance, a reference and the responsible user.

## Key API endpoints

The API uses the `/api/v1` prefix and exposes Swagger documentation during development.

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh

GET  /api/v1/products
GET  /api/v1/products/barcode/:barcode

GET  /api/v1/inventory/stock
GET  /api/v1/inventory/kardex/:productId
POST /api/v1/inventory/adjust
POST /api/v1/inventory/transfer

GET  /api/v1/sales
POST /api/v1/sales
POST /api/v1/sales/:id/void

GET  /api/v1/purchases
POST /api/v1/purchases/:id/receive

GET  /api/v1/credits
POST /api/v1/credits/:id/payment
GET  /api/v1/audit
```

## Running the full system

### Requirements

- Node.js 20 LTS.
- Docker Desktop 24 or later.
- Git.
- 4 GB of RAM available; 8 GB recommended.

### Configuration

The system uses separate files for each process:

```text
.env             # PostgreSQL, Redis and the Compose domain
backend/.env     # NestJS, Prisma, JWT, cookies and logs
frontend/.env    # Public API URL and middleware JWT
```

Check the `.env.example` files before creating real values. Secrets must not be pushed to the repository.

### Startup with Docker

```powershell
docker compose up -d --build
docker compose ps

docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

Local URLs:

```text
Frontend: http://localhost:3001
API:      http://localhost:3000/api/v1
Swagger:  http://localhost:3000/api/docs
```

The seed creates the initial `admin@erp.local` user. The development password must be changed immediately in any shared or production environment.

### Development without Docker

PostgreSQL and Redis must be available locally.

```powershell
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

## Repository structure

```text
erp-system/
├── backend/                 # NestJS API and Prisma
├── frontend/                # Next.js application
├── demo/                    # Static demo
├── nginx/                   # Reverse proxy and HTTPS
├── infrastructure/          # Backups, firewall, SSL and monitoring
├── docker-compose.yml       # Local development
├── docker-compose.prod.yml  # Production deployment
├── SECURITY.md              # Security architecture
└── docs/                    # Requirements and setup guide
```

## Notable technical decisions

### Modular monolith

A modular monolith was chosen to keep deployment simple while still separating business domains. It is a more reasonable foundation at this system size than introducing microservices prematurely.

### PostgreSQL for transactional truth

Sales, stock, credit, purchases and audit data live in PostgreSQL. Redis is reserved for temporary data, rate limiting and capabilities that must not replace transactional persistence.

### Layered security

Authentication does not depend on the frontend alone. The backend validates identity, role, permissions, input and account state; Nginx and Docker add limits and isolation in deployment.

## Project status

The repository is a functional base under active evolution. The static demo allows a quick review of the POS experience; the main system contains the backend architecture, persistence, authentication and business modules to keep hardening before a production deployment.

The following areas are part of the planned technical evolution:

- Progressive integration of every screen with the real API.
- Complete runtime DTOs and configuration validation on startup.
- Unit, integration and E2E tests for sales, inventory, credit and permissions.
- Reinforced transactions and locking in concurrent operations.
- Health checks, metrics and a CI/CD pipeline.
- Gradual evolution towards Clean Architecture where it brings real value.

## Related documentation

- [Setup guide](docs/setup.md)
- [System requirements](docs/requirements.md)
- [Security architecture](SECURITY.md)
- [Demo](demo/index.html)

---
Project focused on enterprise architecture, retail operations and full-stack development with TypeScript.