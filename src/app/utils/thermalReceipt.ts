export interface ThermalReceiptData {
    refId: string;
    date: string;
    studentName?: string;
    service: string;
    tranche?: string;
    montant: number;
    penalite?: number;
    description?: string;
    type?: string;
    footerNote?: string;
}

export function printThermalReceipt(data: ThermalReceiptData) {
    const total = data.montant + (data.penalite || 0);
    const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA";
    const authCode = data.refId.slice(-8).toUpperCase();
    const now = new Date();
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const row = (label: string, value: string, valueClass = "") =>
        `<div class="row"><span class="row-label">${label}</span><span class="row-value ${valueClass}">${value}</span></div>`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Reçu ${authCode}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 148mm 210mm; margin: 0; }

  body {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12px;
    color: #0f172a;
    background: #fff;
    width: 148mm;
    min-height: 210mm;
    padding: 0;
  }

  /* ── HEADER ── */
  .header {
    background: #0f172a;
    padding: 20px 24px 18px;
    color: #fff;
  }
  .header-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .logo-mark {
    width: 38px;
    height: 38px;
    background: #1e40af;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .logo-mark svg { width: 22px; height: 22px; fill: #fff; }
  .company-name {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  .company-sub {
    font-size: 10px;
    color: #94a3b8;
    letter-spacing: 0.02em;
    margin-top: 1px;
  }
  .header-divider {
    border: none;
    border-top: 1px solid #334155;
    margin: 10px 0 12px;
  }
  .receipt-type {
    font-size: 10px;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 3px;
  }
  .receipt-title {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.02em;
  }

  /* ── REF BAND ── */
  .ref-band {
    background: #1e40af;
    padding: 10px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .ref-code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    letter-spacing: 0.06em;
  }
  .ref-datetime {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #bfdbfe;
    text-align: right;
    line-height: 1.6;
  }

  /* ── BODY ── */
  .body { padding: 20px 24px; }

  .section {
    margin-bottom: 16px;
  }
  .section-title {
    font-size: 9px;
    font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #94a3b8;
    font-weight: 500;
    margin-bottom: 8px;
    padding-bottom: 5px;
    border-bottom: 1px solid #e2e8f0;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    padding: 5px 0;
    border-bottom: 1px dashed #f1f5f9;
  }
  .row:last-child { border-bottom: none; }
  .row-label {
    font-size: 11px;
    color: #64748b;
    flex-shrink: 0;
  }
  .row-value {
    font-size: 12px;
    font-weight: 500;
    color: #0f172a;
    text-align: right;
  }
  .row-value.mono {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
  }
  .row-value.green { color: #15803d; }
  .row-value.orange { color: #c2410c; }

  /* ── TOTAL BOX ── */
  .total-box {
    background: #f8fafc;
    border: 2px solid #0f172a;
    border-radius: 8px;
    padding: 14px 18px;
    margin: 16px 0;
  }
  .total-label {
    font-size: 10px;
    font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #64748b;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .total-amount {
    font-family: 'JetBrains Mono', monospace;
    font-size: 26px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1;
    letter-spacing: -0.02em;
  }

  /* ── STATUS BOX ── */
  .status-box {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-left: 4px solid #15803d;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .status-check {
    width: 22px;
    height: 22px;
    background: #15803d;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
  }
  .status-text {
    font-size: 12px;
    font-weight: 600;
    color: #15803d;
    line-height: 1.3;
  }
  .status-sub {
    font-size: 10px;
    color: #16a34a;
    margin-top: 1px;
  }

  /* ── AUTH CODE ── */
  .auth-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 16px;
  }
  .auth-label {
    font-size: 10px;
    font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #1e40af;
    font-weight: 500;
  }
  .auth-code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
    font-weight: 700;
    color: #1e40af;
    letter-spacing: 0.12em;
  }

  /* ── FOOTER ── */
  .footer {
    border-top: 1px solid #e2e8f0;
    padding: 14px 24px 20px;
    text-align: center;
  }
  .footer-text {
    font-size: 10px;
    color: #94a3b8;
    line-height: 1.8;
  }
  .footer-brand {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: #cbd5e1;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-top: 8px;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .ref-band { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .total-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .status-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .auth-row { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="header-top">
      <div class="logo-mark">
        <svg viewBox="0 0 24 24"><path d="M12 3L2 9l10 6 10-6-10-6zM2 15l10 6 10-6M2 12l10 6 10-6"/></svg>
      </div>
      <div>
        <div class="company-name">NIU JODA COMPANY</div>
        <div class="company-sub">Gestion de Bourses &amp; Cours de Langue · Douala, Cameroun</div>
      </div>
    </div>
    <hr class="header-divider">
    <div class="receipt-type">Avis de Paiement</div>
    <div class="receipt-title">Reçu Bancaire</div>
  </div>

  <!-- REF BAND -->
  <div class="ref-band">
    <div class="ref-code">#${authCode}</div>
    <div class="ref-datetime">
      ${data.date}<br>
      ${timeStr}
    </div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- Informations transaction -->
    <div class="section">
      <div class="section-title">Détails de la transaction</div>
      ${data.studentName ? row("Bénéficiaire", data.studentName) : ""}
      ${row("Service", data.service)}
      ${data.tranche ? row("Tranche", data.tranche) : ""}
      ${data.description ? row("Motif", data.description.length > 35 ? data.description.slice(0, 35) + "…" : data.description) : ""}
    </div>

    <!-- Montants -->
    <div class="section">
      <div class="section-title">Détail des montants</div>
      ${row("Montant principal", fmt(data.montant), "mono green")}
      ${data.penalite && data.penalite > 0 ? row("Pénalité de retard", fmt(data.penalite), "mono orange") : ""}
    </div>

    <!-- Total -->
    <div class="total-box">
      <div class="total-label">Montant total encaissé</div>
      <div class="total-amount">${fmt(total)}</div>
    </div>

    <!-- Statut -->
    <div class="status-box">
      <div class="status-check">✓</div>
      <div>
        <div class="status-text">Paiement autorisé et validé</div>
        <div class="status-sub">Transaction confirmée — Conservez ce document</div>
      </div>
    </div>

    <!-- Code d'autorisation -->
    <div class="auth-row">
      <div class="auth-label">Code d'autorisation</div>
      <div class="auth-code">${authCode}</div>
    </div>

  </div><!-- /body -->

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-text">
      ${data.footerNote || "Merci de votre confiance"}<br>
      Ce reçu constitue la preuve de votre paiement. Veuillez le conserver.
    </div>
    <div class="footer-brand">NIU JODA COMPANY — Douala, Cameroun</div>
  </div>

</body>
</html>`;

    const win = window.open("", "_blank", "width=600,height=820,menubar=no,toolbar=no,scrollbars=yes");
    if (!win) {
        alert("Veuillez autoriser les fenêtres popup pour imprimer.");
        return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
        setTimeout(() => win.close(), 500);
    }, 600);
}
