export interface FaqItem {
  id: string;
  labelFR: string;
  labelEN: string;
  questionFR: string;
  questionEN: string;
  answerFR: string;
  answerEN: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "dossier_status",
    labelFR: "Mon dossier",
    labelEN: "My file",
    questionFR: "Où en est mon dossier de candidature ?",
    questionEN: "What is the status of my application?",
    answerFR:
      "Votre dossier est actuellement en cours de traitement. Vous pouvez suivre son avancement en temps réel dans la section Dossier de votre portail. Un agent vous contactera dès qu'une action est requise de votre part.",
    answerEN:
      "Your application file is currently being processed. You can track its progress in real time in the File section of your portal. An agent will contact you as soon as action is required on your end.",
  },
  {
    id: "documents",
    labelFR: "Mes documents",
    labelEN: "My documents",
    questionFR: "Quels documents me manquent ?",
    questionEN: "Which documents am I missing?",
    answerFR:
      "Rendez-vous dans la section Documents de votre portail pour voir la liste complète et l'état de chaque pièce. Les documents manquants ou en attente de validation y sont clairement indiqués. Vous pouvez déposer vos fichiers directement depuis cette section.",
    answerEN:
      "Go to the Documents section of your portal to see the full list and the status of each document. Missing or pending documents are clearly indicated. You can upload your files directly from that section.",
  },
  {
    id: "payment",
    labelFR: "Paiements",
    labelEN: "Payments",
    questionFR: "Comment effectuer mon paiement ?",
    questionEN: "How do I make my payment?",
    answerFR:
      "Vos tranches de paiement et leurs dates limites sont visibles dans la section Paiements de votre portail. Après avoir effectué votre virement, utilisez le bouton « Déclarer ce paiement » pour transmettre votre preuve à l'équipe. La validation est effectuée par un agent dans les plus brefs délais.",
    answerEN:
      "Your payment installments and their due dates are visible in the Payments section of your portal. After making your transfer, use the \"Declare this payment\" button to send your proof to the team. Validation is done by an agent as soon as possible.",
  },
  {
    id: "delay",
    labelFR: "Délais",
    labelEN: "Timeline",
    questionFR: "Combien de temps prend le traitement de mon dossier ?",
    questionEN: "How long does it take to process my application?",
    answerFR:
      "Le traitement d'un dossier de bourse prend en général entre 4 et 8 semaines selon la période et l'université visée. Vous recevrez une notification à chaque étape clé : réception des documents, soumission à l'université, décision d'admission.",
    answerEN:
      "Processing a scholarship application generally takes between 4 and 8 weeks depending on the period and the target university. You will receive a notification at each key stage: document receipt, university submission, admission decision.",
  },
  {
    id: "visa",
    labelFR: "Visa",
    labelEN: "Visa",
    questionFR: "Comment se passe l'obtention du visa ?",
    questionEN: "How does the visa process work?",
    answerFR:
      "Une fois votre admission validée par l'université, notre équipe vous guidera pour les démarches visa : formulaire X2, lettre d'admission officielle et formulaire JW202. Ces documents sont fournis par l'université et notre équipe vous accompagne tout au long du processus.",
    answerEN:
      "Once your admission is validated by the university, our team will guide you through the visa process: X2 form, official admission letter, and JW202 form. These documents are provided by the university and our team will support you throughout the process.",
  },
  {
    id: "language",
    labelFR: "Cours de langue",
    labelEN: "Language courses",
    questionFR: "Comment m'inscrire aux cours de mandarin ou d'anglais ?",
    questionEN: "How do I enroll in Mandarin or English courses?",
    answerFR:
      "L'inscription aux cours de langue se fait via votre agent Joda. Contactez-nous en précisant votre choix (mandarin ou anglais) et nous créerons votre plan de paiement. Les cours sont disponibles en deux tranches : une inscription initiale et un paiement en cours de formation.",
    answerEN:
      "Enrollment in language courses is done through your Joda agent. Contact us specifying your choice (Mandarin or English) and we will set up your payment plan. Courses are available in two installments: an initial registration and a payment during training.",
  },
  {
    id: "university",
    labelFR: "Mon université",
    labelEN: "My university",
    questionFR: "Comment contacter mon université ?",
    questionEN: "How do I contact my university?",
    answerFR:
      "Les coordonnées directes de votre université vous seront communiquées après validation de votre admission. En attendant, toutes vos questions académiques (programme, logement, campus) peuvent être relayées par notre équipe qui est en contact permanent avec nos partenaires universitaires.",
    answerEN:
      "Your university's direct contact details will be provided after your admission is validated. In the meantime, all your academic questions (program, housing, campus) can be relayed by our team, which is in permanent contact with our university partners.",
  },
  {
    id: "penalty",
    labelFR: "Pénalités",
    labelEN: "Late fees",
    questionFR: "Que se passe-t-il si je paie en retard ?",
    questionEN: "What happens if I pay late?",
    answerFR:
      "Des pénalités de retard s'appliquent automatiquement à partir du lendemain de la date limite : 10 000 FCFA/jour pour la procédure bourse, 500 FCFA/jour pour l'inscription aux cours de langue, 1 000 FCFA/jour par tranche de cours. Nous vous recommandons de déclarer votre paiement dès l'envoi du virement pour éviter l'accumulation de pénalités.",
    answerEN:
      "Late fees apply automatically from the day after the deadline: 10,000 FCFA/day for the scholarship procedure, 500 FCFA/day for language course registration, 1,000 FCFA/day per course installment. We recommend declaring your payment as soon as you send the transfer to avoid accumulating fees.",
  },
];

export function getFaqById(id: string): FaqItem | undefined {
  return FAQ_ITEMS.find((item) => item.id === id);
}
