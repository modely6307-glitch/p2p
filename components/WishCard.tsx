'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Order } from '@/types';
import { Gift, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface WishCardProps {
  order: Order;
}

const getCurrencySymbol = (currency: string) => {
  const symbols: Record<string, string> = {
    'USD': '$',
    'TWD': 'NT$',
    'JPY': '¥',
    'KRW': '₩',
    'EUR': '€',
  };
  return symbols[currency] || '$';
};

import { getCountryFlag } from '@/utils/countries';

const maskEmail = (email: string | undefined) => {
  if (!email) return 'User';
  const prefix = email.split('@')[0];
  const displayPrefix = prefix.slice(0, 3);
  return (displayPrefix + '***').slice(0, 6).padEnd(6, '*');
};

export const WishCard = ({ order }: WishCardProps) => {
  const { t } = useLanguage();
  const currencySymbol = getCurrencySymbol(order.currency);
  const countryConfig = getCountryFlag(order.country);

  const displayName = order.buyer?.display_name || maskEmail(order.buyer?.email || undefined);
  const successRate = order.buyer?.total_rating_count && order.buyer.total_rating_count > 0
    ? Math.round((order.buyer.positive_rating_count / order.buyer.total_rating_count) * 100)
    : null;

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-border/40 bg-card/40 backdrop-blur-md group h-full flex flex-col">
      <Link href={`/orders/${order.id}`}>
        <CardHeader className="p-4 pb-2">
          <div className="flex gap-4">
            {order.photo_url ? (
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-border/50">
                <img src={order.photo_url} alt={order.item_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg bg-secondary/30 flex items-center justify-center flex-shrink-0 border border-border/50">
                <Gift className="w-8 h-8 text-muted-foreground/50" />
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-base font-bold truncate leading-tight">{order.item_name}</h3>
              </div>

              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground italic font-black">👤</span>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[80px]">{displayName}</span>
                {successRate !== null && (
                  <span className="text-[9px] bg-yellow-500/10 text-yellow-600 px-1 rounded flex items-center gap-0.5">
                    ⭐ {successRate}%
                  </span>
                )}
                {order.buyer?.is_verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10" />
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground flex items-center gap-1">
                  {countryConfig.flag} {t(`countries.${order.country}`)}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                  +{currencySymbol}{order.reward_fee} {t('order.reward_fee')}
                </span>
                {order.expected_shipping_date && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 flex items-center gap-1">
                    📅 {order.expected_shipping_date}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between mt-2 py-2 border-t border-border/30">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{t('order.target_price')}</span>
              <span className="text-sm font-bold">{currencySymbol}{order.target_price}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{t('order.total_budget')}</span>
              <span className="text-sm font-black text-primary">{currencySymbol}{order.target_price + order.reward_fee}</span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card >
  );
};
