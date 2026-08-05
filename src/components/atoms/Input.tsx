import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  error?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  isCurrency?: boolean;
  currencyPrefix?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  className,
  error,
  type = 'text',
  icon: Icon,
  isCurrency = false,
  currencyPrefix = 'Rp ',
  value,
  onChange,
  onKeyDown,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const isCurrencyType = type === 'currency' || isCurrency;
  const isNumberType = type === 'number';
  const isPasswordType = type === 'password';

  // Handle numeric key block: Block non-numeric characters (like letters, 'e', 'E', '+', '-')
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isNumberType || isCurrencyType) {
      // Allow navigation keys: Backspace, Delete, Tab, Escape, Enter, Arrow keys, Home, End
      const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
        onKeyDown?.(e);
        return;
      }
      // Block non-digits
      if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        return;
      }
    }
    onKeyDown?.(e);
  };

  // Helper to format raw numeric string as Indonesian currency (e.g. 85000 -> "Rp 85.000")
  const formatCurrency = (val: string | number | readonly string[] | undefined): string => {
    if (val === undefined || val === null || val === '') return '';
    const numericStr = String(val).replace(/\D/g, '');
    if (!numericStr) return '';
    const num = parseInt(numericStr, 10);
    return `${currencyPrefix}${num.toLocaleString('id-ID')}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isCurrencyType) {
      const rawDigits = e.target.value.replace(/\D/g, '');
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          name: props.name,
          value: rawDigits
        }
      };
      onChange?.(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
    } else if (isNumberType) {
      const sanitized = e.target.value.replace(/\D/g, '');
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          name: props.name,
          value: sanitized
        }
      };
      onChange?.(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
    } else {
      onChange?.(e);
    }
  };

  const displayValue = isCurrencyType
    ? formatCurrency(value)
    : value;

  const actualType = isPasswordType
    ? (showPassword ? 'text' : 'password')
    : (isCurrencyType || isNumberType ? 'text' : type);

  return (
    <div className="relative w-full">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Icon className="w-5 h-5" />
        </div>
      )}

      <input
        ref={ref}
        type={actualType}
        inputMode={isNumberType || isCurrencyType ? 'numeric' : props.inputMode}
        value={displayValue !== undefined ? displayValue : ''}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={twMerge(
          clsx(
            'w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-900 shadow-2xs placeholder:text-slate-400 transition duration-150 ease-in-out focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
            (isCurrencyType || isNumberType) && 'font-mono font-semibold',
            Icon && 'pl-10',
            isPasswordType && 'pr-10',
            error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
            className
          )
        )}
        {...props}
      />

      {isPasswordType && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
          title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        >
          {showPassword ? <EyeOff className="w-4 h-4 text-emerald-600" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
});

Input.displayName = 'Input';
