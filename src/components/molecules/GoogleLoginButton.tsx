import React from 'react';
import { Button } from '../atoms/Button';

export interface GoogleLoginButtonProps {
  onClick?: () => void;
  isLoading?: boolean;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onClick, isLoading }) => {
  return (
    <Button
      variant="outline"
      size="lg"
      onClick={onClick}
      disabled={isLoading}
      className="w-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-3.5 shadow-sm rounded-2xl flex items-center justify-center gap-3"
    >
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.26v3.15C3.25 21.3 7.31 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.26C.46 8.2.01 10.03.01 12c0 1.97.45 3.8 1.25 5.39l4.02-3.15z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.26 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
        />
      </svg>
      <span>Masuk dengan Google (Supabase OAuth)</span>
    </Button>
  );
};
