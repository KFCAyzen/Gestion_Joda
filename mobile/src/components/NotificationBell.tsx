import { useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { useUnreadCount } from '@/lib/hooks/use-notifications';
import { BellBtn } from './ui/BellBtn';
import { NotificationsSheet } from './NotificationsSheet';

/** Cloche connectée : point rouge si non-lues + ouverture de la feuille. */
export function NotificationBell() {
  const { user } = useAuth();
  const unread = useUnreadCount(user?.id);
  const [open, setOpen] = useState(false);

  return (
    <>
      <BellBtn hasUnread={unread > 0} onPress={() => setOpen(true)} />
      <NotificationsSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
