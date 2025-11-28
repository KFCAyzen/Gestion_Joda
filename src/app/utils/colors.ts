/**
 * Configuration des couleurs pour Joda Company
 * Charte graphique : Rouge, Blanc, Noir
 */

export const colors = {
  // Couleurs principales
  primary: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626', // Rouge principal
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Couleurs neutres (noir, blanc, gris)
  neutral: {
    white: '#ffffff',
    black: '#000000',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Couleurs d'état
  success: {
    light: '#d1fae5',
    main: '#10b981',
    dark: '#047857',
  },
  
  warning: {
    light: '#fef3c7',
    main: '#f59e0b',
    dark: '#d97706',
  },
  
  error: {
    light: '#fee2e2',
    main: '#ef4444',
    dark: '#dc2626',
  },
  
  info: {
    light: '#dbeafe',
    main: '#3b82f6',
    dark: '#1d4ed8',
  },
};

// Classes Tailwind correspondantes
export const tailwindColors = {
  primary: 'red-600',
  primaryHover: 'red-700',
  primaryLight: 'red-50',
  secondary: 'white',
  text: 'black',
  textLight: 'gray-700',
  textMuted: 'gray-500',
  border: 'gray-300',
  background: 'gray-100',
};

// Utilitaires pour les composants
export const getButtonClasses = (variant: 'primary' | 'secondary' | 'outline' = 'primary') => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors duration-200';
  
  switch (variant) {
    case 'primary':
      return `${baseClasses} bg-red-600 hover:bg-red-700 text-white`;
    case 'secondary':
      return `${baseClasses} bg-white hover:bg-gray-50 text-black border border-gray-300`;
    case 'outline':
      return `${baseClasses} bg-transparent hover:bg-red-50 text-red-600 border border-red-600`;
    default:
      return `${baseClasses} bg-red-600 hover:bg-red-700 text-white`;
  }
};

export const getCardClasses = () => {
  return 'bg-white border border-gray-200 rounded-lg shadow-sm';
};

export const getInputClasses = () => {
  return 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors';
};