'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAllOrders, fetchAllProfiles, updateProfile } from '@/utils/api';
import { Order, Profile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, User, Package, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/StatusBadge';

export default function AdminDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'orders' | 'users'>('orders');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        loadData();
    }, [user, authLoading]);

    const loadData = async () => {
        try {
            const [ordData, profData] = await Promise.all([
                fetchAllOrders(),
                fetchAllProfiles()
            ]);
            setOrders(ordData);
            setProfiles(profData);
        } catch (error) {
            console.error('Admin load error:', error);
        } finally {
            setLoading(false);
        }
    };

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
            alert('Failed to update user');
        }
    };

    if (loading || authLoading) {
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
                    <h1 className="text-2xl font-black tracking-tight">Backend Management</h1>
                    <p className="text-sm text-muted-foreground">Monitor orders and manage users</p>
                </div>
            </header>

            <div className="flex bg-secondary/30 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                    Orders & Wishes
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                    Users
                </button>
            </div>

            {activeTab === 'orders' ? (
                <div className="space-y-4">
                    {orders.map(order => (
                        <Card key={order.id} className="overflow-hidden border-border/50">
                            <div className="p-4 flex gap-4">
                                {order.photo_url && (
                                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                        <img src={order.photo_url} className="w-full h-full object-cover" alt="" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold truncate">{order.item_name}</h3>
                                        <StatusBadge status={order.status} />
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-mono mt-1">ID: {order.id.slice(0, 8)}</div>
                                    <div className="flex gap-4 mt-2">
                                        <div className="text-xs">
                                            <span className="text-muted-foreground">Total:</span>
                                            <span className="font-bold ml-1">{order.currency}{order.total_amount}</span>
                                        </div>
                                        <div className="text-xs">
                                            <span className="text-muted-foreground">TWD:</span>
                                            <span className="font-bold ml-1 text-primary">NT${order.total_amount_twd?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
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
                                            <span className="font-bold">{profile.display_name || 'Anonymous User'}</span>
                                            {profile.is_verified && (
                                                <ShieldCheck className="w-4 h-4 text-blue-500 fill-blue-500/10" />
                                            )}
                                        </div>
                                        <div className="text-[10px] text-primary font-bold">{profile.email || 'No Email'}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono">UID: {profile.id.slice(0, 8)}</div>
                                        <div className="flex gap-2 mt-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${profile.level === 'ADMIN' ? 'bg-red-500/10 text-red-500' : profile.level === 'VERIFIED' ? 'bg-blue-500/10 text-blue-500' : 'bg-secondary text-secondary-foreground'}`}>
                                                {profile.level}
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
                                    {profile.is_verified ? 'Unverify' : 'Verify'}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
