'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { fetchMarketOrders } from '@/app/actions/queries';
import { Order } from '@/types';
import { WishCard } from '@/components/WishCard';
import { Search, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { getCountryFlag } from '@/utils/countries';
import { useRouter, useSearchParams } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComp } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

function MarketContent() {
    const { user } = useAuth(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const dateFilter = searchParams.get('date'); // legacy/single date support

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const { t } = useLanguage();

    const handleDateChange = (type: 'from' | 'to', date: Date | undefined) => {
        const params = new URLSearchParams(searchParams.toString());
        const formatted = date ? format(date, 'yyyy-MM-dd') : null;

        if (formatted) {
            params.set(type, formatted);
            if (type === 'from' && toDate && formatted > toDate) {
                params.delete('to');
            }
            if (type === 'to' && fromDate && formatted < fromDate) {
                params.set('from', formatted);
            }
        } else {
            params.delete(type);
        }

        params.delete('date'); // Cleanup legacy
        router.push(`/market?${params.toString()}`);
    };

    useEffect(() => {
        const loadOrders = async () => {
            try {
                const result = await fetchMarketOrders(['OPEN', 'ESCROWED']);
                if (!result.success || !result.data) throw new Error(result.error || 'Failed to fetch');
                const data = result.data;
                // Consolidation Logic:
                // For each group (rootId), decide which one to show to THIS user.
                const groupMap = new Map<string, Order[]>();
                data.forEach(o => {
                    const rootId = o.parent_order_id || o.id;
                    if (!groupMap.has(rootId)) groupMap.set(rootId, []);
                    groupMap.get(rootId)!.push(o);
                });

                const consolidated: Order[] = [];
                groupMap.forEach((members, rootId) => {
                    // 1. If user is a buyer in this group, show ONLY the user's order
                    const myOrder = members.find(m => m.buyer_id === user?.id);
                    if (myOrder) {
                        consolidated.push(myOrder);
                        return;
                    }

                    // 2. Otherwise, find the root order (the one where id === rootId)
                    // If root order isn't in this data (e.g. it was COMPLETED or DELISTED), 
                    // then show the oldest OPEN member as the representative
                    const rootOrder = members.find(m => m.id === rootId);
                    if (rootOrder) {
                        consolidated.push(rootOrder);
                    } else if (members.length > 0) {
                        consolidated.push(members[0]);
                    }
                });

                // Filter out ESCROWED orders that already have a traveler
                const openData = consolidated.filter(o => o.status === 'OPEN' || (o.status === 'ESCROWED' && !o.traveler_id));

                // Sort by expected_shipping_date (closest first)
                const sorted = openData.sort((a, b) => {
                    if (!a.expected_shipping_date) return 1;
                    if (!b.expected_shipping_date) return -1;
                    return new Date(a.expected_shipping_date).getTime() - new Date(b.expected_shipping_date).getTime();
                });
                setOrders(sorted);
            } catch (error) {
                console.error('Error loading market orders:', error);
            } finally {
                setLoading(false);
            }
        };

        loadOrders();
    }, [user]);

    const availableCountries = Array.from(new Set(orders.map(o => o.country)));

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.item_name.toLowerCase().includes(search.toLowerCase());
        const matchesCountry = selectedCountry ? order.country === selectedCountry : true;

        // Trip Window Filter:
        // 1. Must be after or on departure (Traveler is in the country)
        const matchesFrom = fromDate ? order.expected_shipping_date >= fromDate : true;
        // 2. Must be before or on return (Traveler is still available or just returned)
        const effectiveTo = toDate || dateFilter;
        const matchesTo = effectiveTo ? order.expected_shipping_date <= effectiveTo : true;

        return matchesSearch && matchesCountry && matchesFrom && matchesTo;
    });

    return (
        <div className="p-4 pt-8 lg:p-8 space-y-6 pb-20 lg:pb-8">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-1">{t('home.title')}</h1>
                    <p className="text-muted-foreground text-sm font-medium">{t('home.subtitle')}</p>
                </div>
                {(fromDate || toDate || dateFilter) && (
                    <Button variant="outline" size="sm" onClick={() => router.push('/market')} className="rounded-full h-8 text-[10px] font-bold gap-2">
                        <Calendar className="w-3 h-3" />
                        <div className="flex items-center gap-1">
                            {fromDate && <span>{fromDate}</span>}
                            {fromDate && (toDate || dateFilter) && <span className="opacity-30">→</span>}
                            {(toDate || dateFilter) && <span>{toDate || dateFilter}</span>}
                        </div>
                        <span className="ml-1 opacity-50 text-xs">×</span>
                    </Button>
                )}
            </header>

            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Input
                            placeholder={t('home.search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-4 h-12 rounded-2xl bg-secondary/30 border-none shadow-inner"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "h-12 flex-1 md:w-40 justify-start text-left font-bold rounded-2xl border-none bg-secondary/30 shadow-inner px-4 text-xs gap-2",
                                        !fromDate && "text-muted-foreground"
                                    )}
                                >
                                    <Calendar className="w-4 h-4" />
                                    {fromDate ? format(new Date(fromDate), "MMM d") : t('landing.departure_prompt')}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <CalendarComp
                                    mode="single"
                                    selected={fromDate ? new Date(fromDate) : undefined}
                                    onSelect={(date) => handleDateChange('from', date)}
                                    disabled={(date) => toDate ? date > new Date(toDate) : false}
                                    initialFocus
                                />
                                {fromDate && (
                                    <div className="p-2 border-t border-border/50">
                                        <Button variant="ghost" size="sm" fullWidth onClick={() => handleDateChange('from', undefined)} className="text-[10px] font-bold h-7 uppercase">清除</Button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "h-12 flex-1 md:w-40 justify-start text-left font-bold rounded-2xl border-none bg-secondary/30 shadow-inner px-4 text-xs gap-2",
                                        !toDate && !dateFilter && "text-muted-foreground"
                                    )}
                                >
                                    <Calendar className="w-4 h-4" />
                                    {toDate || dateFilter ? format(new Date(toDate || dateFilter!), "MMM d") : t('landing.return_prompt')}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <CalendarComp
                                    mode="single"
                                    selected={(toDate || dateFilter) ? new Date(toDate || dateFilter!) : undefined}
                                    onSelect={(date) => handleDateChange('to', date)}
                                    disabled={(date) => fromDate ? date < new Date(fromDate) : false}
                                    initialFocus
                                />
                                {(toDate || dateFilter) && (
                                    <div className="p-2 border-t border-border/50">
                                        <Button variant="ghost" size="sm" fullWidth onClick={() => handleDateChange('to', undefined)} className="text-[10px] font-bold h-7 uppercase">清除</Button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>
                    </div>
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-2xl overflow-hidden border border-border/50 bg-card">
                            <div className="p-4 pb-2">
                                <div className="flex gap-4">
                                    <div className="w-20 h-20 rounded-lg skeleton shrink-0" />
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-4 skeleton rounded-lg w-3/4" />
                                        <div className="h-3 skeleton rounded-lg w-1/2" />
                                        <div className="flex gap-2 mt-3">
                                            <div className="h-6 skeleton rounded-md w-16" />
                                            <div className="h-6 skeleton rounded-md w-20" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="px-4 pb-4 pt-2">
                                <div className="flex justify-between pt-3 border-t border-border/50">
                                    <div className="space-y-1">
                                        <div className="h-2.5 skeleton rounded w-14" />
                                        <div className="h-4 skeleton rounded w-20" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="h-2.5 skeleton rounded w-14" />
                                        <div className="h-5 skeleton rounded w-24" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredOrders.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredOrders.map((order) => (
                        <WishCard key={order.id} order={order} currentUserId={user?.id} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 text-muted-foreground animate-in fade-in zoom-in-95 fill-mode-both">
                    <div className="w-20 h-20 bg-secondary/20 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-12">
                        <Search className="w-9 h-9 text-muted-foreground/40" />
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
            <div className="p-4 pt-8 lg:p-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden border border-border/50 bg-card h-40 skeleton" />
                ))}
            </div>
        }>
            <MarketContent />
        </Suspense>
    );
}
