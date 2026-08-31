import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

interface Metrics {
  users: { total: number; admins: number; standard: number };
  debts: { count: number; totalBalance: number; monthlyPayment: number };
  incomes: { count: number; totalVolume: number };
  expenses: { count: number; totalVolume: number };
  savings: { count: number; totalTarget: number; totalSaved: number };
  payments: { count: number; totalPaid: number };
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/metrics');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar métricas');
      setMetrics(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="rounded-2xl border border-danger-500/20 bg-danger-500/5 p-6 text-sm text-danger-400">
        {error || 'No se pudieron cargar las métricas'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-border-default bg-surface-50 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Panel de Control de la Plataforma</h2>
            <p className="text-xs text-text-secondary mt-1">
              Monitoreo en tiempo real de usuarios, volúmenes financieros globales y adopción del sistema.
            </p>
          </div>
          <button
            onClick={fetchMetrics}
            className="self-start sm:self-auto inline-flex items-center gap-2 rounded-xl bg-brand-500/15 border border-brand-500/30 px-3.5 py-2 text-xs font-bold text-brand-400 hover:bg-brand-500/25 transition-colors cursor-pointer"
          >
            <span>🔄 Actualizar Métricas</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Platform Overview */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border-default bg-surface-50 p-4 sm:p-5">
          <span className="text-[11px] font-medium text-text-muted">Usuarios Registrados</span>
          <div className="mt-1.5 text-2xl font-black text-text-primary">{metrics.users.total}</div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted">
            <span className="text-brand-400 font-bold">{metrics.users.standard} estándar</span> •{' '}
            <span className="text-accent-400 font-bold">{metrics.users.admins} admin</span>
          </div>
        </div>

        <div className="rounded-2xl border border-danger-500/20 bg-danger-500/5 p-4 sm:p-5">
          <span className="text-[11px] font-medium text-danger-400">Deuda Global en Gestión</span>
          <div className="mt-1.5 text-2xl font-black text-danger-400">{formatCurrency(metrics.debts.totalBalance)}</div>
          <div className="mt-1 text-[10px] text-text-muted">{metrics.debts.count} obligaciones registradas</div>
        </div>

        <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-4 sm:p-5">
          <span className="text-[11px] font-medium text-accent-400">Metas de Ahorro Activas</span>
          <div className="mt-1.5 text-2xl font-black text-accent-400">{formatCurrency(metrics.savings.totalSaved)}</div>
          <div className="mt-1 text-[10px] text-text-muted">
            de {formatCurrency(metrics.savings.totalTarget)} objetivo ({metrics.savings.count} metas)
          </div>
        </div>

        <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4 sm:p-5">
          <span className="text-[11px] font-medium text-brand-400">Abonos Procesados</span>
          <div className="mt-1.5 text-2xl font-black text-brand-400">{formatCurrency(metrics.payments.totalPaid)}</div>
          <div className="mt-1 text-[10px] text-text-muted">{metrics.payments.count} transacciones de pago</div>
        </div>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Flujo de caja global */}
        <div className="rounded-2xl border border-border-default bg-surface-50 p-5 space-y-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <span>💵</span> Volumen Mensual Declarado
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-100/60 border border-border-default/60">
              <span className="text-xs text-text-secondary">Ingresos Mensuales Registrados</span>
              <strong className="text-sm font-bold text-accent-400">{formatCurrency(metrics.incomes.totalVolume)}</strong>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-100/60 border border-border-default/60">
              <span className="text-xs text-text-secondary">Gastos Mensuales Declarados</span>
              <strong className="text-sm font-bold text-danger-400">{formatCurrency(metrics.expenses.totalVolume)}</strong>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-100/60 border border-border-default/60">
              <span className="text-xs text-text-secondary">Compromiso Mensual de Deuda</span>
              <strong className="text-sm font-bold text-brand-400">{formatCurrency(metrics.debts.monthlyPayment)}</strong>
            </div>
          </div>
        </div>

        {/* Acciones directas de administración */}
        <div className="rounded-2xl border border-border-default bg-surface-50 p-5 space-y-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <span>⚡</span> Accesos Administrativos Rápidos
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href="/admin/users"
              className="flex flex-col p-3 rounded-xl bg-surface-100/60 border border-border-default/60 hover:border-brand-500/40 hover:bg-surface-100 transition-all"
            >
              <span className="text-base mb-1">👥</span>
              <strong className="text-xs text-text-primary">Gestionar Usuarios</strong>
              <span className="text-[10px] text-text-muted mt-0.5">Asignar roles admin/user</span>
            </a>

            <a
              href="/admin/institutions"
              className="flex flex-col p-3 rounded-xl bg-surface-100/60 border border-border-default/60 hover:border-brand-500/40 hover:bg-surface-100 transition-all"
            >
              <span className="text-base mb-1">🏦</span>
              <strong className="text-xs text-text-primary">Bancos & Financieras</strong>
              <span className="text-[10px] text-text-muted mt-0.5">Tasas referenciales</span>
            </a>

            <a
              href="/admin/settings"
              className="flex flex-col p-3 rounded-xl bg-surface-100/60 border border-border-default/60 hover:border-brand-500/40 hover:bg-surface-100 transition-all"
            >
              <span className="text-base mb-1">⚙️</span>
              <strong className="text-xs text-text-primary">Parámetros Globales</strong>
              <span className="text-[10px] text-text-muted mt-0.5">SBU y aportes IESS</span>
            </a>

            <a
              href="/admin/audit"
              className="flex flex-col p-3 rounded-xl bg-surface-100/60 border border-border-default/60 hover:border-brand-500/40 hover:bg-surface-100 transition-all"
            >
              <span className="text-base mb-1">📜</span>
              <strong className="text-xs text-text-primary">Auditoría & DB</strong>
              <span className="text-[10px] text-text-muted mt-0.5">Tablas y estado del sistema</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
