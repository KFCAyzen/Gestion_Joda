export interface FaqItem {
  id: string;
  labelFR: string;
  labelEN: string;
  questionFR: string;
  questionEN: string;
  answerFR: string;
  answerEN: string;
  /** Mots-clés (FR + EN) qui déclenchent cette réponse sur un message libre */
  keywords: string[];
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
    keywords: [
      "dossier", "candidature", "statut", "ou en est", "avancement", "etat de mon dossier",
      "application", "file status", "status", "progress",
    ],
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
    keywords: [
      "document", "documents", "papier", "piece", "pieces", "fichier", "manque", "manquant",
      "deposer", "uploader", "telecharger",
      "missing", "upload", "paperwork",
    ],
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
    keywords: [
      "paiement", "payer", "payement", "virement", "regler", "tranche", "comment payer",
      "declarer", "preuve de paiement", "montant",
      "payment", "pay", "transfer", "installment", "how to pay",
    ],
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
    keywords: [
      "delai", "delais", "combien de temps", "duree", "ca prend combien", "quand", "attendre",
      "how long", "timeline", "delay", "duration", "processing time", "when",
    ],
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
    keywords: [
      "visa", "x2", "jw202", "jw 202", "ambassade", "lettre d'admission", "lettre admission",
      "embassy", "admission letter",
    ],
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
    keywords: [
      "mandarin", "chinois", "cours de langue", "cours d'anglais", "cours anglais", "langue",
      "m'inscrire", "inscription cours",
      "language course", "language courses", "english course", "chinese", "enroll",
    ],
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
    keywords: [
      "universite", "fac", "faculte", "campus", "logement", "programme", "contacter mon universite",
      "university", "housing", "program", "contact university",
    ],
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
    keywords: [
      "penalite", "penalites", "retard", "amende", "payer en retard", "date limite depassee",
      "late", "late fee", "late fees", "penalty", "overdue",
    ],
  },
];

/** Réponse rapide pour une intention de base (salutation, remerciement, etc.) */
export interface QuickReply {
  id: string;
  keywords: string[];
  /** Mots-clés courts à matcher en mot entier (évite les faux positifs : « hi » dans « chinois ») */
  exactKeywords?: string[];
  /** Évalué AVANT la FAQ (escalade explicite). Par défaut, évalué après. */
  beforeFaq?: boolean;
  subjectFR: string;
  subjectEN: string;
  answerFR: string;
  answerEN: string;
}

/**
 * Intentions de base, hors FAQ : salutations, remerciements, demande d'agent humain, contact.
 * Évaluées en priorité sur la FAQ pour les messages très courts (« bonjour », « merci »).
 */
export const QUICK_REPLIES: QuickReply[] = [
  {
    id: "greeting",
    keywords: ["bonjour", "bonsoir", "salut", "coucou", "good morning", "good evening"],
    exactKeywords: ["hello", "hi", "hey"],
    subjectFR: "Bonjour 👋",
    subjectEN: "Hello 👋",
    answerFR:
      "Bonjour 👋 ! Je suis l'assistant Joda. Posez-moi votre question (dossier, documents, paiements, visa, délais…) ou utilisez les suggestions ci-dessous. Votre agent prend également le relais dès que nécessaire.",
    answerEN:
      "Hello 👋! I'm the Joda assistant. Ask me your question (file, documents, payments, visa, timeline…) or use the suggestions below. Your agent also steps in whenever needed.",
  },
  {
    id: "thanks",
    keywords: ["merci", "thank you", "thanks", "thx", "je vous remercie"],
    subjectFR: "Avec plaisir",
    subjectEN: "You're welcome",
    answerFR:
      "Avec plaisir 🙏 ! N'hésitez pas si vous avez d'autres questions, je reste disponible.",
    answerEN:
      "You're welcome 🙏! Feel free to ask if you have any other questions, I'm here to help.",
  },
  {
    id: "human_agent",
    keywords: [
      "parler a un agent", "agent humain", "un humain", "une personne", "vrai agent",
      "speak to a human", "talk to a human", "real person", "human agent", "speak to an agent",
    ],
    beforeFaq: true,
    subjectFR: "Transmission à votre agent",
    subjectEN: "Forwarded to your agent",
    answerFR:
      "Votre demande a bien été transmise à votre agent Joda. Ce chat reste disponible 24h/24 et une personne de notre équipe vous répondra personnellement dans les meilleurs délais.",
    answerEN:
      "Your request has been forwarded to your Joda agent. This chat stays available 24/7 and a member of our team will reply to you personally as soon as possible.",
  },
  {
    id: "contact_hours",
    keywords: [
      "horaire", "horaires", "ouvert", "heures d'ouverture", "vous joindre", "telephone",
      "numero", "appeler", "contact", "ou etes vous", "adresse", "bureau",
      "opening hours", "open", "phone number", "call you", "reach you", "office",
    ],
    subjectFR: "Nous contacter",
    subjectEN: "Contact us",
    answerFR:
      "Ce chat est disponible 24h/24, 7j/7 : posez votre question à tout moment et l'assistant vous répond immédiatement. Votre agent Joda prend ensuite le relais pour les demandes nécessitant un suivi personnalisé. Pour une demande urgente, précisez-le dans votre message et nous la traiterons en priorité.",
    answerEN:
      "This chat is available 24/7: ask your question anytime and the assistant replies instantly. Your Joda agent then takes over for requests requiring personal follow-up. For an urgent request, mention it in your message and we'll prioritize it.",
  },
];

export function getFaqById(id: string): FaqItem | undefined {
  return FAQ_ITEMS.find((item) => item.id === id);
}

/** Normalise un texte pour le matching : minuscules, sans accents, espaces compactés. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Vrai si `keyword` (déjà normalisé) apparaît comme sous-chaîne de `haystack`. */
function containsPhrase(haystack: string, keyword: string): boolean {
  return haystack.includes(keyword);
}

/** Vrai si `keyword` (déjà normalisé) apparaît comme mot entier de `haystack`. */
function containsWord(haystack: string, keyword: string): boolean {
  return new RegExp(`(^|\\s)${keyword}(\\s|$)`).test(haystack);
}

export interface AutoReply {
  /** "quick" pour une intention de base, "faq" pour une réponse FAQ */
  source: "quick" | "faq";
  /** id de la QuickReply ou du FaqItem ayant matché */
  matchedId: string;
  subjectFR: string;
  subjectEN: string;
  answerFR: string;
  answerEN: string;
}

/**
 * Tente de reconnaître une question basique/récurrente dans un message libre
 * et renvoie la réponse prédéfinie associée. Les intentions de base (salutations,
 * remerciements…) sont prioritaires, puis la FAQ. Renvoie `null` si rien ne matche.
 */
export function matchAutoReply(content: string): AutoReply | null {
  const text = normalize(content);
  if (!text) return null;

  const quickHit = (qr: QuickReply): boolean =>
    qr.keywords.some((kw) => containsPhrase(text, normalize(kw))) ||
    (qr.exactKeywords ?? []).some((kw) => containsWord(text, normalize(kw)));

  const asAutoReply = (qr: QuickReply): AutoReply => ({
    source: "quick",
    matchedId: qr.id,
    subjectFR: qr.subjectFR,
    subjectEN: qr.subjectEN,
    answerFR: qr.answerFR,
    answerEN: qr.answerEN,
  });

  // 1. Intentions à traiter AVANT la FAQ (escalade explicite : « parler à un agent »)
  for (const qr of QUICK_REPLIES) {
    if (qr.beforeFaq && quickHit(qr)) return asAutoReply(qr);
  }

  // 2. FAQ : on retient l'item au plus grand nombre de mots-clés présents
  let best: { item: FaqItem; score: number } | null = null;
  for (const item of FAQ_ITEMS) {
    const score = item.keywords.reduce(
      (acc, kw) => acc + (containsPhrase(text, normalize(kw)) ? 1 : 0),
      0,
    );
    if (score > 0 && (!best || score > best.score)) best = { item, score };
  }
  if (best) {
    return {
      source: "faq",
      matchedId: best.item.id,
      subjectFR: "Réponse à votre question",
      subjectEN: "Answer to your question",
      answerFR: best.item.answerFR,
      answerEN: best.item.answerEN,
    };
  }

  // 3. Intentions de base restantes (salutation, remerciement, contact)
  for (const qr of QUICK_REPLIES) {
    if (!qr.beforeFaq && quickHit(qr)) return asAutoReply(qr);
  }

  return null;
}
