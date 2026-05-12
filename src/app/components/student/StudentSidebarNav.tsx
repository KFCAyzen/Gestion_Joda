"use client";

import { Bell, FileText, Upload, WalletCards } from "lucide-react";
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
    return (
        <aside className="hidden w-56 shrink-0 flex-col border-r border-white/8 py-5 md:flex lg:w-64">
            {/* Student identity */}
            <div className="mb-6 px-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-[0_8px_20px_rgba(99,102,241,0.4)]">
                        {avatarInitials(userName)}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{userName}</p>
                        <p className="truncate text-[11px] text-white/50">
                            {universityName ?? "—"} · {studentLevel}
                        </p>
                    </div>
                </div>
            </div>

            {/* Conversations */}
            <div className="mb-4 px-4">
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
                    Conversations
                </p>
                <div className="space-y-1">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => onChangeView("messaging")}
                            className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                                view === "messaging"
                                    ? "bg-white/10"
                                    : "hover:bg-white/6"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-[10px] font-bold text-white">
                                        {avatarInitials(conv.agentName)}
                                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#1a1a2e] bg-green-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-[12px] font-semibold text-white">
                                            {conv.agentName}
                                        </p>
                                        <p className="truncate text-[10px] text-white/45">{conv.preview}</p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                    <span className="text-[9px] text-white/35">{conv.time}</span>
                                    {conv.unread > 0 && (
                                        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
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
                            view === "notifications" ? "bg-white/10" : "hover:bg-white/6"
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/60">
                                <Bell className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-semibold text-white">Notifications système</p>
                                {systemNotifCount > 0 && (
                                    <p className="text-[10px] text-white/45">
                                        {systemNotifCount} nouvelle{systemNotifCount > 1 ? "s" : ""}
                                    </p>
                                )}
                            </div>
                            {systemNotifCount > 0 && (
                                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                    {systemNotifCount}
                                </span>
                            )}
                        </div>
                    </button>
                </div>
            </div>

            {/* Quick actions */}
            <div className="mt-auto px-4">
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
                    Actions rapides
                </p>
                <div className="space-y-0.5">
                    {[
                        { label: "Téléverser un document", icon: <Upload className="h-3.5 w-3.5" />, view: "documents" as StudentView },
                        { label: "Voir mes paiements", icon: <WalletCards className="h-3.5 w-3.5" />, view: "payments" as StudentView },
                        { label: "Mon dossier", icon: <FileText className="h-3.5 w-3.5" />, view: "dossier" as StudentView },
                    ].map((item) => (
                        <button
                            key={item.view}
                            onClick={() => onChangeView(item.view)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] text-white/60 transition-colors hover:bg-white/6 hover:text-white"
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
}
