import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { catalogTint, DEFAULT_CATALOGS, fetchCatalog, type CatalogOption } from '@/lib/catalogs';

interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  category: string;
  isEssential: boolean;
  frequency: string;
  paymentTiming?: string;
  activeFrom?: string | null;
  activeUntil?: string | null;
  description?: string;
}

const isoDay = (v?: string | null) => (v ? String(v).slice(0, 10) : '');

export default function ExpensesManager() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Categorías administrables desde el panel de admin
  const [categories, setCategories] = useState<CatalogOption[]>(DEFAULT_CATALOGS.expense_category);

  useEffect(() => {
    fetchCatalog('expense_category').then(setCategories);
  }, []);

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number>(150);
  const [category, setCategory] = useState('housing');
  const [isEssential, setIsEssential] = useState(true);
  const [paymentTiming, setPaymentTiming] = useState('ambas');
  const [activeFrom, setActiveFrom] = useState('');
  const [activeUntil, setActiveUntil] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setName('');
    setAmount(150);
    setCategory('housing');
    setIsEssential(true);
    setPaymentTiming('ambas');
    setActiveFrom('');
    setActiveUntil('');
    setDescription('');
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (exp: ExpenseItem) => {
    setEditingId(exp.id);
    setName(exp.name);
    setAmount(exp.amount);
    setCategory(exp.category);
    setIsEssential(exp.isEssential);
    setPaymentTiming(exp.paymentTiming || 'ambas');
    setActiveFrom(isoDay(exp.activeFrom));
    setActiveUntil(isoDay(exp.activeUntil));
    setDescription(exp.description || '');
    setErrorMessage(null);
    setShowModal(true);
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/expenses');
      const json = await res.json();
      if (json.data) {
        setExpenses(json.data);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        name,
        amount: Number(amount),
        category,
        isEssential,
        frequency: 'monthly',
        paymentTiming,
        activeFrom: activeFrom || null,
        activeUntil: activeUntil || null,
        description,
      };
      if (editingId) payload.id = editingId;

      const res = await fetch('/api/expenses', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar gasto');
      }

      setShowModal(false);
      setEditingId(null);
      await fetchExpenses();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al registrar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Deseas eliminar este gasto?')) return;
    try {
      await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      await fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  // Spreadsheet / Table state
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'essential' | 'flexible'>('all');
  const [sortColumn, setSortColumn] = useState<string>('amount');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const essentialExpenses = expenses.filter((e) => e.isEssential).reduce((sum, e) => sum + e.amount, 0);
  const nonEssentialExpenses = expenses.filter((e) => !e.isEssential).reduce((sum, e) => sum + e.amount, 0);

  // Etiquetas desde el catálogo administrable
  const categoryLabels: Record<string, string> = Object.fromEntries(
    categories.map((c) => [c.value, `${c.icon ? c.icon + ' ' : ''}${c.label}`])
  );

  const filteredAndSortedExpenses = React.useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    const list = expenses.filter((e) => {
      const matchesSearch =
        !query ||
        e.name.toLowerCase().includes(query) ||
        (e.description && e.description.toLowerCase().includes(query)) ||
        e.category.toLowerCase().includes(query) ||
        (e.paymentTiming && e.paymentTiming.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      if (typeFilter === 'essential') return e.isEssential;
      if (typeFilter === 'flexible') return !e.isEssential;
      return true;
    });

    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortColumn) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'category':
          valA = (categoryLabels[a.category] || a.category).toLowerCase();
          valB = (categoryLabels[b.category] || b.category).toLowerCase();
          break;
        case 'isEssential':
          valA = a.isEssential ? 1 : 0;
          valB = b.isEssential ? 1 : 0;
          break;
        case 'paymentTiming':
          valA = a.paymentTiming || '';
          valB = b.paymentTiming || '';
          break;
        case 'amount':
        default:
          valA = a.amount;
          valB = b.amount;
          break;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [expenses, searchTerm, typeFilter, sortColumn, sortDirection, categoryLabels]);

  // Export to CSV with UTF-8 BOM
  const handleExportCsv = () => {
    if (expenses.length === 0) return;

    const headers = [
      '#',
      'Concepto / Gasto',
      'Categoria',
      'Tipo / Naturaleza',
      'Momento de Pago',
      'Vigencia',
      'Monto Mensual (USD)',
      '% del Presupuesto',
      'Descripcion',
    ];

    const rows = filteredAndSortedExpenses.map((e, index) => {
      const pct = totalExpenses > 0 ? ((e.amount / totalExpenses) * 100).toFixed(1) : '0';
      const timingStr =
        e.paymentTiming === 'quincena'
          ? 'Quincena (15)'
          : e.paymentTiming === 'fin_de_mes'
            ? 'Fin de Mes (30)'
            : 'Repartido (15/30)';
      const vigenciaStr =
        e.activeFrom || e.activeUntil
          ? `${e.activeFrom ? isoDay(e.activeFrom) : ''} a ${e.activeUntil ? isoDay(e.activeUntil) : ''}`
          : 'Permanente';

      return [
        index + 1,
        `"${e.name.replace(/"/g, '""')}"`,
        `"${(categoryLabels[e.category] || e.category).replace(/"/g, '""')}"`,
        e.isEssential ? 'Esencial (Fijo)' : 'Flexible (Variable)',
        `"${timingStr}"`,
        `"${vigenciaStr}"`,
        e.amount.toFixed(2),
        `${pct}%`,
        `"${(e.description || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const sumAmt = filteredAndSortedExpenses.reduce((acc, e) => acc + e.amount, 0);
    const sumPct = totalExpenses > 0 ? ((sumAmt / totalExpenses) * 100).toFixed(1) : '0';

    const totalsRow = [
      'TOTAL',
      `"CONSOLIDADO (${filteredAndSortedExpenses.length} GASTOS)"`,
      '""',
      '""',
      '""',
      '""',
      sumAmt.toFixed(2),
      `${sumPct}%`,
      '""',
    ].join(';');

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows, totalsRow].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `planilla_gastos_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sumFiltered = filteredAndSortedExpenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-text-primary">Gastos Mensuales Recurrentes</h2>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Planilla Excel
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-0.5">
            Registra tus gastos fijos y variables para calcular con precisión tu excedente para deudas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={expenses.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Exportar planilla de gastos a Excel / CSV"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar Excel
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Gasto Recurrente
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border-default bg-surface-50 p-4">
          <span className="text-xs font-medium text-text-muted">Total Gastos Mensuales</span>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-text-primary">
            {formatCurrency(totalExpenses)}
          </div>
          <div className="mt-1 text-xs text-text-muted">{expenses.length} categorías registradas</div>
        </div>

        <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4">
          <span className="text-xs font-medium text-brand-400">Gastos Esenciales (Fijos)</span>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-brand-400">
            {formatCurrency(essentialExpenses)}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {totalExpenses > 0 ? ((essentialExpenses / totalExpenses) * 100).toFixed(0) : 0}% del total · Vivienda, comida, servicios
          </div>
        </div>

        <div className="rounded-2xl border border-warning-500/20 bg-warning-500/5 p-4">
          <span className="text-xs font-medium text-warning-400">Gastos Prescindibles (Variables)</span>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-warning-400">
            {formatCurrency(nonEssentialExpenses)}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {totalExpenses > 0 ? ((nonEssentialExpenses / totalExpenses) * 100).toFixed(0) : 0}% del total · Potencial para abonos extra
          </div>
        </div>
      </div>

      {/* Main Container: Excel Spreadsheet / Cards Section */}
      <div className="rounded-2xl border border-border-default bg-surface-50 overflow-hidden shadow-sm">
        {/* Spreadsheet Toolbar */}
        <div className="p-4 border-b border-border-default bg-surface-100/40 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Title & Filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Planilla de Gastos
              </span>
              <span className="text-xs font-mono text-text-muted">
                ({filteredAndSortedExpenses.length}/{expenses.length})
              </span>
            </div>

            {/* Type Pills */}
            <div className="flex items-center rounded-xl bg-surface-200/60 p-1 border border-border-default/40">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  typeFilter === 'all'
                    ? 'bg-surface-50 text-text-primary shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Todos ({expenses.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('essential')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  typeFilter === 'essential'
                    ? 'bg-surface-50 text-brand-400 shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Esenciales ({expenses.filter((e) => e.isEssential).length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('flexible')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  typeFilter === 'flexible'
                    ? 'bg-surface-50 text-warning-400 shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Flexibles ({expenses.filter((e) => !e.isEssential).length})
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
                placeholder="Filtrar por concepto, categoría..."
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
          <div className="p-12 text-center text-text-muted text-sm">Cargando planilla de gastos...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100 text-text-muted">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h4 className="mt-4 font-semibold text-text-primary">No tienes gastos registrados</h4>
            <p className="mt-1 text-sm text-text-muted">
              Registra tu arriendo, comida y servicios para que el motor calcule tu disponible real.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              Registrar Primer Gasto
            </button>
          </div>
        ) : filteredAndSortedExpenses.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            <p>No se encontraron gastos con los criterios seleccionados.</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
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
                      <span>Concepto / Gasto</span>
                      <span className="text-text-muted text-[10px]">
                        {sortColumn === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('category')}
                    className="px-3 py-2.5 border-r border-border-default/40 cursor-pointer hover:bg-surface-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>Categoría</span>
                      <span className="text-text-muted text-[10px]">
                        {sortColumn === 'category' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('isEssential')}
                    className="px-3 py-2.5 text-center border-r border-border-default/40 cursor-pointer hover:bg-surface-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Tipo</span>
                      <span className="text-text-muted text-[10px]">
                        {sortColumn === 'isEssential' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('paymentTiming')}
                    className="px-3 py-2.5 border-r border-border-default/40 cursor-pointer hover:bg-surface-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>Momento de Pago</span>
                      <span className="text-text-muted text-[10px]">
                        {sortColumn === 'paymentTiming' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th className="px-3 py-2.5 border-r border-border-default/40">
                    Vigencia
                  </th>
                  <th
                    onClick={() => handleSort('amount')}
                    className="px-3 py-2.5 text-right border-r border-border-default/40 cursor-pointer hover:bg-surface-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Monto Mensual</span>
                      <span className="text-text-muted text-[10px]">
                        {sortColumn === 'amount' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th className="w-32 px-3 py-2.5 border-r border-border-default/40 text-center">
                    % Presupuesto
                  </th>
                  <th className="px-3 py-2.5 text-center">
                    Acciones
                  </th>
                </tr>
              </thead>

              {/* Rows */}
              <tbody className="divide-y divide-border-default/50 font-normal text-text-primary">
                {filteredAndSortedExpenses.map((exp, index) => {
                  const pct = totalExpenses > 0 ? ((exp.amount / totalExpenses) * 100) : 0;
                  const color = categories.find((c) => c.value === exp.category)?.color;

                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-surface-100/70 transition-colors group"
                    >
                      {/* Excel Row Index */}
                      <td className="px-3 py-2.5 text-center font-mono text-[11px] text-text-muted bg-surface-200/30 border-r border-border-default/40 select-none">
                        {index + 1}
                      </td>

                      {/* Concepto / Nombre */}
                      <td className="px-3 py-2.5 border-r border-border-default/40">
                        <div className="flex flex-col">
                          <span className="font-semibold text-text-primary">
                            {exp.name}
                          </span>
                          {exp.description && (
                            <span className="text-[11px] text-text-muted truncate max-w-xs">
                              {exp.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="px-3 py-2.5 border-r border-border-default/40 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg text-text-secondary border ${
                            color ? 'cat-tint' : 'bg-surface-200 border-border-default/60'
                          }`}
                          style={catalogTint(color)}
                        >
                          {categoryLabels[exp.category] || exp.category}
                        </span>
                      </td>

                      {/* Tipo / Esencial */}
                      <td className="px-3 py-2.5 text-center border-r border-border-default/40 whitespace-nowrap">
                        {exp.isEssential ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-400 border border-brand-500/20">
                            Esencial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-warning-500/10 px-2 py-0.5 text-[10px] font-semibold text-warning-400 border border-warning-500/20">
                            Flexible
                          </span>
                        )}
                      </td>

                      {/* Momento de Pago */}
                      <td className="px-3 py-2.5 border-r border-border-default/40 whitespace-nowrap text-text-secondary">
                        {exp.paymentTiming === 'quincena'
                          ? 'Quincena (15)'
                          : exp.paymentTiming === 'fin_de_mes'
                            ? 'Fin de Mes (30)'
                            : 'Repartido (15/30)'}
                      </td>

                      {/* Vigencia */}
                      <td className="px-3 py-2.5 border-r border-border-default/40 whitespace-nowrap text-[11px]">
                        {exp.activeFrom || exp.activeUntil ? (
                          <span className="text-warning-400 font-medium">
                            {exp.activeFrom ? isoDay(exp.activeFrom) : 'Inicio'}
                            {' → '}
                            {exp.activeUntil ? isoDay(exp.activeUntil) : 'Indefinido'}
                          </span>
                        ) : (
                          <span className="text-text-muted">Permanente</span>
                        )}
                      </td>

                      {/* Monto Mensual */}
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold text-text-primary border-r border-border-default/40 whitespace-nowrap">
                        {formatCurrency(exp.amount)}
                      </td>

                      {/* % del Presupuesto */}
                      <td className="px-3 py-2.5 border-r border-border-default/40">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-text-secondary font-medium">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-surface-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${exp.isEssential ? 'bg-brand-400' : 'bg-warning-400'}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(exp)}
                            className="p-1 text-text-muted hover:text-brand-400 transition-colors rounded hover:bg-brand-500/10 cursor-pointer"
                            title="Editar gasto"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(exp.id)}
                            className="p-1 text-text-muted hover:text-danger-400 transition-colors rounded hover:bg-danger-500/10 cursor-pointer"
                            title="Eliminar gasto"
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

              {/* Excel Summary Total Footer */}
              <tfoot className="border-t-2 border-border-default bg-surface-100/95 font-semibold text-text-primary text-xs">
                <tr>
                  <td className="px-3 py-2.5 text-center font-mono text-[11px] bg-surface-200/50 border-r border-border-default/40">
                    ∑
                  </td>
                  <td colSpan={5} className="px-3 py-2.5 border-r border-border-default/40 font-bold uppercase tracking-wide">
                    TOTAL GASTOS MENSUALES ({filteredAndSortedExpenses.length} categorías)
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-text-primary font-bold border-r border-border-default/40">
                    {formatCurrency(sumFiltered)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono border-r border-border-default/40 text-text-secondary">
                    {totalExpenses > 0 ? ((sumFiltered / totalExpenses) * 100).toFixed(0) : 0}%
                  </td>
                  <td className="px-3 py-2.5 text-center text-text-muted text-[11px]">
                    Presupuesto
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════
             CARDS VIEW (ALTERNATIVE MODE)
             ═══════════════════════════════════════════════ */
          <div className="p-4 sm:p-5 space-y-3">
            {filteredAndSortedExpenses.map((exp) => (
              <div
                key={exp.id}
                className="rounded-2xl border border-border-default bg-surface-100/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-brand-500/40 hover:bg-surface-100/70 transition-all shadow-xs"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="font-semibold text-text-primary text-sm sm:text-base">{exp.name}</span>
                    {(() => {
                      const color = categories.find((c) => c.value === exp.category)?.color;
                      return (
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-lg text-text-secondary border ${
                            color ? 'cat-tint' : 'bg-surface-200 border-border-default/60'
                          }`}
                          style={catalogTint(color)}
                        >
                          {categoryLabels[exp.category] || exp.category}
                        </span>
                      );
                    })()}
                    {exp.isEssential ? (
                      <span className="text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2.5 py-0.5 rounded-lg font-medium">
                        Esencial
                      </span>
                    ) : (
                      <span className="text-xs bg-warning-500/10 text-warning-400 border border-warning-500/20 px-2.5 py-0.5 rounded-lg font-medium">
                        Flexible
                      </span>
                    )}
                    <span className="text-xs bg-surface-200/80 border border-border-default/50 px-2.5 py-0.5 rounded-lg text-text-secondary">
                      {exp.paymentTiming === 'quincena'
                        ? 'Paga el 15'
                        : exp.paymentTiming === 'fin_de_mes'
                          ? 'Paga a fin de mes'
                          : 'Repartido 15/30'}
                    </span>
                  </div>
                  {(exp.activeFrom || exp.activeUntil) && (
                    <p className="text-xs text-warning-400 mt-1.5 font-medium">
                      Vigente {exp.activeFrom ? `desde ${isoDay(exp.activeFrom)}` : ''}
                      {exp.activeFrom && exp.activeUntil ? ' ' : ''}
                      {exp.activeUntil ? `hasta ${isoDay(exp.activeUntil)}` : ''}
                    </p>
                  )}
                  {exp.description && <p className="text-xs text-text-muted mt-1.5">{exp.description}</p>}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-default/60">
                  <div className="text-right">
                    <div className="text-lg sm:text-xl font-extrabold text-text-primary font-mono tabular-nums">
                      {formatCurrency(exp.amount)}
                    </div>
                    <div className="text-xs text-text-muted">al mes</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(exp)}
                      className="p-2 text-text-muted hover:text-brand-400 transition-colors rounded-xl hover:bg-brand-500/10 cursor-pointer border border-border-default/60 bg-surface-50"
                      title="Editar gasto"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(exp.id)}
                      className="p-2 text-text-muted hover:text-danger-400 transition-colors rounded-xl hover:bg-danger-500/10 cursor-pointer border border-border-default/60 bg-surface-50"
                      title="Eliminar gasto"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear Gasto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                {editingId ? (
                  <>
                    <svg className="h-5 w-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Editar Gasto</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Registrar Gasto Recurrente</span>
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Concepto del Gasto</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  placeholder="Ej. Arriendo Departamento / Supermercado"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Monto Mensual ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.icon ? `${c.icon} ` : ''}{c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">¿En qué corte lo pagas?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'quincena', label: 'Quincena (15)' },
                    { value: 'fin_de_mes', label: 'Fin de Mes (30)' },
                    { value: 'ambas', label: 'Repartido 50/50' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPaymentTiming(opt.value)}
                      className={`rounded-xl border p-2 text-xs font-medium cursor-pointer ${
                        paymentTiming === opt.value
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-border-default bg-surface-100 text-text-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Vigencia en el cronograma (opcional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[11px] text-text-muted mb-1">Desde</span>
                    <input
                      type="date"
                      value={activeFrom}
                      onChange={(e) => setActiveFrom(e.target.value)}
                      className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-text-muted mb-1">Hasta</span>
                    <input
                      type="date"
                      value={activeUntil}
                      onChange={(e) => setActiveUntil(e.target.value)}
                      className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-text-muted">
                  Ej. un gasto que termina en diciembre o empieza el próximo mes. Vacío = siempre.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border-default bg-surface-100 p-3">
                <input
                  type="checkbox"
                  id="isEssential"
                  checked={isEssential}
                  onChange={(e) => setIsEssential(e.target.checked)}
                  className="rounded border-border-default text-brand-500 focus:ring-brand-500"
                />
                <label htmlFor="isEssential" className="text-xs font-medium text-text-primary cursor-pointer">
                  Este es un gasto esencial e imprescindible
                </label>
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
                  className="rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : editingId ? 'Actualizar Gasto 💾' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
