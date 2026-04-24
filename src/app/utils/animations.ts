"use client";

import { Variants } from "framer-motion";

// --- Page transitions --- (slide + fade prononcé)
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 48, scale: 0.97 },
  animate: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -32, scale: 0.97, transition: { duration: 0.3 } },
};

// --- Fade simple ---
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5 } },
  exit:    { opacity: 0, transition: { duration: 0.25 } },
};

// --- Slide depuis le bas (très visible) ---
export const slideUp: Variants = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: 40, transition: { duration: 0.25 } },
};

// --- Slide depuis la gauche ---
export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -80 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, x: -60, transition: { duration: 0.25 } },
};

// --- Slide depuis la droite ---
export const slideInRight: Variants = {
  initial: { opacity: 0, x: 80 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, x: 60, transition: { duration: 0.25 } },
};

// --- Scale avec spring (modal, card) ---
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.75, y: 20 },
  animate: { opacity: 1, scale: 1,    y: 0,  transition: { type: "spring", stiffness: 280, damping: 22 } },
  exit:    { opacity: 0, scale: 0.85, y: 10, transition: { duration: 0.2 } },
};

// --- Stagger container ---
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
};

// --- Item stagger (slide + fade) ---
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 40, scale: 0.95 },
  animate: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

// --- Card hover spectaculaire ---
export const cardHover = {
  rest:  { scale: 1,    y: 0,  boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
  hover: { scale: 1.03, y: -6, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", transition: { duration: 0.25, ease: "easeOut" } },
};

// --- Bouton press ---
export const buttonTap = { scale: 0.93 };

// --- Overlay modal ---
export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};

// --- Sidebar (slide depuis gauche) ---
export const sidebarVariants: Variants = {
  closed: { x: "-100%", opacity: 0.5, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  open:   { x: 0,       opacity: 1,   transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

// --- Toast notification ---
export const toastVariants: Variants = {
  initial: { opacity: 0, x: 100, scale: 0.85, rotate: 2 },
  animate: { opacity: 1, x: 0,   scale: 1,    rotate: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  exit:    { opacity: 0, x: 100, scale: 0.85, transition: { duration: 0.25 } },
};

// --- Badge pulse ---
export const pulseBadge = {
  animate: {
    scale: [1, 1.25, 1],
    boxShadow: ["0 0 0 0 rgba(220,38,38,0.4)", "0 0 0 8px rgba(220,38,38,0)", "0 0 0 0 rgba(220,38,38,0)"],
    transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
  },
};

// --- Spinner ---
export const spinnerVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 0.75, repeat: Infinity, ease: "linear" },
  },
};

// --- Entrée hero (logo login) ---
export const heroEntrance: Variants = {
  initial: { scale: 0, rotate: -15, opacity: 0 },
  animate: { scale: 1, rotate: 0,   opacity: 1, transition: { type: "spring", stiffness: 220, damping: 14, delay: 0.2 } },
};

// --- Texte qui apparaît lettre par lettre (titre) ---
export const titleReveal: Variants = {
  initial: { opacity: 0, y: 20, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0,  filter: "blur(0px)", transition: { duration: 0.6, ease: "easeOut" } },
};

// --- Ligne de progression animée ---
export const progressBar = (pct: number) => ({
  initial: { width: "0%", opacity: 0 },
  animate: { width: `${pct}%`, opacity: 1, transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 } },
});

// --- Shake (erreur) ---
export const shakeVariants: Variants = {
  initial: { x: 0 },
  animate: { x: [0, -10, 10, -8, 8, -4, 4, 0], transition: { duration: 0.5 } },
};

// --- Bounce (succès) ---
export const bounceIn: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: [0, 1.2, 0.9, 1.05, 1], opacity: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

// --- Flip card ---
export const flipIn: Variants = {
  initial: { rotateY: -90, opacity: 0 },
  animate: { rotateY: 0,   opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

// --- Glow pulse (bouton CTA) ---
export const glowPulse = {
  animate: {
    boxShadow: [
      "0 0 0 0 rgba(220,38,38,0)",
      "0 0 20px 6px rgba(220,38,38,0.35)",
      "0 0 0 0 rgba(220,38,38,0)",
    ] as string[],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const },
  },
};
