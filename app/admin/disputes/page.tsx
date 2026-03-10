'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAllOrders, resolveDispute, incrementOrderStats } from '@/utils/api';
import { Order, OrderStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle, ArrowLeft, MessageSquare, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/context/LanguageContext';
import { StatusBadge } from '@/components/StatusBadge';

export default function AdminDisputesPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { t } = useLanguage();
    const [orders, setOrders] = useState<Order[]>([]);
    const [pastOrders, setPastOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        if (profile?.level === 'ADMIN') {
            loadDisputedOrders();
        } else {
            setLoading(false);
        }
    }, [user, profile, authLoading]);

    const loadDisputedOrders = async () => {
        setLoading(true);
        try {
            const allOrders = await fetchAllOrders();
            const disputed = allOrders.filter(o => o.status === 'DISPUTE');
            const pastDisputed = allOrders.filter(o => o.status !== 'DISPUTE' && o.dispute_reason);
            setOrders(disputed);
            setPastOrders(pastDisputed);
        } catch (error) {
            console.error('Error loading disputed orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (order: Order, status: OrderStatus) => {
        const notes = resolutionNotes[order.id] || '';
        const actionName = status === 'DELISTED' ? '取消訂單退款' : '完成訂單撥款';

        if (!confirm(`確定要將此訂單裁決為：「${actionName}」嗎？此操作不可逆。`)) return;

        try {
            const { resolveDispute } = await import('@/app/actions/orders');
            const result = await resolveDispute(order.id, status, notes);
            if (!result.success) throw new Error(result.error);

            setResolutionNotes(prev => {
                const next = { ...prev };
                delete next[order.id];
                return next;
            });
            await loadDisputedOrders();
        } catch (error: any) {
            console.error('Error resolving dispute:', error);
            alert(error.message || '裁決失敗，請稍後再試');
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (user && profile?.level !== 'ADMIN') {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="max-w-md w-full border-red-200">
                    <CardHeader className="text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                        <CardTitle className="text-red-600 font-bold">權限不足</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-muted-foreground mb-6">您無權訪問此頁面。</p>
                        <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                            返回首頁
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 max-w-5xl mx-auto pb-20">
            <header className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/admin')} className="rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-red-600 flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6" />
                        爭議案件處理中心
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">目前的待裁決案件總數：{orders.length}</p>
                </div>
            </header>

            <div className="space-y-6">
                {orders.map(order => (
                    <Card key={order.id} className="overflow-hidden border-red-200 bg-red-50/30">
                        <CardHeader className="pb-2 border-b border-red-100 bg-red-100/20">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg font-bold truncate max-w-md">{order.item_name}</CardTitle>
                                        <StatusBadge status={order.status} />
                                    </div>
                                    <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">Order ID: {order.id}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => router.push(`/orders/${order.id}`)} className="h-8 gap-1 text-xs font-bold">
                                    <ExternalLink className="w-3 h-3" />
                                    查看詳情
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="p-3 bg-white rounded-xl border border-red-200">
                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 leading-none">買家爭議理由</p>
                                        <p className="text-sm leading-relaxed">{order.dispute_reason}</p>
                                    </div>
                                    {order.dispute_evidence_url && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 leading-none">上傳證據內容</p>
                                            <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                                                <img src={order.dispute_evidence_url} alt="Evidence" className="w-full h-48 object-cover" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        管理員裁決備註 (買賣雙方皆可見)
                                    </p>
                                    <Textarea
                                        placeholder="輸入裁決理由、退款金額說明或其他重要訊息..."
                                        value={resolutionNotes[order.id] || ''}
                                        onChange={(e) => setResolutionNotes(prev => ({ ...prev, [order.id]: e.target.value }))}
                                        className="min-h-[100px] bg-slate-50 border-none shadow-inner focus-visible:ring-red-200"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            onClick={() => handleResolve(order, 'DELISTED')}
                                            variant="outline"
                                            className="h-12 border-red-200 text-red-600 hover:bg-red-50 font-black"
                                        >
                                            取消訂單退款
                                        </Button>
                                        <Button
                                            onClick={() => handleResolve(order, 'COMPLETED')}
                                            className="h-12 bg-green-600 hover:bg-green-700 font-black"
                                        >
                                            完成訂單撥款
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {orders.length === 0 && (
                    <div className="py-32 text-center border-2 border-dashed border-border/50 rounded-3xl bg-secondary/5 space-y-4">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-600">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-foreground">目前沒有任何活動中的爭議案件</p>
                            <p className="text-sm text-muted-foreground">所有的交易都進行得很順利！</p>
                        </div>
                    </div>
                )}

                {pastOrders.length > 0 && (
                    <details className="mt-12 group bg-white/50 rounded-2xl border border-gray-200 overflow-hidden">
                        <summary className="flex items-center gap-2 p-4 cursor-pointer select-none font-bold text-gray-500 hover:text-gray-800">
                            <AlertTriangle className="w-5 h-5 opacity-50" />
                            歷史申訴紀錄 ({pastOrders.length})
                        </summary>
                        <div className="p-4 space-y-6 bg-gray-50">
                            {pastOrders.map(order => (
                                <Card key={order.id} className="overflow-hidden border-gray-200 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                                    <CardHeader className="pb-2 border-b border-gray-100 bg-gray-100/30">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <CardTitle className="text-sm font-bold truncate max-w-sm">{order.item_name}</CardTitle>
                                                    <StatusBadge status={order.status} />
                                                </div>
                                                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Order ID: {order.id}</p>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => router.push(`/orders/${order.id}`)} className="h-7 text-[10px] font-bold">
                                                <ExternalLink className="w-3 h-3 mr-1" /> 查看
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-3 text-xs space-y-3">
                                        <div>
                                            <span className="font-bold text-gray-500 mr-2">申訴理由:</span>
                                            {order.dispute_reason}
                                        </div>
                                        {order.dispute_resolution && (
                                            <div>
                                                <span className="font-bold text-gray-500 mr-2">處理結果:</span>
                                                <span className="text-gray-700 font-medium">{order.dispute_resolution}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </details>
                )}
            </div>
        </div>
    );
}
