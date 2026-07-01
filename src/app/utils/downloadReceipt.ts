import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { sanitizeForHtml } from "./security";
import { isInternational } from "../types/payment-config";

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
    nationalite?: string | null;
}

type Lang = 'fr' | 'en';

function getLang(langue?: string): Lang {
    return langue?.toLowerCase().includes('anglais') ? 'en' : 'fr';
}

const TRANCHE_LABELS: Record<string, Record<Lang, Record<number, string>>> = {
    bourse: {
        fr: { 1: "Procédure Bourse — Ouverture de dossier", 2: "Procédure Bourse — Caution", 3: "Procédure Bourse — Visa" },
        en: { 1: "Scholarship Procedure — File Opening",    2: "Scholarship Procedure — Deposit",  3: "Scholarship Procedure — Visa" },
    },
    mandarin: {
        fr: { 1: "Mandarin — Inscription", 2: "Mandarin — Livre", 3: "Mandarin — 1re tranche", 4: "Mandarin — 2e tranche" },
        en: { 1: "Mandarin — Registration", 2: "Mandarin — Book", 3: "Mandarin — 1st instalment", 4: "Mandarin — 2nd instalment" },
    },
    anglais: {
        fr: { 1: "Anglais — Inscription", 2: "Anglais — Livre", 3: "Anglais — 1re tranche", 4: "Anglais — 2e tranche" },
        en: { 1: "English — Registration", 2: "English — Book", 3: "English — 1st instalment", 4: "English — 2nd instalment" },
    },
};

function getTypeLabel(payment: ReceiptPayment, lang: Lang): string {
    if (payment.tranche && TRANCHE_LABELS[payment.type]?.[lang]?.[payment.tranche])
        return TRANCHE_LABELS[payment.type][lang][payment.tranche];
    const fallback: Record<string, Record<Lang, string>> = {
        bourse:   { fr: "Procédure Bourse",  en: "Scholarship Procedure" },
        mandarin: { fr: "Cours de Mandarin", en: "Mandarin Course" },
        anglais:  { fr: "Cours d'Anglais",   en: "English Course" },
    };
    return fallback[payment.type]?.[lang] ?? payment.type;
}

function numberToWords(num: number): string {
    const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
    const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
    const tens  = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
    if (num === 0) return "zéro";
    if (num < 10)  return units[num];
    if (num < 20)  return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 > 0 ? "-" + units[num % 10] : "");
    if (num >= 1_000_000) { const m = Math.floor(num / 1_000_000); const r = num % 1_000_000; return `${m} million${m > 1 ? "s" : ""}${r > 0 ? " " + numberToWords(r) : ""}`; }
    if (num >= 1_000)     { const t = Math.floor(num / 1_000);     const r = num % 1_000;     return `${numberToWords(t)} mille${r > 0 ? " " + numberToWords(r) : ""}`; }
    const h = Math.floor(num / 100); const r = num % 100;
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
            reader.onerror  = () => resolve("");
            reader.readAsDataURL(blob);
        });
    } catch { return null; }
}

export async function downloadReceipt(
    payment: ReceiptPayment,
    student: ReceiptStudent,
    options: { includeDuplicata?: boolean } = {},
) {
    const includeDuplicata = options.includeDuplicata ?? false;
    const lang  = getLang(student.langue);
    const isEn  = lang === 'en';
    const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString(isEn ? "en-GB" : "fr-FR") : new Date().toLocaleDateString(isEn ? "en-GB" : "fr-FR");

    const dateStr  = fmtDate(payment.date_paiement ?? payment.validated_at ?? null);
    const today    = fmtDate(new Date().toISOString());
    const logoSrc  = await fetchLogoBase64();
    const logoTag  = logoSrc
        ? `<img src="${logoSrc}" alt="Joda Company" style="height:40px;width:auto;display:block;">`
        : `<span style="font-size:18px;font-weight:900;color:#dc2626;">JC</span>`;

    const typeLabelFr = getTypeLabel(payment, 'fr');
    const isIntl      = isInternational(student.nationalite);
    // Regroupement ASCII (espace normale / virgule) : toLocaleString('fr-FR')
    // insère une espace fine insécable U+202F, gérée en HTML mais qui produit
    // un glyphe parasite si jamais on repasse par une police PDF.
    const groupNum = (n: number, sep: string) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    const amountFmt   = isIntl ? '$' + groupNum(payment.montant, ',') : groupNum(payment.montant, ' ') + ' FCFA';
    // Montant en lettres uniquement pour FCFA (numberToWords est en français).
    const amountWords = isIntl ? '' : `${numberToWords(payment.montant)} francs CFA`;
    const receiptNo   = payment.id.slice(-8).toUpperCase();
    const studentName = `${sanitizeForHtml(student.nom)} ${sanitizeForHtml(student.prenom)}`;
    const companyBlock = isIntl
        ? `<div class="company-name">JODA COMPANY SARL</div>
            <div class="company-sub">Travel consulting and assistance company — Study scholarships in China</div>
            <div class="company-info">
              220 Handan Road, Yangpu District, Shanghai 200433 — People's Republic of China<br>
              Email : contact@joda-company.com &nbsp;|&nbsp; Tel : +86 180 5289 2460 / +86 183 0187 0211<br>
              NIU : M022517611037A
            </div>`
        : `<div class="company-name">JODA COMPANY</div>
            <div class="company-sub">Entreprise de conseil et assistance voyage — Bourse d'étude en Chine</div>
            <div class="company-info">BP 2525 Douala Makepe entrée Marie Lumière &nbsp;|&nbsp; contact@joda-company.com &nbsp;|&nbsp; NIU : M022517611037A</div>`;

    const quittance = (copy: 'ORIGINAL' | 'DUPLICATA') => `
    <div class="quittance">
      <!-- EN-TÊTE -->
      <table class="header-table">
        <tr>
          <td class="logo-cell">${logoTag}</td>
          <td class="company-cell">
            ${companyBlock}
          </td>
          <td class="copy-cell">
            <div class="copy-badge">${copy}</div>
            <div class="receipt-no">N° ${receiptNo}</div>
            <div class="receipt-date">${today}</div>
          </td>
        </tr>
      </table>

      <!-- TITRE -->
      <div class="title-bar">
        QUITTANCE DE PAIEMENT &nbsp;/&nbsp; PAYMENT RECEIPT
      </div>

      <!-- CORPS -->
      <table class="body-table">
        <tr>
          <!-- Colonne gauche : infos étudiant -->
          <td class="col-left">
            <div class="section-label">BÉNÉFICIAIRE / RECIPIENT</div>
            <div class="field"><span class="lbl">Nom / Name :</span> <span class="val">${studentName}</span></div>
            <div class="field"><span class="lbl">Tél :</span> <span class="val">${sanitizeForHtml(student.telephone)}</span></div>
            <div class="field"><span class="lbl">Niveau / Level :</span> <span class="val">${sanitizeForHtml(student.niveau)}</span></div>
          </td>
          <!-- Colonne droite : infos paiement -->
          <td class="col-right">
            <div class="section-label">PAIEMENT / PAYMENT</div>
            <div class="field"><span class="lbl">Objet :</span> <span class="val">Assistance visa</span></div>
            <div class="field"><span class="lbl">Prestation :</span> <span class="val">${typeLabelFr}</span></div>
            <div class="field"><span class="lbl">Date :</span> <span class="val">${dateStr}</span></div>
            <div class="field"><span class="lbl">Mode :</span> <span class="val">Droit Bancaire / Cash</span></div>
            <div class="field"><span class="lbl">Avance :</span> <span class="val">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
            <div class="field"><span class="lbl">Reste :</span> <span class="val">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
          </td>
        </tr>
      </table>

      <!-- MONTANT -->
      <div class="amount-bar">
        <span class="amount-label">MONTANT REÇU / AMOUNT RECEIVED :</span>
        <span class="amount-value">${amountFmt}</span>
      </div>
      ${amountWords ? `<div class="amount-words">Arrêté à : <em>${amountWords}</em></div>` : ''}

      <!-- SIGNATURES -->
      <table class="sig-table">
        <tr>
          <td class="sig-box">
            <div class="sig-title">L'Étudiant / The Student</div>
            <div class="sig-line"></div>
            <div class="sig-name">${studentName}</div>
          </td>
          <td class="sig-box">
            <div class="sig-title">Joda Company</div>
            <div class="sig-line"></div>
            <div class="sig-name">Agent Responsable / Responsible Agent</div>
          </td>
        </tr>
      </table>
    </div>`;

    const styleBlock = `<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #111; background: #fff; }

  .quittance { width: 100%; padding: 6px 0; }

  /* Séparateur de découpe */
  .cut-line {
    border: none;
    border-top: 1.5px dashed #aaa;
    margin: 10px 0;
    position: relative;
    text-align: center;
  }
  .cut-line::after {
    content: "✂  Découper ici / Cut here  ✂";
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    background: #fff;
    padding: 0 8px;
    font-size: 7pt;
    color: #999;
  }

  /* En-tête */
  .header-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .logo-cell    { width: 48px; vertical-align: middle; padding-right: 8px; }
  .company-cell { vertical-align: middle; }
  .company-name { font-size: 13pt; font-weight: 900; color: #dc2626; line-height: 1.1; }
  .company-sub  { font-size: 7pt; color: #555; margin-top: 2px; line-height: 1.4; white-space: nowrap; }
  .company-info { font-size: 6.5pt; color: #777; margin-top: 3px; }
  .copy-cell    { width: 90px; text-align: right; vertical-align: top; }
  .copy-badge   { display: inline-block; background: #dc2626; color: #fff; font-size: 7pt; font-weight: bold; padding: 2px 7px; border-radius: 3px; letter-spacing: 0.08em; }
  .receipt-no   { font-size: 8pt; font-weight: bold; color: #111; margin-top: 4px; }
  .receipt-date { font-size: 7.5pt; color: #555; margin-top: 2px; }

  /* Titre */
  .title-bar {
    background: #dc2626;
    color: #fff;
    text-align: center;
    font-size: 9.5pt;
    font-weight: bold;
    letter-spacing: 0.06em;
    padding: 4px 0;
    margin-bottom: 6px;
  }

  /* Corps */
  .body-table   { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .col-left     { width: 50%; vertical-align: top; padding-right: 8px; border-right: 1px solid #e5e7eb; }
  .col-right    { width: 50%; vertical-align: top; padding-left: 8px; }
  .section-label { font-size: 7pt; font-weight: bold; color: #dc2626; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid #fca5a5; padding-bottom: 2px; margin-bottom: 4px; }
  .field        { margin-bottom: 3px; line-height: 1.4; }
  .lbl          { font-weight: bold; color: #444; font-size: 8pt; }
  .val          { color: #111; font-size: 8pt; }

  /* Montant */
  .amount-bar {
    background: #fff7f7;
    border: 1.5px solid #dc2626;
    border-radius: 4px;
    padding: 5px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3px;
  }
  .amount-label { font-size: 8pt; font-weight: bold; color: #dc2626; }
  .amount-value { font-size: 13pt; font-weight: 900; color: #dc2626; }
  .amount-words { font-size: 7.5pt; color: #555; margin-bottom: 6px; padding-left: 4px; }

  /* Signatures */
  .sig-table  { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .sig-box    { width: 50%; text-align: center; padding: 0 10px; }
  .sig-title  { font-size: 8pt; font-weight: bold; color: #444; margin-bottom: 18px; }
  .sig-line   { border-bottom: 1px solid #333; margin-bottom: 4px; }
  .sig-name   { font-size: 7.5pt; color: #555; }

  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>`;

    const bodyContent = includeDuplicata
        ? `${quittance('ORIGINAL')}<hr class="cut-line">${quittance('DUPLICATA')}`
        : quittance('ORIGINAL');

    // Le reçu EST le HTML imprimé (styles hex only). On le rend dans une iframe
    // totalement isolée puis on capture avec html2canvas DIRECTEMENT (pas via
    // jsPDF.html(), qui re-héberge dans le document principal et laissait fuiter
    // les couleurs oklch/lab de Tailwind v4). L'image est ensuite posée dans un
    // PDF A5 et téléchargée -> rendu identique à l'impression, vrai fichier.
    const A5_W = 148, A5_H = 210;
    const RENDER_WIDTH_PX = 559; // ≈ 148 mm (A5) @ 96 dpi

    const docHtml =
        `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8">` +
        `<title>Quittance ${receiptNo}</title>${styleBlock}</head>` +
        `<body style="margin:0;background:#ffffff;">` +
        `<div style="padding:6mm;">${bodyContent}</div></body></html>`;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${RENDER_WIDTH_PX}px;height:800px;border:0;background:#ffffff;`;
    document.body.appendChild(iframe);

    try {
        const idoc = iframe.contentDocument;
        if (!idoc) throw new Error('iframe document indisponible');
        idoc.open();
        idoc.write(docHtml);
        idoc.close();

        // Attendre le décodage du logo (data URL) avant la capture.
        await Promise.all(
            Array.from(idoc.images).map((img) =>
                img.complete ? Promise.resolve() : new Promise<void>((res) => { img.onload = img.onerror = () => res(); }),
            ),
        );
        await new Promise((r) => setTimeout(r, 60));
        iframe.style.height = `${idoc.body.scrollHeight}px`;

        const canvas = await html2canvas(idoc.body, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: RENDER_WIDTH_PX,
            windowWidth: RENDER_WIDTH_PX,
        });
        const imgData = canvas.toDataURL('image/png');

        const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
        const imgHmm = A5_W * (canvas.height / canvas.width);
        let heightLeft = imgHmm;
        let position = 0;
        doc.addImage(imgData, 'PNG', 0, position, A5_W, imgHmm, undefined, 'FAST');
        heightLeft -= A5_H;
        while (heightLeft > 0.5) {
            position -= A5_H;
            doc.addPage('a5', 'portrait');
            doc.addImage(imgData, 'PNG', 0, position, A5_W, imgHmm, undefined, 'FAST');
            heightLeft -= A5_H;
        }
        doc.save(`Quittance_${receiptNo}.pdf`);
    } catch (err) {
        // Filet de sécurité : impression native (le navigateur gère les couleurs).
        console.error('Génération PDF reçu impossible, repli sur l’impression', err);
        const printHtml =
            `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8">` +
            `<title>Quittance ${receiptNo}</title>${styleBlock}` +
            `<style>@page { size: A5 portrait; margin: 6mm; } @media print { html, body { margin: 0; } }</style>` +
            `</head><body style="margin:0;background:#ffffff;"><div>${bodyContent}</div>` +
            `<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},400);};</script>` +
            `</body></html>`;
        const win = window.open('', '_blank', 'width=900,height=1000');
        if (win) { win.document.open(); win.document.write(printHtml); win.document.close(); }
        else alert(isEn ? 'Could not generate the receipt. Please retry.' : 'Génération du reçu impossible. Réessayez.');
    } finally {
        iframe.remove();
    }
}
