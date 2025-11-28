export const theme = {
  colors: {
    primary: '#dc2626',
    primaryDark: '#b91c1c',
    secondary: '#ffffff',
    accent: '#ef4444',
  },
  
  glassmorphism: {
    card: {
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(220, 38, 38, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    },
    sidebar: {
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(220, 38, 38, 0.1)',
      boxShadow: '0 0 40px rgba(0, 0, 0, 0.1)',
    },
    header: {
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(220, 38, 38, 0.1)',
      boxShadow: '0 1px 20px rgba(0, 0, 0, 0.05)',
    },
  },
  
  gradients: {
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    button: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
  },
} as const;