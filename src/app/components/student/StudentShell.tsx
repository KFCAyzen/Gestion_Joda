"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import type { StudentView } from "./types";
import { BottomTabs } from "./BottomTabs";
import { StudentHeader } from "./StudentHeader";
import { StudentSidebarNav } from "./StudentSidebarNav";

const pageMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

interface Conversation {
  id: string;
  agentName: string;
  preview: string;
  time: string;
  unread: number;
}

export function StudentShell({
  userName,
  universityName,
  studentLevel,
  view,
  onChangeView,
  unreadCount,
  onLogout,
  statusPill,
  conversations,
  children,
}: {
  userName: string;
  universityName?: string | null;
  studentLevel?: string;
  view: StudentView;
  onChangeView: (next: StudentView) => void;
  unreadCount: number;
  onLogout: () => void;
  statusPill?: string | null;
  conversations?: Conversation[];
  children: ReactNode;
}) {
  const isChatView = view === "messaging";

  return (
    <div className="student-shell min-h-screen">
      <StudentHeader
        userName={userName}
        view={view}
        onNotifications={() => onChangeView("notifications")}
        unreadCount={unreadCount}
        onLogout={onLogout}
        statusPill={statusPill}
      />

      {/* Body: sidebar + content */}
      <div className="mx-auto flex max-w-7xl">
        <StudentSidebarNav
          userName={userName}
          universityName={universityName ?? null}
          studentLevel={studentLevel ?? ""}
          view={view}
          onChangeView={onChangeView}
          conversations={conversations ?? []}
          systemNotifCount={unreadCount}
        />

        {/* Main content */}
        {isChatView ? (
          /* Chat fills remaining space without extra padding */
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                {...pageMotion}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <main className="flex-1 min-w-0 px-4 pb-28 pt-6 sm:px-6">
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
        )}
      </div>

      <BottomTabs
        value={view}
        onChange={onChangeView}
        notificationsBadge={unreadCount}
      />
    </div>
  );
}

