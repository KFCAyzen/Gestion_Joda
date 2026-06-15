/** Liste des pièces du dossier — port de `DocumentUpload.tsx` (web). */
export const REQUIRED_DOCS = [
  { key: 'passeport', label: 'Passeport', description: "Copie des pages d'identité", optional: false },
  { key: 'casier_judiciaire', label: 'Casier judiciaire', description: 'Bulletin n°3 de moins de 3 mois', optional: false },
  { key: 'carte_photo', label: "Photo d'identité", description: 'Photo récente fond blanc', optional: false },
  { key: 'releve_bac', label: 'Relevé de notes', description: 'Derniers relevés officiels', optional: false },
  { key: 'diplome_bac', label: 'Diplôme', description: 'Diplôme le plus élevé obtenu', optional: false },
  { key: 'lettre_motivation', label: 'Lettre de motivation', description: 'En français ou anglais', optional: false },
  { key: 'lettre_recommandation', label: 'Lettre de recommandation', description: "D'un professeur ou employeur", optional: false },
  { key: 'certificat_hsk', label: 'Certificat HSK', description: 'Si disponible (optionnel)', optional: true },
] as const;

export type DocKey = (typeof REQUIRED_DOCS)[number]['key'];

export const REQUIRED_KEYS = REQUIRED_DOCS.filter((d) => !d.optional).map((d) => d.key);
