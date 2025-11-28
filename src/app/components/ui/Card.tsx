import { theme } from '../../styles/theme';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div 
      className={`rounded-2xl p-6 border transition-all duration-300 ${hover ? 'hover:scale-105' : ''} ${className}`}
      style={theme.glassmorphism.card}
    >
      {children}
    </div>
  );
}