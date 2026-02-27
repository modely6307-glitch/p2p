import React from 'react';
import { OrderStatus } from '@/types';
import { Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface StepProgressBarProps {
  currentStatus: OrderStatus;
}

const steps: OrderStatus[] = [
  'OPEN',
  'MATCHED',
  'ESCROWED',
  'BOUGHT',
  'SHIPPED',
  'COMPLETED',
];

export const StepProgressBar = ({ currentStatus }: StepProgressBarProps) => {
  const currentStepIndex = steps.indexOf(currentStatus);
  const { t } = useLanguage();

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-muted -z-10" />

        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div key={step} className="flex flex-col items-center gap-2 bg-background p-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${isCompleted || isCurrent
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-muted border-muted text-muted-foreground'
                  }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground hidden sm:block">
                {t(`status.${step}`)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 sm:hidden px-1">
        <span className="text-xs font-medium text-primary">
          {t(`status.${currentStatus}`)}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {currentStepIndex + 1} / {steps.length}
        </span>
      </div>
    </div>
  );
};
