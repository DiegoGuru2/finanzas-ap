# FinanzasAP — Stack Tecnológico

## Resumen

Plataforma financiera personal construida con Astro SSR + React Islands.

---

## Frontend

| Herramienta | Versión | Función |
|:---|:---|:---|
| **Astro** | 7.x | Framework SSR con Islands Architecture |
| **React** | 19.x | Componentes interactivos (islas) |
| **TypeScript** | 7.x | Tipado estricto end-to-end |
| **Tailwind CSS** | 4.x | Sistema de diseño basado en tokens |
| **shadcn/ui** | latest | Componentes UI accesibles (Radix UI base) |
| **Lucide React** | latest | Iconografía SVG |
| **Motion** | latest | Microinteracciones y animaciones |

## Formularios y Validación

| Herramienta | Función |
|:---|:---|
| **React Hook Form** | Formularios de alta performance |
| **Zod** | Validación isomórfica (cliente + servidor) |
| **@hookform/resolvers** | Integración RHF ↔ Zod |
| **Astro Actions** | Endpoints tipados con validación Zod integrada |

## Estado y Datos

| Herramienta | Función |
|:---|:---|
| **Nanostores** | Estado global entre islas (recomendación oficial Astro) |
| **@nanostores/react** | Bindings React para Nanostores |
| **TanStack Query** | Caché y sincronización de datos del servidor |

## Visualización

| Herramienta | Función |
|:---|:---|
| **Recharts** | Gráficas interactivas (proyección de deudas, distribución) |

## Backend y Base de Datos

| Herramienta | Función |
|:---|:---|
| **Drizzle ORM** | ORM tipado para MySQL/TiDB |
| **Drizzle Kit** | Generador de migraciones SQL |
| **@tidbcloud/serverless** | Driver HTTP para TiDB Cloud Serverless |
| **TiDB Cloud** | Base de datos SQL distribuida, MySQL-compatible |

## Autenticación y Seguridad

| Herramienta | Función |
|:---|:---|
| **Better Auth** | Autenticación framework-agnostic |
| **Argon2id** | Hash de contraseñas (automático en Better Auth) |
| **Astro Middleware** | Protección de rutas en servidor |
| **Arcjet** | Rate limiting, protección contra bots |
| **Zod** | Validación de inputs en servidor |

## Testing

| Herramienta | Función |
|:---|:---|
| **Vitest** | Tests unitarios del motor financiero |
| **Playwright** | Tests E2E de flujos críticos |

## Calidad de Código

| Herramienta | Función |
|:---|:---|
| **ESLint** | Linting de código |
| **Prettier** | Formateo consistente |
| **Husky** | Git hooks pre-commit (futuro) |
| **lint-staged** | Lint solo archivos modificados (futuro) |

## Observabilidad

| Herramienta | Función |
|:---|:---|
| **Pino** | Logging estructurado JSON |
| **Sentry** | Monitoreo de errores en producción |

## Deploy

| Herramienta | Función |
|:---|:---|
| **Vercel** | Hosting con SSR nativo para Astro |
| **@astrojs/vercel** | Adaptador oficial de Vercel |
| **GitHub Actions** | CI/CD automatizado |

---

## Notas Importantes

### ¿Por qué Nanostores en vez de Zustand?
Astro no comparte React Context entre islas independientes. Nanostores es la solución oficial recomendada por Astro (~265 bytes, framework-agnostic).

### ¿Por qué Better Auth en vez de Auth.js?
Better Auth es la solución moderna recomendada para Astro. Maneja Argon2id automáticamente, tiene adaptador nativo para Drizzle ORM, y es framework-agnostic.

### ¿Por qué Astro Actions en vez de API Routes?
Astro Actions proveen validación Zod integrada, tipado end-to-end, y manejo de errores estandarizado sin necesidad de escribir endpoints `fetch()` manuales.

### Recharts + React 19
Se requiere forzar `react-is` a la versión 19 en `package.json` overrides para evitar problemas de renderizado. Ya configurado.
