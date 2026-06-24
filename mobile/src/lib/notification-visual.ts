import type { ComponentType } from 'react';
import {
  CircleCheckBig,
  CircleX,
  FileX,
  FolderSync,
  Hourglass,
  Info,
  MessageCircle,
  TriangleAlert,
} from 'lucide-react-native';

import type { NotificationType } from './hooks/use-notifications';

/** Props minimales communes aux icônes lucide (évite de dépendre d'un type exporté). */
type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export interface NotificationVisual {
  Icon: IconComponent;
  /** Couleur de l'icône. */
  color: string;
  /** Classe NativeWind du fond de la pastille (teinte translucide). */
  bg: string;
}

const MINT = '#34d9a8';
const AMBER = '#fbbf24';
const CRIMSON = '#ff5a5f';
const INFO = '#60a5fa';

/** Associe un type de notification à son icône + sa teinte (port du mapping SmartAttendance). */
export function notificationVisual(type: NotificationType): NotificationVisual {
  switch (type) {
    case 'paiement_valide':
      return { Icon: CircleCheckBig, color: MINT, bg: 'bg-mint/15' };
    case 'paiement_rejete':
      return { Icon: CircleX, color: CRIMSON, bg: 'bg-crimson/15' };
    case 'retard_paiement':
      return { Icon: TriangleAlert, color: AMBER, bg: 'bg-amber/15' };
    case 'paiement_en_attente':
      return { Icon: Hourglass, color: AMBER, bg: 'bg-amber/15' };
    case 'document_manquant':
      return { Icon: FileX, color: AMBER, bg: 'bg-amber/15' };
    case 'mise_a_jour_dossier':
      return { Icon: FolderSync, color: INFO, bg: 'bg-info/15' };
    case 'message_recu':
      return { Icon: MessageCircle, color: INFO, bg: 'bg-info/15' };
    case 'info':
    default:
      return { Icon: Info, color: INFO, bg: 'bg-info/15' };
  }
}

/** Route cible quand on tape une notification (ouverture contextuelle). */
export function notificationTarget(type: NotificationType): string | null {
  switch (type) {
    case 'message_recu':
      return '/messages';
    case 'paiement_valide':
    case 'paiement_rejete':
    case 'paiement_en_attente':
    case 'retard_paiement':
      return '/payments';
    case 'document_manquant':
      return '/documents';
    case 'mise_a_jour_dossier':
      return '/parcours';
    default:
      return null;
  }
}

/** Temps relatif court en français (« il y a 5 min », « hier », « 3 j »). */
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}
