import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types
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

// Utilitaires
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
  }).format(amount) + ' FCFA';
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

// Fonction pour ajouter l'en-tête Joda
const addHeader = (doc: jsPDF, title: string) => {
  // Logo et titre
  const fillColor: [number, number, number] = [220, 38, 38]; // Rose Joda
  doc.setFillColor(...fillColor);
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('JODA COMPANY', 105, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestion des bourses d\'études en Chine', 105, 23, { align: 'center' });
  doc.text('Email: contact@joda.app | Tél: +237 XXX XXX XXX', 105, 29, { align: 'center' });
  
  // Titre du document
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 105, 50, { align: 'center' });
};

// Fonction pour ajouter le pied de page
const addFooter = (doc: jsPDF) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    
    const footerText = `Document généré le ${formatDate(new Date().toISOString())} - Page ${i}/${pageCount}`;
    doc.text(footerText, 105, 287, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 283, 190, 283);
  }
};

// 1. Génération de reçu de paiement
export const generatePaymentReceipt = (receipt: PaymentReceipt): void => {
  const doc = new jsPDF();
  
  addHeader(doc, 'REÇU DE PAIEMENT');
  
  // Numéro de reçu
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(140, 55, 50, 10, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° ${receipt.receiptNumber}`, 165, 61, { align: 'center' });
  
  // Informations étudiant
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS ÉTUDIANT', 20, 75);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom: ${receipt.studentName}`, 20, 85);
  doc.text(`ID Étudiant: ${receipt.studentId}`, 20, 92);
  doc.text(`Date: ${formatDate(receipt.date)}`, 20, 99);
  
  // Détails du paiement
  doc.setFont('helvetica', 'bold');
  doc.text('DÉTAILS DU PAIEMENT', 20, 115);
  
  const paymentTypeLabels = {
    bourse: 'Frais de bourse',
    mandarin: 'Cours de Mandarin',
    anglais: 'Cours d\'Anglais',
  };
  
  const rows = [
    ['Type de paiement', paymentTypeLabels[receipt.paymentType]],
    ...(receipt.tranche ? [['Tranche', `Tranche ${receipt.tranche}`]] : []),
    ['Montant', formatCurrency(receipt.amount)],
    ...(receipt.paymentMethod ? [['Mode de paiement', receipt.paymentMethod]] : []),
    ...(receipt.reference ? [['Référence', receipt.reference]] : []),
  ];
  
  autoTable(doc, {
    startY: 120,
    head: [],
    body: rows,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 110 },
    },
  });
  
  // Montant total en grand
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  const redColor: [number, number, number] = [220, 38, 38];
  doc.setFillColor(...redColor);
  doc.roundedRect(20, finalY, 170, 20, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTANT PAYÉ:', 30, finalY + 13);
  doc.text(formatCurrency(receipt.amount), 180, finalY + 13, { align: 'right' });
  
  // Note
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Ce reçu fait foi de paiement. Merci de le conserver précieusement.', 105, finalY + 35, { align: 'center' });
  
  // Signature
  doc.setFont('helvetica', 'normal');
  doc.text('Signature autorisée', 150, finalY + 55);
  doc.line(140, finalY + 60, 190, finalY + 60);
  
  addFooter(doc);
  
  doc.save(`Recu_${receipt.receiptNumber}_${receipt.studentName.replace(/\s+/g, '_')}.pdf`);
};

// 2. Génération de rapport comptable
export const generateAccountingReport = (report: AccountingReport): void => {
  const doc = new jsPDF();
  
  addHeader(doc, report.title.toUpperCase());
  
  // Période
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Période: ${formatDate(report.period.start)} - ${formatDate(report.period.end)}`,
    105,
    60,
    { align: 'center' }
  );
  
  // Tableau des entrées/sorties
  const tableData = report.entries.map(entry => [
    formatDate(entry.date),
    entry.description,
    entry.category,
    entry.type === 'entree' ? formatCurrency(entry.amount) : '-',
    entry.type === 'sortie' ? formatCurrency(entry.amount) : '-',
  ]);
  
  autoTable(doc, {
    startY: 70,
    head: [['Date', 'Description', 'Catégorie', 'Entrées', 'Sorties']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 60 },
      2: { cellWidth: 35 },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
    },
  });
  
  // Résumé
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  const grayColor: [number, number, number] = [248, 250, 252];
  doc.setFillColor(...grayColor);
  doc.roundedRect(20, finalY, 170, 35, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉSUMÉ', 30, finalY + 10);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Entrées:', 30, finalY + 20);
  doc.text(formatCurrency(report.summary.totalEntrees), 180, finalY + 20, { align: 'right' });
  
  doc.text('Total Sorties:', 30, finalY + 27);
  doc.text(formatCurrency(report.summary.totalSorties), 180, finalY + 27, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  const balanceColor: [number, number, number] = report.summary.balance >= 0 ? [16, 185, 129] : [220, 38, 38];
  doc.setTextColor(...balanceColor);
  doc.text('Solde:', 30, finalY + 34);
  doc.text(formatCurrency(report.summary.balance), 180, finalY + 34, { align: 'right' });
  
  addFooter(doc);
  
  const fileName = `Rapport_Comptable_${report.period.start}_${report.period.end}.pdf`.replace(/\//g, '-');
  doc.save(fileName);
};

// 3. Génération de rapport étudiant
export const generateStudentReport = (report: StudentReport): void => {
  const doc = new jsPDF();
  
  addHeader(doc, 'RAPPORT ÉTUDIANT');
  
  // Informations étudiant
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS PERSONNELLES', 20, 65);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const studentInfo = [
    ['Nom complet', report.student.name],
    ['Email', report.student.email],
    ['Téléphone', report.student.phone],
    ['Niveau d\'études', report.student.niveau],
    ['Filière', report.student.filiere],
  ];
  
  autoTable(doc, {
    startY: 70,
    body: studentInfo,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 120 },
    },
  });
  
  // Statut du dossier
  let currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('STATUT DU DOSSIER', 20, currentY);
  
  currentY += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Statut: ${report.dossier.status}`, 20, currentY);
  
  if (report.dossier.university) {
    currentY += 7;
    doc.text(`Université: ${report.dossier.university}`, 20, currentY);
  }
  
  // Historique des paiements
  currentY += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('HISTORIQUE DES PAIEMENTS', 20, currentY);
  
  const paymentData = report.payments.map(p => [
    formatDate(p.date),
    p.type,
    formatCurrency(p.amount),
    p.status,
  ]);
  
  autoTable(doc, {
    startY: currentY + 5,
    head: [['Date', 'Type', 'Montant', 'Statut']],
    body: paymentData,
    theme: 'striped',
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      2: { halign: 'right' },
    },
  });
  
  addFooter(doc);
  
  doc.save(`Rapport_${report.student.name.replace(/\s+/g, '_')}.pdf`);
};
