import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Company info ────────────────────────────────────────────────────────────
const COMPANY = {
  name:    'JODA COMPANY',
  tagline: "Gestion des bourses d'études en Chine",
  phone:   '+237 6 59 19 92 16',
  website: 'joda-company.com',
  email:   'jodacompany2@gmail.com',
  address: 'Makepe entrée Marie lumière, Douala',
  nui:     'NUI : M022517611037A',
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
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(amount) + ' FCFA';

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
        resolve(canvas.toDataURL('image/png'));
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
  const headerH = 44;
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

  doc.setTextColor(...DARK);

  // Nom société
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY.name, titleX, 11.5);

  // Tagline
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.text(COMPANY.tagline, titleX, 17.5);

  // ── Séparateur pleine largeur
  doc.setDrawColor(...WHITE);
  doc.setLineWidth(0.25);
  doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
  doc.line(marginL, 21, pageW - marginR, 21);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // ── Infos de contact — pleine largeur, 2 colonnes
  const col2X = marginL + (pageW - marginL - marginR) / 2; // ~106 mm
  const lh = 5;
  let cy = 26.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK);

  doc.text(`Tel.    : ${COMPANY.phone}`,   marginL, cy);
  doc.text(`E-mail  : ${COMPANY.email}`,   col2X,   cy);
  cy += lh;
  doc.text(`Web     : ${COMPANY.website}`, marginL, cy);
  doc.text(`Adresse : ${COMPANY.address}`, col2X,   cy);
  cy += lh;
  doc.setFontSize(7);
  doc.text(`${COMPANY.nui}`, marginL, cy);

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
      `${COMPANY.name}  •  ${COMPANY.nui}  •  ${COMPANY.address}`,
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
export const generateAccountingReport = async (report: AccountingReport): Promise<void> => {
  const doc = new jsPDF();
  const logo = await loadLogoWhiteBase64();
  const startY = addHeader(doc, report.title.toUpperCase(), logo);

  // Period
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Période : ${formatDate(report.period.start)} — ${formatDate(report.period.end)}`,
    105, startY + 2, { align: 'center' },
  );

  const tableData = report.entries.map(e => [
    formatDate(e.date),
    e.description,
    e.category,
    e.type === 'entree' ? formatCurrency(e.amount) : '—',
    e.type === 'sortie' ? formatCurrency(e.amount) : '—',
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
  doc.text(formatCurrency(report.summary.totalEntrees), 185, finalY + 20, { align: 'right' });
  doc.text('Total Sorties :', 28, finalY + 27);
  doc.text(formatCurrency(report.summary.totalSorties), 185, finalY + 27, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  const balanceColor: [number, number, number] = report.summary.balance >= 0 ? [16, 185, 129] : [220, 38, 38];
  doc.setTextColor(...balanceColor);
  doc.text('Solde net :', 28, finalY + 34);
  doc.text(formatCurrency(report.summary.balance), 185, finalY + 34, { align: 'right' });

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
