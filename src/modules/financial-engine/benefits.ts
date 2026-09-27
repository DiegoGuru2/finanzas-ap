/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Beneficios de Ley (Ecuador)
 * ═══════════════════════════════════════════
 *
 * Décimo tercero, décimo cuarto, fondos de reserva y utilidades.
 * Todos los prorrateos usan 1/12 exacto (el "8.33%" legal es la
 * aproximación de 1/12), para que el mismo beneficio nunca muestre
 * dos montos distintos según la pantalla.
 *
 * Se calculan proporcionales al tiempo laborado si se define workStartDate.
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
  /** Fondos de reserva por mes (0 si no aplica o está acumulado en el IESS o no cumple 1 año) */
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
 * Calcula los días acumulados en el ciclo del Décimo Tercero (1 Dic al 30 Nov).
 */
export function calculateDecimoTerceroCycleDays(
  workStartDate?: string | null,
  targetYear: number = new Date().getFullYear()
): number {
  if (!workStartDate) return 360;
  const start = new Date(`${workStartDate}T00:00:00`);
  if (isNaN(start.getTime())) return 360;

  // Periodo legal: 1 dic de targetYear - 1 hasta 30 nov de targetYear
  const cycleStart = new Date(targetYear - 1, 11, 1);
  const cycleEnd = new Date(targetYear, 10, 30);

  if (start <= cycleStart) return 360;
  if (start > cycleEnd) return 0;

  // Cálculo en meses comerciales (30 días/mes según normativa laboral Ecuador)
  let months = (cycleEnd.getFullYear() - start.getFullYear()) * 12 + (cycleEnd.getMonth() - start.getMonth());
  let days = 0;
  if (start.getDate() === 1) {
    months += 1;
    days = months * 30;
  } else {
    const startMonthDays = Math.max(0, 30 - start.getDate() + 1);
    days = months * 30 + startMonthDays;
  }

  return Math.min(360, Math.max(0, days));
}

/**
 * Calcula el Décimo Tercero anual acumulado (1 Dic al 30 Nov) según el Art. 111 y 95
 * del Código del Trabajo de Ecuador.
 * Considera:
 * - Proporcional por fecha de ingreso (workStartDate).
 * - Variación o aumento de sueldo (hasSalaryChange, previousSalaryAmount, salaryChangeDate).
 * - Horas extras y comisiones mensuales imponibles (monthlyOvertimeAmount).
 */
export function calculateDecimoTerceroAnnual(
  income: Income,
  targetYear: number = new Date().getFullYear()
): { amount: number; label: string; details: string; totalEarnings: number } {
  const gross = income.amount;
  const overtime = income.monthlyOvertimeAmount && income.monthlyOvertimeAmount > 0
    ? income.monthlyOvertimeAmount
    : 0;

  // Si no hay fecha de inicio, ni cambio de sueldo, ni horas extras: cálculo directo
  if (!income.workStartDate && !income.hasSalaryChange && overtime === 0) {
    return {
      amount: round(gross),
      label: 'Décimo tercer sueldo',
      details: 'Cálculo estándar sobre remuneración fija.',
      totalEarnings: round(gross * 12),
    };
  }

  // Ciclo legal: 1 de diciembre de targetYear - 1 hasta 30 de noviembre de targetYear (12 meses)
  let totalEarnings = 0;
  let monthsWorked = 0;
  const start = income.workStartDate ? new Date(`${income.workStartDate}T00:00:00`) : null;
  const changeDate = income.hasSalaryChange && income.salaryChangeDate
    ? new Date(`${income.salaryChangeDate}T00:00:00`)
    : null;
  const prevSalary = income.hasSalaryChange && (income.previousSalaryAmount ?? 0) > 0
    ? (income.previousSalaryAmount as number)
    : gross;

  let monthsWithPrev = 0;
  let monthsWithNew = 0;

  for (let m = 0; m < 12; m++) {
    // m=0: Diciembre del año anterior
    // m=1..11: Enero a Noviembre del año de pago
    const year = m === 0 ? targetYear - 1 : targetYear;
    const month = m === 0 ? 11 : m - 1;
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    // Si aún no ingresaba a laborar en este mes
    if (start && start > monthEnd) {
      continue;
    }

    // Fracción del mes si ingresó a mitad del mes
    let monthFraction = 1.0;
    if (start && start > monthStart && start <= monthEnd) {
      const daysWorked = Math.max(0, 30 - start.getDate() + 1);
      monthFraction = Math.min(1.0, Math.max(0, daysWorked / 30));
    }

    monthsWorked += monthFraction;

    // Determinar qué sueldo aplicaba en este mes
    let baseSalary = gross;
    if (changeDate && monthStart < changeDate) {
      baseSalary = prevSalary;
      monthsWithPrev += monthFraction;
    } else {
      monthsWithNew += monthFraction;
    }

    totalEarnings += (baseSalary + overtime) * monthFraction;
  }

  const decimoAmount = round(totalEarnings / 12);
  let label = 'Décimo tercer sueldo';
  let details = '';

  const roundP = Math.round(monthsWithPrev);
  const roundN = Math.round(monthsWithNew);

  if (income.hasSalaryChange && roundP > 0 && roundN > 0) {
    label = `Décimo 3ro (ponderado: ${roundP}m a $${prevSalary} + ${roundN}m a $${gross})`;
    details = `Ponderado por aumento: ${roundP} meses con $${prevSalary} y ${roundN} meses con $${gross}${overtime > 0 ? ` (+ $${overtime}/m extras)` : ''}.`;
  } else if (monthsWorked < 12) {
    const mw = Math.round(monthsWorked * 10) / 10;
    label = `Décimo tercer sueldo (proporcional ${mw} m)`;
    details = `Proporcional a ${mw} meses laborados en el ciclo legal.`;
  } else if (overtime > 0) {
    label = `Décimo tercer sueldo (con horas extras)`;
    details = `Incluye promedio mensual de $${overtime} en horas extras y comisiones.`;
  }

  return {
    amount: decimoAmount,
    label,
    details,
    totalEarnings: round(totalEarnings),
  };
}

/**
 * Calcula los días acumulados en el ciclo del Décimo Cuarto (Costa vs Sierra).
 */
export function calculateDecimoCuartoCycleDays(
  workStartDate?: string | null,
  region: 'costa' | 'sierra' = 'costa',
  targetYear: number = new Date().getFullYear()
): number {
  if (!workStartDate) return 360;
  const start = new Date(`${workStartDate}T00:00:00`);
  if (isNaN(start.getTime())) return 360;

  let cycleStart: Date;
  let cycleEndYear: number;
  let cycleEndMonth: number; // 0-indexed

  if (region === 'costa') {
    // Costa: 1 de marzo del año anterior al último día de febrero del año de pago
    cycleStart = new Date(targetYear - 1, 2, 1);
    cycleEndYear = targetYear;
    cycleEndMonth = 1; // Febrero
  } else {
    // Sierra: 1 de agosto del año anterior al 31 de julio del año de pago
    cycleStart = new Date(targetYear - 1, 7, 1);
    cycleEndYear = targetYear;
    cycleEndMonth = 6; // Julio
  }

  if (start <= cycleStart) return 360;
  const cycleEnd = new Date(cycleEndYear, cycleEndMonth + 1, 0);
  if (start > cycleEnd) return 0;

  let months = (cycleEndYear - start.getFullYear()) * 12 + (cycleEndMonth - start.getMonth());
  let days = 0;
  if (start.getDate() === 1) {
    months += 1;
    days = months * 30;
  } else {
    const startMonthDays = Math.max(0, 30 - start.getDate() + 1);
    days = months * 30 + startMonthDays;
  }

  return Math.min(360, Math.max(0, days));
}

/**
 * Calcula el ratio de utilidades según los días laborados en el año fiscal cerrado anterior.
 */
export function calculateUtilidadesCycleRatio(
  workStartDate?: string | null,
  targetYear: number = new Date().getFullYear()
): number {
  if (!workStartDate) return 1.0;
  const start = new Date(`${workStartDate}T00:00:00`);
  if (isNaN(start.getTime())) return 1.0;

  const fiscalYear = targetYear - 1;
  const cycleStart = new Date(fiscalYear, 0, 1);
  const cycleEnd = new Date(fiscalYear, 11, 31);

  if (start <= cycleStart) return 1.0;
  if (start > cycleEnd) return 0.0;

  const diffMs = cycleEnd.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(1.0, Math.max(0, days / 360));
}

/**
 * Calcula el paquete de beneficios de ley para un sueldo.
 * Devuelve ceros si el ingreso no es sueldo o no tiene beneficios configurados.
 * Si se especifica asOfDate y workStartDate, ajusta los valores proporcionales al tiempo laborado.
 */
export function calculateBenefits(income: Income, asOfDate: Date = new Date()): BenefitsBreakdown {
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
  const targetYear = asOfDate.getFullYear();

  const decimoTerceroMensualizado = income.decimoTerceroMensualizado ?? true;
  const decimoCuartoMensualizado = income.decimoCuartoMensualizado ?? true;
  const fondosMensualizado = income.fondosReservaMensualizado ?? true;

  // Fondos de reserva: Art. 196 Código de Trabajo (solo a partir de 1 año cumplido si hay fecha de ingreso)
  const fondosEligible = income.workStartDate
    ? checkFondosReservaEligibility(income.workStartDate, asOfDate).isEligible
    : true;
  const hasFondos = !!income.hasFondosReserva && fondosEligible;

  // Prorrateo legal mensual en el rol (1/12 estándar)
  const overtime = income.monthlyOvertimeAmount && income.monthlyOvertimeAmount > 0
    ? income.monthlyOvertimeAmount
    : 0;
  const fondosReservaMonthly = hasFondos ? round((gross + overtime) / 12) : 0;
  const decimoTerceroMonthly = round((gross + overtime) / 12);
  const decimoCuartoMonthly = round(sbu / 12);

  // ─── Décimo Tercero Anual (Ponderado por Aumento / Proporcional / Horas Extras) ───
  const dtCalc = calculateDecimoTerceroAnnual(income, targetYear);
  const decimoTerceroAnnual = dtCalc.amount;
  const dtLabel = dtCalc.label;

  // ─── Décimo Cuarto Anual (Proporcional si hay workStartDate) ───
  const dcDays = calculateDecimoCuartoCycleDays(income.workStartDate, region, targetYear);
  const decimoCuartoAnnual = dcDays >= 360 ? round(sbu) : round((sbu * dcDays) / 360);
  const dcMonths = Math.round((dcDays / 30) * 10) / 10;
  const dcLabel = dcDays < 360
    ? `Décimo cuarto sueldo (proporcional ${dcMonths} m)`
    : 'Décimo cuarto sueldo';

  // ─── Utilidades Anuales (Proporcional al año fiscal anterior) ───
  const nominalUtilidades = income.hasUtilidades && (income.utilidadesAmount ?? 0) > 0
    ? round(income.utilidadesAmount as number)
    : 0;
  const uRatio = calculateUtilidadesCycleRatio(income.workStartDate, targetYear);
  const utilidadesAnnual = round(nominalUtilidades * uRatio);
  const utilidadesMonthly = round(nominalUtilidades / 12);
  const uLabel = uRatio < 1 && uRatio > 0
    ? `Utilidades (proporcional ${Math.round(uRatio * 12)} m)`
    : 'Utilidades';

  // ─── Lo que llega cada mes en el rol (solo mensualizados) ───
  let monthlyRecurring = 0;
  if (hasFondos && fondosMensualizado) monthlyRecurring += fondosReservaMonthly;
  if (decimoTerceroMensualizado) monthlyRecurring += decimoTerceroMonthly;
  if (decimoCuartoMensualizado) monthlyRecurring += decimoCuartoMonthly;

  // ─── Pagos anuales en su mes legal (no mensualizados) ───
  const annualPayouts: BenefitAnnualPayout[] = [];
  if (!decimoTerceroMensualizado && decimoTerceroAnnual > 0) {
    annualPayouts.push({
      month: BENEFIT_PAYOUT_MONTHS.decimoTercero,
      label: dtLabel,
      amount: decimoTerceroAnnual,
      timing: 'fin_de_mes', // se paga hasta el 24 de diciembre
    });
  }
  if (!decimoCuartoMensualizado && decimoCuartoAnnual > 0) {
    annualPayouts.push({
      month:
        region === 'sierra'
          ? BENEFIT_PAYOUT_MONTHS.decimoCuartoSierra
          : BENEFIT_PAYOUT_MONTHS.decimoCuartoCosta,
      label: dcLabel,
      amount: decimoCuartoAnnual,
      timing: 'quincena', // se paga hasta el 15 de marzo/agosto
    });
  }
  if (utilidadesAnnual > 0) {
    annualPayouts.push({
      month: BENEFIT_PAYOUT_MONTHS.utilidades,
      label: uLabel,
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
export function checkFondosReservaEligibility(
  workStartDate?: string | null,
  asOf: Date = new Date()
): {
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
  if (isNaN(start.getTime())) {
    return {
      isEligible: false,
      monthsWorked: 0,
      eligibilityDate: null,
      message: 'Fecha de inicio inválida.',
    };
  }

  const diffTime = asOf.getTime() - start.getTime();
  const monthsWorked = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.4375)));

  const eligibilityDate = new Date(start);
  eligibilityDate.setFullYear(eligibilityDate.getFullYear() + 1);

  const isEligible = asOf >= eligibilityDate;

  return {
    isEligible,
    monthsWorked,
    eligibilityDate,
    message: isEligible
      ? `✓ Cumples con la antigüedad (+${monthsWorked} meses). Tienes derecho a Fondos de Reserva (8.33%).`
      : `Calificarás el ${eligibilityDate.toLocaleDateString('es-ES', { dateStyle: 'long' })} (al cumplir 1 año de labores).`,
  };
}
