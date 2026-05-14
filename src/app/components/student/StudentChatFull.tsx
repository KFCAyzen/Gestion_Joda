"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Mic, MoreVertical, Paperclip, Send } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/app/lib/supabase/client";
import type { StudentView } from "./types";

interface Message {
    id: string;
    from_user_id: string;
    to_user_id: string;
    subject: string;
    content: string;
    read: boolean;
    created_at: string;
    metadata?: Record<string, unknown>;
}

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

function groupByDay(messages: Message[]) {
    const groups: { label: string; messages: Message[] }[] = [];
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

function isSystemMessage(msg: Message): boolean {
    return !!(msg.metadata as any)?.system;
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
    const t = useTranslations("student.portal.chat");
    const locale = useLocale();
    const [messages, setMessages] = useState<Message[]>([]);
    const [agentUserId, setAgentUserId] = useState<string | null>(null);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from("messages")
            .select("id, from_user_id, to_user_id, subject, content, read, created_at, metadata")
            .or(`to_user_id.eq.${userId},from_user_id.eq.${userId}`)
            .order("created_at", { ascending: true });

        const msgs = (data as Message[]) ?? [];
        setMessages(msgs);

        // Find agent user ID from received messages
        const received = msgs.find((m) => m.to_user_id === userId);
        if (received) setAgentUserId(received.from_user_id);

        const unread = msgs.filter((m) => m.to_user_id === userId && !m.read).length;
        onUnreadChange?.(unread);

        // Mark received as read
        const unreadIds = msgs.filter((m) => m.to_user_id === userId && !m.read).map((m) => m.id);
        if (unreadIds.length > 0) {
            await supabase.from("messages").update({ read: true }).in("id", unreadIds);
        }
        setLoading(false);
    }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel(`chat-${userId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: `to_user_id=eq.${userId}`,
            }, () => { void load(); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [userId, load]); // eslint-disable-line react-hooks/exhaustive-deps

    const send = async () => {
        if (!text.trim() || sending || !agentUserId) return;
        setSending(true);
        const content = text.trim();
        setText("");
        await supabase.from("messages").insert({
            from_user_id: userId,
            to_user_id: agentUserId,
            subject: "Réponse étudiant",
            content,
            read: false,
            created_at: new Date().toISOString(),
        });
        await load();
        setSending(false);
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send();
        }
    };

    const groups = groupByDay(messages);

    const dossierStatusLabel: Record<string, string> = {
        document_recu: t("statusLabels.document_recu"),
        en_attente: t("statusLabels.en_attente"),
        en_cours: t("statusLabels.en_cours"),
        document_manquant: t("statusLabels.document_manquant"),
        admission_validee: t("statusLabels.admission_validee"),
        admission_rejetee: t("statusLabels.admission_rejetee"),
        en_attente_universite: t("statusLabels.en_attente_universite"),
        visa_en_cours: t("statusLabels.visa_en_cours"),
        termine: t("statusLabels.termine"),
    };

    return (
        /* Full layout: on md+ = 3 columns, on mobile = single column */
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden md:h-[calc(100vh-4rem)]">
            {/* CENTER — Chat */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b border-[var(--student-border)] px-4 py-3">
                    <button
                        onClick={onBack}
                        className="flex items-center text-[var(--student-fg-muted)] hover:text-[var(--student-fg)] md:hidden"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-sm font-bold text-white">
                            {avatarInitials(agentName)}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--student-surface)] bg-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--student-fg)]">{agentName} · <span className="font-normal text-[var(--student-fg-muted)]">{t("yourAgent")}</span></p>
                        <p className="text-[11px] text-[var(--student-fg-muted)] opacity-70">{t("onlineStatus")}</p>
                    </div>
                    {dossier && (
                        <span className="hidden rounded-full border border-[var(--student-border)] bg-[var(--student-surface)] px-2.5 py-1 text-[11px] text-[var(--student-fg-muted)] sm:inline">
                            {dossierStatusLabel[dossier.status] ?? dossier.status}
                        </span>
                    )}
                    <button className="text-[var(--student-fg-muted)] hover:text-[var(--student-fg)] md:hidden">
                        <MoreVertical className="h-5 w-5" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
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
                                {/* Date separator */}
                                <div className="my-4 flex items-center gap-3">
                                    <div className="h-px flex-1 bg-[var(--student-border)]" />
                                    <span className="text-[10px] font-semibold tracking-widest text-[var(--student-fg-muted)] opacity-60">
                                        — {group.label} —
                                    </span>
                                    <div className="h-px flex-1 bg-[var(--student-border)]" />
                                </div>

                                {group.messages.map((msg) => {
                                    const isOwn = msg.from_user_id === userId;
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
                                            className={`mb-3 flex gap-2.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                                        >
                                            {!isOwn && (
                                                <div className="mt-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-[10px] font-bold text-white">
                                                    {avatarInitials(agentName)}
                                                </div>
                                            )}
                                            <div
                                                className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                                    isOwn
                                                        ? "rounded-br-sm bg-[rgba(220,38,38,0.10)] dark:bg-gray-900 text-[var(--student-fg)]"
                                                        : "rounded-bl-sm bg-[var(--student-surface)] text-[var(--student-fg)]"
                                                }`}
                                            >
                                                {msg.content}
                                                <div
                                                    className={`mt-1 text-[10px] text-[var(--student-fg-muted)] opacity-60 ${
                                                        isOwn ? "text-right" : ""
                                                    }`}
                                                >
                                                    {fmtTime(msg.created_at)}
                                                    {isOwn && (
                                                        <span className="ml-1 opacity-50">✓✓</span>
                                                    )}
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

                {/* Input bar */}
                <div className="border-t border-[var(--student-border)] px-4 py-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-[var(--student-border)] bg-[var(--student-surface)] px-3 py-2">
                        <button className="shrink-0 text-[var(--student-fg-muted)] hover:text-[var(--student-fg)]">
                            <Paperclip className="h-5 w-5" />
                        </button>
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder={t("inputPlaceholder", { name: agentName.split(" ")[0] })}
                            className="flex-1 bg-transparent text-sm text-[var(--student-fg)] placeholder:text-[var(--student-fg-muted)] outline-none"
                        />
                        <button className="shrink-0 text-[var(--student-fg-muted)] hover:text-[var(--student-fg)]">
                            <Mic className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => void send()}
                            disabled={!text.trim() || sending || !agentUserId}
                            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                        >
                            <Send className="h-4 w-4" />
                            {t("send")}
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT — Context panel (desktop only) */}
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

                        {/* Documents progress */}
                        {dossier.docsTotal > 0 && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-[var(--student-fg-muted)] opacity-70">{t("documents")}</span>
                                    <span className="font-semibold text-[var(--student-fg)] opacity-80">
                                        {dossier.docsOk}/{dossier.docsTotal}
                                    </span>
                                </div>
                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--student-border)]">
                                    <div
                                        className="h-1.5 rounded-full bg-blue-400"
                                        style={{
                                            width: `${Math.round((dossier.docsOk / dossier.docsTotal) * 100)}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Next step */}
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

                    {/* Next payment */}
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
