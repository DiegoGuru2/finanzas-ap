/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Shared Financial Constants
 * ═══════════════════════════════════════════
 *
 * Única fuente de verdad para valores legales de Ecuador y utilidades
 * numéricas compartidas por todo el motor y la UI.
 */

/**
 * Salario Básico Unificado vigente (Ecuador).
 * ⚠️ Cambia cada año por decreto — el usuario puede sobreescribirlo en
 * Configuración; este valor solo es el default para cuentas nuevas.
 */
export const DEFAULT_SBU = 460;

/** Aporte personal IESS, relación de dependencia sector privado. */
export const DEFAULT_IESS_PERCENTAGE = 9.45;

/** Mes (0-11) en que se paga cada beneficio anual no mensualizado. */
export const BENEFIT_PAYOUT_MONTHS = {
  decimoTercero: 11, // Diciembre (hasta el 24 de dic)
  decimoCuartoCosta: 2, // Marzo (régimen Costa/Galápagos, hasta el 15 de mar)
  decimoCuartoSierra: 7, // Agosto (régimen Sierra/Amazonía, hasta el 15 de ago)
  utilidades: 3, // Abril (hasta el 15 de abr)
} as const;

/** Redondeo monetario estándar a 2 decimales. */
export function round(value: number): number {
  return Math.round(value * 100) / 100;
}
