import React, { useState, useEffect } from 'react';

interface GlobalParams {
  sbuAmount: number;
  iessPercentagePrivate: number;
  iessPercentagePublic: number;
  maxDebtToIncomeRatio: number;
  emergencyReserveMonthsDefault: number;
  systemName: string;
  systemVersion: string;
  legalDecimoTerceroDate: string;
  legalDecimoCuartoCostaDate: string;
  legalDecimoCuartoSierraDate: string;
}

export default function AdminSettingsManager() {
  const [params, setParams] = useState<GlobalParams | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const fetchParams = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      const json = await res.json();
      if (res.ok) setParams(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParams();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!params) return;
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !params) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-primary">Parámetros Macroeconómicos y del Sistema</h2>
        <p className="text-xs text-text-secondary mt-1">
          Configuración global de nómina ecuatoriana, Salario Básico Unificado (SBU), tasas de IESS y fechas de beneficios legales.
        </p>
      </div>

      {savedMsg && (
        <div className="rounded-xl border border-accent-500/30 bg-accent-500/10 p-3.5 text-xs text-accent-400 font-semibold">
          ✓ Parámetros guardados y actualizados exitosamente en la plataforma.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Nómina Ecuador */}
        <div className="rounded-2xl border border-border-default bg-surface-50 p-5 space-y-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <span>🇪🇨</span> Parámetros de Ley — Ecuador
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">SBU Vigente ($)</label>
              <input
                type="number"
                step="0.01"
                value={params.sbuAmount}
                onChange={(e) => setParams({ ...params, sbuAmount: Number(e.target.value) })}
                className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
              />
              <span className="text-[10px] text-text-muted mt-0.5 block">Base para décimo cuarto sueldo</span>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Aporte IESS Privado (%)</label>
              <input
                type="number"
                step="0.01"
                value={params.iessPercentagePrivate}
                onChange={(e) => setParams({ ...params, iessPercentagePrivate: Number(e.target.value) })}
                className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
              />
              <span className="text-[10px] text-text-muted mt-0.5 block">Retención obligatoria en rol</span>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Aporte IESS Público (%)</label>
              <input
                type="number"
                step="0.01"
                value={params.iessPercentagePublic}
                onChange={(e) => setParams({ ...params, iessPercentagePublic: Number(e.target.value) })}
                className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
              />
              <span className="text-[10px] text-text-muted mt-0.5 block">Sector público</span>
            </div>
          </div>
        </div>

        {/* Políticas de Salud Financiera */}
        <div className="rounded-2xl border border-border-default bg-surface-50 p-5 space-y-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <span>🛡️</span> Reglas de Salud Financiera y Alertas
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Ratio Máximo Deuda / Ingreso (%)</label>
              <input
                type="number"
                step="1"
                value={params.maxDebtToIncomeRatio}
                onChange={(e) => setParams({ ...params, maxDebtToIncomeRatio: Number(e.target.value) })}
                className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
              />
              <span className="text-[10px] text-text-muted mt-0.5 block">Límite recomendado de endeudamiento</span>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Fondo de Emergencia por Defecto (Meses)</label>
              <input
                type="number"
                step="1"
                value={params.emergencyReserveMonthsDefault}
                onChange={(e) => setParams({ ...params, emergencyReserveMonthsDefault: Number(e.target.value) })}
                className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
              />
              <span className="text-[10px] text-text-muted mt-0.5 block">Meses de gastos básicos de reserva</span>
            </div>
          </div>
        </div>

        {/* Guardar cambios */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand-500 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Parámetros'}
          </button>
        </div>
      </form>
    </div>
  );
}
