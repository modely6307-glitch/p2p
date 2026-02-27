'use client';

import React, { useEffect, useState } from 'react';
import { fetchOrders } from '@/utils/api';
import { Order } from '@/types';
import { WishCard } from '@/components/WishCard';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { useLanguage } from '@/context/LanguageContext';

import { getCountryFlag } from '@/utils/countries';

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const { t } = useLanguage();

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

  // Get unique countries from active orders
  const availableCountries = Array.from(new Set(orders.map(o => o.country)));

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.item_name.toLowerCase().includes(search.toLowerCase());
    const matchesCountry = selectedCountry ? order.country === selectedCountry : true;
    return matchesSearch && matchesCountry;
  });

  return (
    <div className="p-4 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-1">{t('home.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('home.subtitle')}</p>
      </header>

      <div className="space-y-4">
        <div className="relative">
          <Input
            placeholder={t('home.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-4 h-11 rounded-xl bg-secondary/20 border-none"
          />
        </div>

        {/* Dynamic Country Filter */}
        {!loading && availableCountries.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedCountry(null)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-sm border ${!selectedCountry ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border/50 text-muted-foreground hover:border-primary/30'}`}
            >
              {t('admin.filter_all')}
            </button>
            {availableCountries.map(country => {
              const info = getCountryFlag(country);
              return (
                <button
                  key={country}
                  onClick={() => setSelectedCountry(country === selectedCountry ? null : country)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-sm border ${selectedCountry === country ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border/50 text-muted-foreground hover:border-primary/30'}`}
                >
                  <span className="text-sm">{info.flag}</span>
                  {t(`countries.${country}`)}
                </button>
              );
            })}
          </div>
        )}
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
        <div className="text-center py-20 text-muted-foreground animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <p className="font-medium">{t('home.no_wishes')}</p>
          {selectedCountry && (
            <Button variant="ghost" onClick={() => setSelectedCountry(null)} className="mt-2 text-primary font-bold">
              {t('admin.filter_all')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
