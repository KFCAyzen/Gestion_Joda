import { ComingSoon } from '@/components/ComingSoon';

export default function DocumentsScreen() {
  return (
    <ComingSoon
      eyebrow="Dossier"
      title="Mes documents"
      note="La checklist des pièces (reçu / à téléverser / optionnel) et l'upload seront branchés sur /api/validate-file et la compression d'image."
    />
  );
}
