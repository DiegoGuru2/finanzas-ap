/**
 * ═══════════════════════════════════════════
 * ProyecAhorro — Catálogos de la aplicación
 * ═══════════════════════════════════════════
 *
 * Valores por defecto de los selects (categorías de gastos, tipos de deuda,
 * categorías de ahorro). El admin puede agregarlos/modificarlos en
 * /admin/catalogs; estos defaults se usan como semilla inicial y como
 * respaldo si el API de catálogos no responde.
 */

export type CatalogKey = 'expense_category' | 'debt_type' | 'savings_category';

export interface CatalogOption {
  value: string;
  label: string;
  icon?: string | null;
}

export const CATALOG_META: Record<CatalogKey, { title: string; description: string }> = {
  expense_category: {
    title: 'Categorías de Gastos',
    description: 'Opciones del select "Categoría" al registrar un gasto.',
  },
  debt_type: {
    title: 'Tipos de Deuda',
    description: 'Opciones del select "Tipo de Obligación" al registrar una deuda.',
  },
  savings_category: {
    title: 'Categorías de Ahorro',
    description: 'Opciones de categoría al crear una meta de ahorro.',
  },
};

export const DEFAULT_CATALOGS: Record<CatalogKey, CatalogOption[]> = {
  expense_category: [
    { value: 'housing', label: 'Vivienda / Arriendo', icon: '🏠' },
    { value: 'food', label: 'Alimentación / Supermercado', icon: '🛒' },
    { value: 'transport', label: 'Transporte / Gasolina', icon: '🚗' },
    { value: 'utilities', label: 'Servicios Básicos / Internet', icon: '💡' },
    { value: 'health', label: 'Salud y Medicina', icon: '🏥' },
    { value: 'education', label: 'Educación', icon: '📚' },
    { value: 'entertainment', label: 'Entretenimiento / Salidas', icon: '🎬' },
    { value: 'insurance', label: 'Seguros', icon: '🛡️' },
    { value: 'savings', label: 'Ahorro', icon: '💰' },
    { value: 'other', label: 'Otros Gastos', icon: '📦' },
  ],
  debt_type: [
    { value: 'credit_card', label: 'Tarjeta de Crédito', icon: '💳' },
    { value: 'biess_quirografario', label: 'BIESS Quirografario', icon: '🏛️' },
    { value: 'biess_hipotecario', label: 'BIESS Hipotecario', icon: '🏡' },
    { value: 'personal_loan', label: 'Préstamo Personal / Bancario', icon: '🏦' },
    { value: 'auto_loan', label: 'Crédito Automotriz', icon: '🚙' },
    { value: 'student_loan', label: 'Crédito Educativo', icon: '🎓' },
    { value: 'mortgage', label: 'Hipoteca', icon: '🏘️' },
    { value: 'other', label: 'Otro', icon: '📄' },
  ],
  savings_category: [
    { value: 'emergency', label: 'Fondo de Emergencia', icon: '🛡️' },
    { value: 'vacation', label: 'Vacaciones', icon: '✈️' },
    { value: 'education', label: 'Educación', icon: '🎓' },
    { value: 'housing', label: 'Vivienda', icon: '🏠' },
    { value: 'vehicle', label: 'Vehículo', icon: '🚗' },
    { value: 'retirement', label: 'Jubilación', icon: '🏖️' },
    { value: 'other', label: 'Otro', icon: '🎯' },
  ],
};

export const CATALOG_KEYS = Object.keys(DEFAULT_CATALOGS) as CatalogKey[];

/**
 * Carga un catálogo desde el API con respaldo a los defaults.
 * Para usar en componentes React (client-side).
 */
export async function fetchCatalog(catalog: CatalogKey): Promise<CatalogOption[]> {
  try {
    const res = await fetch(`/api/catalogs?catalog=${catalog}`);
    const json = await res.json();
    const options = json?.data?.[catalog];
    if (Array.isArray(options) && options.length > 0) return options;
  } catch {
    // sin conexión o error: usar defaults
  }
  return DEFAULT_CATALOGS[catalog];
}
