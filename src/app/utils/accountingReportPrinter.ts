import { fetchLogoBase64 } from "./logoLoader";

type ReportScope = "all" | "entrees" | "sorties";

type AccountingOperation = {
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "entree" | "sortie";
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

type ReportCurrency = "FCFA" | "USD";

function formatCurrency(amount: number, locale: string, currency: ReportCurrency = "FCFA"): string {
  const n = Math.round(amount).toLocaleString(currency === "USD" ? "en-US" : locale);
  return currency === "USD" ? `$${n}` : `${n} FCFA`;
}

function formatDate(date: string, locale: string): string {
  return new Date(date).toLocaleDateString(locale);
}

function buildJournalRows(ops: AccountingOperation[], locale: string, scope: ReportScope, currency: ReportCurrency): string {
  const filtered =
    scope === "entrees"
      ? ops.filter((o) => o.type === "entree")
      : scope === "sorties"
        ? ops.filter((o) => o.type === "sortie")
        : ops;

  if (filtered.length === 0) {
    return `
      <tr class="empty-row">
        <td colspan="7" style="padding:18px 14px;color:var(--ink-light);text-align:center;">
          Aucune opération sur la période sélectionnée.
        </td>
      </tr>
    `.trim();
  }

  let runningBalance = 0;
  return filtered
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((op, idx) => {
      runningBalance += op.type === "entree" ? op.amount : -op.amount;
      const credit = op.type === "entree" ? formatCurrency(op.amount, locale, currency) : "—";
      const debit = op.type === "sortie" ? formatCurrency(op.amount, locale, currency) : "—";
      return `
        <tr class="${op.type === "entree" ? "row-entree" : "row-sortie"}">
          <td class="mono">${String(idx + 1).padStart(3, "0")}</td>
          <td>${escapeHtml(formatDate(op.date, locale))}</td>
          <td>${escapeHtml(op.description)}</td>
          <td class="mono">${escapeHtml(op.category)}</td>
          <td class="mono right amount-entree">${escapeHtml(credit)}</td>
          <td class="mono right amount-sortie">${escapeHtml(debit)}</td>
          <td class="mono right">${escapeHtml(formatCurrency(runningBalance, locale, currency))}</td>
        </tr>
      `.trim();
    })
    .join("\n");
}

export async function printAccountingHtmlReport(params: {
  title: string;
  period: { start: string; end: string };
  entries: AccountingOperation[];
  summary: { totalEntrees: number; totalSorties: number; balance: number };
  scope: ReportScope;
  locale: string;
  currency?: ReportCurrency;
}) {
  const res = await fetch("/templates/rapport-comptable-template.html", { cache: "no-store" });
  if (!res.ok) throw new Error("Impossible de charger le template d'impression.");

  const template = await res.text();
  const { scope, locale } = params;
  const currency: ReportCurrency = params.currency ?? "FCFA";

  const scopeLabel = scope === "entrees" ? "Entrées uniquement" : scope === "sorties" ? "Sorties uniquement" : "Entrées & Sorties";
  const journalRows = buildJournalRows(params.entries, locale, scope, currency);

  const logoSrc = await fetchLogoBase64();
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="Joda Company" style="width:46px;height:46px;object-fit:contain;display:block;background:#fff;border-radius:10px;padding:4px;">`
    : `<div class="brand-mark"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>`;

  const html = template
    .replaceAll("{{LOGO_HTML}}", logoHtml)
    .replaceAll("{{DATE_EMISSION}}", escapeHtml(new Date().toLocaleDateString(locale)))
    .replaceAll("{{PERIODE_DEBUT}}", escapeHtml(formatDate(params.period.start, locale)))
    .replaceAll("{{PERIODE_FIN}}", escapeHtml(formatDate(params.period.end, locale)))
    .replaceAll("{{STATUT}}", escapeHtml(scopeLabel))
    .replaceAll("{{TOTAL_DEBITS}}", escapeHtml(formatCurrency(params.summary.totalSorties, locale, currency)))
    .replaceAll("{{TOTAL_CREDITS}}", escapeHtml(formatCurrency(params.summary.totalEntrees, locale, currency)))
    .replaceAll("{{SOLDE_FINAL}}", escapeHtml(formatCurrency(params.summary.balance, locale, currency)))
    .replaceAll("{{JOURNAL_ROWS}}", journalRows);

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Give the browser a tick to apply styles before printing.
  setTimeout(() => {
    win.print();
  }, 50);
}

