import { sanitizeForHtml } from "./security";

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
    langue?: string;
}

type Lang = 'fr' | 'en';

function getLang(langue?: string): Lang {
    return langue?.toLowerCase().includes('anglais') ? 'en' : 'fr';
}

// ── Bilingual tranche labels ───────────────────────────────────────────────────

const TRANCHE_LABELS: Record<string, Record<Lang, Record<number, string>>> = {
    bourse: {
        fr: {
            1: "Procédure Bourse — Ouverture de dossier",
            2: "Procédure Bourse — Caution",
            3: "Procédure Bourse — Visa",
        },
        en: {
            1: "Scholarship Procedure — File Opening",
            2: "Scholarship Procedure — Deposit",
            3: "Scholarship Procedure — Visa",
        },
    },
    mandarin: {
        fr: {
            1: "Mandarin — Inscription",
            2: "Mandarin — Livre",
            3: "Mandarin — 1re tranche de cours",
            4: "Mandarin — 2e tranche de cours",
        },
        en: {
            1: "Mandarin — Registration",
            2: "Mandarin — Book",
            3: "Mandarin — 1st course instalment",
            4: "Mandarin — 2nd course instalment",
        },
    },
    anglais: {
        fr: {
            1: "Anglais — Inscription",
            2: "Anglais — Livre",
            3: "Anglais — 1re tranche de cours",
            4: "Anglais — 2e tranche de cours",
        },
        en: {
            1: "English — Registration",
            2: "English — Book",
            3: "English — 1st course instalment",
            4: "English — 2nd course instalment",
        },
    },
};

function getTypeLabel(payment: ReceiptPayment, lang: Lang): string {
    if (payment.tranche && TRANCHE_LABELS[payment.type]?.[lang]?.[payment.tranche]) {
        return TRANCHE_LABELS[payment.type][lang][payment.tranche];
    }
    const fallback: Record<string, Record<Lang, string>> = {
        bourse:   { fr: "Procédure Bourse",   en: "Scholarship Procedure" },
        mandarin: { fr: "Cours de Mandarin",  en: "Mandarin Course" },
        anglais:  { fr: "Cours d'Anglais",    en: "English Course" },
    };
    return fallback[payment.type]?.[lang] ?? payment.type;
}

// ── Number to words (FR only — montant écrit en lettres reste en français) ────

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
    const lang = getLang(student.langue);
    const isEn = lang === 'en';

    const [dateStr, logoSrc] = await Promise.all([
        Promise.resolve(
            payment.date_paiement
                ? new Date(payment.date_paiement).toLocaleDateString(isEn ? "en-GB" : "fr-FR")
                : payment.validated_at
                  ? new Date(payment.validated_at).toLocaleDateString(isEn ? "en-GB" : "fr-FR")
                  : new Date().toLocaleDateString(isEn ? "en-GB" : "fr-FR")
        ),
        fetchLogoBase64(),
    ]);

    const logoTag = logoSrc
        ? `<img src="${logoSrc}" alt="Joda Company" style="height:48px;width:auto;display:block;">`
        : `<span style="font-size:22px;font-weight:bold;color:#dc2626;">JC</span>`;

    const typeLabel = getTypeLabel(payment, lang);
    const today = isEn
        ? new Date().toLocaleDateString("en-GB")
        : new Date().toLocaleDateString("fr-FR");
    const now = isEn
        ? new Date().toLocaleTimeString("en-GB")
        : new Date().toLocaleTimeString("fr-FR");

    const t = {
        tagline:       isEn ? "China Scholarship Management" : "Gestion des bourses d'études en Chine",
        receiptTitle:  isEn ? "PAYMENT RECEIPT" : "REÇU DE PAIEMENT",
        receiptNo:     isEn ? "Receipt No:" : "Reçu N° :",
        date:          isEn ? "Date:" : "Date :",
        studentInfo:   isEn ? "STUDENT INFORMATION" : "INFORMATIONS ÉTUDIANT",
        fullName:      isEn ? "Full name:" : "Nom complet :",
        email:         isEn ? "Email:" : "Email :",
        phone:         isEn ? "Phone:" : "Téléphone :",
        level:         isEn ? "Study level:" : "Niveau d'étude :",
        field:         isEn ? "Field of study:" : "Filière :",
        paymentDetails:isEn ? "PAYMENT DETAILS" : "DÉTAILS DU PAIEMENT",
        paymentType:   isEn ? "Payment type:" : "Type de paiement :",
        paymentDate:   isEn ? "Payment date:" : "Date de paiement :",
        paymentMethod: isEn ? "Payment method:" : "Mode de paiement :",
        methodValue:   isEn ? "Bank transfer / Cash" : "Virement bancaire / Espèces",
        statusLabel:   isEn ? "Status:" : "Statut :",
        statusValue:   isEn ? "Paid and validated" : "Payé et validé",
        amountPaid:    isEn ? "AMOUNT PAID" : "MONTANT PAYÉ",
        amountWords:   isEn
            ? `(${numberToWords(payment.montant)} CFA francs)`
            : `(${numberToWords(payment.montant)} francs CFA)`,
        theStudent:    isEn ? "The Student" : "L'Étudiant",
        responsibleAgent: isEn ? "Responsible Agent" : "Agent Responsable",
        footerThanks:  isEn ? "Thank you for your trust!" : "Merci de votre confiance !",
        footerProof:   isEn
            ? "This receipt serves as proof of payment. Please keep it carefully."
            : "Ce reçu fait foi de paiement. Veuillez le conserver précieusement.",
        footerClaim:   isEn
            ? "For any complaint, contact us within 48 hours of receiving this receipt."
            : "Pour toute réclamation, contactez-nous dans les 48h suivant la réception de ce reçu.",
        footerGenerated: isEn
            ? `Document generated on ${today} at ${now}`
            : `Document généré le ${today} à ${now}`,
    };

    const html = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${t.receiptTitle} - Joda Company</title>
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
          <div class="company-tagline">${t.tagline}</div>
          <div class="company-info">
            ${isEn ? "Travel Agency — Scholarships for studies in China" : "Agence de Voyage — Bourses d'Études en Chine"}<br>
            BP : 7352 Yaoundé, N° Cont : P116012206442N<br>
            Tel : (+237) 674 94 44 17 / 699 01 56 81 &nbsp;|&nbsp; Email : jodacompany@yahoo.com
          </div>
        </td>
      </tr>
    </table>
  </div>

  <div class="receipt-number">
    <strong>${t.receiptNo} ${payment.id.toUpperCase()}</strong><br>
    ${t.date} ${today}
  </div>

  <h2 class="receipt-title">${t.receiptTitle}</h2>

  <div class="section">
    <div class="section-title">${t.studentInfo}</div>
    <div class="row"><span class="label">${t.fullName}</span><span class="value">${sanitizeForHtml(student.nom)} ${sanitizeForHtml(student.prenom)}</span></div>
    <div class="row"><span class="label">${t.email}</span><span class="value">${sanitizeForHtml(student.email)}</span></div>
    <div class="row"><span class="label">${t.phone}</span><span class="value">${sanitizeForHtml(student.telephone)}</span></div>
    <div class="row"><span class="label">${t.level}</span><span class="value">${sanitizeForHtml(student.niveau)}</span></div>
    <div class="row"><span class="label">${t.field}</span><span class="value">${sanitizeForHtml(student.filiere)}</span></div>
  </div>

  <div class="section">
    <div class="section-title">${t.paymentDetails}</div>
    <div class="row"><span class="label">${t.paymentType}</span><span class="value">${typeLabel}</span></div>
    <div class="row"><span class="label">${t.paymentDate}</span><span class="value">${dateStr}</span></div>
    <div class="row"><span class="label">${t.paymentMethod}</span><span class="value">${t.methodValue}</span></div>
    <div class="row"><span class="label">${t.statusLabel}</span><span class="value">${t.statusValue}</span></div>
  </div>

  <div class="amount-section">
    <div class="amount-title">${t.amountPaid}</div>
    <div class="amount-value">${Math.round(payment.montant).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} FCFA</div>
    <div style="font-size:14px;color:#666;margin-top:10px;">${t.amountWords}</div>
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div>${t.theStudent}</div>
      <div class="sig-line"></div>
      <div>${sanitizeForHtml(student.nom)} ${sanitizeForHtml(student.prenom)}</div>
    </div>
    <div class="sig-box">
      <div>Joda Company</div>
      <div class="sig-line"></div>
      <div>${t.responsibleAgent}</div>
    </div>
  </div>

  <div class="footer">
    <p><strong>${t.footerThanks}</strong></p>
    <p>${t.footerProof}</p>
    <p>${t.footerClaim}</p>
    <p style="margin-top:20px;font-style:italic;">${t.footerGenerated}</p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${isEn ? "Receipt" : "Recu"}_${student.nom}_${student.prenom}_${typeLabel}_${new Date().toISOString().split("T")[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
