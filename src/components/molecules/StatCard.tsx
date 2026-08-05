import React from 'react';
import { Card } from '../atoms/Card';

export interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'amber' | 'emerald' | 'glass';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend
}) => {
  return (
    <Card variant={variant} className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-600 font-medium">{subtitle}</p>}
        </div>

        {Icon && (
          <div className="p-3 rounded-2xl bg-emerald-600 text-amber-300 shadow-md shadow-emerald-200">
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center text-xs font-medium text-emerald-700">
          <span>{trend}</span>
        </div>
      )}
    </Card>
  );
};
