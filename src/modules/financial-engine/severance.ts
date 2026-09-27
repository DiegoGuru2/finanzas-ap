/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Motor de Liquidación Laboral
 * y Régimen Legal Ecuatoriano
 * ═══════════════════════════════════════════
 *
 * Cumple con el Código del Trabajo de Ecuador y la Ley Orgánica
 * de Apoyo Humanitario (Contrato Especial Emergente).
 */

import { DEFAULT_SBU, round } from './constants';

export interface TenureInfo {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalMonths: number;
  formatted: string;
}

export interface EmergentContractInfo {
  isEmergent: boolean;
  contractDurationMonths: number;
  monthsWorked: number;
  remainingMonths: number;
  isExpired: boolean;
  isOverTwoYears: boolean;
  progressPercent: number;
  status: 'active' | 'nearing_expiration' | 'expired' | 'converted_indefinite';
  statusLabel: string;
  legalNotice: string;
  hasSeveranceRight: boolean;
  severanceRuleText: string;
}

export interface SeveranceBreakdown {
  decimoTercero: number;
  decimoCuarto: number;
  vacaciones: number;
  desahucio: number;
  indemnityDismissal: number;
  total: number;
}

export interface SeveranceCalculationResult {
  asOfDate: string;
  workStartDate: string | null;
  tenure: TenureInfo;
  salary: number;
  sbu: number;
  contractType: 'indefinite' | 'emergente';
  emergentInfo: EmergentContractInfo;
  resignation: SeveranceBreakdown;
  dismissal: SeveranceBreakdown;
  difference: number;
}

/**
 * Calcula la antigüedad exacta en años, meses y días.
 */
export function calculateTenure(workStartDate?: string | null, asOf: Date = new Date()): TenureInfo {
  if (!workStartDate) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
      totalMonths: 0,
      formatted: 'Sin fecha registrada',
    };
  }

  const start = new Date(`${workStartDate}T00:00:00`);
  if (isNaN(start.getTime()) || start > asOf) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
      totalMonths: 0,
      formatted: 'Fecha futura o inválida',
    };
  }

  let years = asOf.getFullYear() - start.getFullYear();
  let months = asOf.getMonth() - start.getMonth();
  let days = asOf.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    // Días del mes anterior
    const prevMonthLastDay = new Date(asOf.getFullYear(), asOf.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const diffMs = asOf.getTime() - start.getTime();
  const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const totalMonths = Math.max(0, Math.round((years * 12 + months + days / 30.4375) * 10) / 10);

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);

  return {
    years,
    months,
    days,
    totalDays,
    totalMonths,
    formatted: parts.join(', '),
  };
}

/**
 * Evalúa las condiciones legales de un Contrato Especial Emergente (Ecuador).
 */
export function getEmergentContractInfo(
  contractType: 'indefinite' | 'emergente',
  durationMonths: number = 12,
  workStartDate?: string | null,
  asOf: Date = new Date()
): EmergentContractInfo {
  const isEmergent = contractType === 'emergente';
  const boundedDuration = Math.min(24, Math.max(1, durationMonths));

  if (!isEmergent || !workStartDate) {
    return {
      isEmergent,
      contractDurationMonths: boundedDuration,
      monthsWorked: 0,
      remainingMonths: boundedDuration,
      isExpired: false,
      isOverTwoYears: false,
      progressPercent: 0,
      status: 'active',
      statusLabel: 'Contrato Indefinido Ordinario',
      legalNotice: 'Gozas de estabilidad laboral bajo el régimen de contrato indefinido general.',
      hasSeveranceRight: true,
      severanceRuleText: 'Derecho a liquidación legal completa por renuncia o despido intempestivo.',
    };
  }

  const tenure = calculateTenure(workStartDate, asOf);
  const monthsWorked = tenure.totalMonths;
  const remainingMonths = Math.max(0, Math.round((boundedDuration - monthsWorked) * 10) / 10);
  const isExpired = monthsWorked >= boundedDuration;
  const isOverTwoYears = monthsWorked >= 24;
  const progressPercent = Math.min(100, Math.round((monthsWorked / boundedDuration) * 100));

  let status: 'active' | 'nearing_expiration' | 'expired' | 'converted_indefinite';
  let statusLabel: string;
  let legalNotice: string;

  if (isOverTwoYears) {
    status = 'converted_indefinite';
    statusLabel = 'Convertido a Indefinido (Superó 2 años)';
    legalNotice =
      '¡Atención legal!: La Ley de Apoyo Humanitario estipula que el contrato emergente dura máximo 2 años. Al superarlos, tu relación laboral se convirtió automáticamente en Contrato Indefinido de pleno derecho.';
  } else if (isExpired) {
    status = 'expired';
    statusLabel = 'Plazo Pactado Cumplido';
    legalNotice =
      'Se ha cumplido el plazo pactado. Si continúas laborando sin renovación expresa o desvinculación, pasa a ser indefinido.';
  } else if (remainingMonths <= 2) {
    status = 'nearing_expiration';
    statusLabel = `Por concluir (${remainingMonths} meses restantes)`;
    legalNotice =
      'El contrato emergente está próximo a vencer su plazo inicial. La empresa puede renovarlo por una sola vez hasta completar 2 años máximo.';
  } else {
    status = 'active';
    statusLabel = `Vigente (${remainingMonths} meses restantes de ${boundedDuration})`;
    legalNotice =
      'Contrato especial emergente bajo Ley Humanitaria vigente con jornada y remuneración pactadas.';
  }

  const severanceRuleText =
    'Al finalizar el plazo acordado SÍ recibes liquidación (décimos, vacaciones y desahucio). Solo si el empleador te despide ANTES del plazo convenido, corresponde adicionalmente la indemnización por despido intempestivo.';

  return {
    isEmergent: true,
    contractDurationMonths: boundedDuration,
    monthsWorked,
    remainingMonths,
    isExpired,
    isOverTwoYears,
    progressPercent,
    status,
    statusLabel,
    legalNotice,
    hasSeveranceRight: true,
    severanceRuleText,
  };
}

/**
 * Calcula los días acumulados en el ciclo legal del Décimo Tercer Sueldo (1 Dic al 30 Nov).
 */
export function getDecimoTerceroAccumulatedDays(asOf: Date = new Date(), workStartDate?: string | null): number {
  const year = asOf.getFullYear();
  // El periodo actual empezó el 1 de diciembre anterior
  let cycleStart = new Date(year - 1, 11, 1);
  if (asOf.getMonth() === 11) {
    // Si estamos en diciembre, el periodo empezó el 1 de dic del mismo año
    cycleStart = new Date(year, 11, 1);
  }

  let effectiveStart = cycleStart;
  if (workStartDate) {
    const start = new Date(`${workStartDate}T00:00:00`);
    if (start > cycleStart) {
      effectiveStart = start;
    }
  }

  const diffMs = Math.max(0, asOf.getTime() - effectiveStart.getTime());
  return Math.min(360, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Calcula los días acumulados en el ciclo legal del Décimo Cuarto Sueldo (Costa vs Sierra).
 */
export function getDecimoCuartoAccumulatedDays(
  region: 'costa' | 'sierra' = 'costa',
  asOf: Date = new Date(),
  workStartDate?: string | null
): number {
  const year = asOf.getFullYear();
  let cycleStart: Date;

  if (region === 'costa') {
    // Costa: 1 de marzo a final de febrero
    if (asOf.getMonth() < 2) {
      // Enero o Febrero: empezó el 1 de marzo del año anterior
      cycleStart = new Date(year - 1, 2, 1);
    } else {
      // Marzo a Diciembre: empezó el 1 de marzo de este año
      cycleStart = new Date(year, 2, 1);
    }
  } else {
    // Sierra: 1 de agosto a 31 de julio
    if (asOf.getMonth() < 7) {
      // Enero a Julio: empezó el 1 de agosto del año anterior
      cycleStart = new Date(year - 1, 7, 1);
    } else {
      // Agosto a Diciembre: empezó el 1 de agosto de este año
      cycleStart = new Date(year, 7, 1);
    }
  }

  let effectiveStart = cycleStart;
  if (workStartDate) {
    const start = new Date(`${workStartDate}T00:00:00`);
    if (start > cycleStart) {
      effectiveStart = start;
    }
  }

  const diffMs = Math.max(0, asOf.getTime() - effectiveStart.getTime());
  return Math.min(360, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export interface SeveranceInput {
  salary: number;
  sbu?: number;
  workStartDate?: string | null;
  contractType?: 'indefinite' | 'emergente';
  contractDurationMonths?: number;
  region?: 'costa' | 'sierra';
  decimoTerceroMensualizado?: boolean;
  decimoCuartoMensualizado?: boolean;
  asOfDate?: Date;
}

/**
 * Calcula la liquidación legal completa en Ecuador tanto para Renuncia Voluntaria
 * como para Despido Intempestivo.
 */
export function calculateSeverance(input: SeveranceInput): SeveranceCalculationResult {
  const salary = Math.max(0, input.salary || 0);
  const sbu = Math.max(0, input.sbu && input.sbu > 0 ? input.sbu : DEFAULT_SBU);
  const contractType = input.contractType || 'indefinite';
  const duration = input.contractDurationMonths ?? 12;
  const region = input.region || 'costa';
  const asOf = input.asOfDate || new Date();
  const workStartDate = input.workStartDate || null;

  const tenure = calculateTenure(workStartDate, asOf);
  const emergentInfo = getEmergentContractInfo(contractType, duration, workStartDate, asOf);

  // 1. Décimo Tercero
  const dtDays = getDecimoTerceroAccumulatedDays(asOf, workStartDate);
  // Si mensualiza, en la liquidación solo se paga el mes en curso proporcional (fracción de 30 días)
  const decimoTercero = input.decimoTerceroMensualizado
    ? round((salary / 12) * (tenure.days / 30))
    : round((salary * dtDays) / 360);

  // 2. Décimo Cuarto
  const dcDays = getDecimoCuartoAccumulatedDays(region, asOf, workStartDate);
  const decimoCuarto = input.decimoCuartoMensualizado
    ? round((sbu / 12) * (tenure.days / 30))
    : round((sbu * dcDays) / 360);

  // 3. Vacaciones no gozadas proporcionales (15 días al año = salary / 24)
  // Días laborados en el periodo anual en curso
  const daysInCurrentYear = tenure.months * 30 + tenure.days;
  const vacaciones = round((salary / 24) * (Math.min(360, daysInCurrentYear) / 360));

  // 4. Bonificación por Desahucio (Art. 185 Código del Trabajo):
  // 25% de la última remuneración mensual por cada año de servicio completo y proporcional por fracciones.
  const serviceYearsDecimal = tenure.years + tenure.months / 12 + tenure.days / 365;
  const desahucio = round(0.25 * salary * serviceYearsDecimal);

  // Subtotal haberes y desahucio (común para renuncia y despido)
  const subtotalHaberes = round(decimoTercero + decimoCuarto + vacaciones + desahucio);

  // 5. Indemnización por Despido Intempestivo (Art. 188 Código del Trabajo):
  // • Hasta 3 años de servicio: 3 remuneraciones (piso mínimo legal).
  // • Más de 3 años de servicio: 1 remuneración por cada año de servicio, donde la fracción de año cuenta como año completo (máximo 25).
  let indemnityDismissal = 0;
  if (salary > 0) {
    if (contractType === 'emergente' && !emergentInfo.isOverTwoYears && !emergentInfo.isExpired) {
      // En contrato emergente despedido anticipadamente antes del plazo pactado
      indemnityDismissal = round(Math.max(3 * salary, salary * Math.ceil(serviceYearsDecimal)));
    } else {
      // Contrato indefinido u ordinario
      if (tenure.years < 3) {
        indemnityDismissal = round(3 * salary);
      } else {
        // Fracción de año cuenta como año completo
        const yearsCounted = tenure.months > 0 || tenure.days > 0 ? tenure.years + 1 : tenure.years;
        const cappedYears = Math.min(25, yearsCounted);
        indemnityDismissal = round(cappedYears * salary);
      }
    }
  }

  // Renuncia voluntaria (no incluye despido intempestivo)
  const resignation: SeveranceBreakdown = {
    decimoTercero,
    decimoCuarto,
    vacaciones,
    desahucio,
    indemnityDismissal: 0,
    total: subtotalHaberes,
  };

  // Despido intempestivo (incluye indemnización Art. 188)
  const dismissal: SeveranceBreakdown = {
    decimoTercero,
    decimoCuarto,
    vacaciones,
    desahucio,
    indemnityDismissal,
    total: round(subtotalHaberes + indemnityDismissal),
  };

  return {
    asOfDate: asOf.toISOString().slice(0, 10),
    workStartDate,
    tenure,
    salary,
    sbu,
    contractType,
    emergentInfo,
    resignation,
    dismissal,
    difference: round(dismissal.total - resignation.total),
  };
}
