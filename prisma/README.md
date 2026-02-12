# Prisma – Modelos y migraciones

## Modelos

| Modelo      | Campos principales |
|------------|--------------------|
| **User**   | id, email, nombre, password, createdAt |
| **Finca**  | id, user_id, nombre, ubicacion, superficie, notas, createdAt |
| **Parcela**| id, finca_id, nombre, cultivo, superficie, notas, createdAt |
| **Labor**  | id, parcela_id, tipo, fecha, descripcion, producto?, cantidad?, createdAt |
| **Incidencia** | id, parcela_id, fecha, descripcion, estado (abierta/resuelta), createdAt |

- **Labor.tipo**: `riego` \| `abonado` \| `tratamiento` \| `poda` \| `cosecha` \| `otros`
- **Incidencia.estado**: `abierta` \| `resuelta`
- Claves foráneas con `onDelete: Cascade` (al borrar usuario se borran sus fincas, etc.)

## Comandos

```bash
# Generar cliente Prisma (tras cambiar schema.prisma)
npm run db:generate

# Crear y aplicar una nueva migración (desarrollo)
npm run db:migrate

# Aplicar migraciones pendientes (producción)
npm run db:migrate:deploy

# Sincronizar schema con la BD sin migraciones (prototipo)
npm run db:push

# Abrir Prisma Studio (visualizar/editar datos)
npm run db:studio
```

## Configuración

En la raíz del proyecto, archivo `.env`:

```
DATABASE_URL="file:./dev.db"
```

La base SQLite `dev.db` se crea en el directorio del proyecto al aplicar la primera migración. Para PostgreSQL u otro motor, cambia `DATABASE_URL` y el `provider` en `schema.prisma`.
