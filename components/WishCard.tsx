'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Order } from '@/types';
import { cn } from '@/lib/utils';
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
    <Card className="overflow-hidden bg-white/95 backdrop-blur-xl border-border/60 hover:border-primary/20 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 group h-full flex flex-col">
      <Link href={`/orders/${order.id}`}>
        {/* badges container */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
          {order.payment_type === 'PRE_ESCROW' && (
            <div className={cn(
              "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-xl border bg-white/90 text-green-600 border-green-200 shadow-sm"
            )}>
              {t('order.tag_pre_escrow')}
            </div>
          )}
          {order.parent_order_id && (
            <div className={cn(
              "px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider backdrop-blur-xl border bg-primary text-primary-foreground shadow-sm flex items-center gap-1"
            )}>
              ⭐ 我的跟單
            </div>
          )}
        </div>

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

              <div className="flex items-center gap-1.5 mb-2.5 text-gray-600">
                <Link href={`/profile/${order.buyer_id}`} className="flex items-center gap-1.5 hover:text-primary transition-colors group/user">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 group-hover/user:border-primary/30 group-hover/user:bg-primary/5 transition-colors">
                    <span className="text-[10px] font-bold">👤</span>
                  </div>
                  <span className="text-xs font-semibold truncate max-w-[80px]">{displayName}</span>
                </Link>
                {successRate !== null && (
                  <span className="text-[10px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1 border border-yellow-100">
                    ⭐ {successRate}%
                  </span>
                )}
                {order.buyer?.is_verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10" />
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-gray-50 text-gray-700 border border-gray-100 flex items-center gap-1 shadow-sm">
                  {countryConfig.flag} {t(`countries.${order.country}`)}
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-100 shadow-sm">
                  +NT$ {order.reward_fee.toLocaleString()} {t('order.reward_fee')}
                </span>
                {order.shipping_fee > 0 && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1 shadow-sm">
                    🚚 {t('order.shipping_fee')} NT$ {order.shipping_fee}
                  </span>
                )}
                {order.expected_shipping_date && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1 shadow-sm">
                    📅 {t('create.return_date_short')} {order.expected_shipping_date}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="flex items-center justify-between mt-3 py-3 border-t border-gray-100">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">{t('order.target_price')}</span>
              <span className="text-sm font-bold text-gray-900">{currencySymbol}{order.target_price.toLocaleString()}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">{t('order.total_budget')}</span>
              <span className="text-base font-black text-primary">NT${(order.total_amount_twd || Math.round(order.target_price * (order.exchange_rate || 1) + order.reward_fee + (order.shipping_fee || 0))).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card >
  );
};
