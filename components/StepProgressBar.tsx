import React from 'react';
import { OrderStatus } from '@/types';
import { Check, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface StepProgressBarProps {
  currentStatus: OrderStatus;
  paymentType?: 'PRE_ESCROW' | 'MATCH_ESCROW';
  travelerId?: string | null;
}

// Virtual step IDs (not all map 1:1 to DB status)
type StepId = 'PE_CREATED' | 'PE_ESCROWED' | 'PE_MATCHED' | 'OPEN' | 'MATCHED' | 'ESCROWED' | 'BOUGHT' | 'SHIPPED' | 'COMPLETED';

interface Step {
  id: StepId;
  labelKey: string;
  descKey: string;
}

// PRE_ESCROW: buyer pays first → escrowed → traveler accepts → buy → ship → done
const PRE_ESCROW_STEPS: Step[] = [
  { id: 'PE_CREATED',  labelKey: 'status.PE_CREATED',  descKey: 'status.PE_CREATED_desc' },
  { id: 'PE_ESCROWED', labelKey: 'status.PE_ESCROWED', descKey: 'status.PE_ESCROWED_desc' },
  { id: 'PE_MATCHED',  labelKey: 'status.PE_MATCHED',  descKey: 'status.PE_MATCHED_desc' },
  { id: 'BOUGHT',      labelKey: 'status.BOUGHT',      descKey: 'status.BOUGHT_desc' },
  { id: 'SHIPPED',     labelKey: 'status.SHIPPED',     descKey: 'status.SHIPPED_desc' },
  { id: 'COMPLETED',   labelKey: 'status.COMPLETED',   descKey: 'status.COMPLETED_desc' },
];

// MATCH_ESCROW: traveler accepts first → buyer pays → escrowed → buy → ship → done
const MATCH_ESCROW_STEPS: Step[] = [
  { id: 'OPEN',      labelKey: 'status.OPEN',      descKey: 'status.OPEN_desc' },
  { id: 'MATCHED',   labelKey: 'status.MATCHED',   descKey: 'status.MATCHED_desc' },
  { id: 'ESCROWED',  labelKey: 'status.ESCROWED',  descKey: 'status.ESCROWED_desc' },
  { id: 'BOUGHT',    labelKey: 'status.BOUGHT',    descKey: 'status.BOUGHT_desc' },
  { id: 'SHIPPED',   labelKey: 'status.SHIPPED',   descKey: 'status.SHIPPED_desc' },
  { id: 'COMPLETED', labelKey: 'status.COMPLETED', descKey: 'status.COMPLETED_desc' },
];

// Map DB status → virtual step index for PRE_ESCROW
// ESCROWED without traveler = step 1 (PE_ESCROWED is current)
// ESCROWED with traveler    = step 2 (PE_MATCHED is current)
function getPreEscrowStepIndex(status: OrderStatus, hasTraveler: boolean): number {
  switch (status) {
    case 'OPEN':      return 0;
    case 'ESCROWED':  return hasTraveler ? 2 : 1;
    case 'MATCHED':   return 2; // edge case: traveler accepted before admin confirmed
    case 'BOUGHT':    return 3;
    case 'SHIPPED':   return 4;
    case 'COMPLETED': return 5;
    default:          return 0;
  }
}

export const StepProgressBar = ({ currentStatus, paymentType, travelerId }: StepProgressBarProps) => {
  const { t } = useLanguage();

  if (currentStatus === 'DELISTED' || currentStatus === 'DISPUTE' || currentStatus === 'PRICE_CONFIRM') {
    return (
      <div className="w-full py-4">
        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gray-500/10 border border-gray-500/20">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-sm font-bold text-gray-400">{t(`status.${currentStatus}`)}</span>
        </div>
      </div>
    );
  }

  const isPreEscrow = paymentType === 'PRE_ESCROW';
  const steps = isPreEscrow ? PRE_ESCROW_STEPS : MATCH_ESCROW_STEPS;
  const currentStepIndex = isPreEscrow
    ? getPreEscrowStepIndex(currentStatus, !!travelerId)
    : steps.findIndex(s => s.id === currentStatus);

  return (
    <div className="w-full py-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{t('order.steps_title') || 'Order Timeline'}</h4>
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors">
              <HelpCircle className="w-3.5 h-3.5" />
              {t('status.help_title')}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4 rounded-2xl shadow-xl border-border bg-white/95 backdrop-blur-xl">
            <div className="space-y-4">
              <h5 className="font-black text-sm text-primary flex items-center gap-2 border-b pb-2">
                <HelpCircle className="w-4 h-4" />
                {t('status.help_title')}
              </h5>
              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <div key={step.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-black text-gray-900">{t(step.labelKey)}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{t(step.descKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center justify-between relative px-1">
        <div className="absolute left-0 top-4 -translate-y-1/2 w-full h-0.5 bg-muted -z-10" />

        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-background p-1">
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
                {t(step.labelKey)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 sm:hidden px-1">
        <span className="text-xs font-medium text-primary">
          {t(steps[currentStepIndex]?.labelKey ?? `status.${currentStatus}`)}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {currentStepIndex + 1} / {steps.length}
        </span>
      </div>
    </div>
  );
};
