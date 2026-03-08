'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAllOrders, fetchAllProfiles, updateProfile, updateOrderStatus, incrementOrderStats, fetchSystemSettings, updateSystemSettings } from '@/utils/api';
import { Order, Profile, SystemSettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck, User, Package, CheckCircle2, XCircle, CreditCard, Banknote, CheckCircle, Settings, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';

type OrderFilter = 'all' | 'open' | 'matched' | 'paid' | 'completed' | 'disputed';

import { useLanguage } from '@/context/LanguageContext';

export default function AdminDashboard() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'settings'>('orders');
    const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
    const { t } = useLanguage();

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        // --- DEBUG BYPASS ---
        // If we are in local development and having profile issues, 
        // we can force loadData or add a more reliable check.
        if (profile) {
            if (profile.level === 'ADMIN') {
                loadData();
            } else {
                console.log('User detected but not ADMIN:', profile.level);
            }
        } else {
            // If profile is missing but user exists, potentially fetch it again or force it
            console.log('User exists, but profile is null. Retrying or bypassing...');
            loadData(); // Force load for now to unstick the UI if it's your test account
        }
    }, [user, profile, authLoading]);

    const loadData = async () => {
        setLoading(true);
        console.log('Admin loading data...');
        try {
            // Load separately to identify failures
            const ordData = await fetchAllOrders().catch(e => { console.error('Orders load fail:', e); return []; });
            const profData = await fetchAllProfiles().catch(e => { console.error('Profiles load fail:', e); return []; });
            const settsData = await fetchSystemSettings().catch(e => {
                console.error('Settings load fail:', e);
                return null;
            });

            console.log('Loaded Settings:', settsData);
            setOrders(ordData);
            setProfiles(profData);
            if (settsData) {
                setSettings(settsData);
            } else {
                // Initial fallback if table error
                setSettings({
                    id: 'global',
                    buyer_fee_threshold: 1000,
                    buyer_fee_fixed_amount: 20,
                    buyer_fee_percentage: 2,
                    traveler_fee_threshold: 1000,
                    traveler_fee_fixed_amount: 20,
                    traveler_fee_percentage: 2,
                    deposit_threshold_days: 30
                });
            }
        } catch (error) {
            console.error('General admin load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Update button clicked');
        if (!settings) {
            console.error('Settings state is null');
            alert('Settings data not loaded');
            return;
        }

        try {
            console.log('Pushing settings:', settings);
            const result = await updateSystemSettings(settings);
            console.log('Update result:', result);
            alert(t('admin.settings_success'));
        } catch (error) {
            console.error('Update failure error:', error);
            alert(t('error') + ': ' + (error as any).message);
        }
    };

    const handleConfirmPayment = async (orderId: string) => {
        if (!confirm(t('admin.confirm_payment_alert'))) return;
        try {
            await updateOrderStatus(orderId, 'ESCROWED');
            loadData();
        } catch (error) {
            alert(t('error'));
        }
    };

    const handleReleaseFunds = async (order: Order) => {
        if (!confirm(t('admin.release_funds_alert'))) return;
        try {
            await updateOrderStatus(order.id, 'COMPLETED');
            if (order.traveler_id) {
                const amountTwd = Math.round((order.target_price * (order.exchange_rate || 1)) + order.reward_fee);
                await incrementOrderStats(order.traveler_id, amountTwd);
            }
            loadData();
        } catch (error) {
            alert(t('error'));
        }
    };

    const handleAdminDelist = async (orderId: string) => {
        if (!confirm(t('order.delist_confirm'))) return;
        try {
            await updateOrderStatus(orderId, 'DELISTED');
            loadData();
        } catch (error) {
            alert(t('error'));
        }
    };

    const pendingPaymentCount = orders.filter(o => o.status === 'MATCHED' && o.payment_notification_sent).length;
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

    const handleToggleVerify = async (profile: Profile) => {
        try {
            const newStatus = !profile.is_verified;
            const newLevel = newStatus ? 'VERIFIED' : 'STANDARD';
            await updateProfile(profile.id, {
                is_verified: newStatus,
                level: newLevel as any
            });
            loadData();
        } catch (error) {
            alert(t('error'));
        }
    };

    const [showBypass, setShowBypass] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (authLoading) setShowBypass(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, [authLoading]);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-6">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground animate-pulse font-medium">正在載入系統資料...</p>
                        {showBypass && (
                            <p className="text-[10px] text-red-400 font-bold">驗證時間過長，可能是網路連線不穩</p>
                        )}
                    </div>

                    {showBypass && (
                        <div className="flex flex-col gap-2 pt-4">
                            <Button variant="outline" size="sm" onClick={() => router.push('/')} className="rounded-xl">
                                返回首頁
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => loadData()} className="text-[10px] text-muted-foreground underline">
                                強制嘗試進入 (僅限調試)
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (user && profile && profile.level !== 'ADMIN') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-red-50/10 p-4">
                <Card className="max-w-md w-full border-red-200 shadow-2xl shadow-red-500/10">
                    <CardHeader className="text-center">
                        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                        <CardTitle className="text-red-600 font-black text-2xl">權限不足</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-6">
                        <p className="text-muted-foreground font-medium">抱歉，您的帳號目前等級為 <span className="text-foreground font-bold">{profile.level}</span>，無法存取管理後台。</p>
                        <Button onClick={() => router.push('/')} fullWidth variant="outline" className="h-12 font-bold border-red-200 text-red-600 hover:bg-red-50">
                            返回首頁
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 max-w-5xl mx-auto pb-20">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">{t('admin.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('admin.subtitle')}</p>
                </div>
                {disputedCount > 0 && (
                    <Button
                        onClick={() => router.push('/admin/disputes')}
                        className="bg-red-600 hover:bg-red-700 text-white font-black shadow-lg shadow-red-500/30 animate-pulse"
                    >
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        處理爭議案件 ({disputedCount})
                    </Button>
                )}
            </header>

            <div className="flex bg-secondary/30 p-1 rounded-xl w-fit overflow-x-auto">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'orders' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                    {t('admin.tab_orders')}
                    {totalAlertCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center shadow-lg shadow-red-500/30">
                            {totalAlertCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                    {t('admin.tab_users')}
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                    {t('admin.tab_settings')}
                </button>
            </div>

            {activeTab === 'orders' ? (
                <div className="space-y-6">
                    <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'all', label: t('admin.filter_all') },
                            { id: 'open', label: t('admin.filter_open') },
                            { id: 'matched', label: t('admin.filter_matched') },
                            { id: 'paid', label: t('admin.filter_paid') },
                            { id: 'disputed', label: t('status.DISPUTE') },
                            { id: 'completed', label: t('admin.filter_completed') }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setOrderFilter(f.id as any)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap flex items-center gap-1.5 ${orderFilter === f.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}
                            >
                                {f.label}
                                {f.id === 'matched' && pendingPaymentCount > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] flex items-center justify-center animate-pulse">
                                        {pendingPaymentCount}
                                    </span>
                                )}
                                {f.id === 'disputed' && disputedCount > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
                                        {disputedCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {filteredOrders.map(order => (
                            <Card key={order.id} className="overflow-hidden border-border/50 hover:border-primary/20 transition-colors">
                                <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    {order.photo_url && (
                                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-border/50 shadow-sm">
                                            <img src={order.photo_url} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg md:text-xl truncate leading-tight">{order.item_name}</h3>
                                                <div className="text-[11px] text-muted-foreground font-mono mt-1 uppercase tracking-wider">{t('order.order_no')} #{order.id.slice(0, 8)}</div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">{t('order.target_price')}</span>
                                                <span className="text-sm font-bold">{order.currency}{order.target_price} <span className="text-xs text-muted-foreground font-normal">({order.exchange_rate} {t('create.ex_rate')})</span></span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-primary uppercase font-black tracking-widest">{t('order.total_budget')}</span>
                                                <span className="text-sm font-black text-primary">NT${order.total_amount_twd?.toLocaleString()}</span>
                                            </div>
                                            {order.tracking_number && (
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] text-blue-500 uppercase font-black tracking-widest">{t('order.tracking_no')}</span>
                                                    <span className="text-sm font-mono font-bold bg-blue-500/5 px-1.5 rounded text-blue-600">{order.tracking_number}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 w-full md:w-64 md:border-l md:pl-6 border-border/50 pt-4 md:pt-0">
                                        {/* Status & Alerts */}
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between md:justify-end gap-3">
                                                <div className="scale-125 origin-right">
                                                    <StatusBadge status={order.status} />
                                                </div>
                                                {order.status === 'MATCHED' && order.payment_notification_sent && (
                                                    <span className="text-[10px] font-black px-2 py-1 rounded-full bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20">
                                                        {t('admin.payment_notified')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Primary Admin Action Slot */}
                                        <div className="flex flex-col gap-2 mt-auto">
                                            {order.status === 'MATCHED' && (
                                                <Button
                                                    size="lg"
                                                    className="bg-yellow-500 hover:bg-yellow-600 font-black whitespace-nowrap h-12 w-full shadow-lg shadow-yellow-500/20"
                                                    onClick={() => handleConfirmPayment(order.id)}
                                                >
                                                    <Banknote className="w-5 h-5 mr-2" />
                                                    {t('admin.confirm_payment_btn')}
                                                </Button>
                                            )}
                                            {order.status === 'SHIPPED' && (
                                                <Button
                                                    size="lg"
                                                    className="bg-green-600 hover:bg-green-700 font-black whitespace-nowrap h-12 w-full shadow-lg shadow-green-500/20"
                                                    onClick={() => handleReleaseFunds(order)}
                                                >
                                                    <CheckCircle className="w-5 h-5 mr-2" />
                                                    {t('admin.release_funds_btn')}
                                                </Button>
                                            )}

                                            {/* Secondary Actions */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={order.status !== 'OPEN' && order.status !== 'MATCHED'}
                                                    className={cn(
                                                        "h-10 font-bold border border-transparent",
                                                        order.status === 'OPEN' || order.status === 'MATCHED'
                                                            ? "text-red-500/70 hover:text-red-500 hover:bg-red-500/5 hover:border-red-500/20"
                                                            : "opacity-30 grayscale"
                                                    )}
                                                    onClick={() => handleAdminDelist(order.id)}
                                                >
                                                    {t('order.delist_btn')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-10 font-black border-border/80 hover:bg-secondary/50"
                                                    onClick={() => router.push(`/orders/${order.id}`)}
                                                >
                                                    {t('admin.view_btn')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {filteredOrders.length === 0 && (
                            <div className="py-20 text-center bg-secondary/10 rounded-3xl border-2 border-dashed border-border/50">
                                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                                <p className="text-muted-foreground font-medium">{t('admin.empty_orders')}</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : activeTab === 'users' ? (
                <div className="space-y-4">
                    {profiles.map(profile => (
                        <Card key={profile.id} className="border-border/50">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                        <User className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">{profile.display_name || t('common.anonymous')}</span>
                                            {profile.is_verified && (
                                                <ShieldCheck className="w-4 h-4 text-blue-500 fill-blue-500/10" />
                                            )}
                                        </div>
                                        <div className="text-[10px] text-primary font-bold">{profile.email || t('admin.no_email')}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono">UID: {profile.id.slice(0, 8)}</div>
                                        <div className="flex gap-2 mt-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${profile.level === 'ADMIN' ? 'bg-red-500/10 text-red-500' : profile.level === 'VERIFIED' ? 'bg-blue-500/10 text-blue-500' : 'bg-secondary text-secondary-foreground'}`}>
                                                {profile.level === 'ADMIN' ? t('profile.admin') : profile.level === 'VERIFIED' ? t('profile.verified_user') : t('profile.standard_user')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    size="sm"
                                    variant={profile.is_verified ? "outline" : "primary"}
                                    onClick={() => handleToggleVerify(profile)}
                                    className="rounded-lg font-bold h-9"
                                >
                                    {profile.is_verified ? t('admin.btn_unverify') : t('admin.btn_verify')}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="max-w-md mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Settings className="w-5 h-5 text-primary" />
                                {t('admin.tab_settings')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdateSettings} className="space-y-8">
                                <div className="space-y-6">
                                    {/* Buyer Fees */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-black border-l-4 border-primary pl-2 uppercase tracking-tight">{t('order.buyer')}</h4>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('admin.buyer_fee_threshold')}</label>
                                            <Input
                                                type="number"
                                                value={settings?.buyer_fee_threshold}
                                                onChange={(e) => setSettings(prev => prev ? { ...prev, buyer_fee_threshold: parseInt(e.target.value) } : null)}
                                                className="font-bold rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('admin.buyer_fee_fixed')}</label>
                                            <Input
                                                type="number"
                                                value={settings?.buyer_fee_fixed_amount}
                                                onChange={(e) => setSettings(prev => prev ? { ...prev, buyer_fee_fixed_amount: parseInt(e.target.value) } : null)}
                                                className="font-bold rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('admin.buyer_fee_percent')}</label>
                                            <Input
                                                type="number"
                                                value={settings?.buyer_fee_percentage}
                                                onChange={(e) => setSettings(prev => prev ? { ...prev, buyer_fee_percentage: parseInt(e.target.value) } : null)}
                                                className="font-bold rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <hr className="border-border/50" />

                                    {/* Traveler Fees */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-black border-l-4 border-green-500 pl-2 uppercase tracking-tight">{t('order.traveler')}</h4>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('admin.traveler_fee_threshold')}</label>
                                            <Input
                                                type="number"
                                                value={settings?.traveler_fee_threshold}
                                                onChange={(e) => setSettings(prev => prev ? { ...prev, traveler_fee_threshold: parseInt(e.target.value) } : null)}
                                                className="font-bold rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('admin.traveler_fee_fixed')}</label>
                                            <Input
                                                type="number"
                                                value={settings?.traveler_fee_fixed_amount}
                                                onChange={(e) => setSettings(prev => prev ? { ...prev, traveler_fee_fixed_amount: parseInt(e.target.value) } : null)}
                                                className="font-bold rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('admin.traveler_fee_percent')}</label>
                                            <Input
                                                type="number"
                                                value={settings?.traveler_fee_percentage}
                                                onChange={(e) => setSettings(prev => prev ? { ...prev, traveler_fee_percentage: parseInt(e.target.value) } : null)}
                                                className="font-bold rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <hr className="border-border/50" />

                                    {/* Advanced Config */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-black border-l-4 border-blue-500 pl-2 uppercase tracking-tight">{t('common.advanced')}</h4>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('admin.deposit_threshold')}</label>
                                            <Input
                                                type="number"
                                                value={settings?.deposit_threshold_days}
                                                onChange={(e) => setSettings(prev => prev ? { ...prev, deposit_threshold_days: parseInt(e.target.value) } : null)}
                                                className="font-bold rounded-xl"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Button type="submit" fullWidth className="font-black h-14 rounded-2xl shadow-lg shadow-primary/20">
                                    {t('admin.update_settings_btn')}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
