import { sanitizeForHtml } from "./security";
import { formatPrice } from "./formatPrice";

export interface ReceiptPayment {
    id: string;
    type: string;
    tranche: number | null;
    montant: number;
    status: string;
    date_paiement: string | null;
    validated_by?: string | null;
    validated_at?: string | null;
}

export interface ReceiptStudent {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    niveau: string;
    filiere: string;
}

const TRANCHE_LABELS: Record<string, Record<number, string>> = {
    bourse: {
        1: "Procédure Bourse — Ouverture de dossier",
        2: "Procédure Bourse — Caution",
        3: "Procédure Bourse — Visa",
    },
    mandarin: {
        1: "Mandarin — Inscription",
        2: "Mandarin — Livre",
        3: "Mandarin — 1re tranche de cours",
        4: "Mandarin — 2e tranche de cours",
    },
    anglais: {
        1: "Anglais — Inscription",
        2: "Anglais — Livre",
        3: "Anglais — 1re tranche de cours",
        4: "Anglais — 2e tranche de cours",
    },
};

function getTypeLabel(payment: ReceiptPayment): string {
    if (payment.tranche && TRANCHE_LABELS[payment.type]?.[payment.tranche]) {
        return TRANCHE_LABELS[payment.type][payment.tranche];
    }
    const fallback: Record<string, string> = {
        bourse: "Procédure Bourse",
        mandarin: "Cours de Mandarin",
        anglais: "Cours d'Anglais",
    };
    return fallback[payment.type] ?? payment.type;
}

function numberToWords(num: number): string {
    const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
    const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
    const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
    if (num === 0) return "zéro";
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 > 0 ? "-" + units[num % 10] : "");
    if (num >= 1000000) {
        const m = Math.floor(num / 1000000);
        const r = num % 1000000;
        return `${m} million${m > 1 ? "s" : ""}${r > 0 ? " " + numberToWords(r) : ""}`;
    }
    if (num >= 1000) {
        const t = Math.floor(num / 1000);
        const r = num % 1000;
        return `${numberToWords(t)} mille${r > 0 ? " " + numberToWords(r) : ""}`;
    }
    const h = Math.floor(num / 100);
    const r = num % 100;
    return `${h > 1 ? numberToWords(h) + " " : ""}cent${h > 1 ? "s" : ""}${r > 0 ? " " + numberToWords(r) : ""}`;
}

async function fetchLogoBase64(): Promise<string | null> {
    try {
        const res = await fetch("/Logo.png");
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve("");
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

export async function downloadReceipt(payment: ReceiptPayment, student: ReceiptStudent) {
    const [dateStr, logoSrc] = await Promise.all([
        Promise.resolve(
            payment.date_paiement
                ? new Date(payment.date_paiement).toLocaleDateString("fr-FR")
                : payment.validated_at
                  ? new Date(payment.validated_at).toLocaleDateString("fr-FR")
                  : new Date().toLocaleDateString("fr-FR")
        ),
        fetchLogoBase64(),
    ]);

    const logoTag = logoSrc
        ? `<img src="${logoSrc}" alt="Joda Company" style="height:48px;width:auto;display:block;">`
        : `<span style="font-size:22px;font-weight:bold;color:#dc2626;">JC</span>`;

    const html = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>Reçu de Paiement - Joda Company</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
  .header { margin-bottom: 30px; border-bottom: 3px solid #dc2626; padding-bottom: 20px; }
  .company-name { font-size: 22px; font-weight: bold; color: #dc2626; margin: 0 0 3px 0; }
  .company-tagline { font-size: 13px; color: #444; margin: 0 0 8px 0; }
  .company-info { font-size: 11px; color: #666; margin: 0; line-height: 1.5; }
  .receipt-title { font-size: 20px; margin: 20px 0; color: #dc2626; text-align: center; text-decoration: underline; }
  .receipt-number { text-align: right; font-size: 14px; color: #666; margin-bottom: 20px; }
  .section { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #dc2626; }
  .section-title { font-weight: bold; color: #dc2626; margin-bottom: 15px; font-size: 16px; text-decoration: underline; }
  .row { display: flex; justify-content: space-between; margin: 8px 0; padding: 5px 0; border-bottom: 1px dotted #ccc; }
  .label { font-weight: bold; color: #333; }
  .value { color: #555; }
  .amount-section { background: #fff; border: 2px solid #dc2626; padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center; }
  .amount-title { font-size: 18px; font-weight: bold; color: #dc2626; margin-bottom: 15px; }
  .amount-value { font-size: 24px; font-weight: bold; color: #dc2626; margin: 10px 0; }
  .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding: 20px 0; }
  .sig-box { text-align: center; width: 200px; }
  .sig-line { border-bottom: 1px solid #333; margin: 40px 0 10px 0; }
  .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 20px; }
</style>
</head>
<body>
  <div class="header">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="vertical-align:middle;width:56px;padding-right:14px;">${logoTag}</td>
        <td style="vertical-align:middle;">
          <div class="company-name">JODA COMPANY</div>
          <div class="company-tagline">Gestion des bourses d'études en Chine</div>
          <div class="company-info">
            Agence de Voyage — Bourses d'Études en Chine<br>
            BP : 7352 Yaoundé, N° Cont : P116012206442N<br>
            Tel : (+237) 674 94 44 17 / 699 01 56 81 &nbsp;|&nbsp; Email : jodacompany@yahoo.com
          </div>
        </td>
      </tr>
    </table>
  </div>

  <div class="receipt-number">
    <strong>Reçu N° : ${payment.id.toUpperCase()}</strong><br>
    Date : ${new Date().toLocaleDateString("fr-FR")}
  </div>

  <h2 class="receipt-title">REÇU DE PAIEMENT</h2>

  <div class="section">
    <div class="section-title">INFORMATIONS ÉTUDIANT</div>
    <div class="row"><span class="label">Nom complet :</span><span class="value">${sanitizeForHtml(student.nom)} ${sanitizeForHtml(student.prenom)}</span></div>
    <div class="row"><span class="label">Email :</span><span class="value">${sanitizeForHtml(student.email)}</span></div>
    <div class="row"><span class="label">Téléphone :</span><span class="value">${sanitizeForHtml(student.telephone)}</span></div>
    <div class="row"><span class="label">Niveau d'étude :</span><span class="value">${sanitizeForHtml(student.niveau)}</span></div>
    <div class="row"><span class="label">Filière :</span><span class="value">${sanitizeForHtml(student.filiere)}</span></div>
  </div>

  <div class="section">
    <div class="section-title">DÉTAILS DU PAIEMENT</div>
    <div class="row"><span class="label">Type de paiement :</span><span class="value">${getTypeLabel(payment)}</span></div>
    <div class="row"><span class="label">Date de paiement :</span><span class="value">${dateStr}</span></div>
    <div class="row"><span class="label">Mode de paiement :</span><span class="value">Virement bancaire / Espèces</span></div>
    <div class="row"><span class="label">Statut :</span><span class="value">Payé et validé</span></div>
  </div>

  <div class="amount-section">
    <div class="amount-title">MONTANT PAYÉ</div>
    <div class="amount-value">${Math.round(payment.montant).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} FCFA</div>
    <div style="font-size:14px;color:#666;margin-top:10px;">(${numberToWords(payment.montant)} francs CFA)</div>
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div>L'Étudiant</div>
      <div class="sig-line"></div>
      <div>${sanitizeForHtml(student.nom)} ${sanitizeForHtml(student.prenom)}</div>
    </div>
    <div class="sig-box">
      <div>Joda Company</div>
      <div class="sig-line"></div>
      <div>Agent Responsable</div>
    </div>
  </div>

  <div class="footer">
    <p><strong>Merci de votre confiance !</strong></p>
    <p>Ce reçu fait foi de paiement. Veuillez le conserver précieusement.</p>
    <p>Pour toute réclamation, contactez-nous dans les 48h suivant la réception de ce reçu.</p>
    <p style="margin-top:20px;font-style:italic;">Document généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Recu_${student.nom}_${student.prenom}_${getTypeLabel(payment)}_${new Date().toISOString().split("T")[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
