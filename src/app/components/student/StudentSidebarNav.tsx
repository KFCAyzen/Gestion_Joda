"use client";

import { Bell, FileText, Upload, WalletCards } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StudentView } from "./types";

interface Conversation {
    id: string;
    agentName: string;
    preview: string;
    time: string;
    unread: number;
}

interface Props {
    userName: string;
    universityName: string | null;
    studentLevel: string;
    view: StudentView;
    onChangeView: (v: StudentView) => void;
    conversations: Conversation[];
    systemNotifCount: number;
}

function avatarInitials(name: string): string {
    return name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
}

export function StudentSidebarNav({
    userName,
    universityName,
    studentLevel,
    view,
    onChangeView,
    conversations,
    systemNotifCount,
}: Props) {
    const t = useTranslations("student.portal.sidebar");
    return (
        <aside className="student-sidebar hidden w-56 shrink-0 flex-col border-r border-[var(--student-border)] py-5 dark:border-white/8 md:flex lg:w-64 overflow-y-auto">
            {/* Student identity */}
            <div className="px-4 pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-800 text-sm font-bold text-white shadow-[0_8px_20px_rgba(220,38,38,0.35)]">
                        {avatarInitials(userName)}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--student-fg)]">{userName}</p>
                        <p className="truncate text-[11px] text-[var(--student-fg-muted)]">
                            {universityName ?? "—"} · {studentLevel}
                        </p>
                    </div>
                </div>
            </div>

            {/* Conversations */}
            <div className="mb-4">
                <div className="mb-2 flex items-center gap-2 px-4">
                    <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
                        {t("conversations")}
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                </div>
                <div className="space-y-1 px-4">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => onChangeView("messaging")}
                            className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                                view === "messaging"
                                    ? "bg-white/15 dark:bg-white/10"
                                    : "hover:bg-white/10 dark:hover:bg-white/6"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-[10px] font-bold text-white">
                                        {avatarInitials(conv.agentName)}
                                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[rgba(185,28,28,0.9)] bg-green-400 dark:border-[#1a1a2e]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-[12px] font-semibold text-[var(--student-fg)]">
                                            {conv.agentName}
                                        </p>
                                        <p className="truncate text-[10px] text-[var(--student-fg-muted)]">{conv.preview}</p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                    <span className="text-[9px] text-[var(--student-fg-muted)]">{conv.time}</span>
                                    {conv.unread > 0 && (
                                        <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                            {conv.unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}

                    {/* System notifications */}
                    <button
                        onClick={() => onChangeView("notifications")}
                        className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                            view === "notifications" ? "bg-white/15 dark:bg-white/10" : "hover:bg-white/10 dark:hover:bg-white/6"
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-[var(--student-ring-move)] dark:bg-white/8 dark:text-white/60">
                                <Bell className="h-3.5 w-3.5" />
                            </div>
                            <p className="min-w-0 flex-1 text-[12px] font-semibold text-[var(--student-fg)]">{t("systemNotifications")}</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Quick actions */}
            <div className="mt-auto">
                <div className="mb-2 flex items-center gap-2 px-4">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
                        {t("quickActions")}
                    </span>
                </div>
                <div className="space-y-0.5 px-4">
                    {[
                        { labelKey: "uploadDocument", icon: <Upload className="h-3.5 w-3.5" />, view: "documents" as StudentView },
                        { labelKey: "viewPayments", icon: <WalletCards className="h-3.5 w-3.5" />, view: "payments" as StudentView },
                        { labelKey: "myDossier", icon: <FileText className="h-3.5 w-3.5" />, view: "dossier" as StudentView },
                    ].map((item) => (
                        <button
                            key={item.view}
                            onClick={() => onChangeView(item.view)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] text-[var(--student-fg-muted)] transition-colors hover:bg-white/10 hover:text-[var(--student-ring-move)] dark:hover:bg-white/6 dark:hover:text-white"
                        >
                            {item.icon}
                            {t(item.labelKey as any)}
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
}
