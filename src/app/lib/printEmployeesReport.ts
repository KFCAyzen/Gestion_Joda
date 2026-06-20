// Génère un rapport global des employés imprimable (synthèse + tableau de l'effectif)
// dans une fenêtre dédiée et déclenche l'impression. Le composant appelant fournit
// des libellés/valeurs déjà traduits — ce helper reste purement présentation.

import { PrintAction, downloadHtmlDocAsPdf, pdfFilename } from "./htmlDocToPdf";

export interface RosterColumn {
  key: string;
  label: string;
  align?: "left" | "right";
}

export interface RosterRow {
  cells: string[];
}

export interface EmployeesReportData {
  docTitle: string;
  subtitle: string;
  summaryTitle: string;
  summary: { label: string; value: string }[];
  tableTitle: string;
  columns: RosterColumn[];
  rows: RosterRow[];
  emptyLabel: string;
  generatedOn: string;
}

const COMPANY = {
  name: "JODA COMPANY",
  tagline: "Gestion des bourses d'études en Chine",
  niu: "M022517611037A",
};

function esc(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSummary(data: EmployeesReportData): string {
  if (data.summary.length === 0) return "";
  const cells = data.summary
    .map(
      (s) => `
      <div class="stat">
        <span class="stat-label">${esc(s.label)}</span>
        <span class="stat-value">${esc(s.value)}</span>
      </div>`
    )
    .join("");
  return `
    <section class="block">
      <h2>${esc(data.summaryTitle)}</h2>
      <div class="stats">${cells}</div>
    </section>`;
}

function renderTable(data: EmployeesReportData): string {
  const head = data.columns
    .map((c) => `<th class="${c.align === "right" ? "right" : ""}">${esc(c.label)}</th>`)
    .join("");
  const body =
    data.rows.length === 0
      ? `<tr><td colspan="${data.columns.length}" class="empty">${esc(data.emptyLabel)}</td></tr>`
      : data.rows
          .map((r) => {
            const tds = r.cells
              .map((cell, i) => {
                const col = data.columns[i];
                const align = col?.align === "right" ? " right" : "";
                return `<td class="nowrap${align}">${esc(cell)}</td>`;
              })
              .join("");
            return `<tr>${tds}</tr>`;
          })
          .join("");
  return `
    <section class="block">
      <h2>${esc(data.tableTitle)}</h2>
      <table class="roster">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </section>`;
}

export function printEmployeesReport(data: EmployeesReportData, action: PrintAction = "print"): void {
  if (typeof window === "undefined") return;

  const origin = window.location.origin;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${esc(data.docTitle)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1f2937;
    margin: 0;
    padding: 28px 32px;
    font-size: 12px;
    line-height: 1.45;
  }
  header.doc {
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 2px solid #be123c;
    padding-bottom: 14px;
    margin-bottom: 18px;
  }
  header.doc img { height: 46px; width: auto; }
  header.doc .company-name { font-size: 18px; font-weight: 700; color: #be123c; }
  header.doc .company-tag { font-size: 11px; color: #6b7280; }
  header.doc .doc-meta { margin-left: auto; text-align: right; }
  header.doc .doc-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
  header.doc .doc-sub { font-size: 11px; color: #4b5563; margin-top: 2px; }
  header.doc .doc-gen { font-size: 10px; color: #6b7280; margin-top: 2px; }

  .block { margin-bottom: 18px; break-inside: avoid; }
  .block h2 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: #be123c;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 4px;
    margin: 0 0 8px;
  }

  .stats { display: flex; flex-wrap: wrap; gap: 10px; }
  .stat {
    flex: 1 1 130px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 8px 10px;
  }
  .stat-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
  .stat-value { display: block; font-size: 15px; font-weight: 700; margin-top: 2px; }

  table.roster { width: 100%; border-collapse: collapse; }
  table.roster th, table.roster td {
    text-align: left;
    padding: 5px 8px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 11px;
    vertical-align: top;
  }
  table.roster thead th {
    background: #f8fafc;
    color: #374151;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: .03em;
  }
  table.roster tbody tr:nth-child(even) { background: #fafafa; }
  .right { text-align: right; }
  .nowrap { white-space: nowrap; }
  table.roster .empty { text-align: center; color: #9ca3af; padding: 16px; }

  @media print {
    body { padding: 0; }
    @page { margin: 12mm; }
    table.roster thead { display: table-header-group; }
  }
</style>
</head>
<body>
  <header class="doc">
    <img src="${origin}/Logo.png" alt="${esc(COMPANY.name)}" onerror="this.style.display='none'" />
    <div>
      <div class="company-name">${esc(COMPANY.name)}</div>
      <div class="company-tag">${esc(COMPANY.tagline)}</div>
      <div class="company-tag">NIU : ${esc(COMPANY.niu)}</div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">${esc(data.docTitle)}</div>
      <div class="doc-sub">${esc(data.subtitle)}</div>
      <div class="doc-gen">${esc(data.generatedOn)}</div>
    </div>
  </header>

  ${renderSummary(data)}
  ${renderTable(data)}

  <script>
    window.onload = function () {
      setTimeout(function () { window.focus(); window.print(); }, 350);
    };
  </script>
</body>
</html>`;

  if (action === "download") {
    void downloadHtmlDocAsPdf(html, pdfFilename(data.docTitle));
    return;
  }

  const win = window.open("", "_blank", "width=1000,height=1100");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
