# ERP System — Security Architecture

## Security Layers

```
Internet
  → Cloudflare (Bot Fight Mode, WAF, DDoS protection)
  → Nginx (HTTPS, Rate Limiting, Security Headers)
  → Linux Firewall (UFW + iptables, ports 22/80/443 only)
  → Fail2Ban (brute force banning)
  → NestJS Guards (JWT Auth, RBAC, Permissions)
  → Prisma ORM (parameterized queries, no SQL injection)
  → PostgreSQL (private network, no public exposure)
  → Redis (private network, password protected)
```

---

## Implemented Security Controls

### Authentication
- JWT Access Token (15 min) + Refresh Token (7 days, rotated on each use)
- argon2id password hashing (memory: 64MB, time: 3 iterations)
- Account lockout after 5 failed attempts (30 min lockout)
- Refresh tokens stored as SHA-256 hashes (never plaintext)
- Token theft detection: reuse of revoked token revokes ALL sessions
- HttpOnly, Secure, SameSite=Strict cookies for refresh tokens
- Logout revokes refresh token; logout-all revokes all sessions

### RBAC (Role-Based Access Control)
- Roles: super_admin, admin, manager, cashier, inventory, sales
- Granular permissions per resource:action (e.g. users:create, sales:read)
- super_admin bypasses all guards
- Role + Permission guards applied per route
- All validation happens backend-side — frontend is untrusted

### Input Validation
- class-validator: all DTOs validated and whitelisted
- Extra fields are stripped (whitelist: true, forbidNonWhitelisted: true)
- XSS sanitization middleware strips HTML from all inputs
- Regex constraints on passwords (uppercase, lowercase, number, special char)

### SQL Injection
- Prisma ORM used exclusively — all queries parameterized
- Raw SQL is never constructed from user input

### Rate Limiting
- Global: 100 req/min per IP (@nestjs/throttler)
- Login: 5 req/min per IP
- Register: 3 req/min per IP
- Upload: 10 req/min per IP
- Nginx zones add a second layer of rate limiting

### File Upload Security
- MIME type validation (allowlist only)
- File extension validation (blocklist: .exe .sh .php .py etc.)
- MIME/extension mismatch detection
- UUID-based filenames (no path traversal possible)
- 10MB size limit
- Files stored in memory → disk (never temp with original names)

### Security Headers (Nginx + Helmet)
- Strict-Transport-Security (HSTS, 1 year, preload)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy: strict
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
- server_tokens: off (no Nginx version disclosure)

### CORS
- Strict allowlist of origins
- Credentials: true only for allowed origins
- No wildcard allowed

### Audit Logging
- Every state-changing action is logged
- Logs include: actor, target, action, IP, user agent, before/after data
- Separate security log stream in Winston
- Logs retained 90 days (security events), 30 days (combined)

### Network Security
- UFW: only ports 22, 80, 443 open
- PostgreSQL not exposed to internet (internal Docker network only)
- Redis not exposed to internet (internal Docker network only)
- All services communicate via private Docker bridge network
- Nginx is the only internet-facing service in production

### Infrastructure
- Docker containers run as non-root (USER node/nextjs)
- Fail2Ban: bans IPs after repeated auth failures
- SSL: Let's Encrypt with auto-renewal
- TLS 1.2+ only, modern cipher suites
- OCSP stapling enabled
- DH parameters: 4096-bit

### WebSocket Security
- JWT verification middleware on every Socket.IO connection
- Anonymous connections rejected
- Room access validated against user roles

### Production Hardening
- Error messages sanitized (no stack traces exposed)
- Swagger UI disabled in production
- NODE_ENV=production enforces secure cookie settings
- Automatic expired token cleanup (hourly cron)
- Automatic account unlock after lockout expiry (daily cron)

---

## First-Time Setup

1. Copy `.env.example` → `.env` and fill real values
2. Generate secrets: `openssl rand -base64 64`
3. Set strong PostgreSQL and Redis passwords (32+ chars)
4. Run: `docker compose up -d`
5. Run migrations: `docker exec backend npx prisma migrate deploy`
6. Seed initial data: `docker exec backend npm run prisma:seed`
7. Change default admin password at first login

---

## Cloudflare Setup (Production)

Enable in Cloudflare dashboard:
- Bot Fight Mode: ON
- Browser Integrity Check: ON
- DDoS protection: ON
- WAF: ON (OWASP ruleset)
- DNS Proxy (orange cloud): ON for all A/CNAME records

---

## Reporting Security Issues

Contact: stivenmoralesmerida.gt@gmail.com
Please do not open public issues for security vulnerabilities.
