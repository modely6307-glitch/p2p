'use client';

import React, { useEffect, useState } from 'react';
import { fetchMyWishes, fetchMyTasks } from '@/utils/api';
import { Order } from '@/types';
import { WishCard } from '@/components/WishCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'wishes' | 'tasks'>('wishes');
  const [orders, setOrders] = useState<Order[]>([]);
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      if (!user) return;
      setLoading(true);
      try {
        let data;
        if (activeTab === 'wishes') {
          data = await fetchMyWishes(user.id);
        } else {
          data = await fetchMyTasks(user.id);
        }
        setOrders(data);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadOrders();
    }
  }, [activeTab, user, authLoading]);

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </header>

      <div className="flex space-x-1 border-b border-border">
        <button
          onClick={() => setActiveTab('wishes')}
          className={`flex-1 pb-2 text-sm font-medium transition-colors relative ${activeTab === 'wishes'
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          My Wishes
          {activeTab === 'wishes' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 pb-2 text-sm font-medium transition-colors relative ${activeTab === 'tasks'
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          My Tasks (Traveler)
          {activeTab === 'tasks' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : orders.length > 0 ? (
        <div className="grid gap-4">
          {orders.map((order) => (
            <WishCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p>No {activeTab === 'wishes' ? 'wishes' : 'tasks'} found.</p>
          {activeTab === 'wishes' && (
            <Button variant="primary" className="mt-4" onClick={() => window.location.href = '/create'}>
              Create Wish
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
