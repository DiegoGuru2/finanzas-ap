# FinanzasAP — Documentación de Arquitectura

## Visión General

FinanzasAP es una plataforma de gestión financiera personal con un motor de optimización de deudas. Está construida con Astro en modo SSR (Server-Side Rendering) usando la arquitectura de Islas (Islands Architecture) con React para componentes interactivos.

## Principios Arquitectónicos

### 1. Monolito Modular
El proyecto sigue una arquitectura de **monolito modular** donde cada dominio (autenticación, motor financiero, UI) está encapsulado en su propio módulo con interfaces claras.

### 2. Motor Financiero Independiente
El motor financiero (`src/modules/financial-engine/`) es **completamente independiente** de la UI y la base de datos. Recibe datos puros y devuelve resultados deterministas. Esto permite:
- Testear toda la lógica matemática con Vitest sin dependencias externas.
- Reutilizar el motor en otros contextos (CLI, API, app móvil).
- Garantizar resultados predecibles y reproducibles.

### 3. Seguridad por Diseño
- **Aislamiento de datos**: Todas las consultas incluyen `WHERE user_id = ?`.
- **Validación isomórfica**: Los mismos esquemas Zod validan en cliente y servidor.
- **Autenticación en middleware**: Verificación de sesión antes de renderizar contenido.
- **Headers de seguridad**: CSP, HSTS, X-Frame-Options en cada respuesta.

### 4. Islands Architecture
- **Páginas estáticas** (landing, login): 0 KB de JavaScript innecesario.
- **Islas interactivas** (gráficas, formularios): Solo se hidratan los componentes React necesarios.
- **Estado entre islas**: Nanostores permite compartir estado sin React Context.

## Pipeline del Motor Financiero

```
INGRESOS (normalizados a mensual)
        │
        ▼
  ┌───────────┐
  │ CASHFLOW  │ → surplus, status, savingsRate
  └─────┬─────┘
        │
        ▼
  ┌───────────┐
  │ OPTIMIZER │ → allocations, warnings, emergencyReserve
  └─────┬─────┘
        │
        ▼
  ┌────────────┐
  │ PROJECTION │ → snapshots[], debtFreeDate, totalInterest
  └────────────┘
```

## Capas de la Aplicación

```
┌─────────────────────────────────────────┐
│           PAGES (Astro SSR)             │
│  Landing • Login • Dashboard • CRUD     │
├─────────────────────────────────────────┤
│        COMPONENTS (React Islands)       │
│  Forms • Charts • Cards • Modals        │
├─────────────────────────────────────────┤
│         ACTIONS (Astro Actions)         │
│  Validación Zod • Mutaciones DB         │
├─────────────────────────────────────────┤
│             MIDDLEWARE                  │
│  Auth • Security Headers • Logging      │
├─────────────────────────────────────────┤
│           LIB (Servicios)               │
│  DB (Drizzle) • Auth • Email • Security │
├─────────────────────────────────────────┤
│      MODULES (Motor Financiero)         │
│  Cashflow • Avalanche • Snowball        │
│  Projection • Optimizer • Validators    │
└─────────────────────────────────────────┘
```

## Convenciones de Código

### Archivos
- **Componentes Astro**: `PascalCase.astro`
- **Componentes React**: `PascalCase.tsx`
- **Módulos/utilidades**: `kebab-case.ts` o `camelCase.ts`
- **Tests**: `nombre-modulo.test.ts`
- **Páginas**: `kebab-case.astro`

### Imports
- Usar aliases `@/` para todos los imports internos.
- Nunca usar rutas relativas con más de un nivel (`../../`).

### Componentes React en Astro
- Siempre usar directiva `client:load` para componentes que necesitan interactividad inmediata.
- Usar `client:visible` para componentes below-the-fold (gráficas).
- Envolver componentes complejos con Context en un archivo `.tsx` wrapper.

### Base de datos
- Todas las queries DEBEN incluir `user_id` del usuario autenticado.
- Usar Drizzle ORM para type-safety end-to-end.
- Las migraciones se generan con `drizzle-kit generate` y se aplican con `drizzle-kit push`.

### Validación
- Definir esquemas Zod en `src/modules/financial-engine/validators.ts`.
- Reutilizar los mismos esquemas en Astro Actions y React Hook Form.
- Mensajes de error en español.
