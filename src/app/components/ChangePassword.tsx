"use client";

import { useState } from "react";
import { supabase } from "../supabase";
import { useNotificationContext } from "../context/NotificationContext";

interface ChangePasswordProps {
    onClose: () => void;
}

function StrengthBar({ password }: { password: string }) {
    const checks = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password),
    ];
    const score = checks.filter(Boolean).length;
    const labels = ["", "Faible", "Moyen", "Bon", "Fort"];
    const colors = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"];

    if (!password) return null;

    return (
        <div className="mt-2 space-y-1">
            <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : "bg-slate-200"}`}
                    />
                ))}
            </div>
            <p className={`text-xs font-medium ${score <= 1 ? "text-red-500" : score === 2 ? "text-orange-400" : score === 3 ? "text-yellow-500" : "text-emerald-500"}`}>
                {labels[score]}
            </p>
        </div>
    );
}

function PasswordInput({ id, label, value, onChange, hint }: {
    id: string; label: string; value: string;
    onChange: (v: string) => void; hint?: string;
}) {
    const [show, setShow] = useState(false);
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="block text-sm font-medium text-slate-700">{label}</label>
            <div className="relative">
                <input
                    id={id}
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
                />
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                    {show ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                    ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    )}
                </button>
            </div>
            {hint && <p className="text-xs text-slate-400">{hint}</p>}
        </div>
    );
}

export default function ChangePassword({ onClose }: ChangePasswordProps) {
    const { showNotification } = useNotificationContext();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const match = confirmPassword.length > 0 && newPassword === confirmPassword;
    const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }
        if (newPassword.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères.");
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setError("Utilisateur non connecté."); return; }

            const { error: err } = await supabase.auth.updateUser({ password: newPassword });
            if (err) { setError(err.message); return; }

            showNotification("Mot de passe modifié avec succès", "success");
            onClose();
        } catch {
            setError("Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-[0_32px_80px_rgba(0,0,0,0.2)]">

                {/* Header */}
                <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 px-8 py-7">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20">
                            <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">Modifier le mot de passe</h2>
                            <p className="mt-0.5 text-sm text-slate-400">Choisissez un mot de passe sécurisé</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleChangePassword} className="space-y-5 px-8 py-7">

                    <PasswordInput
                        id="current"
                        label="Mot de passe actuel"
                        value={currentPassword}
                        onChange={setCurrentPassword}
                    />

                    <div>
                        <PasswordInput
                            id="new"
                            label="Nouveau mot de passe"
                            value={newPassword}
                            onChange={setNewPassword}
                            hint="Minimum 8 caractères, majuscule, chiffre et symbole recommandés"
                        />
                        <StrengthBar password={newPassword} />
                    </div>

                    <div>
                        <PasswordInput
                            id="confirm"
                            label="Confirmer le nouveau mot de passe"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                        />
                        {match && (
                            <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600">
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Les mots de passe correspondent
                            </p>
                        )}
                        {mismatch && (
                            <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Les mots de passe ne correspondent pas
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading || mismatch}
                            className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(220,38,38,0.3)] transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Modification..." : "Modifier le mot de passe"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
