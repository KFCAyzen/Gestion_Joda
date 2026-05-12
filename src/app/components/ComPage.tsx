"use client";

import { useEffect, useMemo, useState } from "react";
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

type StudentRow = {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  user_id: string | null;
};

export default function ComPage() {
  const t = useTranslations("comPage");
  const { user } = useAuth();
  const supabase = createClient();
  const { showNotification } = useNotificationContext();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select("id, nom, prenom, email, user_id")
        .order("nom", { ascending: true });
      if (error) {
        console.error("Load students error:", error);
        showNotification(t("messages.loadError"), "error");
      } else {
        setStudents((data ?? []) as StudentRow[]);
      }
      setLoading(false);
    };
    void load();
  }, [supabase, showNotification, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = `${s.prenom ?? ""} ${s.nom ?? ""}`.toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [students, search]);

  const selectedCount = selectedIds.size;

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const s of filtered) next.add(s.id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      showNotification(t("messages.missingFields"), "error");
      return;
    }
    if (selectedIds.size === 0) {
      showNotification(t("messages.noRecipients"), "error");
      return;
    }
    if (!user) {
      showNotification(t("messages.authRequired"), "error");
      return;
    }

    setSending(true);
    try {
      const studentIds = Array.from(selectedIds);
      const res = await fetch("/api/send-student-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds, subject, content }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Erreur");
      }

      showNotification(t("messages.sent", { count: payload?.sent ?? studentIds.length }), "success");
      setSubject("");
      setContent("");
      clearSelection();
    } catch (err: any) {
      console.error("Send message error:", err);
      showNotification(t("messages.sendError"), "error");
    }
    setSending(false);
  };

  return (
    <ProtectedRoute requiredRole="agent">
      <div className="space-y-6">
        <div className="joda-surface flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              {t("header.eyebrow")}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t("header.title")}</h1>
            <p className="mt-1 text-sm text-slate-500">{t("header.description")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{t("header.recipients", { count: selectedCount })}</Badge>
          </div>
        </div>

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
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("students.searchPlaceholder")}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={selectAllFiltered} disabled={loading || filtered.length === 0}>
                    {t("students.selectAll")}
                  </Button>
                  <Button type="button" variant="outline" onClick={clearSelection} disabled={selectedIds.size === 0}>
                    {t("students.clear")}
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="py-10 text-center text-slate-400">{t("students.loading")}</div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-slate-400">{t("students.empty")}</div>
              ) : (
                <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-100 bg-white">
                  <ul className="divide-y divide-slate-100">
                    {filtered.map((s) => {
                      const checked = selectedIds.has(s.id);
                      const displayName = `${s.prenom ?? ""} ${s.nom ?? ""}`.trim();
                      return (
                        <li key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(s.id)}
                            className="h-4 w-4"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                              {!s.user_id && (
                                <Badge className="bg-amber-100 text-amber-700">{t("students.noAccount")}</Badge>
                              )}
                            </div>
                            <p className="truncate text-xs text-slate-500">{s.email ?? "—"}</p>
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
                  className="min-h-[220px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>

              <Button onClick={handleSend} disabled={sending || selectedCount === 0} className="w-full bg-rose-600 hover:bg-rose-700">
                {sending ? t("composer.sending") : t("composer.send")}
              </Button>

              <p className="text-xs text-slate-500">{t("composer.hint")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

