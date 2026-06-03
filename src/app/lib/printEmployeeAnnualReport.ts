// Génère le bilan annuel d'un employé (synthèse + détail mensuel) dans une fenêtre
// dédiée et déclenche l'impression. Le composant appelant fournit des libellés/valeurs
// déjà traduits/formatés — ce helper reste purement présentation.

export interface AnnualColumn {
  label: string;
  align?: "left" | "right";
}

export interface AnnualRow {
  cells: string[];
  total?: boolean;
}

export interface EmployeeAnnualReportData {
  docTitle: string;
  fullName: string;
  subtitle: string;
  matriculeLabel: string;
  matricule: string;
  yearLabel: string;
  year: string;
  summaryTitle: string;
  summary: { label: string; value: string }[];
  monthlyTitle: string;
  columns: AnnualColumn[];
  rows: AnnualRow[];
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

function renderSummary(data: EmployeeAnnualReportData): string {
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

function renderMonthly(data: EmployeeAnnualReportData): string {
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
                return `<td class="${align.trim()}">${esc(cell)}</td>`;
              })
              .join("");
            return `<tr class="${r.total ? "total" : ""}">${tds}</tr>`;
          })
          .join("");
  return `
    <section class="block">
      <h2>${esc(data.monthlyTitle)}</h2>
      <table class="monthly">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </section>`;
}

export function printEmployeeAnnualReport(data: EmployeeAnnualReportData): void {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return;

  const origin = window.location.origin;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${esc(data.docTitle)} — ${esc(data.fullName)} — ${esc(data.year)}</title>
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
  header.doc .doc-gen { font-size: 10px; color: #6b7280; margin-top: 2px; }

  .identity {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 6px;
  }
  .identity .name { font-size: 20px; font-weight: 700; }
  .identity .sub { font-size: 13px; color: #4b5563; }
  .identity .matricule { font-size: 11px; color: #6b7280; }
  .year {
    font-size: 14px;
    font-weight: 700;
    color: #be123c;
    margin-bottom: 16px;
  }
  .year .year-label { color: #6b7280; font-weight: 400; font-size: 12px; }

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
    flex: 1 1 140px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 8px 10px;
  }
  .stat-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
  .stat-value { display: block; font-size: 15px; font-weight: 700; margin-top: 2px; }

  table.monthly { width: 100%; border-collapse: collapse; }
  table.monthly th, table.monthly td {
    text-align: left;
    padding: 5px 8px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  table.monthly thead th {
    background: #f8fafc;
    color: #374151;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: .03em;
  }
  table.monthly .right { text-align: right; }
  table.monthly tr.total td {
    border-top: 2px solid #e5e7eb;
    font-weight: 700;
    background: #fafafa;
  }
  table.monthly .empty { text-align: center; color: #9ca3af; padding: 16px; }

  @media print {
    body { padding: 0; }
    @page { margin: 14mm; }
    table.monthly thead { display: table-header-group; }
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
      <div class="doc-gen">${esc(data.generatedOn)}</div>
    </div>
  </header>

  <div class="identity">
    <span class="name">${esc(data.fullName)}</span>
    <span class="sub">${esc(data.subtitle)}</span>
    <span class="matricule">${esc(data.matriculeLabel)}: ${esc(data.matricule)}</span>
  </div>
  <div class="year"><span class="year-label">${esc(data.yearLabel)}:</span> ${esc(data.year)}</div>

  ${renderSummary(data)}
  ${renderMonthly(data)}

  <script>
    window.onload = function () {
      setTimeout(function () { window.focus(); window.print(); }, 350);
    };
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
