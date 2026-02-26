'use client';

import React, { useEffect, useState } from 'react';
import { fetchOrders } from '@/utils/api';
import { Order } from '@/types';
import { WishCard } from '@/components/WishCard';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await fetchOrders('OPEN');
        setOrders(data);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const filteredOrders = orders.filter(order =>
    order.item_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Marketplace</h1>
        <p className="text-muted-foreground text-sm">Find wishes to fulfill and earn rewards.</p>
      </header>

      <div className="relative">
        <Input
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-4"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <WishCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p>No active wishes found.</p>
        </div>
      )}
    </div>
  );
}
