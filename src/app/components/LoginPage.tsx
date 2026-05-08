"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { buildStudentAuthEmail } from "../lib/student-auth";
import {
    slideUp,
    scaleIn,
    fadeIn,
    overlayVariants,
    buttonTap,
    heroEntrance,
    titleReveal,
    staggerContainer,
    staggerItem,
} from "../utils/animations";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showStudentLogin, setShowStudentLogin] = useState(false);
    const [studentUsername, setStudentUsername] = useState("");
    const [studentPassword, setStudentPassword] = useState("");
    const [studentError, setStudentError] = useState("");
    const [studentLoading, setStudentLoading] = useState(false);
    const [shakeError, setShakeError] = useState(false);
    const [shakeStudentError, setShakeStudentError] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState<"staff" | "student" | null>(null);
    const [forgotInput, setForgotInput] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSent, setForgotSent] = useState(false);

    const triggerShake = (isStudent = false) => {
        if (isStudent) {
            setShakeStudentError(true);
            setTimeout(() => setShakeStudentError(false), 600);
        } else {
            setShakeError(true);
            setTimeout(() => setShakeError(false), 600);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const isLoggedIn = await login(username, password);

            if (isLoggedIn) {
                router.push("/tableau-de-bord");
                return;
            }

            setError("Nom d'utilisateur ou mot de passe incorrect");
            triggerShake();
        } catch (err) {
            console.error('Erreur dans handleSubmit:', err);
            setError("Nom d'utilisateur ou mot de passe incorrect");
            triggerShake();
        }

        setLoading(false);
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotInput.trim()) return;
        setForgotLoading(true);
        try {
            await fetch("/api/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    showForgotPassword === "student"
                        ? { username: forgotInput.trim() }
                        : { email: forgotInput.trim() }
                ),
            });
        } catch {
            // Silently ignore — always show success to prevent enumeration
        }
        setForgotLoading(false);
        setForgotSent(true);
    };

    const closeForgotPassword = () => {
        setShowForgotPassword(null);
        setForgotInput("");
        setForgotSent(false);
    };

    const handleStudentLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setStudentLoading(true);
        setStudentError("");

        try {
            const isLoggedIn = await login(buildStudentAuthEmail(studentUsername), studentPassword);

            if (isLoggedIn) {
                router.push("/etudiant");
                return;
            }

            setStudentError("Identifiant ou mot de passe incorrect. Si vous venez d'être inscrit, contactez l'administration.");
            triggerShake(true);
        } catch {
            setStudentError("Nom d'utilisateur ou mot de passe incorrect");
            triggerShake(true);
        }

        setStudentLoading(false);
    };

    useEffect(() => {
        if (typeof window !== "undefined") {
            document.body.style.overflow = "hidden";
            document.body.style.position = "fixed";
            document.body.style.width = "100%";
            document.body.style.height = "100%";

            return () => {
                document.body.style.overflow = "";
                document.body.style.position = "";
                document.body.style.width = "";
                document.body.style.height = "";
            };
        }
    }, []);

    const EyeIcon = ({ visible }: { visible: boolean }) =>
        visible ? (
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
        ) : (
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        );

    return (
        <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black"
            style={{ touchAction: "none" }}
            variants={fadeIn}
            initial="initial"
            animate="animate"
        >
            <motion.img
                src="/3353.jpg"
                alt="Background"
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
            />
            <motion.div className="absolute inset-0 bg-black/70" variants={overlayVariants} initial="initial" animate="animate" />

            {[...Array(6)].map((_, index) => (
                <motion.div
                    key={index}
                    className="absolute rounded-full bg-red-500/20 blur-xl"
                    style={{
                        width: 80 + index * 40,
                        height: 80 + index * 40,
                        left: `${10 + index * 15}%`,
                        top: `${20 + (index % 3) * 25}%`,
                    }}
                    animate={{ y: [0, -20, 0], opacity: [0.2, 0.5, 0.2], scale: [1, 1.1, 1] }}
                    transition={{ duration: 3 + index, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
                />
            ))}

            <motion.div
                className="relative w-full max-w-5xl h-full sm:h-[85vh] sm:w-[90vw] lg:h-[75vh] lg:w-[80vw]"
                variants={scaleIn}
                initial="initial"
                animate="animate"
            >
                <motion.div
                    className="relative h-full w-full overflow-hidden sm:rounded-2xl"
                    style={{
                        background: "rgba(0,0,0,0.8)",
                        backdropFilter: "blur(40px) saturate(180%)",
                        border: "1px solid rgba(220,38,38,0.3)",
                        boxShadow: "0 50px 100px rgba(0,0,0,0.8), 0 0 60px rgba(220,38,38,0.25), inset 0 1px 0 rgba(220,38,38,0.15)",
                    }}
                    animate={{
                        boxShadow: [
                            "0 50px 100px rgba(0,0,0,0.8), 0 0 40px rgba(220,38,38,0.15)",
                            "0 50px 100px rgba(0,0,0,0.8), 0 0 80px rgba(220,38,38,0.35)",
                            "0 50px 100px rgba(0,0,0,0.8), 0 0 40px rgba(220,38,38,0.15)",
                        ],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div className="flex h-full flex-col lg:grid lg:grid-cols-[1.2fr_1fr]">
                        {/* Panneau image */}
                        <motion.div
                            className={`relative overflow-hidden ${showStudentLogin ? "hidden lg:block" : ""} h-48 sm:h-2/5 lg:h-full`}
                            initial={{ x: -60, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <motion.img
                                src="/23704.jpg"
                                alt="Login visual"
                                className="absolute inset-0 h-full w-full object-cover"
                                initial={{ scale: 1.15 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <motion.div className="px-4 text-center" variants={staggerContainer} initial="initial" animate="animate">
                                    <motion.div
                                        className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-[0_10px_25px_rgba(0,0,0,0.5)] sm:mb-4 sm:h-14 sm:w-14 md:h-16 md:w-16 lg:mb-6 lg:h-28 lg:w-28"
                                        variants={heroEntrance}
                                        whileHover={{ rotate: [0, -5, 5, 0], scale: 1.08, transition: { duration: 0.4 } }}
                                    >
                                        <img src="/0.png" alt="Joda Company Logo" className="h-10 w-10 object-contain sm:h-12 sm:w-12 lg:h-20 lg:w-20" />
                                    </motion.div>
                                    <motion.h1 className="text-xl font-bold tracking-wider text-black lg:text-3xl" variants={titleReveal}>
                                        Joda Company
                                    </motion.h1>
                                    <motion.p className="text-sm font-semibold text-black lg:text-lg" variants={staggerItem}>
                                        Gestion des bourses
                                    </motion.p>
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Panneau formulaire */}
                        <motion.div
                            className="flex flex-1 flex-col justify-center overflow-y-auto px-6 py-8 text-gray-900 sm:p-8 lg:p-10"
                            style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)" }}
                            initial={{ x: 60, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                        >
                            {showStudentLogin && (
                                <div className="mb-6 flex flex-col items-center sm:hidden">
                                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.15)] ring-1 ring-red-100">
                                        <img src="/0.png" alt="Joda" className="h-12 w-12 object-contain" />
                                    </div>
                                    <h1 className="text-lg font-bold tracking-wide text-gray-900">Joda Company</h1>
                                    <p className="text-xs text-gray-500">Gestion des bourses d'études</p>
                                </div>
                            )}
                            <AnimatePresence mode="wait">
                                {showStudentLogin ? (
                                    <motion.div key="student" className="mx-auto w-full max-w-sm" variants={slideUp} initial="initial" animate="animate" exit="exit">
                                        <motion.div className="mb-6 lg:mb-8" variants={staggerContainer} initial="initial" animate="animate">
                                            <motion.button
                                                onClick={() => {
                                                    setShowStudentLogin(false);
                                                    setStudentUsername("");
                                                    setStudentPassword("");
                                                    setStudentError("");
                                                }}
                                                className="mb-4 flex items-center gap-2 font-medium text-red-600 hover:text-red-700"
                                                whileHover={{ x: -5, color: "#991b1b" }}
                                                whileTap={buttonTap}
                                                variants={staggerItem}
                                            >
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                </svg>
                                                Retour
                                            </motion.button>
                                            <motion.h2 className="mb-2 text-2xl font-light lg:text-2xl" variants={titleReveal}>
                                                Espace Étudiant
                                            </motion.h2>
                                            <motion.p className="text-sm text-gray-600" variants={staggerItem}>
                                                Les comptes sont créés par l'administration. Connectez-vous avec votre nom d'utilisateur.
                                            </motion.p>
                                        </motion.div>

                                        <motion.form
                                            onSubmit={handleStudentLogin}
                                            className="space-y-4"
                                            animate={shakeStudentError ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
                                            transition={{ duration: 0.5 }}
                                        >
                                            <motion.input
                                                type="text"
                                                value={studentUsername}
                                                onChange={(e) => setStudentUsername(e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base text-gray-900 placeholder-gray-500 transition-all focus:border-red-500 focus:ring-2 focus:ring-red-500"
                                                placeholder="Nom d'utilisateur"
                                                required
                                                whileFocus={{ scale: 1.02, borderColor: "#dc2626" }}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 }}
                                            />
                                            <motion.div className="relative" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}>
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={studentPassword}
                                                    onChange={(e) => setStudentPassword(e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 pr-12 text-base text-gray-900 placeholder-gray-500 transition-all focus:border-red-500 focus:ring-2 focus:ring-red-500"
                                                    placeholder="Mot de passe"
                                                    required
                                                />
                                                <motion.button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-red-500"
                                                    whileTap={buttonTap}
                                                    whileHover={{ scale: 1.2 }}
                                                >
                                                    <EyeIcon visible={showPassword} />
                                                </motion.button>
                                            </motion.div>

                                            <AnimatePresence>
                                                {studentError && (
                                                    <motion.div
                                                        variants={slideUp}
                                                        initial="initial"
                                                        animate="animate"
                                                        exit="exit"
                                                        className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-500"
                                                    >
                                                        {studentError}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div className="sticky bottom-0 -mx-1 bg-white/95 px-1 pb-1 pt-3 backdrop-blur-sm">
                                                <motion.button
                                                    type="submit"
                                                    disabled={studentLoading}
                                                    className="w-full rounded-xl bg-red-600 px-4 py-3 text-base font-semibold text-white shadow-[0_16px_32px_rgba(220,38,38,0.35)] transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                    animate={{ opacity: 1, y: 0 }}
                                                    whileHover={{ scale: 1.04, boxShadow: "0 16px 32px rgba(220,38,38,0.5)" }}
                                                    whileTap={buttonTap}
                                                    initial={{ opacity: 0, y: 15 }}
                                                    transition={{ delay: 0.3 }}
                                                >
                                                    {studentLoading ? (
                                                        <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                                                            Connexion...
                                                        </motion.span>
                                                    ) : (
                                                        "Se connecter"
                                                    )}
                                                </motion.button>
                                            </div>
                                        </motion.form>
                                        <motion.div
                                            className="mt-4 text-center"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => { setShowForgotPassword("student"); setForgotInput(""); setForgotSent(false); }}
                                                className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                                            >
                                                Mot de passe oublié ?
                                            </button>
                                        </motion.div>
                                    </motion.div>
                                ) : (
                                    <motion.div key="main" className="mx-auto w-full max-w-sm self-center" variants={slideUp} initial="initial" animate="animate" exit="exit">
                                        <motion.div
                                            className="mb-6 lg:mb-8"
                                            initial={{ opacity: 0, y: -20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2, duration: 0.5 }}
                                        >
                                            <h2 className="mb-1 text-2xl font-light lg:text-3xl">Connexion</h2>
                                            <p className="text-sm text-gray-500">Accédez à votre espace</p>
                                        </motion.div>

                                        <motion.form
                                            onSubmit={handleSubmit}
                                            className="space-y-4"
                                            animate={shakeError ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
                                            transition={{ duration: 0.5 }}
                                        >
                                            <motion.input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-base text-gray-900 placeholder-gray-400 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
                                                placeholder="Email"
                                                required
                                                whileFocus={{ scale: 1.01 }}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.3 }}
                                            />
                                            <motion.div className="relative" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.38 }}>
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 pr-12 text-base text-gray-900 placeholder-gray-400 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
                                                    placeholder="Mot de passe"
                                                    required
                                                />
                                                <motion.button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-red-500"
                                                    whileTap={buttonTap}
                                                >
                                                    <EyeIcon visible={showPassword} />
                                                </motion.button>
                                            </motion.div>

                                            <AnimatePresence>
                                                {error && (
                                                    <motion.div
                                                        variants={slideUp}
                                                        initial="initial"
                                                        animate="animate"
                                                        exit="exit"
                                                        className="rounded-lg border border-red-200 bg-red-50 p-2 text-center text-xs font-medium text-red-500 sm:rounded-xl sm:p-3 sm:text-sm"
                                                    >
                                                        {error}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <motion.button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full rounded-xl bg-red-600 px-4 py-4 text-base font-semibold text-white shadow-[0_16px_32px_rgba(220,38,38,0.35)] transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                animate={{ opacity: 1, y: 0 }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={buttonTap}
                                                initial={{ opacity: 0, y: 15 }}
                                                transition={{ delay: 0.5 }}
                                            >
                                                {loading ? (
                                                    <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                                                        Connexion...
                                                    </motion.span>
                                                ) : (
                                                    "Se connecter"
                                                )}
                                            </motion.button>
                                        </motion.form>

                                        <motion.div
                                            className="mt-6 space-y-3 text-center"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.6 }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => { setShowForgotPassword("staff"); setForgotInput(""); setForgotSent(false); }}
                                                className="text-sm text-gray-400 hover:text-red-600 transition-colors"
                                            >
                                                Mot de passe oublié ?
                                            </button>
                                            <div className="flex items-center gap-3">
                                                <div className="h-px flex-1 bg-gray-200" />
                                                <span className="text-xs text-gray-400">Espace Étudiant</span>
                                                <div className="h-px flex-1 bg-gray-200" />
                                            </div>
                                            <motion.button
                                                onClick={() => setShowStudentLogin(true)}
                                                className="w-full rounded-xl border-2 border-red-600 px-4 py-3.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={buttonTap}
                                                initial={{ opacity: 0, y: 15 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.6 }}
                                            >
                                                Se connecter en tant qu'étudiant
                                            </motion.button>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Forgot password overlay */}
            <AnimatePresence>
                {showForgotPassword && (
                    <motion.div
                        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 px-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeForgotPassword}
                    >
                        <motion.div
                            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {forgotSent ? (
                                <div className="text-center py-4">
                                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                                        <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="mb-2 text-lg font-semibold text-gray-900">Email envoyé</h3>
                                    <p className="mb-6 text-sm text-gray-500 leading-relaxed">
                                        Si un compte correspond, vous recevrez un lien de réinitialisation valable 24 h.
                                    </p>
                                    <button
                                        onClick={closeForgotPassword}
                                        className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                                    >
                                        Retour à la connexion
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-5">
                                        <h3 className="text-lg font-semibold text-gray-900">Mot de passe oublié</h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            {showForgotPassword === "student"
                                                ? "Entrez votre nom d'utilisateur et nous enverrons un lien de réinitialisation à l'email associé."
                                                : "Entrez votre email et nous vous enverrons un lien de réinitialisation."}
                                        </p>
                                    </div>
                                    <form onSubmit={handleForgotPassword} className="space-y-4">
                                        <input
                                            type={showForgotPassword === "student" ? "text" : "email"}
                                            value={forgotInput}
                                            onChange={(e) => setForgotInput(e.target.value)}
                                            placeholder={showForgotPassword === "student" ? "Nom d'utilisateur" : "Email"}
                                            required
                                            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
                                        />
                                        <button
                                            type="submit"
                                            disabled={forgotLoading}
                                            className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(220,38,38,0.3)] hover:bg-red-700 disabled:opacity-50 transition-colors"
                                        >
                                            {forgotLoading ? "Envoi..." : "Envoyer le lien"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={closeForgotPassword}
                                            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                                        >
                                            Annuler
                                        </button>
                                    </form>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
