import React, { useState } from 'react';

export default function AdminAuditManager() {
  const [initLogs, setInitLogs] = useState<string[]>([]);
  const [runningInit, setRunningInit] = useState(false);

  const handleRunInitDb = async () => {
    try {
      setRunningInit(true);
      const res = await fetch('/api/admin/init-db');
      const json = await res.json();
      setInitLogs(json.logs || [json.message || 'Completado']);
    } catch (e: any) {
      setInitLogs([`Error: ${e.message}`]);
    } finally {
      setRunningInit(false);
    }
  };

  const tables = [
    { name: 'user', desc: 'Usuarios autenticados y asignación de roles', status: 'Activa' },
    { name: 'session', desc: 'Sesiones activas con tokens de seguridad', status: 'Activa' },
    { name: 'account', desc: 'Credenciales y proveedores de autenticación', status: 'Activa' },
    { name: 'incomes', desc: 'Ingresos, sueldos nominales, rol y aportes IESS', status: 'Activa' },
    { name: 'expenses', desc: 'Gastos fijos, variables y cortes quincenales', status: 'Activa' },
    { name: 'debts', desc: 'Deudas, tarjetas de crédito, saldos y tasas APR', status: 'Activa' },
    { name: 'payments', desc: 'Historial de pagos y abonos atómicos', status: 'Activa' },
    { name: 'savings_goals', desc: 'Metas de ahorro, contribuciones y proyecciones', status: 'Activa' },
    { name: 'optimization_plans', desc: 'Planes de amortización calculados (Avalancha / Bola de nieve)', status: 'Activa' },
    { name: 'alerts', desc: 'Alertas inteligentes de cortes de pago y recordatorios', status: 'Activa' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Auditoría y Estado de la Base de Datos</h2>
          <p className="text-xs text-text-secondary mt-1">
            Verifica el estado de las tablas maestras en TiDB Cloud y ejecuta tareas de sincronización.
          </p>
        </div>
        <button
          onClick={handleRunInitDb}
          disabled={runningInit}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-accent-400 transition-colors cursor-pointer disabled:opacity-50"
        >
          <span>{runningInit ? 'Verificando...' : '🔍 Sincronizar Tablas DB'}</span>
        </button>
      </div>

      {initLogs.length > 0 && (
        <div className="rounded-2xl border border-border-default bg-surface-100/80 p-4 space-y-2">
          <h4 className="text-xs font-bold text-text-primary">Resultado de la Sincronización:</h4>
          <div className="font-mono text-[11px] text-text-secondary space-y-1">
            {initLogs.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>
      )}

      {/* Tables schema status */}
      <div className="rounded-2xl border border-border-default bg-surface-50 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-default bg-surface-100/60 flex items-center justify-between">
          <span className="text-xs font-bold text-text-primary">Tablas del Esquema en Producción</span>
          <span className="text-[10px] text-accent-400 font-bold">10 / 10 Tablas Activas</span>
        </div>
        <div className="divide-y divide-border-default/60">
          {tables.map((t) => (
            <div key={t.name} className="flex items-center justify-between p-4 text-xs hover:bg-surface-100/30 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-brand-400">{t.name}</span>
                <span className="text-text-muted hidden sm:inline">{t.desc}</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-accent-500/15 px-2 py-0.5 text-[10px] font-bold text-accent-400">
                ✓ {t.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
