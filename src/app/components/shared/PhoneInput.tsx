"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { PHONE_COUNTRY_CODES } from "../../lib/phone";

interface PhoneInputProps {
    id: string;
    countryCode: string;
    value: string;
    onCountryCodeChange: (value: string) => void;
    onValueChange: (value: string) => void;
    required?: boolean;
    placeholder?: string;
}

export default function PhoneInput({
    id,
    countryCode,
    value,
    onCountryCodeChange,
    onValueChange,
    required,
    placeholder = "6 99 00 00 00",
}: PhoneInputProps) {
    const t = useTranslations("phoneInput");
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);
    const selected = PHONE_COUNTRY_CODES.find((entry) => entry.code === countryCode) || PHONE_COUNTRY_CODES[0];

    const normalize = (value: string) =>
        value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

    const filteredCountries = useMemo(() => {
        const term = normalize(search.replace("+", "").trim());
        if (!term) return PHONE_COUNTRY_CODES;

        return PHONE_COUNTRY_CODES.filter((entry) => {
            const code = entry.code.replace("+", "");
            const country = normalize(entry.country);
            return code.includes(term) || country.includes(term) || normalize(`${entry.code} ${entry.country}`).includes(term);
        });
    }, [search]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    return (
        <div className="grid grid-cols-[132px_minmax(0,1fr)] gap-2">
            <div className="relative" ref={menuRef}>
                <button
                    type="button"
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors hover:bg-slate-50 dark:bg-slate-800/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    onClick={() => {
                        setOpen((value) => !value);
                        setSearch("");
                    }}
                    aria-label="Choisir l'indicatif pays"
                >
                    <span className="truncate">{selected.code}</span>
                    <span className="text-slate-400">⌄</span>
                </button>

                {open && (
                    <div className="absolute left-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-xl">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("searchPlaceholder")}
                            className="mb-2"
                            autoFocus
                        />
                        <div className="max-h-64 overflow-y-auto">
                            {filteredCountries.length === 0 ? (
                                <p className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">{t("noResult")}</p>
                            ) : (
                                filteredCountries.map((entry) => (
                                    <button
                                        type="button"
                                        key={`${entry.code}-${entry.country}`}
                                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 dark:bg-slate-800/50 ${
                                            entry.code === countryCode ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" : "text-slate-700 dark:text-slate-300"
                                        }`}
                                        onClick={() => {
                                            onCountryCodeChange(entry.code);
                                            setOpen(false);
                                            setSearch("");
                                        }}
                                    >
                                        <span className="truncate">{entry.country}</span>
                                        <span className="shrink-0 font-semibold">{entry.code}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            <Input
                id={id}
                type="tel"
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                placeholder={placeholder}
                required={required}
            />
        </div>
    );
}
