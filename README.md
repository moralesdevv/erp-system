# ERP + POS System

> Plataforma empresarial para operaciones de retail: ventas, inventario, compras, clientes, créditos y control multi-sucursal.

![Portfolio project](https://img.shields.io/badge/portfolio-project-111827?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-14-111827?style=flat-square&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)

## Resumen

ERP + POS es un proyecto de portafolio orientado a negocios de retail en Guatemala. Su objetivo es centralizar las operaciones diarias de una empresa en una sola plataforma: vender en punto de venta, controlar existencias por sucursal, administrar clientes y proveedores, registrar compras, gestionar créditos y consultar indicadores operativos.

El sistema está construido como un **modular monolith**: mantiene una sola aplicación desplegable, pero separa las capacidades del negocio en módulos que pueden evolucionar de forma independiente. Esta decisión conserva la simplicidad operativa de un monolito y deja límites claros para una futura evolución.

## Demo para reclutadores

La demo visual es independiente del sistema principal y no necesita Node.js, Docker ni base de datos.

1. Abre [demo/index.html](demo/index.html) en el navegador.
2. Prueba buscar productos, agregarlos al carrito y confirmar una venta.
3. Revisa el código de la demo: está comentado y usa una separación simple entre estado, cálculos y renderizado.

La demo representa el flujo de POS con datos locales. El proyecto completo contiene además el backend NestJS, persistencia PostgreSQL, autenticación, RBAC y los módulos empresariales descritos abajo.

## Capacidades principales

| Área | Capacidades |
| --- | --- |
| Dashboard | KPIs, tendencias de ventas, comparación entre sucursales y actividad reciente |
| POS | Búsqueda por nombre, SKU o código de barras; carrito; métodos de pago; cálculo de cambio |
| Inventario | Stock por sucursal, kardex, movimientos, lotes, vencimientos, ajustes y transferencias |
| Ventas | Historial, detalle, anulaciones, resumen diario y filtros operativos |
| Compras | Órdenes de compra, recepción de mercancía, costos y proveedores |
| Clientes | Directorio, historial de ventas, límite y saldo de crédito |
| Créditos | Cuentas por cobrar, pagos parciales, vencimientos y aging report |
| Auditoría | Registro de acciones relevantes, actor, recurso, fecha y contexto de la operación |
| Acceso | JWT, refresh tokens rotativos, Argon2id, bloqueo por intentos fallidos y RBAC |
| Operación | Multi-sucursal, notificaciones, WebSockets y configuración preparada para despliegue con Nginx |

## Arquitectura

```text
┌──────────────────────┐
│ Next.js 14 / React   │  App Router, TypeScript, TailwindCSS
└──────────┬───────────┘
           │ REST / cookies / WebSocket
┌──────────▼───────────┐
│ NestJS modular API   │  Auth, RBAC, ventas, inventario, compras...
└──────────┬───────────┘
           │ Prisma ORM
┌──────────▼───────────┐       ┌──────────────────────┐
│ PostgreSQL 16        │       │ Redis 7              │
│ datos transaccionales│       │ cache y datos efímeros│
└──────────────────────┘       └──────────────────────┘
```

El código está organizado por capacidades de negocio en [backend/src](backend/src) y [frontend/src](frontend/src). El esquema y las migraciones se encuentran en [backend/prisma](backend/prisma).

## Stack técnico

### Frontend

- Next.js 14 con App Router.
- React y TypeScript estricto.
- TailwindCSS y componentes UI reutilizables.
- Framer Motion para interacciones puntuales.
- Axios para el cliente HTTP.
- `jose` para validación del access token en middleware.
- Recharts para visualizaciones.

### Backend

- NestJS 10.
- TypeScript.
- Prisma ORM.
- PostgreSQL 16.
- Redis 7 e Ioredis.
- Socket.IO para eventos en tiempo real.
- Argon2id para hash de contraseñas.
- Helmet, CORS, throttling y sanitización de entradas.
- Winston con rotación diaria de logs.

### Infraestructura

- Docker Compose para desarrollo.
- Dockerfiles separados para desarrollo y producción.
- Nginx como reverse proxy.
- Configuración preparada para HTTPS, Cloudflare y WebSockets.
- Scripts de firewall, SSL, backups y Fail2Ban.

## Módulos del backend

```text
backend/src/
├── auth/             # Login, registro, refresh tokens y sesiones
├── users/            # Usuarios y cambio de contraseñas
├── roles/            # Roles y permisos
├── branches/         # Sucursales
├── products/         # Catálogo, SKU y barcode
├── inventory/        # Stock, kardex, lotes y transferencias
├── sales/            # Ventas y anulaciones
├── purchases/        # Compras y recepción
├── customers/        # Clientes y crédito
├── suppliers/        # Proveedores
├── credits/          # Pagos y vencimientos
├── dashboard/        # Indicadores y agregaciones
├── notifications/    # Notificaciones del sistema
├── audit/            # Auditoría de operaciones
├── upload/           # Archivos validados
├── events/           # Gateway Socket.IO
└── common/           # Guards, filtros, middleware y tareas
```

## Seguridad implementada

- Access token JWT de corta duración y refresh token rotativo.
- Refresh tokens almacenados como hash SHA-256.
- Contraseñas protegidas con Argon2id.
- Bloqueo temporal después de intentos fallidos de autenticación.
- RBAC con los roles `super_admin`, `admin`, `manager`, `cashier`, `inventory` y `sales`.
- Guards globales para autenticación y guards específicos para roles/permisos.
- CORS con allowlist de orígenes.
- Helmet y cabeceras de seguridad.
- Throttling global y límites más estrictos para login, registro y uploads.
- Sanitización de entradas HTML.
- Validación de extensión, MIME y tamaño de archivos.
- Auditoría de login, cambios de usuarios, permisos, uploads, ventas y movimientos.

## Modelo de datos

El modelo Prisma cubre las entidades principales de un ERP/POS:

```text
User ── UserRole ── Role ── RolePermission ── Permission
  │
  ├── Sales ── SaleItem ── Product ── Stock ── Branch
  ├── Purchases ── PurchaseItem ── Supplier
  ├── Credits ── CreditPayment ── Customer
  └── AuditLog / RefreshToken / Notification
```

Las operaciones monetarias usan `Decimal` en Prisma y los movimientos de inventario registran saldo anterior, saldo posterior, referencia y usuario responsable.

## API destacada

La API utiliza el prefijo `/api/v1` y expone documentación Swagger durante desarrollo.

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

## Ejecutar el sistema completo

### Requisitos

- Node.js 20 LTS.
- Docker Desktop 24 o superior.
- Git.
- 4 GB de RAM disponibles; 8 GB recomendados.

### Configuración

El sistema utiliza archivos separados para cada proceso:

```text
.env             # PostgreSQL, Redis y dominio del Compose
backend/.env     # NestJS, Prisma, JWT, cookies y logs
frontend/.env    # URL pública de la API y JWT del middleware
```

Consulta los archivos `.env.example` antes de crear valores reales. Los secretos no deben subirse al repositorio.

### Arranque con Docker

```powershell
docker compose up -d --build
docker compose ps

docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

URLs locales:

```text
Frontend: http://localhost:3001
API:      http://localhost:3000/api/v1
Swagger:  http://localhost:3000/api/docs
```

El seed crea el usuario inicial `admin@erp.local`. La contraseña de desarrollo debe cambiarse inmediatamente en cualquier entorno compartido o productivo.

### Desarrollo sin Docker

Se requiere PostgreSQL y Redis disponibles localmente.

```powershell
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

En otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

## Estructura del repositorio

```text
erp-system/
├── backend/                 # API NestJS y Prisma
├── frontend/                # Aplicación Next.js
├── demo/                    # Demo estática para portafolio
├── nginx/                   # Reverse proxy y HTTPS
├── infrastructure/          # Backups, firewall, SSL y monitoreo
├── docker-compose.yml       # Desarrollo local
├── docker-compose.prod.yml  # Despliegue productivo
├── SECURITY.md              # Arquitectura de seguridad
└── docs/                    # Requisitos y guía de instalación
```

## Decisiones técnicas destacadas

### Modular monolith

Se eligió un monolito modular para mantener el despliegue simple y, al mismo tiempo, separar dominios de negocio. Es una base más razonable para este tamaño de sistema que introducir microservicios prematuramente.

### PostgreSQL para la verdad transaccional

Ventas, stock, créditos, compras y auditoría viven en PostgreSQL. Redis se reserva para datos temporales, rate limiting y capacidades que no deben sustituir la persistencia transaccional.

### Seguridad por capas

La autenticación no depende solamente del frontend. El backend valida identidad, rol, permisos, entrada y estado de la cuenta; Nginx y Docker agregan límites y aislamiento en despliegue.

## Estado del proyecto

El repositorio es una base funcional de portafolio en evolución. La demo estática permite revisar rápidamente la experiencia de POS; el sistema principal contiene la arquitectura de backend, persistencia, autenticación y módulos empresariales para continuar el endurecimiento antes de un despliegue productivo.

Las siguientes áreas son parte de la evolución técnica prevista:

- Integración progresiva de todas las pantallas con la API real.
- DTOs runtime completos y validación de configuración al arrancar.
- Pruebas unitarias, integración y E2E para ventas, inventario, créditos y permisos.
- Transacciones y locking reforzados en operaciones concurrentes.
- Health checks, métricas y pipeline CI/CD.
- Evolución gradual hacia Clean Architecture donde aporte valor real.

## Documentación relacionada

- [Guía de instalación](docs/setup.md)
- [Requisitos del sistema](docs/requirements.md)
- [Arquitectura de seguridad](SECURITY.md)
- [Demo de portafolio](demo/index.html)

---

Proyecto de portafolio enfocado en arquitectura empresarial, operaciones de retail y desarrollo full-stack con TypeScript.
