import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { payslipReference } from './payslipRef';
import { computeCameroonPayroll } from './cameroonPayroll';

// ─── Company info ────────────────────────────────────────────────────────────
const COMPANY = {
  name:    'JODA COMPANY SARL',
  tagline: "Gestion des bourses d'études en Chine",
  phone:   '+237 6 59 19 92 16',
  website: 'joda-company.com',
  email:   'jodacompany2@gmail.com',
  address: 'BP 2525, Makepé entrée Marie Lumière, Douala',
  // Identifiants légaux employeur — à renseigner pour figurer sur les bulletins de paie.
  nui:     'M022517611037A',
  cnps:    '',
  rccm:    '',
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface PaymentReceipt {
  receiptNumber: string;
  date: string;
  studentName: string;
  studentId: string;
  amount: number;
  paymentType: 'bourse' | 'mandarin' | 'anglais';
  tranche?: number;
  paymentMethod?: string;
  reference?: string;
}

interface AccountingReport {
  title: string;
  period: { start: string; end: string };
  entries: Array<{
    date: string;
    description: string;
    category: string;
    amount: number;
    type: 'entree' | 'sortie';
  }>;
  summary: {
    totalEntrees: number;
    totalSorties: number;
    balance: number;
  };
}

interface AccountingReportOptions {
  includeEntrees?: boolean;
  includeSorties?: boolean;
  currency?: 'FCFA' | 'USD';
}

interface StudentReport {
  student: {
    name: string;
    email: string;
    phone: string;
    niveau: string;
    filiere: string;
  };
  payments: Array<{
    date: string;
    type: string;
    amount: number;
    status: string;
  }>;
  dossier: {
    status: string;
    university?: string;
  };
}

// ─── Utilities ───────────────────────────────────────────────────────────────
const formatCurrency = (amount: number): string =>
  Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' FCFA';

const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

async function loadLogoWhiteBase64(): Promise<string | null> {
  try {
    const res = await fetch('/Logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] === 0) continue;
          const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3;
          if (brightness < 30) {
            d[i + 3] = 0;          // fond noir → transparent
          } else if (brightness > 180) {
            d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; // texte clair → noir
          } else {
            d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; // symbole J coloré → blanc
          }
        }
        ctx.putImageData(imageData, 0, 0);

        // Supprime les composantes connexes mineures (icône interne du J)
        const w = canvas.width, h = canvas.height;
        const px = ctx.getImageData(0, 0, w, h);
        const pxd = px.data;
        const visited  = new Uint8Array(w * h);
        const labels   = new Int32Array(w * h);
        const compSizes = new Map<number, number>();
        let nextId = 1;
        for (let i = 0; i < w * h; i++) {
          if (visited[i] || pxd[i * 4 + 3] === 0) continue;
          const id = nextId++;
          let size = 0;
          const stack = [i];
          visited[i] = 1;
          while (stack.length) {
            const cur = stack.pop()!;
            labels[cur] = id; size++;
            const x = cur % w, y = (cur / w) | 0;
            if (x > 0   && !visited[cur-1] && pxd[(cur-1)*4+3] > 0) { visited[cur-1] = 1; stack.push(cur-1); }
            if (x < w-1 && !visited[cur+1] && pxd[(cur+1)*4+3] > 0) { visited[cur+1] = 1; stack.push(cur+1); }
            if (y > 0   && !visited[cur-w] && pxd[(cur-w)*4+3] > 0) { visited[cur-w] = 1; stack.push(cur-w); }
            if (y < h-1 && !visited[cur+w] && pxd[(cur+w)*4+3] > 0) { visited[cur+w] = 1; stack.push(cur+w); }
          }
          compSizes.set(id, size);
        }
        let largestId = 0, largestSize = 0;
        for (const [id, size] of compSizes) {
          if (size > largestSize) { largestSize = size; largestId = id; }
        }
        for (let i = 0; i < w * h; i++) {
          if (labels[i] > 0 && labels[i] !== largestId) pxd[i * 4 + 3] = 0;
        }
        ctx.putImageData(px, 0, 0);

        // Rogne les bords transparents
        const trimData = ctx.getImageData(0, 0, w, h).data;
        let minX = w, maxX = -1, minY = h, maxY = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (trimData[(y * w + x) * 4 + 3] > 0) {
              if (x < minX) minX = x; if (x > maxX) maxX = x;
              if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
          }
        }
        if (minX <= maxX) {
          const trim = document.createElement('canvas');
          trim.width  = maxX - minX + 1;
          trim.height = maxY - minY + 1;
          trim.getContext('2d')!.drawImage(canvas, minX, minY, trim.width, trim.height, 0, 0, trim.width, trim.height);
          resolve(trim.toDataURL('image/png'));
        } else {
          resolve(canvas.toDataURL('image/png'));
        }
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null); };
      img.src = objectUrl;
    });
  } catch {
    return null;
  }
}

// ─── Header ──────────────────────────────────────────────────────────────────
// Returns the Y position where content should start (below header).
const addHeader = (doc: jsPDF, title: string, logoData: string | null): number => {
  const RED:   [number, number, number] = [220, 38, 38];
  const WHITE: [number, number, number] = [255, 255, 255];
  const DARK:  [number, number, number] = [31,  41,  55];

  const pageW   = 210;
  const headerH = 36;
  const marginL = 10;
  const marginR = 8;

  // Red background
  doc.setFillColor(...RED);
  doc.rect(0, 0, pageW, headerH, 'F');

  // Thin dark accent bar at bottom
  doc.setFillColor(180, 25, 25);
  doc.rect(0, headerH - 1.5, pageW, 1.5, 'F');

  // ── Logo — petit, intégré au titre (inline avec "JODA COMPANY")
  const logoW = 20;
  const logoH = 13;
  const logoX = marginL;
  const logoY = 4;

  // Logo blanc directement sur le bandeau rouge
  if (logoData) {
    doc.addImage(logoData, 'PNG', logoX, logoY, logoW, logoH);
  } else {
    doc.setTextColor(...WHITE);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('J', logoX + logoW / 2, logoY + logoH / 2 + 3, { align: 'center' });
  }

  // ── Titre — collé au logo
  const titleX = logoX + logoW + 4; // ~34 mm

  doc.setTextColor(...WHITE);

  // Nom société
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY.name, titleX, 11.5);

  // Tagline
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.text(COMPANY.tagline, titleX, 17.5);

  // ── Email + Adresse — côté droit, alignés avec le titre (au-dessus du séparateur)
  const rightCol = 118;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text(`E-mail  : ${COMPANY.email}`,   rightCol, 12);
  doc.setFontSize(7);
  doc.text(`Adresse : ${COMPANY.address}`, rightCol, 18);

  // ── Séparateur pleine largeur
  doc.setDrawColor(...WHITE);
  doc.setLineWidth(0.25);
  doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
  doc.line(marginL, 21, pageW - marginR, 21);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // ── Tel / Web — une seule ligne pleine largeur sous le séparateur
  const colW = (pageW - marginL - marginR) / 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text(`Tel.    : ${COMPANY.phone}`,   marginL,        29);
  doc.text(`Web     : ${COMPANY.website}`, marginL + colW, 29);
  if (COMPANY.nui) doc.text(`NIU     : ${COMPANY.nui}`, marginL + 2 * colW, 29);

  // ── Titre du document — sous le bandeau
  const titleY = headerH + 11;
  doc.setTextColor(...DARK);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageW / 2, titleY, { align: 'center' });

  // Soulignement rouge
  const titleW = doc.getTextWidth(title);
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.6);
  doc.line(pageW / 2 - titleW / 2, titleY + 1.5, pageW / 2 + titleW / 2, titleY + 1.5);

  return titleY + 10;
};

// ─── Footer ──────────────────────────────────────────────────────────────────
const addFooter = (doc: jsPDF) => {
  const pageCount = (doc as any).internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(15, 282, 195, 282);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');

    // Left: company legal info
    doc.text(
      `${COMPANY.name}  •  ${COMPANY.address}`,
      15, 286,
    );

    // Right: page number
    doc.text(`Page ${i} / ${pageCount}`, 195, 286, { align: 'right' });

    // Center: generation date
    doc.text(
      `Généré le ${formatDate(new Date().toISOString())}`,
      105, 291, { align: 'center' },
    );
  }
};

// ─── 1. Reçu de paiement ─────────────────────────────────────────────────────
export const generatePaymentReceipt = async (receipt: PaymentReceipt): Promise<void> => {
  const doc = new jsPDF();
  const logo = await loadLogoWhiteBase64();
  const startY = addHeader(doc, 'REÇU DE PAIEMENT', logo);

  // Receipt number badge
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(140, startY - 8, 55, 10, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° ${receipt.receiptNumber}`, 167, startY - 2, { align: 'center' });

  // Student info
  let y = startY + 4;
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS ÉTUDIANT', 20, y);
  y += 8;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom : ${receipt.studentName}`, 20, y); y += 6;
  doc.text(`ID  : ${receipt.studentId}`,   20, y); y += 6;
  doc.text(`Date : ${formatDate(receipt.date)}`, 20, y); y += 10;

  // Payment details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DÉTAILS DU PAIEMENT', 20, y);
  y += 4;

  const paymentTypeLabels = {
    bourse:   'Frais de bourse',
    mandarin: 'Cours de Mandarin',
    anglais:  "Cours d'Anglais",
  };

  const rows: string[][] = [
    ['Type de paiement', paymentTypeLabels[receipt.paymentType]],
    ...(receipt.tranche     ? [['Tranche',           `Tranche ${receipt.tranche}`]] : []),
    ['Montant',               formatCurrency(receipt.amount)],
    ...(receipt.paymentMethod ? [['Mode de paiement', receipt.paymentMethod]]        : []),
    ...(receipt.reference     ? [['Référence',        receipt.reference]]             : []),
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: rows,
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { cellWidth: 115 },
    },
  });

  // Total bar
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFillColor(220, 38, 38);
  doc.roundedRect(20, finalY, 170, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTANT PAYÉ :', 30, finalY + 13);
  doc.text(formatCurrency(receipt.amount), 185, finalY + 13, { align: 'right' });

  // Note + signature
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.text('Ce reçu fait foi de paiement. Merci de le conserver précieusement.', 105, finalY + 33, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Signature autorisée', 155, finalY + 52);
  doc.setDrawColor(180, 180, 180);
  doc.line(140, finalY + 57, 192, finalY + 57);

  addFooter(doc);
  doc.save(`Recu_${receipt.receiptNumber}_${receipt.studentName.replace(/\s+/g, '_')}.pdf`);
};

// ─── 2. Rapport comptable ────────────────────────────────────────────────────
export const generateAccountingReport = async (
  report: AccountingReport,
  options: AccountingReportOptions = {}
): Promise<void> => {
  const doc = new jsPDF();
  const logo = await loadLogoWhiteBase64();
  const startY = addHeader(doc, report.title.toUpperCase(), logo);

  // Formatage devise local (le formatCurrency module-level est FCFA-only).
  const isUsd = options.currency === 'USD';
  const fmtCur = (amount: number): string => {
    const n = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return isUsd ? `$${n}` : `${n} FCFA`;
  };

  // Period
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Période : ${formatDate(report.period.start)} — ${formatDate(report.period.end)}`,
    105, startY + 2, { align: 'center' },
  );

  const includeEntrees = options.includeEntrees ?? true;
  const includeSorties = options.includeSorties ?? true;
  const filteredEntries = report.entries.filter((e) => {
    if (e.type === 'entree') return includeEntrees;
    if (e.type === 'sortie') return includeSorties;
    return true;
  });

  const tableData = filteredEntries.map(e => [
    formatDate(e.date),
    e.description,
    e.category,
    e.type === 'entree' ? fmtCur(e.amount) : '—',
    e.type === 'sortie' ? fmtCur(e.amount) : '—',
  ]);

  autoTable(doc, {
    startY: startY + 8,
    head: [['Date', 'Description', 'Catégorie', 'Entrées', 'Sorties']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9.5,
    },
    styles: { fontSize: 8.5, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 60 },
      2: { cellWidth: 35 },
      3: { cellWidth: 33, halign: 'right' },
      4: { cellWidth: 33, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const rowIndex = data.row.index;
      const entry = filteredEntries[rowIndex];
      if (!entry) return;

      // Color-code amounts (Entrées = green, Sorties = red).
      if (data.column.index === 3 && entry.type === 'entree') {
        data.cell.styles.textColor = [16, 185, 129];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.column.index === 4 && entry.type === 'sortie') {
        data.cell.styles.textColor = [220, 38, 38];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Summary box
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, finalY, 170, 36, 3, 3, 'F');
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.6);
  doc.line(20, finalY, 20, finalY + 36);

  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉSUMÉ', 28, finalY + 10);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Entrées :', 28, finalY + 20);
  doc.text(fmtCur(report.summary.totalEntrees), 185, finalY + 20, { align: 'right' });
  doc.text('Total Sorties :', 28, finalY + 27);
  doc.text(fmtCur(report.summary.totalSorties), 185, finalY + 27, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  const balanceColor: [number, number, number] = report.summary.balance >= 0 ? [16, 185, 129] : [220, 38, 38];
  doc.setTextColor(...balanceColor);
  doc.text('Solde net :', 28, finalY + 34);
  doc.text(fmtCur(report.summary.balance), 185, finalY + 34, { align: 'right' });

  addFooter(doc);
  const fileName = `Rapport_Comptable_${report.period.start}_${report.period.end}.pdf`.replace(/\//g, '-');
  doc.save(fileName);
};

// ─── 3. Rapport étudiant ─────────────────────────────────────────────────────
export const generateStudentReport = async (report: StudentReport): Promise<void> => {
  const doc = new jsPDF();
  const logo = await loadLogoWhiteBase64();
  const startY = addHeader(doc, 'RAPPORT ÉTUDIANT', logo);

  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS PERSONNELLES', 20, startY + 4);

  autoTable(doc, {
    startY: startY + 8,
    body: [
      ['Nom complet',       report.student.name],
      ['Email',             report.student.email],
      ['Téléphone',         report.student.phone],
      ["Niveau d'études",   report.student.niveau],
      ['Filière',           report.student.filiere],
    ],
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 130 },
    },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('STATUT DU DOSSIER', 20, currentY);
  currentY += 7;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Statut : ${report.dossier.status}`, 20, currentY);
  if (report.dossier.university) {
    currentY += 6;
    doc.text(`Université : ${report.dossier.university}`, 20, currentY);
  }

  currentY += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('HISTORIQUE DES PAIEMENTS', 20, currentY);

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Date', 'Type', 'Montant', 'Statut']],
    body: report.payments.map(p => [
      formatDate(p.date), p.type, formatCurrency(p.amount), p.status,
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9.5,
    },
    styles: { fontSize: 9, cellPadding: 3.5 },
    columnStyles: { 2: { halign: 'right' } },
  });

  addFooter(doc);
  doc.save(`Rapport_${report.student.name.replace(/\s+/g, '_')}.pdf`);
};

// ─── 4. Fiche de paie (module RH) ────────────────────────────────────────────
interface PayslipPdfData {
  id: string;
  mois: number;
  annee: number;
  salaire_base: number;
  primes: number;
  deductions: number;
  adjustments?: { type: 'bonus' | 'deduction'; motif: string; montant: number }[];
  jours_absences: number;
  net_a_payer: number;
  notes?: string | null;
  payment_date?: string | null;
  created_at?: string | null;
}

interface PayslipEmployeeData {
  matricule?: string | null;
  nom: string;
  prenom: string;
  poste: string;
  departement?: string | null;
  date_embauche: string;
  // Champs enrichis (optionnels — l'appelant passe l'objet Employee complet)
  numero_cnps?: string | null;
  situation_matrimoniale?: 'celibataire' | 'marie' | 'divorce' | 'veuf' | 'union_libre' | null;
  nombre_enfants?: number | null;
  type_piece?: 'cni' | 'passeport' | 'permis' | 'recepisse' | 'autre' | null;
  numero_piece?: string | null;
  type_contrat?: 'cdi' | 'cdd' | 'stage' | 'consultant' | 'interim' | 'temps_partiel' | null;
  type_horaire?: 'temps_plein' | 'temps_partiel' | 'flexible' | 'poste' | null;
  date_fin_contrat?: string | null;
}

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const SITUATION_FR: Record<string, string> = {
  celibataire: 'Célibataire', marie: 'Marié(e)', divorce: 'Divorcé(e)',
  veuf: 'Veuf(ve)', union_libre: 'Union libre',
};
const CONTRAT_FR: Record<string, string> = {
  cdi: 'CDI', cdd: 'CDD', stage: 'Stage', consultant: 'Consultant',
  interim: 'Intérim', temps_partiel: 'Temps partiel',
};
const HORAIRE_FR: Record<string, string> = {
  temps_plein: 'Temps plein', temps_partiel: 'Temps partiel',
  flexible: 'Flexible', poste: 'Posté',
};
const PIECE_FR: Record<string, string> = {
  cni: 'CNI', passeport: 'Passeport', permis: 'Permis',
  recepisse: 'Récépissé', autre: 'Autre',
};

// Ancienneté (« X an(s) Y mois ») depuis la date d'embauche jusqu'à aujourd'hui.
function computeSeniority(dateEmbauche: string): string {
  const start = new Date(dateEmbauche);
  if (isNaN(start.getTime())) return '';
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} an${years > 1 ? 's' : ''}`);
  if (rem > 0) parts.push(`${rem} mois`);
  return parts.length ? parts.join(' ') : 'moins d\'un mois';
}

// Montant entier converti en toutes lettres (français) — mention obligatoire d'un bulletin.
function numberToFrenchWords(value: number): string {
  let n = Math.round(value);
  if (n === 0) return 'zéro';
  if (n < 0) return 'moins ' + numberToFrenchWords(-n);

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  const below1000 = (num: number): string => {
    let str = '';
    const h = Math.floor(num / 100);
    const rest = num % 100;
    if (h > 0) {
      if (h > 1) str += units[h] + ' ';
      str += 'cent';
      if (h > 1 && rest === 0) str += 's';
      if (rest > 0) str += ' ';
    }
    if (rest > 0) {
      if (rest < 20) {
        str += units[rest];
      } else {
        const t = Math.floor(rest / 10);
        const u = rest % 10;
        if (t === 7 || t === 9) {
          str += tens[t];
          str += (t === 7 && u === 1) ? ' et onze' : '-' + units[10 + u];
        } else {
          str += tens[t];
          if (u === 1 && t !== 8) str += ' et un';
          else if (u > 0) str += '-' + units[u];
          else if (t === 8) str += 's';
        }
      }
    }
    return str.trim();
  };

  const milliards = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;

  let out = '';
  if (milliards > 0) out += (milliards > 1 ? below1000(milliards) + ' ' : 'un ') + 'milliard' + (milliards > 1 ? 's ' : ' ');
  if (millions > 0) out += (millions > 1 ? below1000(millions) + ' ' : 'un ') + 'million' + (millions > 1 ? 's ' : ' ');
  if (milliers > 0) out += (milliers > 1 ? below1000(milliers) + ' ' : '') + 'mille ';
  if (reste > 0) out += below1000(reste);
  return out.trim();
}

export const generatePayslip = async (
  payslip: PayslipPdfData,
  employee: PayslipEmployeeData,
  options?: { output?: 'save' | 'base64' },
): Promise<string | void> => {
  const doc = new jsPDF();
  const logo = await loadLogoWhiteBase64();
  const moisLabel = MOIS_FR[payslip.mois - 1] ?? String(payslip.mois);
  const startY = addHeader(doc, `FICHE DE PAIE — ${moisLabel.toUpperCase()} ${payslip.annee}`, logo);

  const reference = payslipReference(payslip);

  // Formatage des nombres pour les colonnes (séparateur d'espace, sans suffixe).
  const fmtNum = (v: number): string =>
    Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // ── Bandeau d'identification : Réf. + Période + Date de paiement
  const headBandY = startY - 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(15, headBandY, 180, 9, 1.5, 1.5, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Référence', 19, headBandY + 3.5);
  doc.text('Période de paie', 86, headBandY + 3.5);
  doc.text('Date de paiement', 150, headBandY + 3.5);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(reference, 19, headBandY + 7);
  doc.text(`${moisLabel} ${payslip.annee}`, 86, headBandY + 7);
  const paymentDate = payslip.payment_date ?? payslip.created_at;
  doc.text(paymentDate ? formatDate(paymentDate) : '—', 150, headBandY + 7);

  // ── Identité de l'employé (colonnes Employé / Emploi)
  const employeeLines: Array<[string, string]> = [];
  const emp = (label: string, value: string | null | undefined) => {
    if (value != null && String(value).trim() !== '') employeeLines.push([label, String(value)]);
  };
  emp('Nom & prénom', `${employee.prenom} ${employee.nom}`);
  emp('Matricule', employee.matricule);
  emp('N° CNPS', employee.numero_cnps);
  if (employee.situation_matrimoniale) {
    const enf = employee.nombre_enfants ? ` — ${employee.nombre_enfants} enfant(s)` : '';
    emp('Situation familiale', `${SITUATION_FR[employee.situation_matrimoniale] ?? ''}${enf}`);
  }
  if (employee.numero_piece) {
    const tp = employee.type_piece ? `${PIECE_FR[employee.type_piece] ?? ''} ` : '';
    emp('Pièce d\'identité', `${tp}${employee.numero_piece}`);
  }

  const jobLines: Array<[string, string]> = [];
  const job = (label: string, value: string | null | undefined) => {
    if (value != null && String(value).trim() !== '') jobLines.push([label, String(value)]);
  };
  job('Poste', employee.poste);
  job('Département', employee.departement);
  job('Type de contrat', employee.type_contrat ? CONTRAT_FR[employee.type_contrat] : null);
  job('Type d\'horaire', employee.type_horaire ? HORAIRE_FR[employee.type_horaire] : null);
  job('Date d\'embauche', formatDate(employee.date_embauche));
  job('Ancienneté', computeSeniority(employee.date_embauche));
  if (employee.date_fin_contrat) job('Fin de contrat', formatDate(employee.date_fin_contrat));

  const idRows: any[] = [];
  const maxLen = Math.max(employeeLines.length, jobLines.length);
  for (let i = 0; i < maxLen; i++) {
    const l = employeeLines[i] ?? ['', ''];
    const r = jobLines[i] ?? ['', ''];
    idRows.push([
      { content: l[0], styles: { fontStyle: 'bold', textColor: [107, 114, 128] } },
      l[1],
      { content: r[0], styles: { fontStyle: 'bold', textColor: [107, 114, 128] } },
      r[1],
    ]);
  }

  // Identifiants légaux employeur (affichés seulement si renseignés)
  let idTableY = headBandY + 13;
  const employerLegal = [
    COMPANY.nui && `NUI : ${COMPANY.nui}`,
    COMPANY.cnps && `N° CNPS employeur : ${COMPANY.cnps}`,
    COMPANY.rccm && `RCCM : ${COMPANY.rccm}`,
  ].filter(Boolean).join('      ');
  if (employerLegal) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(employerLegal, 15, headBandY + 12.5);
    idTableY = headBandY + 16;
  }

  autoTable(doc, {
    startY: idTableY,
    head: [[
      { content: 'EMPLOYÉ', colSpan: 2 },
      { content: 'EMPLOI', colSpan: 2 },
    ]],
    body: idRows,
    theme: 'grid',
    headStyles: {
      fillColor: [243, 244, 246], textColor: [55, 65, 81],
      fontStyle: 'bold', fontSize: 8, halign: 'left',
    },
    styles: {
      fontSize: 8, cellPadding: 1.6, textColor: [31, 41, 55],
      lineColor: [226, 232, 240], lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 30 }, 1: { cellWidth: 60 },
      2: { cellWidth: 30 }, 3: { cellWidth: 60 },
    },
    margin: { left: 15, right: 15 },
  });

  // ── Détail de la rémunération : ventilation légale (CNPS + impôts sur salaire)
  const pr = computeCameroonPayroll({
    salaireBase: payslip.salaire_base,
    primes: payslip.primes,
    joursAbsences: payslip.jours_absences,
    autresRetenues: payslip.deductions,
  });
  const base = payslip.salaire_base;
  const primes = payslip.primes;

  type Cell = { content: string; styles?: Record<string, unknown> };
  const subtotalStyle = { fontStyle: 'bold', fillColor: [243, 244, 246] };
  const subRow = (label: string, col: 3 | 4, val: number): Cell[] => [
    { content: label, styles: subtotalStyle },
    { content: '', styles: subtotalStyle },
    { content: '', styles: subtotalStyle },
    { content: col === 3 ? fmtNum(val) : '', styles: subtotalStyle },
    { content: col === 4 ? fmtNum(val) : '', styles: subtotalStyle },
  ];
  const gain = (label: string, baseCol: string, val: number): Cell[] => [
    { content: label }, { content: baseCol }, { content: '' }, { content: fmtNum(val) }, { content: '' },
  ];
  const ret = (label: string, baseCol: string, taux: string, val: number): Cell[] => [
    { content: label }, { content: baseCol }, { content: taux }, { content: '' }, { content: fmtNum(val) },
  ];

  // Détail des primes/retenues saisies (motifs). À défaut, on retombe sur les
  // libellés agrégés (anciennes fiches ou fiches auto-générées sans détail).
  const adjustments = payslip.adjustments ?? [];
  const bonusLines = adjustments.filter((a) => a.type === 'bonus' && a.montant > 0);
  const deductionLines = adjustments.filter((a) => a.type === 'deduction' && a.montant > 0);

  const payBody: Cell[][] = [];
  payBody.push(gain('Salaire de base', fmtNum(base), base));
  if (bonusLines.length > 0) {
    bonusLines.forEach((a) => payBody.push(gain(a.motif?.trim() || 'Prime', '', a.montant)));
  } else if (primes > 0) {
    payBody.push(gain('Primes et indemnités', '', primes));
  }
  payBody.push(subRow('SALAIRE BRUT', 3, pr.brut));
  if (pr.absenceDeduction > 0) payBody.push(ret(`Absences (${payslip.jours_absences} j)`, '', '', pr.absenceDeduction));
  if (deductionLines.length > 0) {
    deductionLines.forEach((a) => payBody.push(ret(a.motif?.trim() || 'Retenue', '', '', a.montant)));
  } else if (pr.autresRetenues > 0) {
    payBody.push(ret('Retenues diverses', '', '', pr.autresRetenues));
  }
  payBody.push(subRow('TOTAL DES RETENUES', 4, pr.totalRetenues));

  const payTitleY = ((doc as any).lastAutoTable?.finalY ?? startY + 40) + 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('DÉTAIL DE LA RÉMUNÉRATION', 15, payTitleY);
  autoTable(doc, {
    startY: payTitleY + 3,
    head: [['Rubrique', 'Base', 'Taux', 'Gains', 'Retenues']],
    body: payBody as any,
    theme: 'grid',
    headStyles: {
      fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold',
      fontSize: 8, halign: 'right',
    },
    styles: {
      fontSize: 8.5, cellPadding: 2.2, textColor: [31, 41, 55],
      lineColor: [226, 232, 240], lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 64, halign: 'left' },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 33, halign: 'right' },
      4: { cellWidth: 33, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
    didParseCell: (data: any) => {
      if (data.section === 'head' && data.column.index === 0) data.cell.styles.halign = 'left';
    },
  });

  // ── Net à payer (cohérent avec la ventilation : brut − total retenues)
  const netY = ((doc as any).lastAutoTable?.finalY ?? payTitleY + 40) + 8;
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(15, netY, 180, 14, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('NET À PAYER', 20, netY + 9);
  doc.setTextColor(220, 38, 38);
  doc.text(formatCurrency(pr.netAPayer), 190, netY + 9, { align: 'right' });

  // ── Montant en toutes lettres
  doc.setTextColor(75, 85, 99);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  const enLettres = `Arrêté le présent bulletin à la somme de : ${numberToFrenchWords(pr.netAPayer)} francs CFA.`;
  const lettresSplit = doc.splitTextToSize(enLettres, 180);
  doc.text(lettresSplit, 15, netY + 20);
  let contentEndY = netY + 20 + lettresSplit.length * 4.5;

  // ── Charges patronales (à titre indicatif)
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const chargesLine =
    `Charges patronales (indicatif) : PVID ${fmtNum(pr.employer.pvid)} · Prest. familiales ${fmtNum(pr.employer.prestationsFamiliales)} · ` +
    `Risques pro ${fmtNum(pr.employer.risquesPro)} · CFC ${fmtNum(pr.employer.cfc)} · FNE ${fmtNum(pr.employer.fne)} = ${fmtNum(pr.employer.total)} FCFA. ` +
    `Coût total employeur : ${fmtNum(pr.coutTotalEmployeur)} FCFA.`;
  const chargesSplit = doc.splitTextToSize(chargesLine, 180);
  doc.text(chargesSplit, 15, contentEndY + 1);
  contentEndY = contentEndY + 1 + chargesSplit.length * 3.6;

  // ── Notes
  if (payslip.notes) {
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Observations', 15, contentEndY + 4);
    doc.setFont('helvetica', 'normal');
    const split = doc.splitTextToSize(payslip.notes, 180);
    doc.text(split, 15, contentEndY + 9);
    contentEndY = contentEndY + 9 + split.length * 4.5;
  }

  // ── Mention légale
  const legalY = Math.min(Math.max(contentEndY + 18, 235), 278);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Bulletin de paie à conserver sans limitation de durée.',
    105, legalY, { align: 'center' },
  );

  addFooter(doc);

  // Sortie base64 (sans le préfixe data URI) pour l'envoi en pièce jointe e-mail.
  if (options?.output === 'base64') {
    return doc.output('datauristring').split('base64,')[1] ?? '';
  }
  doc.save(`Fiche_paie_${reference}_${employee.nom}.pdf`);
};
