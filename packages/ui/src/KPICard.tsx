import React from 'react';
import { Card } from './Card';

export interface KPICardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  delta?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
}

export const KPICard = React.forwardRef<HTMLDivElement, KPICardProps>(
  ({ label, value, delta, icon, className = '', ...props }, ref) => {
    return (
      <Card ref={ref} className={`p-6 ${className}`} {...props}>
        <div className="flex items-start justify-between">
          <div>
            {/* Label — Inter, 12px uppercase */}
            <p className="text-xs font-inter font-medium text-gray-500 uppercase tracking-wide mb-2">
              {label}
            </p>

            {/* Value — ROBOTO MONO (CRITICAL), 36px, navy */}
            <div className="font-mono text-4xl font-semibold text-navy">
              {value}
            </div>

            {/* Delta optional */}
            {delta && (
              <div className={`mt-3 flex items-center gap-1 text-sm font-mono ${delta.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {delta.isPositive ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414-1.414L13.586 7H12z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 13a1 1 0 110 2H7a1 1 0 01-1-1V9a1 1 0 112 0v3.586l4.293-4.293a1 1 0 011.414 1.414L8.414 13H12z" clipRule="evenodd" />
                  </svg>
                )}
                {delta.isPositive ? '+' : ''}{delta.value}%
              </div>
            )}
          </div>

          {/* Icon optional */}
          {icon && (
            <div className="text-gray-300">
              {icon}
            </div>
          )}
        </div>
      </Card>
    );
  }
);

KPICard.displayName = 'KPICard';
