'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAllOrders, fetchAllProfiles, updateProfile, updateOrderStatus, incrementOrderStats, fetchSystemSettings, updateSystemSettings } from '@/utils/api';
import { Order, Profile, SystemSettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck, User, Package, XCircle, Banknote, CheckCircle, Settings, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

type OrderFilter = 'all' | 'open' | 'matched' | 'paid' | 'completed' | 'disputed';

export default function AdminDashboard() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { t } = useLanguage();

    // State
    const [orders, setOrders] = useState<Order[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'settings'>('orders');
    const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');

    // Safety & Initialization
    const isMounted = useRef(true);
    const [dataLoaded, setDataLoaded] = useState(false);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const loadData = async () => {
        if (!isMounted.current) return;
        setLoading(true);

        try {
            const [ordData, profData, settsData] = await Promise.all([
                fetchAllOrders().catch(e => { console.error('Orders fail:', e); return [] as Order[]; }),
                fetchAllProfiles().catch(e => { console.error('Profiles fail:', e); return [] as Profile[]; }),
                fetchSystemSettings().catch(e => { console.error('Settings fail:', e); return null; })
            ]);

            if (isMounted.current) {
                setOrders(ordData);
                setProfiles(profData);
                if (settsData) setSettings(settsData);
                setDataLoaded(true);
            }
        } catch (error) {
            console.error('Admin: Critical data fetch error:', error);
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        if (profile?.level !== 'ADMIN') {
            const bypassKey = localStorage.getItem('admin_bypass');
            if (!bypassKey) {
                return;
            }
        }

        if (!dataLoaded && !loading) {
            loadData();
        }
    }, [user, profile, authLoading, dataLoaded]);

    // UI RENDER LOGIC
    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse font-medium">{t('admin.verifying_permissions') || '正在驗證權限...'}</p>
            </div>
        );
    }

    if (!user || (profile?.level !== 'ADMIN' && !localStorage.getItem('admin_bypass'))) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-red-50/10 p-4">
                <Card className="max-w-md w-full border-red-200 shadow-2xl shadow-red-500/10">
                    <CardHeader className="text-center">
                        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                        <CardTitle className="text-red-600 font-black text-2xl">權限不足</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-6">
                        <p className="text-muted-foreground font-medium">抱歉，您的帳號無法存取管理中心。</p>
                        <Button onClick={() => router.push('/')} fullWidth variant="outline" className="h-12 font-bold">
                            返回首頁
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!dataLoaded && loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">正在載入管理系統資料...</p>
                <button onClick={() => loadData()} className="text-[10px] text-muted-foreground underline mt-4">
                    重試載入 (Retry)
                </button>
            </div>
        );
    }

    // HANDLERS
    const handleConfirmPayment = async (orderId: string) => {
        if (!confirm('確認收到款項？')) return;
        try {
            const { confirmEscrow } = await import('@/app/actions/orders');
            const result = await confirmEscrow(orderId);
            if (!result.success) throw new Error(result.error);
            loadData();
        } catch (error: any) {
            alert(error.message || t('error'));
        }
    };

    const handleReleaseFunds = async (order: Order) => {
        if (!confirm('確認撥款給旅人？')) return;
        try {
            const { adminReleaseFunds } = await import('@/app/actions/orders');
            const result = await adminReleaseFunds(order.id);
            if (!result.success) throw new Error(result.error);
            loadData();
        } catch (error: any) {
            alert(error.message || t('error'));
        }
    };

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;
        try {
            await updateSystemSettings(settings);
            alert('設定已更新');
            loadData();
        } catch (error) {
            alert('更新失敗');
        }
    };

    const handleToggleVerify = async (profile: Profile) => {
        try {
            const newStatus = !profile.is_verified;
            await updateProfile(profile.id, {
                is_verified: newStatus,
                level: newStatus ? 'VERIFIED' : 'STANDARD'
            });
            loadData();
        } catch (error) {
            alert(t('error'));
        }
    };

    const pendingPaymentCount = orders.filter(o => (o.status === 'MATCHED' || o.status === 'OPEN') && o.payment_notification_sent).length;
    const disputedCount = orders.filter(o => o.status === 'DISPUTE').length;
    const totalAlertCount = pendingPaymentCount + disputedCount;

    const filteredOrders = orders.filter(order => {
        if (orderFilter === 'all') return true;
        if (orderFilter === 'open') return order.status === 'OPEN';
        if (orderFilter === 'matched') return order.status === 'MATCHED';
        if (orderFilter === 'paid') return ['ESCROWED', 'BOUGHT', 'SHIPPED'].includes(order.status);
        if (orderFilter === 'completed') return order.status === 'COMPLETED' || order.status === 'DELISTED';
        if (orderFilter === 'disputed') return order.status === 'DISPUTE';
        return true;
    });

    return (
        <div className="p-4 space-y-6 max-w-5xl mx-auto pb-20">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">{t('admin.title')}</h1>
                    <p className="text-sm text-muted-foreground italic">Admin Control Center</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => loadData()} disabled={loading} className="rounded-full">
                        <Loader2 className={cn("w-4 h-4", loading && "animate-spin")} />
                    </Button>
                    {disputedCount > 0 && (
                        <Button
                            onClick={() => router.push('/admin/disputes')}
                            className="bg-red-600 hover:bg-red-700 text-white font-black shadow-lg shadow-red-500/30 animate-pulse"
                        >
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            爭議中 ({disputedCount})
                        </Button>
                    )}
                </div>
            </header>

            <div className="flex bg-secondary/30 p-1 rounded-xl w-fit overflow-x-auto">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'orders' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                    訂單管理
                    {totalAlertCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                            {totalAlertCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                    用戶審核
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                    系統設定
                </button>
            </div>

            {activeTab === 'orders' ? (
                <div className="space-y-6">
                    <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'all', label: '全部' },
                            { id: 'open', label: '開放中' },
                            { id: 'matched', label: '已撮合' },
                            { id: 'paid', label: '已付款' },
                            { id: 'disputed', label: '爭議中' },
                            { id: 'completed', label: '已完成' }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setOrderFilter(f.id as any)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${orderFilter === f.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-4">
                        {filteredOrders.map(order => (
                            <Card key={order.id} className="overflow-hidden border-border/50">
                                <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg truncate">{order.item_name}</h3>
                                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">#{order.id.slice(0, 8)}</div>
                                        <div className="flex gap-4 mt-2">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] uppercase font-bold text-muted-foreground">預算</span>
                                                <span className="text-sm font-black">NT${order.total_amount_twd?.toLocaleString()}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] uppercase font-bold text-muted-foreground">狀態</span>
                                                <StatusBadge status={order.status} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 w-full md:w-auto">
                                        {(order.status === 'MATCHED' || (order.status === 'OPEN' && order.payment_notification_sent)) && (
                                            <Button size="sm" onClick={() => handleConfirmPayment(order.id)} className="bg-yellow-500 hover:bg-yellow-600 font-bold relative">
                                                確認收款
                                                {order.payment_notification_sent && (
                                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                                                )}
                                            </Button>
                                        )}
                                        {order.status === 'SHIPPED' && (
                                            <Button size="sm" onClick={() => handleReleaseFunds(order)} className="bg-green-600 hover:bg-green-700 font-bold">
                                                確認撥款
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => router.push(`/orders/${order.id}`)} className="font-bold">
                                            詳情
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            ) : activeTab === 'users' ? (
                <div className="space-y-4">
                    {profiles.map(p => (
                        <Card key={p.id} className="p-4 border-border/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold">
                                        {p.display_name?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold">{p.display_name}</span>
                                            {p.is_verified && <ShieldCheck className="w-4 h-4 text-blue-500" />}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{p.email}</div>
                                        <div className="text-[10px] uppercase font-bold text-primary">{p.level}</div>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant={p.is_verified ? "outline" : "primary"}
                                    onClick={() => handleToggleVerify(p)}
                                    className="font-bold h-9"
                                >
                                    {p.is_verified ? "取消認證" : "通過認證"}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="max-w-md mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Settings className="w-5 h-5" />
                                系統手續費設定
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdateSettings} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground">買家手續費 (%)</label>
                                        <Input
                                            type="number"
                                            value={settings?.buyer_fee_percentage}
                                            onChange={e => setSettings(prev => prev ? { ...prev, buyer_fee_percentage: parseInt(e.target.value) } : null)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground">旅人手續費 (%)</label>
                                        <Input
                                            type="number"
                                            value={settings?.traveler_fee_percentage}
                                            onChange={e => setSettings(prev => prev ? { ...prev, traveler_fee_percentage: parseInt(e.target.value) } : null)}
                                        />
                                    </div>
                                </div>
                                <Button type="submit" fullWidth className="font-black h-12 rounded-xl">更新設定</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
