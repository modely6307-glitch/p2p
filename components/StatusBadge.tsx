'use client';

import React from 'react';
import { OrderStatus } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface StatusBadgeProps {
  status: OrderStatus;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { t } = useLanguage();

  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    MATCHED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    PRICE_CONFIRM: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    ESCROWED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    BOUGHT: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    SHIPPED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
    DISPUTE: 'bg-red-500/10 text-red-400 border-red-500/20',
    DELISTED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusColors[status]}`}
    >
      {t(`status.${status}`)}
    </span>
  );
};
