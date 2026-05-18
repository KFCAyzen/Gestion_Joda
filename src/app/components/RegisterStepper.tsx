"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buildStudentUsername } from "@/app/lib/student-auth";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
    // Étape 1 – Infos personnelles
    prenom: string;
    nom: string;
    email: string;
    telephone: string;
    age: string;
    sexe: "M" | "F" | "";
    nationalite: string;
    // Étape 2 – Infos académiques
    niveau: string;
    filiere: string;
    diplome_acquis: string;
    langue: string;
    choix: "procedure_seule" | "cours_seuls" | "procedure_cours" | "";
    // Étape 3 – Passeport
    passeport_numero: string;
    passeport_expiration: string;
    // Étape 5 – Compte
    password: string;
    confirmPassword: string;
}

interface DocumentFiles {
    passeport?: File;
    casier_judiciaire?: File;
    carte_photo?: File;
    releve_bac?: File;
    diplome_bac?: File;
}

const STEPS = ["personal", "academic", "passport", "documents", "account", "review"] as const;
type Step = (typeof STEPS)[number];

const TOTAL_STEPS = STEPS.length;

// ── Helpers ───────────────────────────────────────────────────────────────────

function PasswordStrengthBar({ password }: { password: string }) {
    const t = useTranslations("register.account.strength");
    const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.match(/[A-Z]/) && password.match(/[0-9]/) && password.length >= 10 ? 3 : 2;
    const colors = ["bg-gray-200", "bg-red-400", "bg-yellow-400", "bg-green-500"];
    const labels = ["", t("weak"), t("medium"), t("strong")];

    return (
        <div className="mt-1.5 space-y-1">
            <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${strength >= i ? colors[strength] : "bg-gray-200 dark:bg-gray-700"}`}
                    />
                ))}
            </div>
            {password.length > 0 && (
                <p className={`text-xs ${strength === 1 ? "text-red-500" : strength === 2 ? "text-yellow-600" : "text-green-600"}`}>
                    {labels[strength]}
                </p>
            )}
        </div>
    );
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

const inputClass =
    "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition focus:border-red-400 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30";

const selectClass = inputClass;

const labelClass = "block mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide";

// ── StepIndicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current, total, steps }: { current: number; total: number; steps: readonly string[] }) {
    const t = useTranslations("register.steps");

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                {steps.map((step, idx) => {
                    const isCompleted = idx < current;
                    const isActive = idx === current;
                    return (
                        <div key={step} className="flex flex-1 items-center">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                                        isCompleted
                                            ? "bg-red-600 text-white"
                                            : isActive
                                            ? "bg-red-100 dark:bg-red-900/30 text-red-600 ring-2 ring-red-400"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                    }`}
                                >
                                    {isCompleted ? (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        idx + 1
                                    )}
                                </div>
                                <span className={`mt-1 hidden text-[10px] font-medium sm:block ${isActive ? "text-red-600" : "text-gray-400"}`}>
                                    {t(step as any)}
                                </span>
                            </div>
                            {idx < total - 1 && (
                                <div className={`h-0.5 flex-1 mx-1 transition-colors duration-300 ${isCompleted ? "bg-red-500" : "bg-gray-200 dark:bg-gray-700"}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Document file picker ───────────────────────────────────────────────────────

function DocFilePicker({
    label,
    file,
    onChange,
    accept = ".pdf,.jpg,.jpeg,.png",
}: {
    label: string;
    file?: File;
    onChange: (f?: File) => void;
    accept?: string;
}) {
    const t = useTranslations("register.documents");
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{label}</p>
                {file ? (
                    <p className="text-xs text-green-600 dark:text-green-400 truncate mt-0.5">
                        ✓ {file.name}
                    </p>
                ) : (
                    <p className="text-xs text-gray-400 mt-0.5">{t("formats")}</p>
                )}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => onChange(e.target.files?.[0])}
            />
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="shrink-0 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
                {file ? t("changeFile") : t("selectFile")}
            </button>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RegisterStepper() {
    const t = useTranslations("register");
    const locale = useLocale();

    const [currentStep, setCurrentStep] = useState(0);
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [submitError, setSubmitError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [successUsername, setSuccessUsername] = useState("");

    const [form, setForm] = useState<FormData>({
        prenom: "",
        nom: "",
        email: "",
        telephone: "",
        age: "",
        sexe: "",
        nationalite: "",
        niveau: "",
        filiere: "",
        diplome_acquis: "",
        langue: "Français",
        choix: "",
        passeport_numero: "",
        passeport_expiration: "",
        password: "",
        confirmPassword: "",
    });

    const [documents, setDocuments] = useState<DocumentFiles>({});

    const setField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: undefined }));
    }, []);

    const setDoc = useCallback((type: keyof DocumentFiles, file?: File) => {
        setDocuments((prev) => ({ ...prev, [type]: file }));
    }, []);

    const previewUsername = buildStudentUsername(form.prenom, form.nom);

    // ── Validation par étape ──────────────────────────────────────────────────

    const validateStep = (step: number): boolean => {
        const newErrors: Partial<Record<keyof FormData, string>> = {};
        const required = t("errors.required");

        if (step === 0) {
            if (!form.prenom.trim()) newErrors.prenom = required;
            if (!form.nom.trim()) newErrors.nom = required;
            if (!form.email.trim()) newErrors.email = required;
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = t("errors.emailInvalid");
            if (!form.telephone.trim()) newErrors.telephone = required;
            const ageNum = Number(form.age);
            if (!form.age || isNaN(ageNum) || ageNum < 15 || ageNum > 60) newErrors.age = t("errors.ageInvalid");
            if (!form.sexe) newErrors.sexe = required;
            if (!form.nationalite.trim()) newErrors.nationalite = required;
        }

        if (step === 1) {
            if (!form.niveau.trim()) newErrors.niveau = required;
            if (!form.filiere.trim()) newErrors.filiere = required;
            if (!form.diplome_acquis.trim()) newErrors.diplome_acquis = required;
            if (!form.langue) newErrors.langue = required;
            if (!form.choix) newErrors.choix = required;
        }

        if (step === 2) {
            if (!form.passeport_numero.trim()) newErrors.passeport_numero = required;
            if (!form.passeport_expiration) newErrors.passeport_expiration = required;
            else if (new Date(form.passeport_expiration) <= new Date()) newErrors.passeport_expiration = t("errors.passportExpired");
        }

        // Step 3 (documents) : optionnel, pas de validation requise

        if (step === 4) {
            if (!form.password) newErrors.password = required;
            else if (form.password.length < 8) newErrors.password = t("account.passwordTooShort");
            if (!form.confirmPassword) newErrors.confirmPassword = required;
            else if (form.password !== form.confirmPassword) newErrors.confirmPassword = t("account.passwordMismatch");
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const goNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
        }
    };

    const goBack = () => {
        setErrors({});
        setCurrentStep((s) => Math.max(s - 1, 0));
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        setSubmitting(true);
        setSubmitError("");

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prenom: form.prenom.trim(),
                    nom: form.nom.trim(),
                    email: form.email.trim().toLowerCase(),
                    telephone: form.telephone.trim(),
                    age: Number(form.age),
                    sexe: form.sexe,
                    nationalite: form.nationalite.trim(),
                    niveau: form.niveau.trim(),
                    filiere: form.filiere.trim(),
                    diplome_acquis: form.diplome_acquis.trim(),
                    langue: form.langue,
                    choix: form.choix,
                    passeport_numero: form.passeport_numero.trim(),
                    passeport_expiration: form.passeport_expiration,
                    password: form.password,
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                if (json.error === "EMAIL_EXISTS") setSubmitError(t("errors.emailExists"));
                else if (json.error === "USERNAME_EXISTS") setSubmitError(t("errors.usernameExists"));
                else setSubmitError(json.message ?? t("errors.generic"));
                return;
            }

            setSuccessUsername(json.username ?? previewUsername);
        } catch {
            setSubmitError(t("errors.generic"));
        } finally {
            setSubmitting(false);
        }
    };

    // ── Success screen ────────────────────────────────────────────────────────

    if (successUsername) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
            >
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                    <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{t("success.title")}</h2>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{t("success.subtitle")}</p>

                <div className="mx-auto mb-6 max-w-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-4 text-left">
                    <p className="mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t("success.username")}</p>
                    <p className="font-mono text-lg font-bold text-red-600">{successUsername}</p>
                </div>

                <div className="mx-auto mb-6 max-w-sm rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">{t("success.info")}</p>
                </div>

                <Link
                    href={`/${locale}/login`}
                    className="inline-block rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-red-700 transition-colors"
                >
                    {t("success.backToLogin")}
                </Link>
            </motion.div>
        );
    }

    // ── Step contents ─────────────────────────────────────────────────────────

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return <StepPersonal form={form} errors={errors} setField={setField} t={t} />;
            case 1:
                return <StepAcademic form={form} errors={errors} setField={setField} t={t} />;
            case 2:
                return <StepPassport form={form} errors={errors} setField={setField} t={t} />;
            case 3:
                return <StepDocuments documents={documents} setDoc={setDoc} t={t} />;
            case 4:
                return <StepAccount form={form} errors={errors} setField={setField} previewUsername={previewUsername} t={t} />;
            case 5:
                return (
                    <StepReview
                        form={form}
                        documents={documents}
                        previewUsername={previewUsername}
                        goToStep={setCurrentStep}
                        submitError={submitError}
                        submitting={submitting}
                        onSubmit={handleSubmit}
                        t={t}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full">
            <StepIndicator current={currentStep} total={TOTAL_STEPS} steps={STEPS} />

            <div className="mb-2 text-right text-xs text-gray-400">
                {t("nav.step", { current: currentStep + 1, total: TOTAL_STEPS })}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                >
                    {renderStep()}
                </motion.div>
            </AnimatePresence>

            {/* Navigation — pas affiché à l'étape récapitulatif */}
            {currentStep < TOTAL_STEPS - 1 && (
                <div className="mt-6 flex gap-3">
                    {currentStep > 0 && (
                        <button
                            type="button"
                            onClick={goBack}
                            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            {t("nav.back")}
                        </button>
                    )}
                    <motion.button
                        type="button"
                        onClick={goNext}
                        className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(220,38,38,0.3)] hover:bg-red-700 transition-colors"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {currentStep === TOTAL_STEPS - 2 ? t("review.submit") : t("nav.next")}
                    </motion.button>
                </div>
            )}
        </div>
    );
}

// ── Step 1 – Infos personnelles ───────────────────────────────────────────────

function StepPersonal({
    form,
    errors,
    setField,
    t,
}: {
    form: FormData;
    errors: Partial<Record<keyof FormData, string>>;
    setField: <K extends keyof FormData>(key: K, val: FormData[K]) => void;
    t: ReturnType<typeof useTranslations<"register">>;
}) {
    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("personal.title")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("personal.subtitle")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass}>{t("personal.firstName")} *</label>
                    <input
                        className={inputClass}
                        value={form.prenom}
                        onChange={(e) => setField("prenom", e.target.value)}
                        placeholder="Jean"
                    />
                    <FieldError message={errors.prenom} />
                </div>
                <div>
                    <label className={labelClass}>{t("personal.lastName")} *</label>
                    <input
                        className={inputClass}
                        value={form.nom}
                        onChange={(e) => setField("nom", e.target.value)}
                        placeholder="Dupont"
                    />
                    <FieldError message={errors.nom} />
                </div>
            </div>

            <div>
                <label className={labelClass}>{t("personal.email")} *</label>
                <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder={t("personal.emailPlaceholder")}
                />
                <FieldError message={errors.email} />
            </div>

            <div>
                <label className={labelClass}>{t("personal.phone")} *</label>
                <input
                    type="tel"
                    className={inputClass}
                    value={form.telephone}
                    onChange={(e) => setField("telephone", e.target.value)}
                    placeholder={t("personal.phonePlaceholder")}
                />
                <FieldError message={errors.telephone} />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass}>{t("personal.age")} *</label>
                    <input
                        type="number"
                        min={15}
                        max={60}
                        className={inputClass}
                        value={form.age}
                        onChange={(e) => setField("age", e.target.value)}
                        placeholder="20"
                    />
                    <FieldError message={errors.age} />
                </div>
                <div>
                    <label className={labelClass}>{t("personal.gender")} *</label>
                    <select
                        className={selectClass}
                        value={form.sexe}
                        onChange={(e) => setField("sexe", e.target.value as "M" | "F")}
                    >
                        <option value="">—</option>
                        <option value="M">{t("personal.male")}</option>
                        <option value="F">{t("personal.female")}</option>
                    </select>
                    <FieldError message={errors.sexe} />
                </div>
            </div>

            <div>
                <label className={labelClass}>{t("personal.nationality")} *</label>
                <input
                    className={inputClass}
                    value={form.nationalite}
                    onChange={(e) => setField("nationalite", e.target.value)}
                    placeholder={t("personal.nationalityPlaceholder")}
                />
                <FieldError message={errors.nationalite} />
            </div>
        </div>
    );
}

// ── Step 2 – Infos académiques ────────────────────────────────────────────────

function StepAcademic({
    form,
    errors,
    setField,
    t,
}: {
    form: FormData;
    errors: Partial<Record<keyof FormData, string>>;
    setField: <K extends keyof FormData>(key: K, val: FormData[K]) => void;
    t: ReturnType<typeof useTranslations<"register">>;
}) {
    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("academic.title")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("academic.subtitle")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass}>{t("academic.level")} *</label>
                    <input
                        className={inputClass}
                        value={form.niveau}
                        onChange={(e) => setField("niveau", e.target.value)}
                        placeholder={t("academic.levelPlaceholder")}
                    />
                    <FieldError message={errors.niveau} />
                </div>
                <div>
                    <label className={labelClass}>{t("academic.field")} *</label>
                    <input
                        className={inputClass}
                        value={form.filiere}
                        onChange={(e) => setField("filiere", e.target.value)}
                        placeholder={t("academic.fieldPlaceholder")}
                    />
                    <FieldError message={errors.filiere} />
                </div>
            </div>

            <div>
                <label className={labelClass}>{t("academic.diploma")} *</label>
                <input
                    className={inputClass}
                    value={form.diplome_acquis}
                    onChange={(e) => setField("diplome_acquis", e.target.value)}
                    placeholder={t("academic.diplomaPlaceholder")}
                />
                <FieldError message={errors.diplome_acquis} />
            </div>

            <div>
                <label className={labelClass}>{t("academic.language")} *</label>
                <select
                    className={selectClass}
                    value={form.langue}
                    onChange={(e) => setField("langue", e.target.value)}
                >
                    <option value="Français">{t("academic.languageFr")}</option>
                    <option value="Anglais">{t("academic.languageEn")}</option>
                </select>
                <FieldError message={errors.langue} />
            </div>

            <div>
                <label className={labelClass}>{t("academic.service")} *</label>
                <div className="space-y-2">
                    {(
                        [
                            ["procedure_seule", t("academic.serviceProcedure")],
                            ["cours_seuls", t("academic.serviceCours")],
                            ["procedure_cours", t("academic.serviceBoth")],
                        ] as [string, string][]
                    ).map(([val, label]) => (
                        <label
                            key={val}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                                form.choix === val
                                    ? "border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-500"
                                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            }`}
                        >
                            <input
                                type="radio"
                                name="choix"
                                value={val}
                                checked={form.choix === val}
                                onChange={() => setField("choix", val as FormData["choix"])}
                                className="accent-red-600"
                            />
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
                        </label>
                    ))}
                </div>
                <FieldError message={errors.choix} />
            </div>
        </div>
    );
}

// ── Step 3 – Passeport ────────────────────────────────────────────────────────

function StepPassport({
    form,
    errors,
    setField,
    t,
}: {
    form: FormData;
    errors: Partial<Record<keyof FormData, string>>;
    setField: <K extends keyof FormData>(key: K, val: FormData[K]) => void;
    t: ReturnType<typeof useTranslations<"register">>;
}) {
    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("passport.title")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("passport.subtitle")}</p>
            </div>

            <div>
                <label className={labelClass}>{t("passport.number")} *</label>
                <input
                    className={inputClass}
                    value={form.passeport_numero}
                    onChange={(e) => setField("passeport_numero", e.target.value.toUpperCase())}
                    placeholder={t("passport.numberPlaceholder")}
                />
                <FieldError message={errors.passeport_numero} />
            </div>

            <div>
                <label className={labelClass}>{t("passport.expiration")} *</label>
                <input
                    type="date"
                    className={inputClass}
                    value={form.passeport_expiration}
                    onChange={(e) => setField("passeport_expiration", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                />
                <FieldError message={errors.passeport_expiration} />
            </div>

            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-4 py-3">
                <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                    ⚠️ {t("passport.warning")}
                </p>
            </div>
        </div>
    );
}

// ── Step 4 – Documents ────────────────────────────────────────────────────────

function StepDocuments({
    documents,
    setDoc,
    t,
}: {
    documents: DocumentFiles;
    setDoc: (type: keyof DocumentFiles, file?: File) => void;
    t: ReturnType<typeof useTranslations<"register">>;
}) {
    const docList: { key: keyof DocumentFiles; label: string }[] = [
        { key: "passeport", label: t("documents.docPasseport") },
        { key: "casier_judiciaire", label: t("documents.docCasier") },
        { key: "carte_photo", label: t("documents.docPhoto") },
        { key: "releve_bac", label: t("documents.docReleve") },
        { key: "diplome_bac", label: t("documents.docDiplome") },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("documents.title")}</h3>
                        <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                            {t("documents.optionalBadge")}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("documents.subtitle")}</p>
                </div>
            </div>

            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 px-4 py-3">
                <p className="text-sm text-blue-700 dark:text-blue-400">ℹ️ {t("documents.skipInfo")}</p>
            </div>

            <div className="space-y-2">
                {docList.map(({ key, label }) => (
                    <DocFilePicker
                        key={key}
                        label={label}
                        file={documents[key]}
                        onChange={(f) => setDoc(key, f)}
                    />
                ))}
            </div>
        </div>
    );
}

// ── Step 5 – Compte ───────────────────────────────────────────────────────────

function StepAccount({
    form,
    errors,
    setField,
    previewUsername,
    t,
}: {
    form: FormData;
    errors: Partial<Record<keyof FormData, string>>;
    setField: <K extends keyof FormData>(key: K, val: FormData[K]) => void;
    previewUsername: string;
    t: ReturnType<typeof useTranslations<"register">>;
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("account.title")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("account.subtitle")}</p>
            </div>

            <div>
                <label className={labelClass}>{t("account.username")}</label>
                <div className="relative">
                    <input
                        className={`${inputClass} bg-gray-100 dark:bg-gray-800 cursor-not-allowed font-mono`}
                        value={previewUsername}
                        readOnly
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                </div>
                <p className="mt-1 text-xs text-gray-400">{t("account.usernameInfo")}</p>
            </div>

            <div>
                <label className={labelClass}>{t("account.password")} *</label>
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        className={`${inputClass} pr-12`}
                        value={form.password}
                        onChange={(e) => setField("password", e.target.value)}
                        placeholder={t("account.passwordPlaceholder")}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                        {showPassword ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </button>
                </div>
                <PasswordStrengthBar password={form.password} />
                <FieldError message={errors.password} />
            </div>

            <div>
                <label className={labelClass}>{t("account.confirmPassword")} *</label>
                <div className="relative">
                    <input
                        type={showConfirm ? "text" : "password"}
                        className={`${inputClass} pr-12`}
                        value={form.confirmPassword}
                        onChange={(e) => setField("confirmPassword", e.target.value)}
                        placeholder={t("account.confirmPlaceholder")}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                        {showConfirm ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </button>
                </div>
                <FieldError message={errors.confirmPassword} />
            </div>
        </div>
    );
}

// ── Step 6 – Récapitulatif ────────────────────────────────────────────────────

function StepReview({
    form,
    documents,
    previewUsername,
    goToStep,
    submitError,
    submitting,
    onSubmit,
    t,
}: {
    form: FormData;
    documents: DocumentFiles;
    previewUsername: string;
    goToStep: (step: number) => void;
    submitError: string;
    submitting: boolean;
    onSubmit: () => void;
    t: ReturnType<typeof useTranslations<"register">>;
}) {
    const choixLabels: Record<string, string> = {
        procedure_seule: t("academic.serviceProcedure"),
        cours_seuls: t("academic.serviceCours"),
        procedure_cours: t("academic.serviceBoth"),
    };

    const docCount = Object.values(documents).filter(Boolean).length;

    const SectionCard = ({
        title,
        step,
        rows,
    }: {
        title: string;
        step: number;
        rows: [string, string][];
    }) => (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-3">
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</span>
                <button
                    type="button"
                    onClick={() => goToStep(step)}
                    className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                >
                    {t("review.editStep")}
                </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map(([label, val]) => (
                    <div key={label} className="flex justify-between gap-4 px-4 py-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100 text-right break-all">{val || "—"}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-2">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("review.title")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("review.subtitle")}</p>
            </div>

            <SectionCard
                title={t("review.sectionPersonal")}
                step={0}
                rows={[
                    [t("personal.firstName"), form.prenom],
                    [t("personal.lastName"), form.nom],
                    [t("personal.email"), form.email],
                    [t("personal.phone"), form.telephone],
                    [t("personal.age"), form.age],
                    [t("personal.gender"), form.sexe === "M" ? t("personal.male") : form.sexe === "F" ? t("personal.female") : ""],
                    [t("personal.nationality"), form.nationalite],
                ]}
            />

            <SectionCard
                title={t("review.sectionAcademic")}
                step={1}
                rows={[
                    [t("academic.level"), form.niveau],
                    [t("academic.field"), form.filiere],
                    [t("academic.diploma"), form.diplome_acquis],
                    [t("academic.language"), form.langue],
                    [t("academic.service"), choixLabels[form.choix] ?? ""],
                ]}
            />

            <SectionCard
                title={t("review.sectionPassport")}
                step={2}
                rows={[
                    [t("passport.number"), form.passeport_numero],
                    [t("passport.expiration"), form.passeport_expiration],
                ]}
            />

            <SectionCard
                title={t("review.sectionDocuments")}
                step={3}
                rows={[
                    [
                        t("review.sectionDocuments"),
                        docCount > 0 ? t("review.docsCount", { count: docCount }) : t("review.noDoc"),
                    ],
                ]}
            />

            <SectionCard
                title={t("review.sectionAccount")}
                step={4}
                rows={[[t("account.username"), previewUsername]]}
            />

            {submitError && (
                <div className="rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
                </div>
            )}

            <motion.button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="w-full rounded-xl bg-red-600 py-4 text-base font-semibold text-white shadow-[0_12px_28px_rgba(220,38,38,0.35)] hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-4"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
            >
                {submitting ? (
                    <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                        {t("review.submitting")}
                    </motion.span>
                ) : (
                    t("review.submit")
                )}
            </motion.button>
        </div>
    );
}
