'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Order } from '@/types';
import { cn } from '@/lib/utils';
import { Gift, ShieldCheck, Star, User, Truck, CalendarDays, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import { getCountryFlag } from '@/utils/countries';

interface WishCardProps {
  order: Order;
  currentUserId?: string;
}

const getCurrencySymbol = (currency: string) => {
  const symbols: Record<string, string> = {
    'USD': '$', 'TWD': 'NT$', 'JPY': '¥', 'KRW': '₩', 'EUR': '€',
  };
  return symbols[currency] || '$';
};

const maskEmail = (email: string | undefined) => {
  if (!email) return 'User';
  const prefix = email.split('@')[0];
  return (prefix.slice(0, 3) + '***').slice(0, 6).padEnd(6, '*');
};

export const WishCard = ({ order, currentUserId }: WishCardProps) => {
  const { t } = useLanguage();
  const router = useRouter();
  const currencySymbol = getCurrencySymbol(order.currency);
  const countryConfig = getCountryFlag(order.country);

  const displayName = order.buyer?.display_name || maskEmail(order.buyer?.email || undefined);
  const successRate = order.buyer?.total_rating_count && order.buyer.total_rating_count > 0
    ? Math.round((order.buyer.positive_rating_count / order.buyer.total_rating_count) * 100)
    : null;

  const totalBudget = order.total_amount_twd ||
    Math.round(order.target_price * (order.exchange_rate || 1) + order.reward_fee + (order.shipping_fee || 0));

  const isOwnOrder = currentUserId && currentUserId === order.buyer_id;
  const isAcceptable = (order.status === 'OPEN' || (order.status === 'ESCROWED' && !order.traveler_id)) && !isOwnOrder;

  return (
    <Card className="overflow-hidden bg-card border-border/70 hover:border-primary/30 shadow-sm hover:shadow-md transition-all duration-200 group">
      <Link href={`/orders/${order.id}`} className="block">
        <div className="p-4">
          {/* Top row: photo + core info */}
          <div className="flex gap-3">
            {/* Photo */}
            <div className="shrink-0">
              {order.photo_url ? (
                <div className="w-[72px] h-[72px] rounded-xl overflow-hidden border border-border/50">
                  <img
                    src={order.photo_url}
                    alt={order.item_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="w-[72px] h-[72px] rounded-xl bg-secondary flex items-center justify-center border border-border/50">
                  <Gift className="w-7 h-7 text-muted-foreground/40" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {order.payment_type === 'PRE_ESCROW' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent text-accent-foreground border border-border/50">
                    {t('order.tag_pre_escrow')}
                  </span>
                )}
                {order.parent_order_id && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary text-primary-foreground">
                    <Star className="w-2.5 h-2.5 fill-current" /> 我的跟單
                  </span>
                )}
              </div>

              {/* Product name */}
              <h3 className="text-[15px] font-bold leading-snug truncate text-foreground mb-1.5">
                {order.item_name}
              </h3>

              {/* Buyer row */}
              <button
                className="flex items-center gap-1.5 group/buyer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/profile/${order.buyer_id}`);
                }}
              >
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center border border-border shrink-0">
                  <User className="w-3 h-3 text-muted-foreground" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground group-hover/buyer:text-foreground transition-colors truncate max-w-[72px]">
                  {displayName}
                </span>
                {successRate !== null && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 shrink-0">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    {successRate}%
                  </span>
                )}
                {order.buyer?.is_verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5">
            {/* Country row */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-base leading-none">{countryConfig.flag}</span>
              <span className="font-medium">{t(`countries.${order.country}`)}</span>
            </div>

            {/* Return date row */}
            {order.expected_shipping_date && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">{t('create.return_date_short')} {order.expected_shipping_date}</span>
              </div>
            )}

            {/* Shipping fee row */}
            {order.shipping_fee > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">{t('order.shipping_fee')} NT$ {order.shipping_fee}</span>
              </div>
            )}
          </div>

          {/* Reward highlight + price info */}
          <div className="mt-3 pt-3 border-t border-border/60">
            <div className="flex items-end justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t('order.reward_fee')}
                </p>
                <p className="text-base font-black text-primary leading-none">
                  +NT$ {order.reward_fee.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t('order.target_price')}：{currencySymbol}{order.target_price.toLocaleString()}
                  {order.exchange_rate && order.currency !== 'TWD' && (
                    <span className="ml-1 opacity-70">
                      (~NT$ {Math.round(order.target_price * order.exchange_rate).toLocaleString()})
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t('order.total_budget')}：NT$ {totalBudget.toLocaleString()}
                </p>
              </div>

              {isOwnOrder ? (
                <span className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-muted-foreground bg-muted border border-border/60">
                  我的願望
                </span>
              ) : isAcceptable ? (
                <div className={cn(
                  "shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200",
                  "bg-primary text-primary-foreground shadow-sm",
                  "group-hover:shadow-md group-hover:brightness-105 active:scale-95"
                )}>
                  接單
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
};
