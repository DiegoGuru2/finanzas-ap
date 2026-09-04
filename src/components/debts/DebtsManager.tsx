import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { DEFAULT_CATALOGS, fetchCatalog, type CatalogOption } from '@/lib/catalogs';

interface DebtItem {
  id: string;
  name: string;
  creditor?: string;
  currentBalance: number;
  originalBalance: number;
  apr: number;
  minimumPayment: number;
  dueDay: number;
  type: string;
  paymentTiming?: string;
  status: string;
  hasInstallmentPlan?: boolean;
  termMonths?: number | null;
}

export default function DebtsManager() {
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Tipos de deuda administrables desde el panel de admin
  const [debtTypes, setDebtTypes] = useState<CatalogOption[]>(DEFAULT_CATALOGS.debt_type);

  useEffect(() => {
    fetchCatalog('debt_type').then(setDebtTypes);
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [currentBalance, setCurrentBalance] = useState<string>('');
  const [originalBalance, setOriginalBalance] = useState<string>('');
  const [apr, setApr] = useState<string>('');
  const [minimumPayment, setMinimumPayment] = useState<string>('');
  const [dueDay, setDueDay] = useState<string>('15');
  const [type, setType] = useState<string>('credit_card');
  const [paymentTiming, setPaymentTiming] = useState<string>('quincena');
  const [hasInstallmentPlan, setHasInstallmentPlan] = useState(false);
  const [payFullBalance, setPayFullBalance] = useState(false);
  const [termMonths, setTermMonths] = useState<string>('12');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'minimum' | 'extra' | 'full'>('minimum');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState('');

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/debts');
      const json = await res.json();
      if (json.data) {
        setDebts(json.data);
      }
    } catch (err) {
      console.error('Error fetching debts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingDebtId(null);
    setName('');
    setCreditor('');
    setCurrentBalance('');
    setOriginalBalance('');
    setApr('');
    setMinimumPayment('');
    setDueDay('15');
    setType('credit_card');
    setPaymentTiming('quincena');
    setHasInstallmentPlan(false);
    setPayFullBalance(false);
    setTermMonths('12');
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (debt: DebtItem) => {
    setEditingDebtId(debt.id);
    setName(debt.name);
    setCreditor(debt.creditor || '');
    setCurrentBalance(String(debt.currentBalance));
    setOriginalBalance(String(debt.originalBalance));
    setApr(String(debt.apr));
    setMinimumPayment(String(debt.minimumPayment));
    setDueDay(String(debt.dueDay || 15));
    setType(debt.type || 'credit_card');
    setPaymentTiming(debt.paymentTiming || 'quincena');
    setHasInstallmentPlan(!!debt.hasInstallmentPlan);
    setPayFullBalance(false);
    setTermMonths(String(debt.termMonths || 12));
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const isEditing = !!editingDebtId;
      const url = '/api/debts';
      const method = isEditing ? 'PUT' : 'POST';

      const bal = parseFloat(currentBalance) || 0;
      const origBal = parseFloat(originalBalance) || bal;
      const tm = parseInt(termMonths) || 1;

      // Con plan de cuotas, la cuota mensual se deriva del saldo y reemplaza al pago mínimo
      const installmentAmount =
        hasInstallmentPlan && tm > 0
          ? Math.round((bal / tm) * 100) / 100
          : null;

      // Si paga valor total, el mínimo = saldo actual y termMonths = 1
      const finalMinimum = payFullBalance
        ? bal
        : (installmentAmount ?? (parseFloat(minimumPayment) || 0));

      const payload: any = {
        name,
        creditor,
        currentBalance: bal,
        originalBalance: origBal,
        apr: parseFloat(apr) || 0,
        minimumPayment: finalMinimum,
        dueDay: parseInt(dueDay) || 15,
        type,
        paymentTiming,
        hasInstallmentPlan: payFullBalance ? false : hasInstallmentPlan,
        termMonths: payFullBalance ? 1 : (hasInstallmentPlan ? tm : null),
        currency: 'USD',
        status: 'active',
      };

      if (isEditing) {
        payload.id = editingDebtId;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar deuda');
      }

      setShowModal(false);
      setEditingDebtId(null);
      setName('');
      await fetchDebts();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debtId: selectedDebt.id,
          amount: parseFloat(paymentAmount) || 0,
          type: paymentType,
          paidAt: paymentDate,
          notes: paymentNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al abonar');
      }

      setShowPaymentModal(false);
      setSelectedDebt(null);
      await fetchDebts();
    } catch (err: any) {
      alert(err.message || 'Error al procesar pago');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, debtName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la deuda "${debtName}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/debts?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Error al eliminar deuda');
        return;
      }
      await fetchDebts();
    } catch (err) {
      console.error(err);
    }
  };

  // Spreadsheet / Table state
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paid'>('all');
  const [sortColumn, setSortColumn] = useState<string>('currentBalance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedDebts = React.useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    const list = debts.filter((d) => {
      // Search query filter
      const matchesSearch =
        !query ||
        d.name.toLowerCase().includes(query) ||
        (d.creditor && d.creditor.toLowerCase().includes(query)) ||
        d.type.toLowerCase().includes(query) ||
        (d.paymentTiming && d.paymentTiming.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === 'active') return d.currentBalance > 0;
      if (statusFilter === 'paid') return d.currentBalance <= 0;
      return true;
    });

    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      const amortizedA = Math.max(0, a.originalBalance - a.currentBalance);
      const amortizedB = Math.max(0, b.originalBalance - b.currentBalance);
      const progressA = a.originalBalance > 0 ? (amortizedA / a.originalBalance) * 100 : 0;
      const progressB = b.originalBalance > 0 ? (amortizedB / b.originalBalance) * 100 : 0;

      switch (sortColumn) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'creditor':
          valA = (a.creditor || '').toLowerCase();
          valB = (b.creditor || '').toLowerCase();
          break;
        case 'dueDay':
          valA = a.dueDay || 0;
          valB = b.dueDay || 0;
          break;
        case 'apr':
          valA = a.apr || 0;
          valB = b.apr || 0;
          break;
        case 'originalBalance':
          valA = a.originalBalance || 0;
          valB = b.originalBalance || 0;
          break;
        case 'currentBalance':
          valA = a.currentBalance || 0;
          valB = b.currentBalance || 0;
          break;
        case 'minimumPayment':
          valA = a.minimumPayment || 0;
          valB = b.minimumPayment || 0;
          break;
        case 'progress':
          valA = progressA;
          valB = progressB;
          break;
        default:
          valA = a.currentBalance || 0;
          valB = b.currentBalance || 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [debts, searchTerm, statusFilter, sortColumn, sortDirection]);

  // Export to Excel / CSV format with UTF-8 BOM
  const handleExportCsv = () => {
    if (debts.length === 0) return;

    const headers = [
      '#',
      'Obligacion / Deuda',
      'Acreedor / Institucion',
      'Tipo',
      'Modalidad',
      'Momento Pago',
      'Dia Corte',
      'Tasa APR (%)',
      'Saldo Original (USD)',
      'Saldo Actual (USD)',
      'Amortizado (USD)',
      'Progreso (%)',
      'Cuota Minima (USD)',
      'Estado',
    ];

    const rows = filteredAndSortedDebts.map((d, index) => {
      const amortized = Math.max(0, d.originalBalance - d.currentBalance);
      const paidPercent =
        d.originalBalance > 0
          ? Math.min(100, Math.max(0, Math.round((amortized / d.originalBalance) * 100)))
          : 0;
      const statusStr = d.currentBalance <= 0 ? 'Liquidada' : 'Activa';
      const planStr =
        d.hasInstallmentPlan && d.termMonths ? `${d.termMonths} cuotas` : 'Pago regular';
      const timingStr = d.paymentTiming === 'quincena' ? 'Quincena (15)' : 'Fin de Mes (30)';

      return [
        index + 1,
        `"${d.name.replace(/"/g, '""')}"`,
        `"${(d.creditor || '').replace(/"/g, '""')}"`,
        `"${d.type}"`,
        `"${planStr}"`,
        `"${timingStr}"`,
        d.dueDay,
        d.apr,
        d.originalBalance.toFixed(2),
        d.currentBalance.toFixed(2),
        amortized.toFixed(2),
        `${paidPercent}%`,
        d.minimumPayment.toFixed(2),
        `"${statusStr}"`,
      ].join(';');
    });

    const sumOrig = filteredAndSortedDebts.reduce((acc, d) => acc + d.originalBalance, 0);
    const sumCur = filteredAndSortedDebts.reduce((acc, d) => acc + d.currentBalance, 0);
    const sumAmort = Math.max(0, sumOrig - sumCur);
    const sumProg = sumOrig > 0 ? Math.round((sumAmort / sumOrig) * 100) : 0;
    const sumMin = filteredAndSortedDebts.reduce((acc, d) => acc + d.minimumPayment, 0);

    const totalsRow = [
      'TOTAL',
      `"CONSOLIDADO (${filteredAndSortedDebts.length} DEUDAS)"`,
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      sumOrig.toFixed(2),
      sumCur.toFixed(2),
      sumAmort.toFixed(2),
      `${sumProg}%`,
      sumMin.toFixed(2),
      '""',
    ].join(';');

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows, totalsRow].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `planilla_deudas_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);
  const totalOriginal = debts.reduce((sum, d) => sum + d.originalBalance, 0);
  const totalAmortized = Math.max(0, totalOriginal - totalDebt);
  const totalProgress = totalOriginal > 0 ? Math.round((totalAmortized / totalOriginal) * 100) : 0;
  const totalMin = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const avgApr = debts.length > 0 ? debts.reduce((sum, d) => sum + d.apr, 0) / debts.length : 0;

  // Active debts count
  const activeCount = debts.filter((d) => d.currentBalance > 0).length;
  const paidCount = debts.filter((d) => d.currentBalance <= 0).length;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-text-primary">Gestión y Configuración de Deudas</h2>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Planilla Excel
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-0.5">
            Administra, amortiza, edita o elimina tus tarjetas, préstamos quirografarios del BIESS y créditos bancarios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={debts.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Exportar planilla a Microsoft Excel / CSV"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar Excel
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-danger-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-danger-500/25 transition-all hover:bg-danger-400 cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Nueva Deuda / Crédito
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-danger-500/20 bg-danger-500/5 p-4">
          <span className="text-xs font-medium text-danger-400">Saldo Total Adeudado</span>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-danger-400">
            {formatCurrency(totalDebt)}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {activeCount} activa(s) · {paidCount} liquidada(s)
          </div>
        </div>

        <div className="rounded-2xl border border-border-default bg-surface-50 p-4">
          <span className="text-xs font-medium text-text-secondary">Saldo Original Registrado</span>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-text-primary">
            {formatCurrency(totalOriginal)}
          </div>
          <div className="mt-1 text-xs text-text-muted">Capital inicial total</div>
        </div>

        <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-4">
          <span className="text-xs font-medium text-accent-400">Total Amortizado</span>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-accent-400">
            {formatCurrency(totalAmortized)}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {totalProgress}% del capital cancelado
          </div>
        </div>

        <div className="rounded-2xl border border-warning-500/20 bg-warning-500/5 p-4">
          <span className="text-xs font-medium text-warning-400">Compromiso Mensual</span>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-warning-400">
            {formatCurrency(totalMin)}
          </div>
          <div className="mt-1 text-xs text-text-muted">Suma cuotas / mínimos al mes</div>
        </div>
      </div>

      {/* Main Container: Excel Spreadsheet / Cards Section */}
      <div className="rounded-2xl border border-border-default bg-surface-50 overflow-hidden shadow-sm">
        {/* Spreadsheet Toolbar */}
        <div className="p-4 border-b border-border-default bg-surface-100/40 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Title & Status filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Planilla de Deudas
              </span>
              <span className="text-xs font-mono text-text-muted">
                ({filteredAndSortedDebts.length}/{debts.length})
              </span>
            </div>

            {/* Status Pills */}
            <div className="flex items-center rounded-xl bg-surface-200/60 p-1 border border-border-default/40">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-surface-50 text-text-primary shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Todas ({debts.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-surface-50 text-danger-400 shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Activas ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('paid')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'paid'
                    ? 'bg-surface-50 text-emerald-400 shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Liquidadas ({paidCount})
              </button>
            </div>
          </div>

          {/* Right: Search box & View Switcher */}
          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-text-muted">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por nombre, banco..."
                className="w-full rounded-xl border border-border-default bg-surface-100 py-1.5 pl-8 pr-7 text-xs text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2 text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl bg-surface-200/60 p-1 border border-border-default/40">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-surface-50 text-text-primary shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Vista Tabla Excel"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Tabla</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-surface-50 text-text-primary shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Vista Tarjetas"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="hidden sm:inline">Tarjetas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12 text-center text-text-muted text-sm">Cargando planilla de deudas...</div>
        ) : debts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100 text-text-muted">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h4 className="mt-4 font-semibold text-text-primary">No tienes deudas registradas</h4>
            <p className="mt-1 text-sm text-text-muted">
              ¡Excelente! O registra tus tarjetas y préstamos para calcular tu plan de amortización tipo planilla.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              Registrar Deuda
            </button>
          </div>
        ) : filteredAndSortedDebts.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            <p>No se encontraron deudas con los criterios seleccionados.</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="mt-2 text-xs font-semibold text-brand-400 hover:underline cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* ═══════════════════════════════════════════════
             EXCEL-STYLE STRUCTURED SPREADSHEET TABLE
             ═══════════════════════════════════════════════ */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              {/* Spreadsheet Header Row */}
              <thead>
                <tr className="border-b border-border-default bg-surface-100/80 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  <th className="w-10 px-3 py-2.5 text-center font-mono border-r border-border-default/40 bg-surface-200/40 text-text-muted">
                    #
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-3 py-2.5 border-r border-border-default/40 cursor-pointer hover:bg-surface-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>Concepto / Obligación</span>
                      <span className="text-text-muted text-[10px]">
                        {sortColumn === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('creditor')}
                    className="px-3 py-2.5 border-r border-border-default/40 cursor-pointer hover:bg-surface-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>Acreedor / Banco</span>
                      <span className="text-text-muted text-[10px]">
                        {sortColumn === 'creditor' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('dueDay')}
                    className="px-3 py-2.5 border-r border-border-default/40 cursor-pointer hover:bg-surface-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>Corte / Pago</span>
                      <span className="text-text-muted text-[10px]">
                        {sortColumn === 'dueDay' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('apr')}
                    className="px-3 py-2.5 text-center border-r border-border-default/40 cursor-pointer hover:bg-surface-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>APR</span>
                      <span className="text-text-muted text-[10px]">
                        {sortColumn === 'apr' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('originalBalance')}
                    className="px-3 py-2.5 text-right border-r border-border-default/40 cursor-pointer hover:bg-surface-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Saldo Orig.</span>
                      <span className="text-text-muted text-[10px]">
                        {sortColumn === 'originalBalance' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('currentBalance')}
                    className="px-3 py-2.5 text-right border-r border-border-default/40 cursor-pointer hover:bg-surface-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Saldo Actual</span>
                      <span className="text-text-muted text-[10px]">
                        {sortColumn === 'currentBalance' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('minimumPayment')}
                    className="px-3 py-2.5 text-right border-r border-border-default/40 cursor-pointer hover:bg-surface-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Cuota Mín.</span>
                      <span className="text-text-muted text-[10px]">
                        {sortColumn === 'minimumPayment' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('progress')}
                    className="w-36 px-3 py-2.5 border-r border-border-default/40 cursor-pointer hover:bg-surface-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>Amortización</span>
                      <span className="text-text-muted text-[10px]">
                        {sortColumn === 'progress' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th className="px-3 py-2.5 text-center border-r border-border-default/40">
                    Estado
                  </th>
                  <th className="px-3 py-2.5 text-center">
                    Acciones
                  </th>
                </tr>
              </thead>

              {/* Rows */}
              <tbody className="divide-y divide-border-default/50 font-normal text-text-primary">
                {filteredAndSortedDebts.map((debt, index) => {
                  const amortized = Math.max(0, debt.originalBalance - debt.currentBalance);
                  const paidPercent =
                    debt.originalBalance > 0
                      ? Math.min(100, Math.max(0, Math.round((amortized / debt.originalBalance) * 100)))
                      : 0;
                  const isPaid = debt.currentBalance <= 0;

                  return (
                    <tr
                      key={debt.id}
                      className={`hover:bg-surface-100/70 transition-colors group ${
                        isPaid ? 'bg-emerald-500/[0.02]' : ''
                      }`}
                    >
                      {/* Excel Row Number Index */}
                      <td className="px-3 py-2.5 text-center font-mono text-[11px] text-text-muted bg-surface-200/30 border-r border-border-default/40 select-none">
                        {index + 1}
                      </td>

                      {/* Name / Details */}
                      <td className="px-3 py-2.5 border-r border-border-default/40">
                        <div className="flex flex-col gap-0.5">
                          <span className={`font-semibold ${isPaid ? 'text-emerald-400 line-through' : 'text-text-primary'}`}>
                            {debt.name}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-surface-200 text-text-muted">
                              {debt.type || 'crédito'}
                            </span>
                            {debt.hasInstallmentPlan && debt.termMonths && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent-500/10 text-accent-400 border border-accent-500/20 font-medium">
                                {debt.termMonths} cuotas
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Acreedor / Banco */}
                      <td className="px-3 py-2.5 border-r border-border-default/40">
                        {debt.creditor ? (
                          <span className="inline-block rounded-md bg-surface-200 px-2 py-0.5 text-xs text-text-secondary font-medium">
                            {debt.creditor}
                          </span>
                        ) : (
                          <span className="text-text-muted italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Timing / Corte */}
                      <td className="px-3 py-2.5 border-r border-border-default/40 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-text-secondary">
                            Día {debt.dueDay || 15}
                          </span>
                          <span className="text-[10px] text-brand-400 font-medium">
                            {debt.paymentTiming === 'quincena' ? 'Quincena (15)' : 'Fin de mes (30)'}
                          </span>
                        </div>
                      </td>

                      {/* APR */}
                      <td className="px-3 py-2.5 text-center font-mono border-r border-border-default/40 whitespace-nowrap">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                            debt.apr > 15
                              ? 'bg-danger-500/10 text-danger-400'
                              : 'bg-surface-200 text-text-secondary'
                          }`}
                        >
                          {debt.apr}%
                        </span>
                      </td>

                      {/* Saldo Original */}
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-text-secondary border-r border-border-default/40 whitespace-nowrap">
                        {formatCurrency(debt.originalBalance)}
                      </td>

                      {/* Saldo Actual */}
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums border-r border-border-default/40 whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            isPaid
                              ? 'text-emerald-400'
                              : 'text-danger-400'
                          }`}
                        >
                          {formatCurrency(debt.currentBalance)}
                        </span>
                      </td>

                      {/* Cuota Mínima */}
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-warning-400 font-semibold border-r border-border-default/40 whitespace-nowrap">
                        {formatCurrency(debt.minimumPayment)}
                      </td>

                      {/* Amortización */}
                      <td className="px-3 py-2.5 border-r border-border-default/40">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-accent-400 font-semibold">
                              {paidPercent}%
                            </span>
                            <span className="text-text-muted text-[10px] font-mono tabular-nums">
                              {formatCurrency(amortized)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-surface-200 overflow-hidden">
                            <div
                              className="h-full bg-accent-400 rounded-full transition-all duration-300"
                              style={{ width: `${paidPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-3 py-2.5 text-center border-r border-border-default/40 whitespace-nowrap">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Liquidada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-danger-500/10 px-2 py-0.5 text-[10px] font-semibold text-danger-400 border border-danger-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-danger-400 animate-pulse" />
                            Activa
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Abonar */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDebt(debt);
                              setPaymentAmount(String(debt.minimumPayment));
                              setShowPaymentModal(true);
                            }}
                            className="rounded-lg bg-accent-500/10 border border-accent-500/30 px-2 py-1 text-[11px] font-semibold text-accent-400 hover:bg-accent-500/25 transition-all cursor-pointer shadow-xs"
                            title="Registrar abono a esta deuda"
                          >
                            Abonar
                          </button>

                          {/* Modificar */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(debt)}
                            className="p-1 text-text-muted hover:text-brand-400 transition-colors rounded hover:bg-brand-500/10 cursor-pointer"
                            title="Modificar deuda"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={() => handleDelete(debt.id, debt.name)}
                            className="p-1 text-text-muted hover:text-danger-400 transition-colors rounded hover:bg-danger-500/10 cursor-pointer"
                            title="Eliminar deuda"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Excel Summary Total Footer Row */}
              <tfoot className="border-t-2 border-border-default bg-surface-100/95 font-semibold text-text-primary text-xs">
                <tr>
                  <td className="px-3 py-2.5 text-center font-mono text-[11px] bg-surface-200/50 border-r border-border-default/40">
                    ∑
                  </td>
                  <td colSpan={3} className="px-3 py-2.5 border-r border-border-default/40 font-bold uppercase tracking-wide">
                    TOTALES CONSOLIDADOS ({filteredAndSortedDebts.length} filas)
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono border-r border-border-default/40 text-text-secondary">
                    {avgApr.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-text-primary border-r border-border-default/40">
                    {formatCurrency(filteredAndSortedDebts.reduce((acc, d) => acc + d.originalBalance, 0))}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-danger-400 font-bold border-r border-border-default/40">
                    {formatCurrency(filteredAndSortedDebts.reduce((acc, d) => acc + d.currentBalance, 0))}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-warning-400 font-bold border-r border-border-default/40">
                    {formatCurrency(filteredAndSortedDebts.reduce((acc, d) => acc + d.minimumPayment, 0))}
                  </td>
                  <td className="px-3 py-2.5 border-r border-border-default/40">
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                      <span className="text-accent-400">
                        {totalProgress}%
                      </span>
                      <span className="text-text-muted text-[10px]">
                        {formatCurrency(totalAmortized)}
                      </span>
                    </div>
                  </td>
                  <td colSpan={2} className="px-3 py-2.5 text-center text-text-muted text-[11px]">
                    Planilla al día
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════
             CARDS VIEW (ALTERNATIVE MODE)
             ═══════════════════════════════════════════════ */
          <div className="divide-y divide-border-default">
            {filteredAndSortedDebts.map((debt) => {
              const amortized = Math.max(0, debt.originalBalance - debt.currentBalance);
              const paidPercent =
                debt.originalBalance > 0
                  ? Math.min(100, Math.max(0, Math.round((amortized / debt.originalBalance) * 100)))
                  : 0;

              return (
                <div
                  key={debt.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-surface-100/50 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="font-semibold text-text-primary text-base">{debt.name}</span>
                      {debt.creditor && (
                        <span className="text-xs bg-surface-200 px-2 py-0.5 rounded text-text-secondary">
                          {debt.creditor}
                        </span>
                      )}
                      <span className="text-xs bg-danger-500/10 text-danger-400 border border-danger-500/20 px-2 py-0.5 rounded font-medium">
                        {debt.apr}% APR
                      </span>
                      <span className="text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded font-medium">
                        Paga en: {debt.paymentTiming === 'quincena' ? 'Quincena (15)' : 'Fin de Mes (30)'}
                      </span>
                      {debt.hasInstallmentPlan && debt.termMonths ? (
                        <span className="text-xs bg-accent-500/10 text-accent-400 border border-accent-500/20 px-2 py-0.5 rounded font-medium">
                          {debt.termMonths} cuotas de {formatCurrency(debt.minimumPayment)}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted pt-1">
                      <span>
                        Día de pago: <strong>Día {debt.dueDay}</strong>
                      </span>
                      <span>
                        Mínimo requerido:{' '}
                        <strong className="text-warning-400">{formatCurrency(debt.minimumPayment)}</strong>
                      </span>
                      <span>
                        Progreso pago: <strong>{paidPercent}%</strong> ({formatCurrency(amortized)})
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-surface-200 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-accent-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${paidPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-5">
                    <div className="text-right">
                      <div className="text-xl font-extrabold font-mono text-danger-400">
                        {formatCurrency(debt.currentBalance)}
                      </div>
                      <div className="text-xs font-mono text-text-muted">
                        de {formatCurrency(debt.originalBalance)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botón Abonar */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDebt(debt);
                          setPaymentAmount(String(debt.minimumPayment));
                          setShowPaymentModal(true);
                        }}
                        className="rounded-xl bg-accent-500/10 border border-accent-500/20 px-3 py-2 text-xs font-semibold text-accent-400 hover:bg-accent-500/20 transition-all cursor-pointer"
                      >
                        Abonar
                      </button>

                      {/* Botón Modificar / Editar */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(debt)}
                        className="p-2 text-text-muted hover:text-brand-400 transition-colors rounded-lg hover:bg-brand-500/10 cursor-pointer"
                        title="Modificar deuda"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>

                      {/* Botón Borrar / Eliminar */}
                      <button
                        type="button"
                        onClick={() => handleDelete(debt.id, debt.name)}
                        className="p-2 text-text-muted hover:text-danger-400 transition-colors rounded-lg hover:bg-danger-500/10 cursor-pointer"
                        title="Eliminar deuda"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Crear / Modificar Deuda */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                {editingDebtId ? (
                  <>
                    <svg className="h-5 w-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Modificar Deuda o Crédito</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Registrar Deuda o Crédito</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 border border-border-default text-text-muted hover:text-text-primary hover:bg-surface-200 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Nombre de la Deuda</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  placeholder="Ej. Visa Signature Banco Pichincha / Préstamo BIESS"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Acreedor / Institución</label>
                  <input
                    type="text"
                    value={creditor}
                    onChange={(e) => setCreditor(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                    placeholder="Banco Pichincha / BIESS / Diners"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Tipo de Obligación</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  >
                    {debtTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon ? `${t.icon} ` : ''}{t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Saldo Actual ($)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Monto Original ($)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={originalBalance}
                    onChange={(e) => setOriginalBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Tasa APR (%)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    max="100"
                    value={apr}
                    onChange={(e) => setApr(e.target.value)}
                    required
                    placeholder="0.0"
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    {payFullBalance ? 'Pago Total ($)' : hasInstallmentPlan ? 'Cuota Mensual ($)' : 'Pago Mínimo ($)'}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={
                      payFullBalance
                        ? currentBalance
                        : hasInstallmentPlan && (parseInt(termMonths) || 0) > 0
                          ? String(Math.round(((parseFloat(currentBalance) || 0) / (parseInt(termMonths) || 1)) * 100) / 100)
                          : minimumPayment
                    }
                    onChange={(e) => setMinimumPayment(e.target.value)}
                    required
                    disabled={hasInstallmentPlan || payFullBalance}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Día de Corte/Pago</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    required
                    placeholder="15"
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Momento de Pago Habitual</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentTiming('quincena')}
                    className={`rounded-xl border p-2 text-xs font-medium cursor-pointer ${
                      paymentTiming === 'quincena'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-border-default bg-surface-100 text-text-muted'
                    }`}
                  >
                    Pagar con la Quincena (15)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentTiming('fin_de_mes')}
                    className={`rounded-xl border p-2 text-xs font-medium cursor-pointer ${
                      paymentTiming === 'fin_de_mes'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-border-default bg-surface-100 text-text-muted'
                    }`}
                  >
                    Pagar a Fin de Mes (30)
                  </button>
                </div>
              </div>

              {/* Pagar valor total (un solo pago) */}
              <div className="rounded-xl border border-accent-500/30 bg-accent-500/5 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="payFullBalance"
                    checked={payFullBalance}
                    onChange={(e) => {
                      setPayFullBalance(e.target.checked);
                      if (e.target.checked) {
                        setHasInstallmentPlan(false);
                      }
                    }}
                    className="h-4 w-4 rounded border-accent-500 text-accent-500 focus:ring-accent-500 cursor-pointer"
                  />
                  <label htmlFor="payFullBalance" className="text-xs font-bold text-accent-400 cursor-pointer">
                    💰 Pagar el valor total de esta deuda (un solo pago)
                  </label>
                </div>
                {payFullBalance && (parseFloat(currentBalance) || 0) > 0 && (
                  <div className="rounded-lg bg-accent-500/10 border border-accent-500/20 px-3 py-2 text-xs text-accent-400">
                    Se programará 1 pago único de <strong>{formatCurrency(parseFloat(currentBalance) || 0)}</strong>
                  </div>
                )}
              </div>

              {/* Plan de cuotas fijas */}
              <div className={`rounded-xl border border-border-default bg-surface-100 p-3 space-y-3 ${payFullBalance ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasInstallmentPlan"
                    checked={hasInstallmentPlan}
                    onChange={(e) => setHasInstallmentPlan(e.target.checked)}
                    disabled={payFullBalance}
                    className="rounded border-border-default text-brand-500 focus:ring-brand-500"
                  />
                  <label htmlFor="hasInstallmentPlan" className="text-xs font-medium text-text-primary cursor-pointer">
                    Pagar esta deuda en cuotas fijas
                  </label>
                </div>

                {hasInstallmentPlan && (
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">Número de Cuotas</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="360"
                        value={termMonths}
                        onChange={(e) => setTermMonths(e.target.value)}
                        required
                        placeholder="12"
                        className="w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div className="rounded-lg bg-brand-500/10 border border-brand-500/20 px-3 py-2 text-xs text-brand-400">
                      {(parseInt(termMonths) || 0) > 0 ? (
                        <>
                          {termMonths} cuota(s) de{' '}
                          <strong>{formatCurrency(Math.round(((parseFloat(currentBalance) || 0) / (parseInt(termMonths) || 1)) * 100) / 100)}</strong>
                        </>
                      ) : (
                        'Ingresa el número de cuotas'
                      )}
                    </div>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="rounded-lg bg-danger-500/10 border border-danger-500/20 px-3 py-2 text-xs text-danger-400">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-danger-500 px-5 py-2 text-xs font-semibold text-white hover:bg-danger-400 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Guardando...' : editingDebtId ? 'Actualizar Deuda 💾' : 'Registrar Deuda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Abonar a Deuda */}
      {showPaymentModal && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <svg className="h-5 w-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Registrar Abono</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 border border-border-default text-text-muted hover:text-text-primary hover:bg-surface-200 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-text-secondary">
              Abonando a: <strong className="text-text-primary">{selectedDebt.name}</strong> (Saldo actual: {formatCurrency(selectedDebt.currentBalance)})
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Monto del Pago ($)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  max={selectedDebt.currentBalance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('minimum');
                    setPaymentAmount(String(selectedDebt.minimumPayment));
                  }}
                  className={`rounded-lg border p-2 text-xs font-medium cursor-pointer ${
                    paymentType === 'minimum' ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-border-default bg-surface-100 text-text-muted'
                  }`}
                >
                  Mínimo (${selectedDebt.minimumPayment})
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('extra')}
                  className={`rounded-lg border p-2 text-xs font-medium cursor-pointer ${
                    paymentType === 'extra' ? 'border-accent-500 bg-accent-500/10 text-accent-400' : 'border-border-default bg-surface-100 text-text-muted'
                  }`}
                >
                  Extra a Capital
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('full');
                    setPaymentAmount(String(selectedDebt.currentBalance));
                  }}
                  className={`rounded-lg border p-2 text-xs font-medium cursor-pointer ${
                    paymentType === 'full' ? 'border-warning-500 bg-warning-500/10 text-warning-400' : 'border-border-default bg-surface-100 text-text-muted'
                  }`}
                >
                  Liquidar Total
                </button>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Fecha de Pago</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-accent-500 px-5 py-2 text-xs font-semibold text-white hover:bg-accent-400 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Procesando...' : 'Confirmar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
