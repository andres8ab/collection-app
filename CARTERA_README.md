# Gestión de Cartera — Setup

App de gestión de cartera (facturación y cobros) construida con **TanStack Start**, **Prisma** y **Neon (PostgreSQL)**.

## Requisitos

- Node 20+
- Cuenta en [Neon](https://neon.tech) (PostgreSQL serverless)

## 1. Base de datos Neon

1. Crea un proyecto en [Neon Console](https://console.neon.tech).
2. En **Connection details** copia:
   - **Pooled connection** → para la app (`DATABASE_URL`)
   - **Direct connection** → para migraciones (`DIRECT_URL`)

## 2. Variables de entorno

En la raíz del proyecto (`app/`) crea `.env`:

```env
# Pooled (para la app en runtime)
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DB?sslmode=require"

# Direct (para Prisma migrate)
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/DB?sslmode=require"
```

No subas `.env` a git (ya está en `.gitignore`).

## 3. Migraciones

Con `DIRECT_URL` y `DATABASE_URL` configurados:

```bash
cd app
npx prisma migrate deploy
```

(O en desarrollo: `npx prisma migrate dev` para aplicar y crear nuevas migraciones.)

## 4. Instalar y arrancar

```bash
cd app
npm install
npm run dev
```

Abre http://localhost:3000.

## Estructura de la app

- **Cartera** (`/`): tabla de facturas, botón “Nueva factura”, filtros. Al agregar factura se elige Cliente, FV, Ciudad, Vendedor y Valor (dropdowns con búsqueda y opción “agregar nuevo”).
- **Liquidaciones** (`/liquidaciones`): por vendedor se listan los meses con facturas liquidadas; se ve detalle y total comisión; se puede **Quitar** una factura del mes si se agregó por error.
- **Reportes** (`/reportes`): estado de cuenta por cliente y rango de fechas.

## Prisma

- Modelos: `Ciudad`, `Cliente`, `Vendedor`, `Bill`, `MonthlySettlement`, `User`.
- La app usa **Neon** con el adapter `@prisma/adapter-neon` en `src/server/db.ts`.
- Migraciones en `prisma/migrations/`. Sin datos de prueba; todo se carga desde la UI.

## Producción

- Configura `DATABASE_URL` y `DIRECT_URL` en el entorno de despliegue.
- Ejecuta `npx prisma migrate deploy` en el build o en el primer arranque.
- Build: `npm run build`.
