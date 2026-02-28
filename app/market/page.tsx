'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { fetchOrders } from '@/utils/api';
import { Order } from '@/types';
import { WishCard } from '@/components/WishCard';
import { Loader2, Calendar, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { getCountryFlag } from '@/utils/countries';
import { useRouter, useSearchParams } from 'next/navigation';

function MarketContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dateFilter = searchParams.get('date');

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const { t } = useLanguage();

    useEffect(() => {
        const loadOrders = async () => {
            try {
                const data = await fetchOrders('OPEN');
                // Sort by expected_shipping_date (closest first)
                const sorted = data.sort((a, b) => {
                    if (!a.expected_shipping_date) return 1;
                    if (!b.expected_shipping_date) return -1;
                    return new Date(a.expected_shipping_date).getTime() - new Date(b.expected_shipping_date).getTime();
                });
                setOrders(sorted);
            } catch (error) {
                console.error('Error fetching orders:', error);
            } finally {
                setLoading(false);
            }
        };

        loadOrders();
    }, []);

    const availableCountries = Array.from(new Set(orders.map(o => o.country)));

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.item_name.toLowerCase().includes(search.toLowerCase());
        const matchesCountry = selectedCountry ? order.country === selectedCountry : true;
        const matchesDate = dateFilter ? order.expected_shipping_date >= dateFilter : true;
        return matchesSearch && matchesCountry && matchesDate;
    });

    return (
        <div className="p-4 pt-8 lg:p-8 space-y-6 pb-20 lg:pb-8">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-1">{t('home.title')}</h1>
                    <p className="text-muted-foreground text-sm font-medium">{t('home.subtitle')}</p>
                </div>
                {dateFilter && (
                    <Button variant="outline" size="sm" onClick={() => router.push('/market')} className="rounded-full h-8 text-[10px] font-bold">
                        <Calendar className="w-3 h-3 mr-1" />
                        {dateFilter} <span className="ml-1 opacity-50">×</span>
                    </Button>
                )}
            </header>

            <div className="space-y-4">
                <div className="relative">
                    <Input
                        placeholder={t('home.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-4 h-12 rounded-2xl bg-secondary/30 border-none shadow-inner"
                    />
                </div>

                {!loading && availableCountries.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        <button
                            onClick={() => setSelectedCountry(null)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-black transition-all whitespace-nowrap shadow-sm border ${!selectedCountry ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-card border-border/50 text-muted-foreground hover:border-primary/30'}`}
                        >
                            {t('admin.filter_all')}
                        </button>
                        {availableCountries.map(country => {
                            const info = getCountryFlag(country);
                            return (
                                <button
                                    key={country}
                                    onClick={() => setSelectedCountry(country === selectedCountry ? null : country)}
                                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-xs font-black transition-all whitespace-nowrap shadow-sm border ${selectedCountry === country ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-card border-border/50 text-muted-foreground hover:border-primary/30'}`}
                                >
                                    <span className="text-base">{info.flag}</span>
                                    {t(`countries.${country}`)}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-24">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
                        <p className="text-xs font-bold text-muted-foreground animate-pulse uppercase tracking-widest">{t('common.loading')}</p>
                    </div>
                </div>
            ) : filteredOrders.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredOrders.map((order) => (
                        <WishCard key={order.id} order={order} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 text-muted-foreground animate-in fade-in zoom-in-95 fill-mode-both">
                    <div className="w-20 h-20 bg-secondary/20 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-12">
                        <span className="text-4xl">🔍</span>
                    </div>
                    <h3 className="text-lg font-black text-foreground mb-2">{t('home.no_wishes')}</h3>
                    <p className="text-sm font-medium mb-6">嘗試調整篩選條件或搜尋關鍵字</p>
                    {(selectedCountry || search || dateFilter) && (
                        <Button variant="outline" onClick={() => {
                            setSelectedCountry(null);
                            setSearch('');
                            router.push('/market');
                        }} className="font-black rounded-xl border-primary/20 text-primary">
                            清除所有篩選
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Market() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center py-24">
                <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
            </div>
        }>
            <MarketContent />
        </Suspense>
    );
}
