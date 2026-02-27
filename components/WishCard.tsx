import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Order } from '@/types';
import { DollarSign, Gift, ArrowRight } from 'lucide-react';

interface WishCardProps {
  order: Order;
}

export const WishCard = ({ order }: WishCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-border/40 bg-card/40 backdrop-blur-md group">
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
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                  +${order.reward_fee} Reward
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  OPEN
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between mt-2 py-2 border-t border-border/30">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Budget</span>
              <span className="text-sm font-bold">${order.target_price}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Total</span>
              <span className="text-sm font-black text-primary">${order.target_price + order.reward_fee}</span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};
