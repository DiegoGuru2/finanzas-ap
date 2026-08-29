# FinanzasAP — Motor Financiero

## Descripción

El motor financiero es el núcleo algorítmico de FinanzasAP. Es un módulo **100% determinista** y **completamente independiente** de la interfaz de usuario y la base de datos.

Ubicación: `src/modules/financial-engine/`

## Módulos

### `cashflow.ts` — Calculadora de Flujo de Caja
Normaliza ingresos y gastos a frecuencia mensual y calcula el excedente disponible.

```typescript
import { calculateCashflow } from '@/modules/financial-engine';

const result = calculateCashflow({
  incomes: [{ id: '1', name: 'Salario', amount: 1800, frequency: 'monthly' }],
  expenses: [
    { id: '1', name: 'Renta', amount: 600, frequency: 'monthly', category: 'housing', isEssential: true },
  ],
  minimumPayments: 300,
});
// → { surplus: 900, status: 'healthy', savingsRate: 50 }
```

### `avalanche.ts` — Estrategia Avalancha
Prioriza deudas con mayor tasa de interés (APR). **Minimiza el costo total de intereses.**

### `snowball.ts` — Estrategia Bola de Nieve
Prioriza deudas con menor saldo. **Proporciona victorias psicológicas rápidas.**

### `optimizer.ts` — Motor de Optimización
Combina la estrategia seleccionada con reserva de emergencia y genera la recomendación final.

```typescript
import { optimizeDebt } from '@/modules/financial-engine';

const result = optimizeDebt({
  surplus: 600,
  debts: [...],
  strategy: 'avalanche',
  emergencyReservePercent: 20,
});
// → {
//     allocations: [...],
//     emergencyReserve: 120,
//     projectedDebtFreeDate: '2028-04-15',
//     warnings: [...]
//   }
```

### `projection.ts` — Proyecciones de Amortización
Genera snapshots mensuales mostrando la evolución de cada deuda.

### `validators.ts` — Esquemas de Validación Zod
Esquemas compartidos entre formularios del cliente y acciones del servidor.

## Tests

Ejecutar: `npm test`

Los tests cubren:
- Normalización de frecuencias (semanal, quincenal, mensual, anual)
- Estrategia avalancha (mayor APR primero, cascada, empates)
- Estrategia bola de nieve (menor saldo primero, empates)
- Optimizador (reserva de emergencia, warnings, comparación)
- Edge cases (ingreso $0, deuda $0, APR iguales, pago mínimo > saldo, APR 0%, APR 99.9%)

**43 tests cubriendo todos los escenarios.**
