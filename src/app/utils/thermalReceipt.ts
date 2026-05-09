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
    const dash = "--------------------------------";
    const eqSign = "================================";

    const rowHtml = (label: string, value: string) =>
        `<div class="row"><span>${label}</span><span>${value}</span></div>`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Reçu ${data.refId.slice(-8).toUpperCase()}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { margin: 1mm; size: 80mm auto; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 9pt;
    width: 76mm;
    max-width: 76mm;
    color: #000;
    background: #fff;
    padding: 2mm;
    line-height: 1.4;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .small { font-size: 8pt; }
  .large { font-size: 12pt; }
  .xlarge { font-size: 14pt; }
  .divider-dash { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
  .divider-solid { border: none; border-top: 1px solid #000; margin: 2mm 0; }
  .row { display: flex; justify-content: space-between; gap: 4mm; }
  .row span:last-child { text-align: right; font-weight: bold; }
  .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 11pt; margin-top: 1mm; }
  .badge {
    display: inline-block;
    border: 1px solid #000;
    padding: 0 2mm;
    font-size: 7pt;
    font-weight: bold;
    letter-spacing: 0.05em;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

  <div class="center">
    <div class="bold xlarge">NIU JODA COMPANY</div>
    <div class="small">Gestion de Bourses &amp; Cours de Langue</div>
    <div class="small">Douala, Cameroun</div>
  </div>

  <hr class="divider-solid">

  <div class="center bold large">RECU DE PAIEMENT</div>
  <div class="center small">Ref : #${data.refId.slice(-8).toUpperCase()}</div>
  <div class="center small">Date : ${data.date}</div>

  <hr class="divider-dash">

  ${data.studentName ? rowHtml("Etudiant :", data.studentName) : ""}
  ${data.description ? rowHtml("Motif :", data.description.length > 20 ? data.description.slice(0, 20) + "..." : data.description) : ""}

  <hr class="divider-dash">

  ${rowHtml("Service :", data.service)}
  ${data.tranche ? rowHtml("Tranche :", data.tranche) : ""}

  <hr class="divider-dash">

  ${rowHtml("Montant :", fmt(data.montant))}
  ${data.penalite && data.penalite > 0 ? rowHtml("Penalite :", fmt(data.penalite)) : ""}

  <hr class="divider-solid">

  <div class="total-row">
    <span>TOTAL DU :</span>
    <span>${fmt(total)}</span>
  </div>

  <hr class="divider-solid">

  <div class="center small" style="margin-top: 3mm;">
    Paiement effectue et valide<br>
    Conservez ce recu
  </div>
  <div class="center small" style="margin-top: 2mm; font-style: italic;">
    ${data.footerNote || "Merci de votre confiance"}
  </div>
  <div class="center small" style="margin-top: 3mm;">
    <span class="badge">NIU JODA COMPANY</span>
  </div>

</body>
</html>`;

    const win = window.open("", "_blank", "width=320,height=700,menubar=no,toolbar=no");
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
    }, 400);
}
