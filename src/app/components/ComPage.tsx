"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useNotificationContext } from "../context/NotificationContext";
import { Inbox, MessageSquare, Phone, PhoneOff, RefreshCw, Send, Smartphone } from "lucide-react";

type MsgStudent = {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  user_id: string | null;
};

type SmsStudent = {
  id: string;
  nom: string;
  prenom: string;
  telephone: string | null;
};

type ConvStudent = {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  user_id: string | null;
  lastMessage: string | null;
  lastAt: string | null;
  unread: number;
};

type ConvMessage = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  subject: string;
  content: string;
  read: boolean;
  created_at: string;
};

const SMS_MAX_CHARS = 160;

export default function ComPage() {
  const t = useTranslations("comPage");
  const ts = useTranslations("smsPage");
  const { user } = useAuth();
  const supabase = createClient();
  const { showNotification } = useNotificationContext();

  const [tab, setTab] = useState<"conversations" | "messages" | "sms">("conversations");

  // ── Messages tab state ────────────────────────────────────────────────────
  const [msgStudents, setMsgStudents] = useState<MsgStudent[]>([]);
  const [msgLoading, setMsgLoading] = useState(true);
  const [msgSearch, setMsgSearch] = useState("");
  const [msgSelected, setMsgSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  // ── Conversations tab state ───────────────────────────────────────────────
  const [conversations, setConversations] = useState<ConvStudent[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convSearch, setConvSearch] = useState("");
  const [activeStudent, setActiveStudent] = useState<ConvStudent | null>(null);
  const [threadMessages, setThreadMessages] = useState<ConvMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [convInput, setConvInput] = useState("");
  const [convSending, setConvSending] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const activeStudentRef = useRef<ConvStudent | null>(null);
  useEffect(() => { activeStudentRef.current = activeStudent; }, [activeStudent]);

  // ── SMS tab state ─────────────────────────────────────────────────────────
  const [smsStudents, setSmsStudents] = useState<SmsStudent[]>([]);
  const [smsLoading, setSmsLoading] = useState(true);
  const [smsSearch, setSmsSearch] = useState("");
  const [smsSelected, setSmsSelected] = useState<Set<string>>(new Set());
  const [smsMessage, setSmsMessage] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [credit, setCredit] = useState<number | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);

  // Load messaging students
  useEffect(() => {
    const load = async () => {
      setMsgLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select("id, nom, prenom, email, user_id")
        .order("nom", { ascending: true });
      if (error) showNotification(t("messages.loadError"), "error");
      else setMsgStudents((data ?? []) as MsgStudent[]);
      setMsgLoading(false);
    };
    void load();
  }, [supabase, showNotification, t]);

  // Load SMS students
  useEffect(() => {
    const load = async () => {
      setSmsLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select("id, nom, prenom, telephone")
        .order("nom", { ascending: true });
      if (error) showNotification(ts("messages.loadError"), "error");
      else setSmsStudents((data ?? []) as SmsStudent[]);
      setSmsLoading(false);
    };
    void load();
  }, [supabase, showNotification, ts]);

  // Load conversations list (uses admin API to bypass RLS)
  useEffect(() => {
    const load = async () => {
      setConvLoading(true);
      try {
        const res = await fetch("/api/conversation");
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations ?? []);
        }
      } catch { /* silent */ }
      setConvLoading(false);
    };
    void load();
  }, []);

  const loadCredit = async () => {
    setCreditLoading(true);
    try {
      const res = await fetch("/api/sms-balance");
      if (res.ok) {
        const data = await res.json();
        setCredit(data.credit ?? 0);
      }
    } catch { /* balance is optional */ }
    setCreditLoading(false);
  };

  useEffect(() => { void loadCredit(); }, []);

  // Realtime — écoute les messages entrants adressés à cet agent
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`agent-inbox-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `to_user_id=eq.${user.id}` },
        async (payload) => {
          const msg = payload.new as { from_user_id: string; content: string; created_at: string };

          setConversations((prev) =>
            prev.map((c) => {
              if (c.user_id !== msg.from_user_id) return c;
              const isOpen = activeStudentRef.current?.user_id === msg.from_user_id;
              return { ...c, lastMessage: msg.content, lastAt: msg.created_at, unread: isOpen ? c.unread : c.unread + 1 };
            })
          );

          const active = activeStudentRef.current;
          if (active?.user_id === msg.from_user_id) {
            try {
              const res = await fetch(`/api/conversation/${active.id}`);
              if (res.ok) {
                const data = await res.json();
                setThreadMessages(data.messages ?? []);
              }
            } catch { /* silent */ }
          }
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, supabase]);

  // ── Conversations helpers ─────────────────────────────────────────────────
  const convFiltered = useMemo(() => {
    const q = convSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((s) => {
      const name = `${s.prenom ?? ""} ${s.nom ?? ""}`.toLowerCase();
      return name.includes(q) || (s.email ?? "").toLowerCase().includes(q);
    });
  }, [conversations, convSearch]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  const openConversation = async (s: ConvStudent) => {
    setActiveStudent(s);
    setThreadLoading(true);
    setThreadMessages([]);

    try {
      const res = await fetch(`/api/conversation/${s.id}`);
      if (res.ok) {
        const data = await res.json();
        setThreadMessages(data.messages ?? []);
      }
    } catch { /* silent */ }
    setThreadLoading(false);

    // Mark student→agent messages as read (agent is to_user_id, RLS allows it)
    if (user?.id && s.user_id) {
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("from_user_id", s.user_id)
        .eq("to_user_id", user.id)
        .eq("read", false);
      setConversations((prev) => prev.map((c) => (c.id === s.id ? { ...c, unread: 0 } : c)));
    }
  };

  const sendConvReply = async () => {
    if (!convInput.trim() || !activeStudent || convSending) return;
    setConvSending(true);
    try {
      const res = await fetch("/api/send-student-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: [activeStudent.id], subject: "Message", content: convInput.trim() }),
      });
      if (res.ok) {
        setConvInput("");
        const threadRes = await fetch(`/api/conversation/${activeStudent.id}`);
        if (threadRes.ok) {
          const data = await threadRes.json();
          const msgs = (data.messages ?? []) as ConvMessage[];
          setThreadMessages(msgs);
          const last = msgs[msgs.length - 1];
          if (last) {
            setConversations((prev) =>
              prev.map((c) => (c.id === activeStudent.id ? { ...c, lastMessage: last.content, lastAt: last.created_at } : c))
            );
          }
        }
      } else {
        showNotification(t("messages.sendError"), "error");
      }
    } catch {
      showNotification(t("messages.sendError"), "error");
    }
    setConvSending(false);
  };

  // ── Messages helpers ──────────────────────────────────────────────────────
  const msgFiltered = useMemo(() => {
    const q = msgSearch.trim().toLowerCase();
    if (!q) return msgStudents;
    return msgStudents.filter((s) => {
      const name = `${s.prenom ?? ""} ${s.nom ?? ""}`.toLowerCase();
      return name.includes(q) || (s.email ?? "").toLowerCase().includes(q);
    });
  }, [msgStudents, msgSearch]);

  const toggleMsg = (id: string) =>
    setMsgSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectAllMsg = () =>
    setMsgSelected((prev) => { const n = new Set(prev); msgFiltered.forEach((s) => n.add(s.id)); return n; });

  const clearMsg = () => setMsgSelected(new Set());

  const handleSendMsg = async () => {
    if (!subject.trim() || !content.trim()) { showNotification(t("messages.missingFields"), "error"); return; }
    if (msgSelected.size === 0) { showNotification(t("messages.noRecipients"), "error"); return; }
    if (!user) { showNotification(t("messages.authRequired"), "error"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/send-student-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: Array.from(msgSelected), subject, content }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Erreur");
      showNotification(t("messages.sent", { count: payload?.sent ?? msgSelected.size }), "success");
      setSubject(""); setContent(""); clearMsg();
    } catch (err: any) {
      showNotification(t("messages.sendError"), "error");
    }
    setSending(false);
  };

  // ── SMS helpers ───────────────────────────────────────────────────────────
  const hasPhone = (s: SmsStudent) => !!s.telephone?.trim();

  const smsFiltered = useMemo(() => {
    const q = smsSearch.trim().toLowerCase();
    if (!q) return smsStudents;
    return smsStudents.filter((s) => {
      const name = `${s.prenom ?? ""} ${s.nom ?? ""}`.toLowerCase();
      return name.includes(q) || (s.telephone ?? "").includes(q);
    });
  }, [smsStudents, smsSearch]);

  const smsSelectedWithPhone = useMemo(
    () => Array.from(smsSelected).filter((id) => smsStudents.find((s) => s.id === id && hasPhone(s))).length,
    [smsSelected, smsStudents]
  );

  const charCount = smsMessage.length;
  const smsCount = Math.ceil(charCount / SMS_MAX_CHARS) || 1;

  const toggleSms = (id: string) =>
    setSmsSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectAllSms = () =>
    setSmsSelected((prev) => { const n = new Set(prev); smsFiltered.filter(hasPhone).forEach((s) => n.add(s.id)); return n; });

  const clearSms = () => setSmsSelected(new Set());

  const handleSendSms = async () => {
    if (!smsMessage.trim()) { showNotification(ts("messages.missingMessage"), "error"); return; }
    if (smsSelected.size === 0) { showNotification(ts("messages.noRecipients"), "error"); return; }
    setSmsSending(true);
    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: Array.from(smsSelected), message: smsMessage }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Erreur");
      showNotification(ts("messages.sent", { count: payload?.sent ?? 0, skipped: payload?.skipped ?? 0 }), "success");
      setSmsMessage(""); clearSms(); void loadCredit();
    } catch (err: any) {
      showNotification(err?.message || ts("messages.sendError"), "error");
    }
    setSmsSending(false);
  };

  return (
    <ProtectedRoute requiredRole="agent">
      <div className="space-y-6">
        {/* Header */}
        <div className="joda-surface flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              {t("header.eyebrow")}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{t("header.title")}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("header.description")}</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === "messages" && (
              <Badge variant="outline">{t("header.recipients", { count: msgSelected.size })}</Badge>
            )}
            {tab === "sms" && (
              <>
                <Badge variant="outline" className="gap-1.5">
                  <Smartphone className="h-3 w-3" />
                  {ts("header.recipients", { count: smsSelected.size })}
                </Badge>
                {credit !== null && (
                  <Badge className="gap-1.5 bg-emerald-100 text-emerald-700 dark:text-emerald-300">
                    {ts("header.credit", { count: credit })}
                  </Badge>
                )}
                <button
                  onClick={() => void loadCredit()}
                  disabled={creditLoading}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-600 dark:text-slate-400 transition-colors"
                  title={ts("header.refreshCredit")}
                >
                  <RefreshCw className={`h-4 w-4 ${creditLoading ? "animate-spin" : ""}`} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-700/50 p-1 w-fit">
          <button
            onClick={() => setTab("conversations")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === "conversations"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Inbox className="h-4 w-4" />
            {t("tabs.conversations")}
          </button>
          <button
            onClick={() => setTab("messages")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === "messages"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            {t("tabs.messages")}
          </button>
          <button
            onClick={() => setTab("sms")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === "sms"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            {t("tabs.sms")}
          </button>
        </div>

        {/* ── Conversations tab ─────────────────────────────────────────────── */}
        {tab === "conversations" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            {/* Student list */}
            <Card className="joda-surface border-0 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("conversations.title")}</CardTitle>
                <Input
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                  placeholder={t("conversations.search")}
                  className="mt-2"
                />
              </CardHeader>
              <CardContent className="p-0">
                {convLoading ? (
                  <p className="py-10 text-center text-sm text-slate-400">{t("conversations.loading")}</p>
                ) : convFiltered.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">{t("conversations.empty")}</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[600px] overflow-auto">
                    {convFiltered.map((s) => {
                      const name = `${s.prenom ?? ""} ${s.nom ?? ""}`.trim();
                      const initials = `${(s.prenom ?? "")[0] ?? ""}${(s.nom ?? "")[0] ?? ""}`.toUpperCase();
                      const isActive = activeStudent?.id === s.id;
                      return (
                        <li
                          key={s.id}
                          onClick={() => void openConversation(s)}
                          className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                            isActive
                              ? "bg-rose-50 dark:bg-rose-900/20"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-xs font-bold text-rose-700 dark:text-rose-300">
                            {initials || "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</p>
                            <p className="truncate text-xs text-slate-400">
                              {s.lastMessage ?? t("conversations.noMessages")}
                            </p>
                          </div>
                          {s.unread > 0 && (
                            <Badge className="bg-rose-600 text-white text-xs shrink-0">{s.unread}</Badge>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Thread */}
            {activeStudent ? (
              <Card className="joda-surface border-0 shadow-none flex flex-col">
                <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-700">
                  <CardTitle className="text-base">
                    {`${activeStudent.prenom ?? ""} ${activeStudent.nom ?? ""}`.trim()}
                  </CardTitle>
                  {activeStudent.email && (
                    <p className="text-xs text-slate-400">{activeStudent.email}</p>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col flex-1 p-0 overflow-hidden">
                  <div className="flex-1 overflow-auto px-4 py-4 space-y-3 max-h-[460px]">
                    {threadLoading ? (
                      <p className="text-center text-sm text-slate-400 py-10">{t("conversations.loading")}</p>
                    ) : threadMessages.length === 0 ? (
                      <p className="text-center text-sm text-slate-400 py-10">{t("conversations.noMessages")}</p>
                    ) : (
                      threadMessages.map((m) => {
                        const fromMe = m.from_user_id === user?.id;
                        const date = new Date(m.created_at);
                        const today = new Date();
                        const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
                        const sameDay = (a: Date, b: Date) =>
                          a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
                        const dateLabel = sameDay(date, today)
                          ? t("conversations.today")
                          : sameDay(date, yesterday)
                          ? t("conversations.yesterday")
                          : date.toLocaleDateString();
                        const timeLabel = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        return (
                          <div key={m.id} className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                                fromMe
                                  ? "bg-rose-600 text-white rounded-tr-sm"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-sm"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{m.content}</p>
                              <p className={`mt-1 text-[10px] ${fromMe ? "text-rose-200" : "text-slate-400"}`}>
                                {dateLabel} {timeLabel}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={threadEndRef} />
                  </div>
                  {/* Reply bar */}
                  <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 flex gap-2 items-end">
                    <textarea
                      value={convInput}
                      onChange={(e) => setConvInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendConvReply(); } }}
                      placeholder={t("conversations.inputPlaceholder")}
                      rows={2}
                      className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-200"
                    />
                    <Button
                      onClick={() => void sendConvReply()}
                      disabled={convSending || !convInput.trim()}
                      className="h-10 w-10 shrink-0 rounded-xl bg-rose-600 hover:bg-rose-700 p-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="joda-surface border-0 shadow-none flex items-center justify-center">
                <div className="text-center text-slate-400 py-20">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{t("conversations.empty")}</p>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── Messages tab ─────────────────────────────────────────────────── */}
        {tab === "messages" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]">
            <Card className="joda-surface border-0 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("students.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs">{t("students.searchLabel")}</Label>
                    <Input
                      value={msgSearch}
                      onChange={(e) => setMsgSearch(e.target.value)}
                      placeholder={t("students.searchPlaceholder")}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={selectAllMsg} disabled={msgLoading || msgFiltered.length === 0}>
                      {t("students.selectAll")}
                    </Button>
                    <Button type="button" variant="outline" onClick={clearMsg} disabled={msgSelected.size === 0}>
                      {t("students.clear")}
                    </Button>
                  </div>
                </div>

                {msgLoading ? (
                  <div className="py-10 text-center text-slate-400">{t("students.loading")}</div>
                ) : msgFiltered.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">{t("students.empty")}</div>
                ) : (
                  <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">{msgFiltered.map((s) => {
                        const checked = msgSelected.has(s.id);
                        const displayName = `${s.prenom ?? ""} ${s.nom ?? ""}`.trim();
                        return (
                          <li key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <input type="checkbox" checked={checked} onChange={() => toggleMsg(s.id)} className="h-4 w-4 accent-rose-600" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{displayName}</p>
                                {!s.user_id && (
                                  <Badge className="bg-amber-100 text-amber-700">{t("students.noAccount")}</Badge>
                                )}
                              </div>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{s.email ?? "—"}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="joda-surface border-0 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("composer.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">{t("composer.subject")}</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("composer.subjectPlaceholder")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("composer.message")}</Label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t("composer.messagePlaceholder")}
                    className="min-h-[220px] w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-200"
                  />
                </div>
                <Button onClick={() => void handleSendMsg()} disabled={sending || msgSelected.size === 0} className="w-full bg-rose-600 hover:bg-rose-700">
                  {sending ? t("composer.sending") : t("composer.send")}
                </Button>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("composer.hint")}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── SMS tab ──────────────────────────────────────────────────────── */}
        {tab === "sms" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
            <Card className="joda-surface border-0 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{ts("students.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs">{ts("students.searchLabel")}</Label>
                    <Input
                      value={smsSearch}
                      onChange={(e) => setSmsSearch(e.target.value)}
                      placeholder={ts("students.searchPlaceholder")}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={selectAllSms} disabled={smsLoading || smsFiltered.filter(hasPhone).length === 0}>
                      {ts("students.selectAll")}
                    </Button>
                    <Button type="button" variant="outline" onClick={clearSms} disabled={smsSelected.size === 0}>
                      {ts("students.clear")}
                    </Button>
                  </div>
                </div>

                {smsLoading ? (
                  <div className="py-10 text-center text-slate-400">{ts("students.loading")}</div>
                ) : smsFiltered.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">{ts("students.empty")}</div>
                ) : (
                  <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">{smsFiltered.map((s) => {
                        const checked = smsSelected.has(s.id);
                        const displayName = `${s.prenom ?? ""} ${s.nom ?? ""}`.trim();
                        const phoneOk = hasPhone(s);
                        return (
                          <li
                            key={s.id}
                            className={`flex items-center gap-3 px-4 py-3 ${phoneOk ? "hover:bg-slate-50 dark:hover:bg-slate-800/50" : "opacity-50"}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => phoneOk && toggleSms(s.id)}
                              disabled={!phoneOk}
                              className="h-4 w-4 accent-rose-600"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{displayName}</p>
                                {phoneOk ? (
                                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                                    <Phone className="h-3 w-3" />
                                    {s.telephone}
                                  </span>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-700 gap-1 text-xs">
                                    <PhoneOff className="h-3 w-3" />
                                    {ts("students.noPhone")}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {smsSelected.size > smsSelectedWithPhone && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {ts("students.phoneWarning", { without: smsSelected.size - smsSelectedWithPhone })}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="joda-surface border-0 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{ts("composer.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{ts("composer.message")}</Label>
                    <span className={`text-xs font-medium tabular-nums ${charCount > SMS_MAX_CHARS ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
                      {charCount}/{SMS_MAX_CHARS}
                      {smsCount > 1 && (
                        <span className="ml-1 text-amber-600 dark:text-amber-400">({smsCount} {ts("composer.smsParts")})</span>
                      )}
                    </span>
                  </div>
                  <textarea
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder={ts("composer.messagePlaceholder")}
                    className="min-h-[180px] w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-200"
                  />
                </div>

                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">{ts("composer.sender")}:</span> JODA</p>
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">{ts("composer.recipients")}:</span> {smsSelectedWithPhone} {ts("composer.withPhone")}</p>
                  {smsCount > 1 && <p className="text-amber-600 dark:text-amber-400">{ts("composer.multiSmsNote", { parts: smsCount })}</p>}
                </div>

                <Button
                  onClick={() => void handleSendSms()}
                  disabled={smsSending || smsSelectedWithPhone === 0 || !smsMessage.trim()}
                  className="w-full gap-2 bg-rose-600 hover:bg-rose-700"
                >
                  <Send className="h-4 w-4" />
                  {smsSending ? ts("composer.sending") : ts("composer.send", { count: smsSelectedWithPhone })}
                </Button>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ts("composer.hint")}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
