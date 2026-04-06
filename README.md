# Gestor de Fincas y Cuaderno de Campo

Web para que pequeños agricultores lleven el registro de fincas, parcelas, labores agrícolas e incidencias.

## Funcionalidades

- **Autenticación**: registro de usuarios, inicio de sesión y cierre de sesión (datos en el navegador).
- **Gestión de fincas**: CRUD de fincas (nombre, ubicación, hectáreas, notas).
- **Gestión de parcelas**: CRUD de parcelas asociadas a cada finca.
- **Cultivos**: por parcela, con nombre, variedad, fecha de plantación y estado.
- **Cuaderno de campo (labores)**: registro unificado de labores agrícolas:
  - Tipos: **riego**, **abonado**, **tratamiento**, **poda**, **cosecha**, **otro**.
  - Campos: fecha, parcela, descripción; opcionales: producto, cantidad, unidad, notas.
- **Incidencias**: plagas, heladas, enfermedades, etc., con **estado abierta/resuelta**, severidad y notas.
- **Listados con filtros**: por finca, parcela, tipo de labor, rango de fechas (en labores); por parcela y solo abiertas (en incidencias).
- **Dashboard**: resumen con número de fincas, parcelas, labores de los últimos 7 días e incidencias abiertas; acceso rápido y listas recientes.

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La primera vez tendrás que **registrarte** (nombre, email, contraseña) o **iniciar sesión** si ya tienes cuenta.

Si al ejecutar `npm run dev` ves un error del tipo *"no es una aplicación Win32 válida"* o *"Failed to load SWC binary"* (común si el proyecto está en OneDrive), el proyecto está configurado para usar Babel (`.babelrc`). Si sigue fallando, mueve el proyecto fuera de OneDrive y ejecuta de nuevo `npm install` y `npm run dev`.

**Producción:** Docker (`Dockerfile`, `docker-compose.yml`), variables en [.env.production.example](.env.production.example) y guía paso a paso en [DEPLOY.md](DEPLOY.md).

## Tecnologías

- **Next.js 14** (App Router) con **TypeScript**
- **Tailwind CSS** para estilos
- **Prisma** + **SQLite** para modelos y migraciones (ver [prisma/README.md](prisma/README.md))
- **NextAuth.js** para autenticación: registro (name, email, password), login y logout con sesión JWT; contraseñas hasheadas con bcrypt
- **Protección de rutas**: middleware redirige a `/login` si no hay sesión en `/`, `/fincas`, `/parcelas`, `/labores`, `/incidencias`, `/ajustes`, `/cultivos`
- La app usa **localStorage** para fincas/labores/incidencias en el front; las APIs de ejemplo (`/api/me`, `/api/fincas`) usan Prisma y comprueban sesión

## Uso

1. **Registro / Login**: crea una cuenta o inicia sesión. Sin sesión no se puede acceder al resto de la app.
2. **Fincas**: desde Inicio o menú “Fincas”, crea y edita fincas; en cada finca puedes añadir parcelas.
3. **Parcelas**: desde una finca, añade parcelas; en cada parcela puedes añadir cultivos.
4. **Cuaderno (Labores)**: registra riegos, abonados, tratamientos, podas, cosechas u otras labores; usa los filtros por finca, parcela, tipo y fechas.
5. **Incidencias**: registra problemas (plagas, heladas, etc.) y márcalos como abiertos o resueltos.
6. **Ajustes**: exporta/importa datos en JSON e instrucciones para instalar en el móvil (PWA).

Los datos se guardan solo en tu navegador. Exporta copias con regularidad desde Ajustes.
