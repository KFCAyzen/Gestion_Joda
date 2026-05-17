"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Mic, MoreVertical, Paperclip, Send } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/app/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
    useStudentChat,
    useSendChatMessage,
    useMarkMessagesRead,
    STUDENT_CHAT_KEY,
    type ChatMessage,
} from "@/app/lib/hooks/use-messages";

interface DossierInfo {
    status: string;
    university: string | null;
    program: string | null;
    docsOk: number;
    docsTotal: number;
    nextStep: string | null;
    nextStepAt: string | null;
}

interface PaymentInfo {
    label: string;
    montant: number;
    dateLimite: string | null;
    daysLeft: number | null;
}

interface Props {
    userId: string;
    agentName: string;
    onBack: () => void;
    dossier: DossierInfo | null;
    nextPayment: PaymentInfo | null;
    onUnreadChange?: (n: number) => void;
}

function fmtTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDateSep(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "AUJOURD'HUI";
    if (d.toDateString() === yesterday.toDateString()) return "HIER";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }).toUpperCase();
}

function groupByDay(messages: ChatMessage[]) {
    const groups: { label: string; messages: ChatMessage[] }[] = [];
    let lastDay = "";
    messages.forEach((msg) => {
        const day = new Date(msg.created_at).toDateString();
        if (day !== lastDay) {
            groups.push({ label: fmtDateSep(msg.created_at), messages: [] });
            lastDay = day;
        }
        groups[groups.length - 1].messages.push(msg);
    });
    return groups;
}

function isSystemMessage(msg: ChatMessage): boolean {
    return !!(msg.metadata as Record<string, unknown>)?.system;
}

function avatarInitials(name: string): string {
    return name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
}

export function StudentChatFull({ userId, agentName, onBack, dossier, nextPayment, onUnreadChange }: Props) {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const t = useTranslations("student.portal.chat");
    const locale = useLocale();
    const [text, setText] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    // ── TanStack Query ────────────────────────────────────────────────────────
    const { data: messages = [], isLoading: loading } = useStudentChat(userId);
    const sendChatMessage = useSendChatMessage(userId);
    const markMessagesRead = useMarkMessagesRead();

    // agentUserId dérivé du premier message reçu
    const agentUserId = messages.find((m) => m.to_user_id === userId)?.from_user_id ?? null;

    // Marque les messages non lus comme lus dès qu'ils apparaissent
    useEffect(() => {
        const unreadIds = messages
            .filter((m) => m.to_user_id === userId && !m.read)
            .map((m) => m.id);
        if (unreadIds.length > 0) markMessagesRead.mutate(unreadIds);
        onUnreadChange?.(unreadIds.length > 0 ? 0 : 0);
    }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

    // Scroll automatique vers le bas
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Real-time : nouveaux messages reçus
    useEffect(() => {
        const channel = supabase
            .channel(`chat-${userId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: `to_user_id=eq.${userId}`,
            }, (payload) => {
                const newMsg = payload.new as ChatMessage;
                queryClient.setQueryData<ChatMessage[]>([...STUDENT_CHAT_KEY, userId], (old) => {
                    if (!old) return [newMsg];
                    if (old.some((m) => m.id === newMsg.id)) return old;
                    return [...old, newMsg];
                });
                // Marque immédiatement comme lu côté serveur
                void supabase.from("messages").update({ read: true }).eq("id", newMsg.id);
                onUnreadChange?.(0);
            })
            .subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [userId, queryClient, supabase, onUnreadChange]);

    // ── Envoi ─────────────────────────────────────────────────────────────────

    const send = async () => {
        const content = text.trim();
        if (!content || sendChatMessage.isPending) return;
        setText("");
        await sendChatMessage.mutateAsync({ content, agentUserId });
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send();
        }
    };

    // ── Labels dossier ────────────────────────────────────────────────────────

    const dossierStatusLabel: Record<string, string> = {
        document_recu:          t("statusLabels.document_recu"),
        en_attente:             t("statusLabels.en_attente"),
        en_cours:               t("statusLabels.en_cours"),
        document_manquant:      t("statusLabels.document_manquant"),
        admission_validee:      t("statusLabels.admission_validee"),
        admission_rejetee:      t("statusLabels.admission_rejetee"),
        en_attente_universite:  t("statusLabels.en_attente_universite"),
        visa_en_cours:          t("statusLabels.visa_en_cours"),
        termine:                t("statusLabels.termine"),
    };

    const groups = groupByDay(messages);

    // ── Rendu ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex h-[calc(100dvh-4rem)] overflow-hidden md:h-[calc(100vh-4rem)]">
            {/* CENTER — Chat */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2.5 border-b border-[var(--student-border)] bg-[var(--student-surface-2)] px-3 py-2.5 backdrop-blur-xl sm:gap-3 sm:px-4 sm:py-3">
                    <button
                        onClick={onBack}
                        aria-label="Retour"
                        className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--student-fg-muted)] transition-colors hover:bg-[var(--student-surface)] hover:text-[var(--student-fg)] md:hidden"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="relative shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(220,38,38,0.30)]">
                            {avatarInitials(agentName)}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--student-ink)] bg-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold leading-tight text-[var(--student-fg)] sm:text-sm">
                            {agentName}
                            <span className="ml-1 font-normal text-[var(--student-fg-muted)]">· {t("yourAgent")}</span>
                        </p>
                        <p className="mt-0.5 truncate text-[11px] leading-tight text-[var(--student-fg-muted)] opacity-75">{t("onlineStatus")}</p>
                    </div>
                    {dossier && (
                        <span className="hidden shrink-0 rounded-full border border-[var(--student-border)] bg-[var(--student-surface)] px-2.5 py-1 text-[11px] text-[var(--student-fg-muted)] sm:inline">
                            {dossierStatusLabel[dossier.status] ?? dossier.status}
                        </span>
                    )}
                    <button
                        aria-label="Options"
                        className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--student-fg-muted)] transition-colors hover:bg-[var(--student-surface)] hover:text-[var(--student-fg)] md:hidden"
                    >
                        <MoreVertical className="h-5 w-5" />
                    </button>
                </div>

                {/* Messages */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-sm text-[var(--student-fg-muted)]">
                            {t("loading")}
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-sm text-[var(--student-fg-muted)]">
                            {t("empty")}
                        </div>
                    ) : (
                        groups.map((group) => (
                            <div key={group.label}>
                                <div className="my-4 flex items-center justify-center">
                                    <span className="rounded-full border border-[var(--student-border)] bg-[var(--student-surface)] px-3 py-1 text-[10px] font-semibold tracking-widest text-[var(--student-fg-muted)] opacity-80">
                                        {group.label}
                                    </span>
                                </div>

                                {group.messages.map((msg) => {
                                    const isOwn   = msg.from_user_id === userId;
                                    const isSystem = isSystemMessage(msg);

                                    if (isSystem) {
                                        return (
                                            <div key={msg.id} className="my-3 flex justify-center">
                                                <span className="rounded-full border border-[var(--student-border)] bg-[var(--student-surface)] px-4 py-1.5 text-[11px] text-[var(--student-fg-muted)]">
                                                    {msg.content}
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={msg.id}
                                            className={`mb-2 flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                                        >
                                            {!isOwn ? (
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-[10px] font-bold text-white shadow-[0_2px_8px_rgba(220,38,38,0.25)]">
                                                    {avatarInitials(agentName)}
                                                </div>
                                            ) : (
                                                <div className="w-7 shrink-0" aria-hidden />
                                            )}
                                            <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed shadow-[0_1px_2px_rgba(0,0,0,0.06)] sm:max-w-[72%] sm:px-4 sm:py-3 sm:text-sm ${
                                                isOwn
                                                    ? "rounded-br-md bg-red-600 text-white"
                                                    : "rounded-bl-md border border-white/20 bg-white text-gray-900"
                                            }`}>
                                                {msg.content}
                                                <div className={`mt-1 flex items-center gap-1 text-[10px] ${isOwn ? "justify-end text-white/70" : "text-gray-400"}`}>
                                                    <span>{fmtTime(msg.created_at)}</span>
                                                    {isOwn && <span aria-hidden>✓✓</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Barre de saisie */}
                <div className="border-t border-[var(--student-border)] bg-[var(--student-surface-2)] px-2.5 pt-2 pb-[calc(env(safe-area-inset-bottom)+5.75rem)] backdrop-blur-xl md:px-4 md:py-3 md:pb-3">
                    <div className="flex items-center gap-1 rounded-full border border-[var(--student-border)] bg-[var(--student-surface)] py-1 pl-1 pr-1 shadow-[0_2px_12px_rgba(0,0,0,0.08)] sm:gap-1.5">
                        <button
                            type="button"
                            aria-label="Joindre un fichier"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--student-fg-muted)] transition-colors hover:bg-[var(--student-surface-2)] hover:text-[var(--student-fg)] active:scale-95 sm:h-9 sm:w-9"
                        >
                            <Paperclip className="h-[18px] w-[18px]" />
                        </button>
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder={t("inputPlaceholder", { name: agentName.split(" ")[0] })}
                            enterKeyHint="send"
                            autoComplete="off"
                            className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[15px] text-[var(--student-fg)] placeholder:text-[var(--student-fg-muted)] outline-none sm:text-sm"
                        />
                        {!text.trim() && (
                            <button
                                type="button"
                                aria-label="Message vocal"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--student-fg-muted)] transition-colors hover:bg-[var(--student-surface-2)] hover:text-[var(--student-fg)] active:scale-95 sm:h-9 sm:w-9"
                            >
                                <Mic className="h-[18px] w-[18px]" />
                            </button>
                        )}
                        <button
                            onClick={() => void send()}
                            disabled={!text.trim() || sendChatMessage.isPending}
                            aria-label={t("send")}
                            className="flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-red-600 text-white shadow-[0_4px_14px_rgba(220,38,38,0.45)] transition-all hover:bg-red-700 active:scale-95 disabled:opacity-40 disabled:shadow-none disabled:active:scale-100 sm:h-9 sm:w-auto sm:px-4"
                        >
                            <Send className="h-[18px] w-[18px] sm:h-4 sm:w-4" />
                            <span className="hidden text-sm font-semibold sm:inline">{t("send")}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT — Panneau contexte (desktop uniquement) */}
            {dossier && (
                <aside className="hidden w-60 shrink-0 flex-col border-l border-[var(--student-border)] overflow-y-auto xl:flex">
                    <div className="border-b border-[var(--student-border)] px-4 py-4">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--student-fg-muted)] opacity-60">
                            {t("activeFile")}
                        </p>
                        <p className="mt-2 text-base font-semibold text-[var(--student-fg)]">
                            {dossier.university ?? t("university")}
                        </p>
                        {dossier.program && (
                            <p className="text-[12px] text-[var(--student-fg-muted)]">{dossier.program}</p>
                        )}
                        {dossier.docsTotal > 0 && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-[var(--student-fg-muted)] opacity-70">{t("documents")}</span>
                                    <span className="font-semibold text-[var(--student-fg)] opacity-80">
                                        {dossier.docsOk}/{dossier.docsTotal}
                                    </span>
                                </div>
                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/25 dark:bg-[var(--student-border)]">
                                    <div
                                        className="h-1.5 rounded-full bg-[#f59e0b]"
                                        style={{ width: `${Math.round((dossier.docsOk / dossier.docsTotal) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {dossier.nextStep && (
                        <div className="border-b border-white/8 px-4 py-4">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--student-fg-muted)] opacity-60">
                                {t("nextStep")}
                            </p>
                            <div className="mt-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
                                <p className="text-sm font-semibold text-[var(--student-fg)]">{dossier.nextStep}</p>
                                {dossier.nextStepAt && (
                                    <p className="mt-1 text-[11px] text-[var(--student-fg-muted)]">{dossier.nextStepAt}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {nextPayment && (
                        <div className="px-4 py-4">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--student-fg-muted)] opacity-60">
                                {t("nextPayment")}
                            </p>
                            <div className="mt-2">
                                <p className="text-sm font-medium text-[var(--student-fg)]">{nextPayment.label}</p>
                                <p className="text-base font-bold text-[var(--student-fg)]">
                                    {nextPayment.montant.toLocaleString("fr-FR")} F
                                </p>
                                {nextPayment.dateLimite && (
                                    <p className="text-[11px] text-[var(--student-fg-muted)]">
                                        {t("dueOn", { date: new Date(nextPayment.dateLimite).toLocaleDateString(locale, { day: "numeric", month: "short" }) })}
                                        {nextPayment.daysLeft !== null && ` · ${t("daysLeft", { count: nextPayment.daysLeft })}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </aside>
            )}
        </div>
    );
}
