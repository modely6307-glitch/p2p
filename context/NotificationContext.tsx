'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { Order, OrderStatus } from '@/types';

interface Notification {
    id: string;          // order id + status combo
    orderId: string;
    itemName: string;
    oldStatus: string;
    newStatus: OrderStatus;
    timestamp: number;
    read: boolean;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    unreadWishCount: number;   // buyer orders with changes
    unreadTaskCount: number;   // traveler orders with changes
    activeTaskCount: number;   // Total ongoing tasks as traveler
    activeToast: Notification | null;
    dismissToast: () => void;
    markAllRead: () => void;
    markRead: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'gull_order_snapshots';
const DISMISSED_KEY = 'gull_dismissed_notifications';

function getSnapshots(): Record<string, OrderStatus> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

function saveSnapshots(snapshots: Record<string, OrderStatus>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
}

function getDismissed(): Set<string> {
    try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
}

function saveDismissed(dismissed: Set<string>) {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
}

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [activeToast, setActiveToast] = useState<Notification | null>(null);
    const { user } = useAuthContext();
    const userId = user?.id ?? null;
    const [activeTaskCount, setActiveTaskCount] = useState(0);


    // Poll orders and detect status changes
    const checkOrders = useCallback(async () => {
        if (!userId) return;

        try {
            // Fetch all orders related to user (as buyer or traveler)
            const { data: buyerOrders } = await supabase
                .from('orders')
                .select('id, item_name, status, buyer_id, traveler_id')
                .eq('buyer_id', userId);

            const { data: travelerOrders } = await supabase
                .from('orders')
                .select('id, item_name, status, buyer_id, traveler_id')
                .eq('traveler_id', userId);

            const allOrders = [...(buyerOrders || []), ...(travelerOrders || [])];

            // Deduplicate
            const uniqueOrders = allOrders.filter((o, i, self) =>
                self.findIndex(x => x.id === o.id) === i
            );

            const snapshots = getSnapshots();
            const dismissed = getDismissed();
            const newNotifications: Notification[] = [];
            const newSnapshots: Record<string, OrderStatus> = {};

            for (const order of uniqueOrders) {
                newSnapshots[order.id] = order.status;
                const oldStatus = snapshots[order.id];

                // If we have a previous snapshot and status changed
                if (oldStatus && oldStatus !== order.status) {
                    const notifId = `${order.id}_${order.status}`;
                    if (!dismissed.has(notifId)) {
                        newNotifications.push({
                            id: notifId,
                            orderId: order.id,
                            itemName: order.item_name,
                            oldStatus,
                            newStatus: order.status,
                            timestamp: Date.now(),
                            read: false,
                        });
                    }
                }
            }

            saveSnapshots(newSnapshots);

            // Calculate active task count (as traveler, status not COMPLETED/DELISTED)
            const ongoingTasks = (travelerOrders || []).filter(o =>
                o.status !== 'COMPLETED' && o.status !== 'DELISTED'
            ).length;
            setActiveTaskCount(ongoingTasks);

            if (newNotifications.length > 0) {
                setNotifications(prev => {
                    const existingIds = new Set(prev.map(n => n.id));
                    const fresh = newNotifications.filter(n => !existingIds.has(n.id));
                    return [...fresh, ...prev];
                });

                // Show the most recent one as toast
                const latestUntoasted = newNotifications[0];
                if (latestUntoasted) {
                    setActiveToast(latestUntoasted);
                }
            }
        } catch (error) {
            console.error('Notification check error:', error);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        // Initial check
        checkOrders();

        // Poll every 15 seconds
        const interval = setInterval(checkOrders, 15000);
        return () => clearInterval(interval);
    }, [userId, checkOrders]);

    const dismissToast = useCallback(() => {
        if (activeToast) {
            const dismissed = getDismissed();
            dismissed.add(activeToast.id);
            saveDismissed(dismissed);
            setNotifications(prev => prev.filter(n => n.id !== activeToast.id));
        }
        setActiveToast(null);
    }, [activeToast]);

    const markRead = useCallback((id: string) => {
        const dismissed = getDismissed();
        dismissed.add(id);
        saveDismissed(dismissed);
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (activeToast?.id === id) setActiveToast(null);
    }, [activeToast]);

    const markAllRead = useCallback(() => {
        const dismissed = getDismissed();
        notifications.forEach(n => dismissed.add(n.id));
        saveDismissed(dismissed);
        setNotifications([]);
        setActiveToast(null);
    }, [notifications]);

    const unreadCount = notifications.length;
    const unreadWishCount = notifications.filter(n => true).length; // All unread for now
    const unreadTaskCount = 0;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            unreadWishCount,
            unreadTaskCount,
            activeTaskCount,
            activeToast,
            dismissToast,
            markAllRead,
            markRead,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
};
