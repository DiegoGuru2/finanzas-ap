import { describe, it, expect } from 'vitest';
import {
  calculateTenure,
  getEmergentContractInfo,
  calculateSeverance,
} from '../../../src/modules/financial-engine/severance';

describe('Severance & Emergent Contract Engine (Ecuador)', () => {
  it('calculates tenure accurately for a known date range', () => {
    const asOf = new Date('2026-09-26T00:00:00');
    const tenure = calculateTenure('2024-05-10', asOf);

    expect(tenure.years).toBe(2);
    expect(tenure.months).toBe(4);
    expect(tenure.days).toBe(16);
    expect(tenure.formatted).toContain('2 años, 4 meses, 16 días');
  });

  it('detects emergent contract active status and progress', () => {
    const asOf = new Date('2026-09-26T00:00:00');
    // Started 6 months ago, 12 months duration
    const info = getEmergentContractInfo('emergente', 12, '2026-03-26', asOf);

    expect(info.isEmergent).toBe(true);
    expect(info.contractDurationMonths).toBe(12);
    expect(info.status).toBe('active');
    expect(info.hasSeveranceRight).toBe(true);
    expect(info.severanceRuleText).toContain('Al finalizar el plazo acordado SÍ recibes liquidación');
  });

  it('detects when emergent contract converts automatically to indefinite contract (>2 years)', () => {
    const asOf = new Date('2026-09-26T00:00:00');
    // Started 2.5 years ago
    const info = getEmergentContractInfo('emergente', 12, '2024-01-01', asOf);

    expect(info.isOverTwoYears).toBe(true);
    expect(info.status).toBe('converted_indefinite');
    expect(info.legalNotice).toContain('se convirtió automáticamente en Contrato Indefinido');
  });

  it('calculates severance for resignation vs dismissal intempestivo with minimum 3-salary floor', () => {
    const asOf = new Date('2026-09-26T00:00:00');
    const result = calculateSeverance({
      salary: 1000,
      sbu: 460,
      workStartDate: '2025-01-01',
      contractType: 'indefinite',
      region: 'costa',
      asOfDate: asOf,
    });

    // 1 year, 8 months worked
    expect(result.tenure.years).toBe(1);
    expect(result.resignation.desahucio).toBeGreaterThan(0);
    expect(result.resignation.indemnityDismissal).toBe(0);

    // In dismissal with < 3 years, minimum indemnity is 3 salaries = $3000
    expect(result.dismissal.indemnityDismissal).toBe(3000);
    expect(result.dismissal.total).toBe(result.resignation.total + 3000);
    expect(result.difference).toBe(3000);
  });
});
