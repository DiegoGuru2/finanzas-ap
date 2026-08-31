import ExcelJS from 'exceljs';

export interface ExportPeriod {
  key: string;
  day: number;
  month: number;
  year: number;
  timing: 'quincena' | 'fin_de_mes';
  incomeAvailable: number;
}

export interface ExportRow {
  name: string;
  kind: 'debt' | 'expense';
  monthlyAmount: number;
  cells: Record<string, number>;
}

export interface ExportScheduleData {
  periods: ExportPeriod[];
  rows: ExportRow[];
  totals: Record<string, number>;
  remaining: Record<string, number>;
  monthlyIncome: { quincena: number; finDeMes: number };
  monthlyCommitment: { debts: number; expenses: number };
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export async function exportScheduleToExcel(data: ExportScheduleData, filename?: string) {
  const { periods, rows, totals, remaining, monthlyIncome, monthlyCommitment } = data;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ProyecAhorro';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Cronograma de Pagos', {
    views: [{ showGridLines: true }],
  });

  // Currency format
  const CURRENCY_FMT = '$#,##0.00;($#,##0.00);"-"';

  // Common styles
  const fontTitle: Partial<ExcelJS.Font> = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  const fontSubtitle: Partial<ExcelJS.Font> = { name: 'Arial', size: 10, italic: true, color: { argb: 'FFD1D5DB' } };
  const fontSection: Partial<ExcelJS.Font> = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1F2937' } };
  const fontHeader: Partial<ExcelJS.Font> = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const fontBody: Partial<ExcelJS.Font> = { name: 'Arial', size: 10, color: { argb: 'FF1F2937' } };
  const fontBold: Partial<ExcelJS.Font> = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF111827' } };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  };

  const totalCols = 3 + periods.length; // Concepto, Tipo, Monto Mensual + períodos

  // ─── 1. Header Banner ───
  worksheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = '💎 PROYECAHORRO — CRONOGRAMA FINANCIERO DE PAGOS';
  titleCell.font = fontTitle;
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 36;

  worksheet.mergeCells(2, 1, 2, totalCols);
  const subCell = worksheet.getCell(2, 1);
  subCell.value = `Generado el: ${new Date().toLocaleDateString('es-ES', { dateStyle: 'full' })} | Desarrollado por DG design`;
  subCell.font = fontSubtitle;
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3730A3' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(2).height = 20;

  worksheet.addRow([]); // Blank row

  // ─── 2. KPI Summary Cards ───
  const startKpiRow = 4;
  worksheet.mergeCells(startKpiRow, 1, startKpiRow, 2);
  worksheet.getCell(startKpiRow, 1).value = '📊 RESUMEN MENSUAL';
  worksheet.getCell(startKpiRow, 1).font = fontSection;
  worksheet.getCell(startKpiRow, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };

  const kpis = [
    ['Ingreso Quincenal (Día 15)', monthlyIncome.quincena],
    ['Ingreso Fin de Mes', monthlyIncome.finDeMes],
    ['Total Ingreso Líquido', monthlyIncome.quincena + monthlyIncome.finDeMes],
    ['Compromiso en Deudas', monthlyCommitment.debts],
    ['Compromiso en Gastos', monthlyCommitment.expenses],
    ['Total Compromisos', monthlyCommitment.debts + monthlyCommitment.expenses],
    [
      'Excedente / Ahorro Mensual',
      monthlyIncome.quincena + monthlyIncome.finDeMes - (monthlyCommitment.debts + monthlyCommitment.expenses),
    ],
  ];

  kpis.forEach(([label, val], idx) => {
    const rIdx = startKpiRow + 1 + idx;
    const labelCell = worksheet.getCell(rIdx, 1);
    const valCell = worksheet.getCell(rIdx, 2);

    labelCell.value = label;
    labelCell.font = fontBody;
    labelCell.border = thinBorder;

    valCell.value = val;
    valCell.font = idx === 6 ? { ...fontBold, color: { argb: 'FF047857' } } : fontBold;
    valCell.numFmt = CURRENCY_FMT;
    valCell.alignment = { horizontal: 'right' };
    valCell.border = thinBorder;

    if (idx === 6) {
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    }
  });

  worksheet.addRow([]);
  worksheet.addRow([]);

  // ─── 3. Schedule Matrix Headers ───
  const matrixHeaderRow = worksheet.addRow([
    'Concepto / Obligación',
    'Tipo',
    'Monto Mensual',
    ...periods.map((p) => `${p.timing === 'quincena' ? '15' : 'Fin'} ${MONTH_SHORT[p.month]} ${p.year}`),
  ]);

  matrixHeaderRow.height = 28;
  matrixHeaderRow.eachCell((cell, colNum) => {
    cell.font = fontHeader;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colNum <= 3 ? 'FF4F46E5' : colNum % 2 === 0 ? 'FF4338CA' : 'FF3730A3' },
    };
    cell.alignment = { vertical: 'middle', horizontal: colNum <= 2 ? 'left' : 'right' };
    cell.border = thinBorder;
  });

  // ─── 4. Data Rows: Deudas ───
  const debtRows = rows.filter((r) => r.kind === 'debt');
  const expenseRows = rows.filter((r) => r.kind === 'expense');

  if (debtRows.length > 0) {
    const secRow = worksheet.addRow(['💳 DEUDAS Y TARJETAS DE CRÉDITO']);
    worksheet.mergeCells(secRow.number, 1, secRow.number, totalCols);
    secRow.getCell(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF4338CA' } };
    secRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
    secRow.height = 22;

    debtRows.forEach((r, idx) => {
      const rowData = [
        r.name,
        'Deuda',
        r.monthlyAmount,
        ...periods.map((p) => r.cells[p.key] || 0),
      ];
      const row = worksheet.addRow(rowData);
      row.height = 20;

      row.eachCell((cell, colNum) => {
        cell.font = fontBody;
        cell.border = thinBorder;
        if (colNum >= 3) {
          cell.numFmt = CURRENCY_FMT;
          cell.alignment = { horizontal: 'right' };
        }
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }
      });
    });
  }

  // ─── 5. Data Rows: Gastos ───
  if (expenseRows.length > 0) {
    const secRow = worksheet.addRow(['📋 GASTOS FIJOS Y VARIABLES']);
    worksheet.mergeCells(secRow.number, 1, secRow.number, totalCols);
    secRow.getCell(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0D9488' } };
    secRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
    secRow.height = 22;

    expenseRows.forEach((r, idx) => {
      const rowData = [
        r.name,
        'Gasto',
        r.monthlyAmount,
        ...periods.map((p) => r.cells[p.key] || 0),
      ];
      const row = worksheet.addRow(rowData);
      row.height = 20;

      row.eachCell((cell, colNum) => {
        cell.font = fontBody;
        cell.border = thinBorder;
        if (colNum >= 3) {
          cell.numFmt = CURRENCY_FMT;
          cell.alignment = { horizontal: 'right' };
        }
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }
      });
    });
  }

  worksheet.addRow([]); // Blank row separator

  // ─── 6. Totals Row ───
  const totalsRowData = [
    '🔴 TOTAL A PAGAR POR CORTE',
    '',
    monthlyCommitment.debts + monthlyCommitment.expenses,
    ...periods.map((p) => totals[p.key] || 0),
  ];
  const totRow = worksheet.addRow(totalsRowData);
  totRow.height = 24;
  totRow.eachCell((cell, colNum) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF991B1B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    cell.border = thinBorder;
    if (colNum >= 3) {
      cell.numFmt = CURRENCY_FMT;
      cell.alignment = { horizontal: 'right' };
    }
  });

  // ─── 7. Remaining Income Row ───
  const remainingRowData = [
    '🟢 SALDO DISPONIBLE (EN MANO)',
    '',
    monthlyIncome.quincena + monthlyIncome.finDeMes - (monthlyCommitment.debts + monthlyCommitment.expenses),
    ...periods.map((p) => remaining[p.key] || 0),
  ];
  const remRow = worksheet.addRow(remainingRowData);
  remRow.height = 24;
  remRow.eachCell((cell, colNum) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF065F46' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    cell.border = thinBorder;
    if (colNum >= 3) {
      cell.numFmt = CURRENCY_FMT;
      cell.alignment = { horizontal: 'right' };
    }
  });

  // ─── Column Widths Auto-sizing ───
  worksheet.getColumn(1).width = 32; // Concepto
  worksheet.getColumn(2).width = 12; // Tipo
  worksheet.getColumn(3).width = 18; // Monto Mensual
  for (let i = 4; i <= totalCols; i++) {
    worksheet.getColumn(i).width = 16;
  }

  // ─── Generate & Download ───
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const nowStr = new Date().toISOString().slice(0, 10);
  const outName = filename || `cronograma_proyecahorro_${nowStr}.xlsx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', outName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
