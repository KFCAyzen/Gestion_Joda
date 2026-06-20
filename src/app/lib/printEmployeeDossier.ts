// Génère un dossier employé imprimable (profil détaillé + synthèse + historique)
// dans une fenêtre dédiée et déclenche l'impression. Le composant appelant fournit
// des libellés/valeurs déjà traduits — ce helper reste purement présentation.

import { PrintAction, downloadHtmlDocAsPdf, pdfFilename } from "./htmlDocToPdf";

export interface DossierSection {
  title: string;
  rows: { label: string; value: string }[];
}

export interface DossierHistoryRow {
  date: string;
  type: string;
  detail: string;
  amount: string;
}

export interface EmployeeDossierData {
  docTitle: string;
  fullName: string;
  subtitle: string;
  matriculeLabel: string;
  matricule: string;
  statusLabel: string;
  profileTitle: string;
  sections: DossierSection[];
  statsTitle: string;
  stats: { label: string; value: string }[];
  notesTitle: string;
  notes: string;
  historyTitle: string;
  historyHeaders: { date: string; type: string; detail: string; amount: string };
  history: DossierHistoryRow[];
  historyEmpty: string;
  generatedOn: string;
}

const COMPANY = {
  name: 'JODA COMPANY',
  tagline: "Gestion des bourses d'études en Chine",
  niu: 'M022517611037A',
};

function esc(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSection(section: DossierSection): string {
  const rows = section.rows
    .map(
      (r) => `
      <tr>
        <th>${esc(r.label)}</th>
        <td>${esc(r.value)}</td>
      </tr>`
    )
    .join('');
  return `
    <section class="block">
      <h2>${esc(section.title)}</h2>
      <table class="kv">${rows}</table>
    </section>`;
}

function renderStats(data: EmployeeDossierData): string {
  if (data.stats.length === 0) return '';
  const cells = data.stats
    .map(
      (s) => `
      <div class="stat">
        <span class="stat-label">${esc(s.label)}</span>
        <span class="stat-value">${esc(s.value)}</span>
      </div>`
    )
    .join('');
  return `
    <section class="block">
      <h2>${esc(data.statsTitle)}</h2>
      <div class="stats">${cells}</div>
    </section>`;
}

function renderHistory(data: EmployeeDossierData): string {
  const body =
    data.history.length === 0
      ? `<tr><td colspan="4" class="empty">${esc(data.historyEmpty)}</td></tr>`
      : data.history
          .map(
            (h) => `
        <tr>
          <td class="nowrap">${esc(h.date)}</td>
          <td class="nowrap">${esc(h.type)}</td>
          <td>${esc(h.detail)}</td>
          <td class="right nowrap">${esc(h.amount)}</td>
        </tr>`
          )
          .join('');
  return `
    <section class="block">
      <h2>${esc(data.historyTitle)}</h2>
      <table class="history">
        <thead>
          <tr>
            <th>${esc(data.historyHeaders.date)}</th>
            <th>${esc(data.historyHeaders.type)}</th>
            <th>${esc(data.historyHeaders.detail)}</th>
            <th class="right">${esc(data.historyHeaders.amount)}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </section>`;
}

export function printEmployeeDossier(data: EmployeeDossierData, action: PrintAction = 'print'): void {
  if (typeof window === 'undefined') return;

  const origin = window.location.origin;
  const sectionsHtml = data.sections.map(renderSection).join('');
  const notesHtml = data.notes.trim()
    ? `<section class="block"><h2>${esc(data.notesTitle)}</h2><p class="notes">${esc(
        data.notes
      )}</p></section>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${esc(data.docTitle)} — ${esc(data.fullName)}</title>
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
    margin-bottom: 16px;
  }
  .identity .name { font-size: 20px; font-weight: 700; }
  .identity .sub { font-size: 13px; color: #4b5563; }
  .identity .matricule { font-size: 11px; color: #6b7280; }
  .identity .status {
    margin-left: auto;
    font-size: 11px;
    font-weight: 600;
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    padding: 2px 10px;
  }

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

  table.kv { width: 100%; border-collapse: collapse; }
  table.kv th, table.kv td {
    text-align: left;
    vertical-align: top;
    padding: 4px 8px;
    border-bottom: 1px solid #f1f5f9;
    width: 50%;
  }
  table.kv th { color: #6b7280; font-weight: 600; }

  .stats { display: flex; flex-wrap: wrap; gap: 10px; }
  .stat {
    flex: 1 1 140px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 8px 10px;
  }
  .stat-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
  .stat-value { display: block; font-size: 15px; font-weight: 700; margin-top: 2px; }

  .notes { margin: 0; white-space: pre-wrap; }

  table.history { width: 100%; border-collapse: collapse; }
  table.history th, table.history td {
    text-align: left;
    padding: 5px 8px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 11px;
    vertical-align: top;
  }
  table.history thead th {
    background: #f8fafc;
    color: #374151;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: .03em;
  }
  table.history .right, .right { text-align: right; }
  .nowrap { white-space: nowrap; }
  table.history .empty { text-align: center; color: #9ca3af; padding: 16px; }

  @media print {
    body { padding: 0; }
    @page { margin: 14mm; }
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
    <span class="status">${esc(data.statusLabel)}</span>
  </div>

  ${sectionsHtml}
  ${notesHtml}
  ${renderStats(data)}
  ${renderHistory(data)}

  <script>
    window.onload = function () {
      setTimeout(function () { window.focus(); window.print(); }, 350);
    };
  </script>
</body>
</html>`;

  if (action === 'download') {
    void downloadHtmlDocAsPdf(html, pdfFilename(data.docTitle, data.fullName));
    return;
  }

  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
