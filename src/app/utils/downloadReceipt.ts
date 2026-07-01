import jsPDF from "jspdf";
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

/**
 * Génère la quittance et la TÉLÉCHARGE (vrai fichier PDF via doc.save()).
 *
 * On dessine le PDF directement avec les primitives jsPDF (texte, rectangles,
 * image du logo) : AUCUN html2canvas. C'est pour ça que ça marche de façon
 * fiable — html2canvas plante au parsing des couleurs modernes de Tailwind v4
 * (oklch/lab), alors que le dessin vectoriel jsPDF n'y touche jamais.
 */
export async function downloadReceipt(
    payment: ReceiptPayment,
    student: ReceiptStudent,
    options: { includeDuplicata?: boolean } = {},
) {
    const includeDuplicata = options.includeDuplicata ?? false;
    const lang = getLang(student.langue);
    const isEn = lang === 'en';
    const fmtDate = (d: string | null) =>
        (d ? new Date(d) : new Date()).toLocaleDateString(isEn ? "en-GB" : "fr-FR");

    const dateStr = fmtDate(payment.date_paiement ?? payment.validated_at ?? null);
    const today = fmtDate(null);
    const logoSrc = await fetchLogoBase64();

    const typeLabelFr = getTypeLabel(payment, 'fr');
    const isIntl = isInternational(student.nationalite);
    const amountFmt = isIntl
        ? '$' + Math.round(payment.montant).toLocaleString('fr-FR')
        : Math.round(payment.montant).toLocaleString('fr-FR') + ' FCFA';
    // Montant en lettres uniquement pour FCFA (numberToWords est en français).
    const amountWords = isIntl ? '' : `${numberToWords(payment.montant)} francs CFA`;
    const receiptNo = payment.id.slice(-8).toUpperCase();
    const studentName = `${student.nom} ${student.prenom}`.trim();

    const company = isIntl
        ? {
            name: 'JODA COMPANY SARL',
            tag: 'Travel consulting & assistance — Study scholarships in China',
            info: '220 Handan Road, Yangpu District, Shanghai — China  |  contact@joda-company.com  |  NIU : M022517611037A',
        }
        : {
            name: 'JODA COMPANY',
            tag: "Entreprise de conseil et assistance voyage — Bourse d'étude en Chine",
            info: 'BP 2525 Douala Makepe  |  contact@joda-company.com  |  NIU : M022517611037A',
        };

    const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
    const L = 10, R = 138, W = R - L; // 128 mm de contenu

    const RED: [number, number, number] = [220, 38, 38];
    const INK: [number, number, number] = [17, 17, 17];
    const GRAY: [number, number, number] = [90, 90, 90];

    const drawCopy = (copy: 'ORIGINAL' | 'DUPLICATA') => {
        // ── En-tête : logo + société (gauche), N°/date/copie (droite) ──
        let textX = L;
        if (logoSrc) {
            try {
                const p = doc.getImageProperties(logoSrc);
                const h = 13;
                const w = Math.min(30, h * (p.width / p.height));
                doc.addImage(logoSrc, 'PNG', L, 8, w, h);
                textX = L + w + 4;
            } catch { /* logo indisponible : on continue sans */ }
        }
        doc.setTextColor(...RED); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
        doc.text(company.name, textX, 13);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GRAY);
        doc.text(doc.splitTextToSize(company.tag, R - 30 - textX), textX, 17);
        doc.text(doc.splitTextToSize(company.info, R - 30 - textX), textX, 20.5);

        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...INK);
        doc.text(`N° ${receiptNo}`, R, 10, { align: 'right' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRAY);
        doc.text(today, R, 14, { align: 'right' });
        doc.setFillColor(...RED); doc.roundedRect(R - 22, 16.5, 22, 5, 1, 1, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
        doc.text(copy, R - 11, 20, { align: 'center' });

        // ── Barre titre ──
        doc.setFillColor(...RED); doc.rect(L, 30, W, 7, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.text('QUITTANCE DE PAIEMENT  /  PAYMENT RECEIPT', 74, 34.7, { align: 'center' });

        // ── Deux colonnes ──
        const section = (x: number, y: number, label: string) => {
            doc.setTextColor(...RED); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
            doc.text(label, x, y);
            doc.setDrawColor(252, 165, 165); doc.setLineWidth(0.3);
            doc.line(x, y + 1.5, x + 58, y + 1.5);
        };
        const field = (x: number, y: number, label: string, value: string) => {
            doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY); doc.setFontSize(7.5);
            doc.text(label, x, y);
            const lw = doc.getTextWidth(label + ' ');
            doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK);
            doc.text(value || '—', x + lw, y);
        };

        const colY = 44;
        section(L, colY, 'BÉNÉFICIAIRE / RECIPIENT');
        field(L, colY + 6, 'Nom :', studentName);
        field(L, colY + 11, 'Tél :', (student.telephone || '').replace(/^undefined\s*/i, ''));
        field(L, colY + 16, 'Niveau :', student.niveau);

        const rc = 76;
        section(rc, colY, 'PAIEMENT / PAYMENT');
        field(rc, colY + 6, 'Prestation :', typeLabelFr);
        field(rc, colY + 11, 'Date :', dateStr);
        field(rc, colY + 16, 'Mode :', 'Banque / Cash');

        // ── Montant ──
        const ay = 70;
        doc.setFillColor(254, 242, 242); doc.setDrawColor(...RED); doc.setLineWidth(0.5);
        doc.roundedRect(L, ay, W, 13, 2, 2, 'FD');
        doc.setTextColor(...RED); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
        doc.text('MONTANT REÇU / AMOUNT RECEIVED', L + 4, ay + 8);
        doc.setFontSize(13);
        doc.text(amountFmt, R - 4, ay + 8.5, { align: 'right' });
        if (amountWords) {
            doc.setFont('helvetica', 'italic'); doc.setTextColor(...GRAY); doc.setFontSize(7);
            doc.text(doc.splitTextToSize(`Arrêté à : ${amountWords}`, W - 4), L + 2, ay + 18);
        }

        // ── Signatures ──
        const sy = 108;
        doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.3);
        doc.line(L + 6, sy, L + 52, sy);
        doc.line(R - 52, sy, R - 6, sy);
        doc.setTextColor(...GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.text("L'Étudiant / The Student", L + 29, sy + 4, { align: 'center' });
        doc.text('Joda Company', R - 29, sy + 4, { align: 'center' });

        // ── Note de bas de page ──
        doc.setFont('helvetica', 'italic'); doc.setTextColor(150, 150, 150); doc.setFontSize(6.5);
        doc.text(
            isEn ? 'This receipt is proof of payment. Please keep it safe.'
                 : 'Ce reçu fait foi de paiement. Merci de le conserver.',
            74, 125, { align: 'center' },
        );
    };

    drawCopy('ORIGINAL');
    if (includeDuplicata) { doc.addPage(); drawCopy('DUPLICATA'); }

    doc.save(`Quittance_${receiptNo}.pdf`);
}
