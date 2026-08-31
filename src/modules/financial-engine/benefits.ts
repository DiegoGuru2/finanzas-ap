/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Beneficios de Ley (Ecuador)
 * ═══════════════════════════════════════════
 *
 * Décimo tercero, décimo cuarto, fondos de reserva y utilidades.
 * Todos los prorrateos usan 1/12 exacto (el "8.33%" legal es la
 * aproximación de 1/12), para que el mismo beneficio nunca muestre
 * dos montos distintos según la pantalla.
 */

import { BENEFIT_PAYOUT_MONTHS, DEFAULT_SBU, round } from './constants';
import type { Income } from './types';

export interface BenefitAnnualPayout {
  /** Mes 0-11 en que cae el pago */
  month: number;
  label: string;
  amount: number;
  /** Corte donde se cobra: décimos/utilidades tienen fecha legal límite */
  timing: 'quincena' | 'fin_de_mes';
}

export interface BenefitsBreakdown {
  /** Fondos de reserva por mes (0 si no aplica o está acumulado en el IESS) */
  fondosReservaMonthly: number;
  decimoTerceroMonthly: number;
  decimoTerceroAnnual: number;
  decimoCuartoMonthly: number;
  decimoCuartoAnnual: number;
  utilidadesMonthly: number;
  utilidadesAnnual: number;
  /** Lo que llega efectivamente cada mes en el rol (solo mensualizados) */
  monthlyRecurring: number;
  /** Promedio mensual de todo el paquete (para comparativas) */
  monthlyEquivalent: number;
  /** Pagos anuales que caen en un mes específico (no mensualizados) */
  annualPayouts: BenefitAnnualPayout[];
}

/**
 * Un ingreso "tiene beneficios configurados" cuando al menos uno de los
 * campos de beneficios viene definido (los registros de la base siempre
 * los traen). Ingresos construidos sin estos campos (tests, datos ajenos)
 * no reciben beneficios implícitos.
 */
export function hasBenefitsConfigured(income: Income): boolean {
  return (
    income.hasFondosReserva !== undefined ||
    income.decimoTerceroMensualizado !== undefined ||
    income.decimoCuartoMensualizado !== undefined ||
    income.sbuAmount !== undefined
  );
}

/**
 * Calcula el paquete de beneficios de ley para un sueldo.
 * Devuelve ceros si el ingreso no es sueldo o no tiene beneficios configurados.
 */
export function calculateBenefits(income: Income): BenefitsBreakdown {
  const empty: BenefitsBreakdown = {
    fondosReservaMonthly: 0,
    decimoTerceroMonthly: 0,
    decimoTerceroAnnual: 0,
    decimoCuartoMonthly: 0,
    decimoCuartoAnnual: 0,
    utilidadesMonthly: 0,
    utilidadesAnnual: 0,
    monthlyRecurring: 0,
    monthlyEquivalent: 0,
    annualPayouts: [],
  };

  if (!income.isSalary || !hasBenefitsConfigured(income)) return empty;

  const gross = income.amount;
  const sbu = income.sbuAmount && income.sbuAmount > 0 ? income.sbuAmount : DEFAULT_SBU;
  const region = income.region === 'sierra' ? 'sierra' : 'costa';

  const decimoTerceroMensualizado = income.decimoTerceroMensualizado ?? true;
  const decimoCuartoMensualizado = income.decimoCuartoMensualizado ?? true;
  const fondosMensualizado = income.fondosReservaMensualizado ?? true;
  const hasFondos = !!income.hasFondosReserva;
  const utilidadesAnnual =
    income.hasUtilidades && (income.utilidadesAmount ?? 0) > 0
      ? round(income.utilidadesAmount as number)
      : 0;

  // Prorrateo legal: 1/12 del sueldo (13ro y fondos) y 1/12 del SBU (14to)
  const fondosReservaMonthly = hasFondos ? round(gross / 12) : 0;
  const decimoTerceroMonthly = round(gross / 12);
  const decimoTerceroAnnual = round(gross);
  const decimoCuartoMonthly = round(sbu / 12);
  const decimoCuartoAnnual = round(sbu);
  const utilidadesMonthly = round(utilidadesAnnual / 12);

  // ─── Lo que llega cada mes en el rol ───
  let monthlyRecurring = 0;
  if (hasFondos && fondosMensualizado) monthlyRecurring += fondosReservaMonthly;
  if (decimoTerceroMensualizado) monthlyRecurring += decimoTerceroMonthly;
  if (decimoCuartoMensualizado) monthlyRecurring += decimoCuartoMonthly;

  // ─── Pagos anuales en su mes legal ───
  const annualPayouts: BenefitAnnualPayout[] = [];
  if (!decimoTerceroMensualizado) {
    annualPayouts.push({
      month: BENEFIT_PAYOUT_MONTHS.decimoTercero,
      label: 'Décimo tercer sueldo',
      amount: decimoTerceroAnnual,
      timing: 'fin_de_mes', // se paga hasta el 24 de diciembre
    });
  }
  if (!decimoCuartoMensualizado) {
    annualPayouts.push({
      month:
        region === 'sierra'
          ? BENEFIT_PAYOUT_MONTHS.decimoCuartoSierra
          : BENEFIT_PAYOUT_MONTHS.decimoCuartoCosta,
      label: 'Décimo cuarto sueldo',
      amount: decimoCuartoAnnual,
      timing: 'quincena', // se paga hasta el 15 de marzo/agosto
    });
  }
  if (utilidadesAnnual > 0) {
    annualPayouts.push({
      month: BENEFIT_PAYOUT_MONTHS.utilidades,
      label: 'Utilidades',
      amount: utilidadesAnnual,
      timing: 'quincena', // se pagan hasta el 15 de abril
    });
  }

  const monthlyEquivalent = round(
    (hasFondos && fondosMensualizado ? fondosReservaMonthly : 0) +
      decimoTerceroMonthly +
      decimoCuartoMonthly +
      utilidadesMonthly
  );

  return {
    fondosReservaMonthly,
    decimoTerceroMonthly,
    decimoTerceroAnnual,
    decimoCuartoMonthly,
    decimoCuartoAnnual,
    utilidadesMonthly,
    utilidadesAnnual,
    monthlyRecurring: round(monthlyRecurring),
    monthlyEquivalent,
    annualPayouts,
  };
}

/**
 * Evalúa si el trabajador cumple con el requisito legal de 1 año (12 meses)
 * de antigüedad continua para percibir Fondos de Reserva en Ecuador.
 */
export function checkFondosReservaEligibility(workStartDate?: string | null): {
  isEligible: boolean;
  monthsWorked: number;
  eligibilityDate: Date | null;
  message: string;
} {
  if (!workStartDate) {
    return {
      isEligible: false,
      monthsWorked: 0,
      eligibilityDate: null,
      message: 'Ingresa tu fecha de inicio de labores para calcular la fecha de Fondos de Reserva.',
    };
  }

  const start = new Date(`${workStartDate}T00:00:00`);
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  const monthsWorked = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.4375)));

  const eligibilityDate = new Date(start);
  eligibilityDate.setFullYear(eligibilityDate.getFullYear() + 1);

  const isEligible = now >= eligibilityDate;

  return {
    isEligible,
    monthsWorked,
    eligibilityDate,
    message: isEligible
      ? `✓ Cumples con la antigüedad (+${monthsWorked} meses). Tienes derecho a Fondos de Reserva (8.33%).`
      : `Calificarás el ${eligibilityDate.toLocaleDateString('es-ES', { dateStyle: 'long' })} (al cumplir 1 año de labores).`,
  };
}
