/**
 * Export utilities for financial reports — CSV download & print-to-PDF.
 */

interface CsvRow {
  [key: string]: string | number;
}

/** Download an array of objects as a CSV file */
export function downloadCsv(rows: CsvRow[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h];
        const str = String(val ?? '');
        // Escape commas and quotes
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Open the browser print dialog scoped to a specific element (print-to-PDF) */
export function printElementAsPdf(elementId: string, title: string) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; color: #1a1a1a; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .subtitle { font-size: 12px; color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #e5e5e5; }
        th { background: #f5f5f5; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .bold { font-weight: 700; }
        .green { color: #16a34a; }
        .red { color: #dc2626; }
        .yellow { color: #d97706; }
        .totals { border-top: 2px solid #333; font-weight: 700; }
        .section { margin-top: 20px; }
        .metric-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; }
        .metric-card { border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px; }
        .metric-card h3 { font-size: 13px; margin-bottom: 8px; }
        .metric-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
        .metric-label { color: #666; }
        .timestamp { font-size: 10px; color: #999; margin-top: 20px; text-align: right; }
        @media print { body { padding: 12px; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="subtitle">PlanivueHub — ${new Date().toLocaleDateString()}</div>
      ${el.innerHTML}
      <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
