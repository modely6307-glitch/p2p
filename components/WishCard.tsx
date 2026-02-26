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
    <Card className="hover:shadow-lg transition-shadow duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <span className="text-lg font-semibold truncate pr-2">{order.item_name}</span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
            ${order.reward_fee} fee
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center text-muted-foreground text-sm mb-2">
          <DollarSign className="w-4 h-4 mr-1" />
          <span>Target: ${order.target_price}</span>
        </div>
        <div className="flex items-center text-muted-foreground text-sm">
          <Gift className="w-4 h-4 mr-1" />
          <span>Total: ${order.target_price + order.reward_fee}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/orders/${order.id}`} className="w-full">
          <Button className="w-full justify-between group" variant="secondary">
            View Details
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
