// Génère une fiche d'évaluation employé imprimable (notes par critères + synthèse)
// dans une fenêtre dédiée et déclenche l'impression. Le composant appelant fournit
// des libellés/valeurs déjà traduits — ce helper reste purement présentation.

export interface EvaluationCriterionRow {
  label: string;
  score: number; // 1..5
  max: number; // 5
}

export interface EvaluationTextBlock {
  title: string;
  body: string;
}

export interface EmployeeEvaluationData {
  docTitle: string;
  fullName: string;
  subtitle: string;
  matriculeLabel: string;
  matricule: string;
  dateLabel: string;
  date: string;
  periodLabel: string;
  period: string;
  evaluatorLabel: string;
  evaluator: string;
  criteriaTitle: string;
  criteria: EvaluationCriterionRow[];
  overallLabel: string;
  overall: string; // ex "4,3 / 5"
  scoreHeader: string;
  blocks: EvaluationTextBlock[];
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

function renderStars(score: number, max: number): string {
  const full = Math.max(0, Math.min(max, Math.round(score)));
  let out = "";
  for (let i = 0; i < max; i++) {
    out += `<span class="star ${i < full ? "on" : ""}">&#9733;</span>`;
  }
  return out;
}

function renderCriteria(data: EmployeeEvaluationData): string {
  const rows = data.criteria
    .map(
      (c) => `
      <tr>
        <th>${esc(c.label)}</th>
        <td class="stars">${renderStars(c.score, c.max)}</td>
        <td class="score">${esc(String(c.score))} / ${esc(String(c.max))}</td>
      </tr>`
    )
    .join("");
  return `
    <section class="block">
      <h2>${esc(data.criteriaTitle)}</h2>
      <table class="crit">
        <thead>
          <tr><th>${esc(data.criteriaTitle)}</th><th></th><th class="score">${esc(
    data.scoreHeader
  )}</th></tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <th>${esc(data.overallLabel)}</th>
            <td class="stars">${renderStars(parseFloat(data.overall) || 0, 5)}</td>
            <td class="score overall">${esc(data.overall)}</td>
          </tr>
        </tfoot>
      </table>
    </section>`;
}

function renderBlocks(data: EmployeeEvaluationData): string {
  return data.blocks
    .filter((b) => b.body.trim())
    .map(
      (b) => `
      <section class="block">
        <h2>${esc(b.title)}</h2>
        <p class="text">${esc(b.body)}</p>
      </section>`
    )
    .join("");
}

export function printEmployeeEvaluation(data: EmployeeEvaluationData): void {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return;

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
  .meta { font-size: 12px; color: #374151; margin-bottom: 16px; }
  .meta span { margin-right: 16px; }
  .meta .lbl { color: #6b7280; }

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

  table.crit { width: 100%; border-collapse: collapse; }
  table.crit th, table.crit td {
    text-align: left;
    vertical-align: middle;
    padding: 6px 8px;
    border-bottom: 1px solid #f1f5f9;
  }
  table.crit thead th {
    color: #6b7280;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .03em;
  }
  table.crit tbody th { font-weight: 600; width: 40%; }
  table.crit .stars { white-space: nowrap; }
  table.crit .star { color: #d1d5db; font-size: 15px; letter-spacing: 1px; }
  table.crit .star.on { color: #f59e0b; }
  table.crit .score { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  table.crit tfoot th, table.crit tfoot td {
    border-top: 2px solid #e5e7eb;
    border-bottom: none;
    padding-top: 8px;
    font-weight: 700;
  }
  table.crit .overall { color: #be123c; font-size: 14px; }

  .text { margin: 0; white-space: pre-wrap; }

  .signatures {
    display: flex;
    gap: 40px;
    margin-top: 40px;
    break-inside: avoid;
  }
  .signatures .sig { flex: 1; }
  .signatures .sig-line { border-top: 1px solid #9ca3af; margin-top: 36px; padding-top: 4px; font-size: 11px; color: #6b7280; }

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
  <div class="meta">
    <span><span class="lbl">${esc(data.dateLabel)}:</span> ${esc(data.date)}</span>
    <span><span class="lbl">${esc(data.periodLabel)}:</span> ${esc(data.period)}</span>
    <span><span class="lbl">${esc(data.evaluatorLabel)}:</span> ${esc(data.evaluator)}</span>
  </div>

  ${renderCriteria(data)}
  ${renderBlocks(data)}

  <div class="signatures">
    <div class="sig"><div class="sig-line">${esc(data.evaluatorLabel)}</div></div>
    <div class="sig"><div class="sig-line">${esc(data.fullName)}</div></div>
  </div>

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
