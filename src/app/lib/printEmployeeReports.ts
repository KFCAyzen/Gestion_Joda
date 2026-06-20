// Compile les rapports journaliers d'un employé sur une période donnée en un
// document imprimable (une fenêtre dédiée) et déclenche l'impression. Le composant
// appelant fournit des libellés/valeurs déjà traduits — ce helper reste présentation.

import { PrintAction, downloadHtmlDocAsPdf, pdfFilename } from "./htmlDocToPdf";

export interface ReportEntry {
  date: string;
  hours: string;
  activities: string;
  observations: string;
  stats?: { label: string; value: string }[];
}

export interface WeeklyQuotaBlock {
  title: string;
  weekLabel: string;
  appelsLabel: string;
  rdvLabel: string;
  statusLabel: string;
  metLabel: string;
  notMetLabel: string;
  rows: { week: string; appels: string; rdv: string; met: boolean }[];
}

export interface EmployeeReportsData {
  docTitle: string;
  fullName: string;
  subtitle: string;
  matriculeLabel: string;
  matricule: string;
  periodLabel: string;
  period: string;
  summaryTitle: string;
  summary: { label: string; value: string }[];
  observationsLabel: string;
  entries: ReportEntry[];
  emptyLabel: string;
  generatedOn: string;
  weekly?: WeeklyQuotaBlock;
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

function renderSummary(data: EmployeeReportsData): string {
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

function renderWeekly(data: EmployeeReportsData): string {
  const w = data.weekly;
  if (!w || w.rows.length === 0) return "";
  const rows = w.rows
    .map(
      (r) => `
      <tr>
        <td>${esc(r.week)}</td>
        <td class="num">${esc(r.appels)}</td>
        <td class="num">${esc(r.rdv)}</td>
        <td class="status ${r.met ? "ok" : "ko"}">${esc(r.met ? w.metLabel : w.notMetLabel)}</td>
      </tr>`
    )
    .join("");
  return `
    <section class="block">
      <h2>${esc(w.title)}</h2>
      <table class="wq">
        <thead>
          <tr>
            <th>${esc(w.weekLabel)}</th>
            <th class="num">${esc(w.appelsLabel)}</th>
            <th class="num">${esc(w.rdvLabel)}</th>
            <th>${esc(w.statusLabel)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

function renderEntries(data: EmployeeReportsData): string {
  if (data.entries.length === 0) {
    return `<p class="empty">${esc(data.emptyLabel)}</p>`;
  }
  return data.entries
    .map(
      (e) => `
      <article class="report">
        <header class="report-head">
          <span class="report-date">${esc(e.date)}</span>
          <span class="report-hours">${esc(e.hours)}</span>
        </header>
        ${
          e.stats && e.stats.length > 0
            ? `<div class="report-stats">${e.stats
                .map(
                  (s) =>
                    `<span class="rs-chip"><span class="rs-label">${esc(s.label)}</span> ${esc(s.value)}</span>`
                )
                .join("")}</div>`
            : ""
        }
        <p class="report-act">${esc(e.activities)}</p>
        ${
          e.observations.trim()
            ? `<p class="report-obs"><span class="obs-label">${esc(
                data.observationsLabel
              )}:</span> ${esc(e.observations)}</p>`
            : ""
        }
      </article>`
    )
    .join("");
}

export function printEmployeeReports(data: EmployeeReportsData, action: PrintAction = "print"): void {
  if (typeof window === "undefined") return;

  const origin = window.location.origin;

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
    margin-bottom: 6px;
  }
  .identity .name { font-size: 20px; font-weight: 700; }
  .identity .sub { font-size: 13px; color: #4b5563; }
  .identity .matricule { font-size: 11px; color: #6b7280; }
  .period { font-size: 12px; color: #374151; margin-bottom: 16px; }
  .period .period-label { color: #6b7280; }

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

  .report {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
    break-inside: avoid;
  }
  .report-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 5px;
    margin-bottom: 6px;
  }
  .report-date { font-weight: 700; font-size: 13px; }
  .report-hours {
    font-size: 11px;
    font-weight: 600;
    color: #be123c;
    border: 1px solid #fecdd3;
    border-radius: 999px;
    padding: 1px 8px;
  }
  .report-stats { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 7px; }
  .rs-chip {
    font-size: 10px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 999px;
    padding: 1px 8px;
    font-weight: 600;
  }
  .rs-chip .rs-label { color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: .03em; }
  .report-act { margin: 0; white-space: pre-wrap; }
  .report-obs { margin: 6px 0 0; color: #4b5563; font-size: 11px; white-space: pre-wrap; }

  table.wq { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.wq th, table.wq td { border: 1px solid #e5e7eb; padding: 5px 8px; text-align: left; }
  table.wq th { background: #f8fafc; text-transform: uppercase; letter-spacing: .03em; font-size: 10px; color: #6b7280; }
  table.wq td.num, table.wq th.num { text-align: right; font-variant-numeric: tabular-nums; }
  table.wq td.status { font-weight: 700; }
  table.wq td.status.ok { color: #15803d; }
  table.wq td.status.ko { color: #be123c; }
  .report-obs .obs-label { font-weight: 600; text-transform: uppercase; letter-spacing: .03em; }
  .empty { text-align: center; color: #9ca3af; padding: 24px; }

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
  </div>
  <div class="period"><span class="period-label">${esc(data.periodLabel)}:</span> ${esc(data.period)}</div>

  ${renderSummary(data)}

  ${renderWeekly(data)}

  <section class="block">
    ${renderEntries(data)}
  </section>

  <script>
    window.onload = function () {
      setTimeout(function () { window.focus(); window.print(); }, 350);
    };
  </script>
</body>
</html>`;

  if (action === "download") {
    void downloadHtmlDocAsPdf(html, pdfFilename(data.docTitle, data.fullName));
    return;
  }

  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
