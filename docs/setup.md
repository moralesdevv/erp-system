# Guía de Instalación Completa

## 1. Instalar Node.js 20 LTS

### Windows
```powershell
# Con winget
winget install OpenJS.NodeJS.LTS

# O descargar desde https://nodejs.org
```

### Ubuntu/Debian
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # debe mostrar v20.x.x
```

---

## 2. Instalar Docker Desktop

### Windows / Mac
Descargar desde https://www.docker.com/products/docker-desktop

### Linux (Ubuntu)
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo systemctl enable docker
# Cerrar sesión y volver a abrir para que tome efecto el grupo
docker --version   # debe mostrar 24+
```

---

## 3. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/erp-system.git
cd erp-system
```

---

## 4. Configurar Variables de Entorno

### 4.1 Variables raíz

```bash
cp .env.example .env
```

Editar `.env`:
```env
POSTGRES_DB=erp_dev
POSTGRES_USER=erp_user
POSTGRES_PASSWORD=MiPassword123!Segura
REDIS_PASSWORD=MiRedisPassword456!
DOMAIN=localhost
```

### 4.2 Variables del Backend

```bash
cp backend/.env.example backend/.env
```

Editar `backend/.env` con los valores del paso anterior más:

```env
# Generar estos con: openssl rand -base64 64
JWT_ACCESS_SECRET=RESULTADO_OPENSSL_1
JWT_REFRESH_SECRET=RESULTADO_OPENSSL_2

# Generar con: openssl rand -base64 32
COOKIE_SECRET=RESULTADO_OPENSSL_3
```

### 4.3 Variables del Frontend

```bash
cp frontend/.env.example frontend/.env
```

Editar `frontend/.env`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
JWT_ACCESS_SECRET=MISMO_JWT_ACCESS_SECRET_DEL_BACKEND
```

---

## 5. Levantar Servicios con Docker

```bash
# Construir y levantar todos los servicios
docker compose up -d

# Ver logs en tiempo real
docker compose logs -f

# Verificar que todos están corriendo
docker compose ps
```

Esperar ~30 segundos para que PostgreSQL y Redis inicien.

---

## 6. Ejecutar Migraciones de Base de Datos

```bash
# Aplicar migraciones (crear todas las tablas)
docker exec -it erp-system-backend-1 npx prisma migrate dev --name init

# Verificar que las tablas se crearon
docker exec -it erp-system-backend-1 npx prisma studio
# Abrir http://localhost:5555
```

---

## 7. Cargar Datos Iniciales (Seed)

```bash
docker exec -it erp-system-backend-1 npm run prisma:seed
```

El seed crea:
- Todos los roles (super_admin, admin, manager, cashier, inventory, sales)
- Todos los permisos del sistema
- Usuario administrador: `admin@erp.local` / `Admin@123!ChangeMe`

**⚠️ IMPORTANTE: Cambiar la contraseña del admin en el primer inicio.**

---

## 8. Acceder al Sistema

| URL | Descripción |
|---|---|
| http://localhost:3001 | Frontend (ERP + POS) |
| http://localhost:3000/api/v1 | API REST |
| http://localhost:3000/api/docs | Swagger UI |

Login con: `admin@erp.local` / `Admin@123!ChangeMe`

---

## 9. Comandos Útiles del Día a Día

```bash
# Detener todos los servicios
docker compose down

# Reiniciar un servicio específico
docker compose restart backend

# Ver logs del backend
docker compose logs -f backend

# Ejecutar una migración nueva
docker exec -it erp-system-backend-1 npx prisma migrate dev --name nombre_migracion

# Abrir Prisma Studio (gestor visual de DB)
docker exec -it erp-system-backend-1 npx prisma studio

# Entrar a la shell del backend
docker exec -it erp-system-backend-1 sh

# Ver el estado de la base de datos
docker exec -it erp-system-postgres-1 psql -U erp_user -d erp_dev -c "\dt"
```

---

## 10. Desarrollo sin Docker (opcional)

Si prefieres correr sin Docker (requiere PostgreSQL y Redis instalados localmente):

### Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
# Corre en http://localhost:3000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Corre en http://localhost:3001
```

---

## 11. Instalación en Producción (Servidor Linux)

```bash
# 1. Conectarse al servidor
ssh user@tu-servidor.com

# 2. Clonar el repositorio
git clone https://github.com/tu-usuario/erp-system.git /opt/erp
cd /opt/erp

# 3. Configurar variables
cp .env.example .env
cp backend/.env.example backend/.env.production
cp frontend/.env.example frontend/.env.production
# Editar TODOS los archivos .env con valores de producción

# 4. Configurar dominio
export DOMAIN=tudominio.com
export CERTBOT_EMAIL=admin@tudominio.com
sed -i "s/yourdomain.com/$DOMAIN/g" nginx/conf.d/erp.conf

# 5. Ejecutar instalador automático
chmod +x infrastructure/scripts/install.sh
bash infrastructure/scripts/install.sh

# El script instala:
# - Docker, Nginx, Certbot, UFW, Fail2Ban
# - Configura firewall (solo puertos 22, 80, 443)
# - Obtiene certificado SSL
# - Levanta todos los servicios
# - Configura backups automáticos
```

---

## Solución de Problemas Comunes

### Error: "Cannot connect to PostgreSQL"
```bash
# Verificar que PostgreSQL está corriendo
docker compose ps
# Si no está, revisar logs
docker compose logs postgres
```

### Error: "JWT_ACCESS_SECRET is required"
Verificar que `backend/.env` tiene todas las variables configuradas.

### Error: "ECONNREFUSED Redis"
Redis no está corriendo. Verificar `docker compose ps` y `docker compose logs redis`.

### Error en migraciones: "column already exists"
```bash
# Resetear la base de datos (⚠️ borra todos los datos)
docker exec -it erp-system-backend-1 npx prisma migrate reset
```

### Puerto 3001 ya en uso
```bash
# Ver qué proceso usa el puerto
lsof -i :3001   # Linux/Mac
netstat -ano | findstr :3001   # Windows
```
