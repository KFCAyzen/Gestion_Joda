"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import type { StudentView } from "./types";
import { BottomTabs } from "./BottomTabs";
import { StudentHeader } from "./StudentHeader";

const pageMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

export function StudentShell({
  userName,
  view,
  onChangeView,
  unreadCount,
  unreadMessages,
  onLogout,
  statusPill,
  children,
}: {
  userName: string;
  view: StudentView;
  onChangeView: (next: StudentView) => void;
  unreadCount: number;
  unreadMessages: number;
  onLogout: () => void;
  statusPill?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="student-shell min-h-screen">
      <StudentHeader
        userName={userName}
        view={view}
        onMessaging={() => onChangeView("messaging")}
        unreadMessages={unreadMessages}
        onLogout={onLogout}
        statusPill={statusPill}
      />

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            {...pageMotion}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomTabs
        value={view}
        onChange={onChangeView}
        notificationsBadge={unreadCount}
      />
    </div>
  );
}

