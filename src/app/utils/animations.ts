"use client";

import { Variants } from "framer-motion";

// --- Page transitions ---
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  exit:    { opacity: 0, y: -16, transition: { duration: 0.2 } },
};

// --- Fade simple ---
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};

// --- Slide depuis le bas ---
export const slideUp: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit:    { opacity: 0, y: 30, transition: { duration: 0.2 } },
};

// --- Slide depuis la gauche ---
export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit:    { opacity: 0, x: -40, transition: { duration: 0.2 } },
};

// --- Slide depuis la droite ---
export const slideInRight: Variants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit:    { opacity: 0, x: 40, transition: { duration: 0.2 } },
};

// --- Scale (modal, card) ---
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit:    { opacity: 0, scale: 0.92, transition: { duration: 0.2 } },
};

// --- Stagger container (liste d'éléments) ---
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

// --- Item dans un stagger ---
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// --- Card hover ---
export const cardHover = {
  rest:  { scale: 1,    boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  hover: { scale: 1.02, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", transition: { duration: 0.2 } },
};

// --- Bouton press ---
export const buttonTap = { scale: 0.96 };

// --- Overlay modal ---
export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};

// --- Sidebar ---
export const sidebarVariants: Variants = {
  closed: { x: "-100%", transition: { duration: 0.3, ease: "easeInOut" } },
  open:   { x: 0,       transition: { duration: 0.3, ease: "easeInOut" } },
};

// --- Compteur (nombre qui monte) ---
export const counterTransition = { duration: 1.2, ease: "easeOut" };

// --- Notification toast ---
export const toastVariants: Variants = {
  initial: { opacity: 0, x: 60, scale: 0.95 },
  animate: { opacity: 1, x: 0,  scale: 1, transition: { duration: 0.35, ease: "easeOut" } },
  exit:    { opacity: 0, x: 60, scale: 0.95, transition: { duration: 0.25 } },
};

// --- Badge pulse ---
export const pulseBadge = {
  animate: {
    scale: [1, 1.15, 1],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  },
};

// --- Spinner ---
export const spinnerVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 0.8, repeat: Infinity, ease: "linear" },
  },
};
