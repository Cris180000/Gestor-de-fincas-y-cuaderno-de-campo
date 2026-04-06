# Despliegue en producción

## Requisitos comunes

| Variable | Uso |
|----------|-----|
| `NEXTAUTH_URL` | URL pública con `https://` (sin barra final). |
| `NEXTAUTH_SECRET` | Mínimo 32 caracteres aleatorios (`openssl rand -base64 32`). |
| `DATABASE_URL` | SQLite en un **archivo persistente** o (recomendado en cloud) PostgreSQL. |
| `SMTP_*` | Sin esto, el flujo «olvidé contraseña» no enviará correo real (en desarrollo se usa Ethereal). |

Plantilla: [.env.production.example](.env.production.example).

## Opción A: Docker + Docker Compose (recomendada con el stack actual)

El proyecto usa **SQLite** en el `schema.prisma` por defecto. En un contenedor la base debe vivir en un **volumen** persistente.

1. Copia la plantilla y edítala:
   ```bash
   cp .env.production.example .env
   ```
2. Ajusta `NEXTAUTH_URL`, `NEXTAUTH_SECRET` y `SMTP_*`. No hace falta cambiar `DATABASE_URL` si usas el `docker-compose.yml` incluido: fija `file:/data/prod.db` y monta el volumen `app_db`.
3. Construye y arranca:
   ```bash
   docker compose up -d --build
   ```
4. La app queda en el puerto **3000**. El entrypoint ejecuta `prisma migrate deploy` antes de `next start`.

Para actualizar tras un `git pull`:

```bash
docker compose up -d --build
```

## Opción B: Vercel / entornos serverless

El sistema de ficheros en Vercel **no persiste** SQLite entre invocaciones. Para desplegar ahí necesitas:

1. Base **PostgreSQL** (Vercel Postgres, Neon, Supabase, etc.).
2. Cambiar en `prisma/schema.prisma` el `provider` a `postgresql` y volver a crear o adaptar migraciones.
3. En el panel de Vercel, definir las variables de entorno (misma lista que `.env.production.example`).
4. El archivo [vercel.json](vercel.json) ya define `buildCommand` con `prisma generate` y build con webpack.

## Opción C: VPS sin Docker

1. Node.js **20+** (`engines` en `package.json`).
2. Clona el repo, configura `.env` como en la plantilla.
3. Usa una ruta **absoluta** y persistente para SQLite, por ejemplo:
   `DATABASE_URL=file:/var/lib/gestor-fincas/prod.db`
4. Despliegue típico:
   ```bash
   npm ci
   npm run build
   npx prisma migrate deploy
   npm run start
   ```
5. Delante de Node suele ir **nginx** o Caddy con TLS termination; expón la app solo en localhost o red interna.

## Build local de comprobación

```bash
npm ci
npm run build
```

Si falla, revisa que exista `prisma/schema.prisma` y que las migraciones estén en `prisma/migrations/`.
