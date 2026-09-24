# Requisitos del Sistema

## Para Desarrollo Local

### Software Requerido

| Software | Versión Mínima | Descargar |
|---|---|---|
| **Node.js** | 20 LTS | https://nodejs.org |
| **npm** | 10+ | Incluido con Node.js |
| **Docker Desktop** | 24+ | https://docker.com |
| **Git** | 2.40+ | https://git-scm.com |

### Hardware Mínimo (Desarrollo)

- CPU: 2 núcleos
- RAM: 4 GB (8 GB recomendado)
- Disco: 5 GB libres

### Hardware Mínimo (Producción)

- CPU: 2 núcleos dedicados
- RAM: 4 GB (8 GB recomendado para alto volumen)
- Disco: 20 GB SSD
- OS: Ubuntu 22.04 LTS

---

## Para Producción (Servidor Linux)

### Software del Servidor

| Software | Versión | Instalación |
|---|---|---|
| **Ubuntu** | 22.04 LTS | VPS/servidor |
| **Docker** | 24+ | `curl -fsSL https://get.docker.com \| sh` |
| **Docker Compose** | Plugin v2+ | Incluido con Docker |
| **Nginx** | 1.24+ | `apt install nginx` |
| **Certbot** | Latest | `apt install certbot python3-certbot-nginx` |
| **UFW** | Incluido | `apt install ufw` |
| **Fail2Ban** | Incluido | `apt install fail2ban` |

---

## Variables de Entorno Requeridas

### Backend (obligatorias)

```
DATABASE_URL          — URL de conexión a PostgreSQL
REDIS_HOST            — Host de Redis
REDIS_PASSWORD        — Contraseña de Redis
JWT_ACCESS_SECRET     — Mínimo 64 caracteres aleatorios
JWT_REFRESH_SECRET    — Mínimo 64 caracteres aleatorios (diferente al anterior)
COOKIE_SECRET         — Mínimo 32 caracteres aleatorios
ALLOWED_ORIGINS       — URL del frontend (https://tudominio.com)
```

### Frontend (obligatorias)

```
NEXT_PUBLIC_API_URL   — URL del backend
JWT_ACCESS_SECRET     — Mismo valor que el backend (para validación en Edge)
```

---

## Puertos Utilizados

| Servicio | Puerto | Expuesto |
|---|---|---|
| PostgreSQL | 5432 | Solo interno |
| Redis | 6379 | Solo interno |
| Backend (NestJS) | 3000 | Solo interno (a través de Nginx) |
| Frontend (Next.js) | 3001 | Solo interno (a través de Nginx) |
| Nginx HTTP | 80 | Público |
| Nginx HTTPS | 443 | Público |
| Uptime Kuma | 3010 | Solo 127.0.0.1 |
| Grafana | 3011 | Solo 127.0.0.1 |

---

## Navegadores Soportados

| Navegador | Versión Mínima |
|---|---|
| Chrome | 110+ |
| Firefox | 110+ |
| Safari | 16+ |
| Edge | 110+ |

> El sistema NO soporta Internet Explorer.

---

## Para el POS (Punto de Venta)

Para uso óptimo del POS se recomienda:
- Pantalla táctil de al menos 10"
- Lector de código de barras USB (emula teclado)
- Impresora de tickets térmica (80mm, compatible ESC/POS)
- Conexión estable a internet (o VPN a servidor local)
