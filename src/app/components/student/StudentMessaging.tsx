"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/app/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
    useStudentInbox,
    useMarkMessageRead,
    useSendStudentMessage,
    STUDENT_INBOX_KEY,
    type ChatMessage,
} from "@/app/lib/hooks/use-messages";
import { SectionHeader } from "./SectionHeader";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";
import { Bot, ChevronLeft, Mail, MailOpen, SendHorizonal } from "lucide-react";

interface Props {
    userId: string;
    onBack?: () => void;
    onUnreadChange?: (count: number) => void;
}

export function StudentMessaging({ userId, onBack, onUnreadChange }: Props) {
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const t = useTranslations("student.portal.messaging");
    const queryClient = useQueryClient();
    const supabase = createClient();

    // ── État UI local ─────────────────────────────────────────────────────────
    const [selected, setSelected] = useState<ChatMessage | null>(null);
    const [draft, setDraft] = useState("");
    const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // ── TanStack Query ────────────────────────────────────────────────────────
    const { data: messages = [], isLoading: loading } = useStudentInbox(userId);
    const markMessageRead = useMarkMessageRead();
    const sendMessage = useSendStudentMessage();

    // Calcule et remonte le compteur de non-lus reçus
    const unreadCount = messages.filter((m) => m.to_user_id === userId && !m.read).length;
    useEffect(() => {
        onUnreadChange?.(unreadCount);
    }, [unreadCount, onUnreadChange]);

    // Real-time : invalide le cache à chaque nouveau message reçu
    useEffect(() => {
        const channel = supabase
            .channel(`inbox-${userId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: `to_user_id=eq.${userId}`,
            }, () => {
                queryClient.invalidateQueries({ queryKey: [...STUDENT_INBOX_KEY, userId] });
            })
            .subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [userId, queryClient, supabase]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const openMessage = (msg: ChatMessage) => {
        setSelected(msg);
        if (!msg.read) markMessageRead.mutate(msg.id);
    };

    const handleSend = async () => {
        const text = draft.trim();
        if (!text || sendMessage.isPending) return;
        setSendState("sending");
        try {
            const subject = selected ? `Re: ${selected.subject}` : t("title");
            await sendMessage.mutateAsync({ subject, content: text });
            setDraft("");
            setSendState("sent");
            setTimeout(() => setSendState("idle"), 3000);
        } catch {
            setSendState("error");
            setTimeout(() => setSendState("idle"), 3000);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });

    // ── Barre de composition ──────────────────────────────────────────────────

    const composeBar = (
        <div className="student-surface mt-4 flex items-end gap-2 rounded-2xl p-3">
            <textarea
                ref={textareaRef}
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("replyPlaceholder")}
                disabled={sendMessage.isPending}
                className="student-focus-ring flex-1 resize-none bg-transparent text-sm text-[var(--student-fg)] placeholder:text-[var(--student-fg-muted)]/50 focus:outline-none disabled:opacity-50"
            />
            <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!draft.trim() || sendMessage.isPending}
                className={cn(
                    "student-focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                    draft.trim() && !sendMessage.isPending
                        ? "bg-[var(--student-ring-stand)] text-white hover:opacity-90"
                        : "bg-white/10 text-[var(--student-fg-muted)] opacity-40",
                )}
                aria-label={t("send")}
            >
                <SendHorizonal className="h-4 w-4" />
            </button>
        </div>
    );

    // ── Rendu : message ouvert ─────────────────────────────────────────────────

    if (selected) {
        return (
            <div className="space-y-4">
                <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="student-focus-ring flex items-center gap-1.5 text-sm text-[var(--student-fg-muted)] hover:text-[var(--student-fg)]"
                >
                    <ChevronLeft className="h-4 w-4" />
                    {t("back")}
                </button>
                <div className="student-surface rounded-2xl p-5 sm:p-6">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--student-ring-stand)]">
                        {formatDate(selected.created_at)}
                    </p>
                    <h3 className="text-base font-semibold text-[var(--student-fg)] sm:text-lg">
                        {selected.subject}
                    </h3>
                    <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--student-fg-muted)]">
                        {selected.content}
                    </div>
                </div>
                {sendState === "sent" && (
                    <p className="text-center text-xs text-[var(--student-ring-stand)]">{t("sent")}</p>
                )}
                {sendState === "error" && (
                    <p className="text-center text-xs text-red-400">{t("sendError")}</p>
                )}
                {composeBar}
            </div>
        );
    }

    // ── Rendu : liste inbox ────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            <SectionHeader title={t("title")} />

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((k) => (
                        <div key={k} className="student-surface h-20 animate-pulse rounded-2xl" />
                    ))}
                </div>
            ) : messages.length === 0 ? (
                <EmptyState title={t("empty")} description={t("emptyDescription")} />
            ) : (
                <ul className="space-y-2">
                    {messages.map((msg) => (
                        <li key={msg.id}>
                            <button
                                type="button"
                                onClick={() => openMessage(msg)}
                                className={cn(
                                    "student-focus-ring student-surface w-full rounded-2xl p-4 text-left transition-colors hover:bg-[rgba(220,38,38,0.04)] dark:hover:bg-white/[0.07]",
                                    !msg.read && "border-l-2 border-[var(--student-ring-stand)]",
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 shrink-0 text-[var(--student-fg-muted)]">
                                        {!!(msg.metadata as Record<string, unknown>)?.is_auto_reply ? (
                                            <Bot className="h-4 w-4 text-slate-400" />
                                        ) : msg.read ? (
                                            <MailOpen className="h-4 w-4" />
                                        ) : (
                                            <Mail className="h-4 w-4 text-[var(--student-ring-stand)]" />
                                        )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <div className="flex min-w-0 items-center gap-1.5">
                                                <p className={cn(
                                                    "truncate text-sm",
                                                    msg.read
                                                        ? "font-normal text-[var(--student-fg-muted)]"
                                                        : "font-semibold text-[var(--student-fg)]",
                                                )}>
                                                    {msg.subject}
                                                </p>
                                                {!!(msg.metadata as Record<string, unknown>)?.is_auto_reply && (
                                                    <span className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                                                        {t("autoReplyBadge")}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="shrink-0 text-[10px] text-[var(--student-fg-muted)] opacity-60">
                                                {formatDate(msg.created_at)}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--student-fg-muted)]">
                                            {msg.content}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {sendState === "sent" && (
                <p className="text-center text-xs text-[var(--student-ring-stand)]">{t("sent")}</p>
            )}
            {sendState === "error" && (
                <p className="text-center text-xs text-red-400">{t("sendError")}</p>
            )}
            {composeBar}
        </div>
    );
}
