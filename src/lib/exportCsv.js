/**
 * exportCsv.js — Exporta empleados a CSV (formato Excel-friendly).
 * Sin librerías externas. UTF-8 BOM para acentos en Excel.
 */

const escape = (val) => {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const exportEmployeesToCsv = (employees, filename = 'empleados.csv') => {
  const headers = ['numero_empleado', 'nombre', 'turno', 'ruta', 'colonia', 'referencia'];
  const rows = employees.map((emp) => headers.map((h) => escape(emp[h])).join(','));
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 200);
};
