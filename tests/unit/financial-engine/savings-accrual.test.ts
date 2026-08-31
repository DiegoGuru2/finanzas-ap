import { describe, expect, it } from 'vitest';
import { calculateLinkedAccrual } from '@/modules/financial-engine/savings';

describe('calculateLinkedAccrual (meta vinculada a un gasto)', () => {
  const today = new Date('2026-08-31T12:00:00');

  it('acumula un aporte por cada mes cumplido desde linkedSince', () => {
    const r = calculateLinkedAccrual('2026-05-31', 100, today);
    expect(r.monthsElapsed).toBe(3); // may→jun, jun→jul, jul→ago
    expect(r.accrued).toBe(300);
  });

  it('no acumula nada antes de cumplir el primer mes', () => {
    const r = calculateLinkedAccrual('2026-08-15', 100, today);
    expect(r.monthsElapsed).toBe(0);
    expect(r.accrued).toBe(0);
  });

  it('el mes cuenta recién al llegar al día del vínculo', () => {
    // Vinculado el 15: al 31 de agosto ya pasó el día 15 → cuenta el mes
    expect(calculateLinkedAccrual('2026-07-15', 50, today).monthsElapsed).toBe(1);
    // Vinculado un día 5 de hace un mes, hoy es 31 → también cuenta
    expect(calculateLinkedAccrual('2026-07-05', 50, today).monthsElapsed).toBe(1);
    // Hoy 10 de sep, vinculado el 15 de ago → aún no cumple el mes
    expect(
      calculateLinkedAccrual('2026-08-15', 50, new Date('2026-09-10T12:00:00')).monthsElapsed
    ).toBe(0);
  });

  it('redondea a 2 decimales', () => {
    const r = calculateLinkedAccrual('2026-02-28', 33.33, today);
    expect(r.monthsElapsed).toBe(6);
    expect(r.accrued).toBe(199.98);
  });

  it('monto 0 o fecha inválida no acumulan', () => {
    expect(calculateLinkedAccrual('2026-01-01', 0, today).accrued).toBe(0);
    expect(calculateLinkedAccrual('fecha-mala', 100, today).accrued).toBe(0);
  });

  it('fecha futura no acumula', () => {
    const r = calculateLinkedAccrual('2027-01-01', 100, today);
    expect(r.monthsElapsed).toBe(0);
    expect(r.accrued).toBe(0);
  });
});
