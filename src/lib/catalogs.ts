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
  color?: string | null; // hex pastel para pintar tarjetas y badges
}

/** Paleta pastel disponible en el admin para asignar a cada opción. */
export const PASTEL_PALETTE: { name: string; hex: string }[] = [
  { name: 'Rosa', hex: '#F9A8B8' },
  { name: 'Coral', hex: '#F5A79B' },
  { name: 'Durazno', hex: '#FBC490' },
  { name: 'Amarillo', hex: '#F7DC8D' },
  { name: 'Menta', hex: '#B7E4A7' },
  { name: 'Aqua', hex: '#8FD6C7' },
  { name: 'Celeste', hex: '#9CC9F5' },
  { name: 'Lila', hex: '#B5B2F0' },
  { name: 'Orquídea', hex: '#E3A8E8' },
  { name: 'Arena', hex: '#D3C7A2' },
  { name: 'Gris', hex: '#C9CDD6' },
];

/**
 * Estilo inline para teñir una tarjeta/badge con el color pastel de su
 * categoría. Se usa junto con la clase CSS `cat-tint` (global.css), que
 * ajusta la intensidad según el tema claro/oscuro vía color-mix.
 */
export const catalogTint = (color?: string | null) =>
  (color ? { '--cat-color': color } : {}) as Record<string, string>;

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
    { value: 'housing', label: 'Vivienda / Arriendo', icon: '🏠', color: '#9CC9F5' },
    { value: 'food', label: 'Alimentación / Supermercado', icon: '🛒', color: '#B7E4A7' },
    { value: 'transport', label: 'Transporte / Gasolina', icon: '🚗', color: '#FBC490' },
    { value: 'utilities', label: 'Servicios Básicos / Internet', icon: '💡', color: '#F7DC8D' },
    { value: 'health', label: 'Salud y Medicina', icon: '🏥', color: '#F9A8B8' },
    { value: 'education', label: 'Educación', icon: '📚', color: '#B5B2F0' },
    { value: 'entertainment', label: 'Entretenimiento / Salidas', icon: '🎬', color: '#E3A8E8' },
    { value: 'insurance', label: 'Seguros', icon: '🛡️', color: '#8FD6C7' },
    { value: 'savings', label: 'Ahorro', icon: '💰', color: '#B7E4A7' },
    { value: 'other', label: 'Otros Gastos', icon: '📦', color: '#C9CDD6' },
  ],
  debt_type: [
    { value: 'credit_card', label: 'Tarjeta de Crédito', icon: '💳', color: '#F9A8B8' },
    { value: 'biess_quirografario', label: 'BIESS Quirografario', icon: '🏛️', color: '#9CC9F5' },
    { value: 'biess_hipotecario', label: 'BIESS Hipotecario', icon: '🏡', color: '#8FD6C7' },
    { value: 'personal_loan', label: 'Préstamo Personal / Bancario', icon: '🏦', color: '#FBC490' },
    { value: 'auto_loan', label: 'Crédito Automotriz', icon: '🚙', color: '#F7DC8D' },
    { value: 'student_loan', label: 'Crédito Educativo', icon: '🎓', color: '#B5B2F0' },
    { value: 'mortgage', label: 'Hipoteca', icon: '🏘️', color: '#D3C7A2' },
    { value: 'other', label: 'Otro', icon: '📄', color: '#C9CDD6' },
  ],
  savings_category: [
    { value: 'emergency', label: 'Fondo de Emergencia', icon: '🛡️', color: '#F5A79B' },
    { value: 'vacation', label: 'Vacaciones', icon: '✈️', color: '#9CC9F5' },
    { value: 'education', label: 'Educación', icon: '🎓', color: '#B5B2F0' },
    { value: 'housing', label: 'Vivienda', icon: '🏠', color: '#FBC490' },
    { value: 'vehicle', label: 'Vehículo', icon: '🚗', color: '#F7DC8D' },
    { value: 'retirement', label: 'Jubilación', icon: '🏖️', color: '#8FD6C7' },
    { value: 'other', label: 'Otro', icon: '🎯', color: '#C9CDD6' },
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
