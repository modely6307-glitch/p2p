'use client';

import React, { useEffect, useState } from 'react';
import { fetchMyWishes, fetchMyTasks } from '@/utils/api';
import { Order } from '@/types';
import { WishCard } from '@/components/WishCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

import { useLanguage } from '@/context/LanguageContext';
import { useNotifications } from '@/context/NotificationContext';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'wishes' | 'tasks'>('wishes');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed'>('active');
  const [orders, setOrders] = useState<Order[]>([]);
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { activeTaskCount } = useNotifications();

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

    if (!authLoading && user) {
      loadOrders();
    }
  }, [activeTab, user, authLoading]);

  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'completed') return order.status === 'COMPLETED' || order.status === 'DELISTED';
    return order.status !== 'COMPLETED' && order.status !== 'DELISTED';
  });

  return (
    <div className="p-4 pt-8 lg:p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{t('dashboard.title')}</h1>
      </header>

      <div className="flex space-x-1 border-b border-border">
        <button
          onClick={() => setActiveTab('wishes')}
          className={`flex-1 pb-2 text-sm font-medium transition-colors relative ${activeTab === 'wishes'
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          {t('dashboard.tab_wishes')}
          {activeTab === 'wishes' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 pb-2 text-sm font-medium transition-colors relative flex items-center justify-center gap-2 ${activeTab === 'tasks'
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          {t('dashboard.tab_tasks')}
          {activeTaskCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-red-500/30">
              {activeTaskCount}
            </span>
          )}
          {activeTab === 'tasks' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === 'active' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
        >
          {t('dashboard.filter_processing')}
        </button>
        <button
          onClick={() => setStatusFilter('completed')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === 'completed' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
        >
          {t('dashboard.filter_completed')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <WishCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border/50 rounded-3xl">
          <p>{activeTab === 'wishes' ? t('dashboard.empty_wishes') : t('dashboard.empty_tasks')}</p>
          {activeTab === 'wishes' && statusFilter === 'active' && (
            <Button variant="primary" className="mt-4" onClick={() => window.location.href = '/create'}>
              {t('nav.create')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
