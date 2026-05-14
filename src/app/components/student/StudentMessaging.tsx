"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/app/lib/supabase/client";
import { SectionHeader } from "./SectionHeader";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";
import { ChevronLeft, Mail, MailOpen } from "lucide-react";

interface Message {
  id: string;
  from_user_id: string;
  subject: string;
  content: string;
  read: boolean;
  created_at: string;
  metadata?: { student_name?: string };
}

interface Props {
  userId: string;
  onBack?: () => void;
  onUnreadChange?: (count: number) => void;
}

export function StudentMessaging({ userId, onBack, onUnreadChange }: Props) {
  const locale = useLocale();
  const dateLocale = locale === "en" ? "en-US" : "fr-FR";
  const t = useTranslations("student.portal.messaging");
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("id, from_user_id, subject, content, read, created_at, metadata")
      .eq("to_user_id", userId)
      .order("created_at", { ascending: false });
    const msgs = (data as Message[]) ?? [];
    setMessages(msgs);
    onUnreadChange?.(msgs.filter((m) => !m.read).length);
    setLoading(false);
  }, [supabase, userId, onUnreadChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const openMessage = useCallback(
    async (msg: Message) => {
      setSelected(msg);
      if (!msg.read) {
        await supabase.from("messages").update({ read: true }).eq("id", msg.id);
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m)),
        );
        onUnreadChange?.(
          messages.filter((m) => !m.read && m.id !== msg.id).length,
        );
      }
    },
    [supabase, messages, onUnreadChange],
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader title={t("title")} />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="student-surface h-20 animate-pulse rounded-2xl"
            />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <EmptyState
          title={t("empty")}
          description={t("emptyDescription")}
        />
      ) : (
        <ul className="space-y-2">
          {messages.map((msg) => (
            <li key={msg.id}>
              <button
                type="button"
                onClick={() => void openMessage(msg)}
                className={cn(
                  "student-focus-ring student-surface w-full rounded-2xl p-4 text-left transition-colors hover:bg-[rgba(220,38,38,0.04)] dark:hover:bg-white/[0.07]",
                  !msg.read && "border-l-2 border-[var(--student-ring-stand)]",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-[var(--student-fg-muted)]">
                    {msg.read ? (
                      <MailOpen className="h-4 w-4" />
                    ) : (
                      <Mail className="h-4 w-4 text-[var(--student-ring-stand)]" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={cn(
                          "truncate text-sm",
                          msg.read
                            ? "font-normal text-[var(--student-fg-muted)]"
                            : "font-semibold text-[var(--student-fg)]",
                        )}
                      >
                        {msg.subject}
                      </p>
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
    </div>
  );
}
