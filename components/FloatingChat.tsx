'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Minus } from 'lucide-react';
import { OrderChat } from './OrderChat';
import { cn } from '@/lib/utils';
import { fetchUnreadMessagesCount, updateOrderLastReadAt } from '@/utils/api';
import { supabase } from '@/utils/supabase/client';

interface FloatingChatProps {
    orderId: string;
    currentUserId: string;
    role: 'buyer' | 'traveler' | 'admin';
    partnerName?: string;
    lastReadAt?: string;
}

export function FloatingChat({ orderId, currentUserId, role, partnerName, lastReadAt }: FloatingChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // Initial fetch of unread count
        const getUnreadCount = async () => {
            if (!lastReadAt) return;
            try {
                const count = await fetchUnreadMessagesCount(orderId, currentUserId, lastReadAt);
                setUnreadCount(count);
            } catch (error) {
                console.error('Error fetching unread count:', error);
            }
        };

        getUnreadCount();

        // Real-time subscription for unread count
        const channel = supabase
            .channel(`unread_messages_${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'order_messages',
                    filter: `order_id=eq.${orderId}`,
                },
                (payload: { new: { user_id: string } }) => {
                    const newMsg = payload.new;
                    if (newMsg.user_id !== currentUserId) {
                        if (!isOpen) {
                            setUnreadCount((prev) => prev + 1);
                        } else {
                            // If open, update DB immediately so unread count doesn't increase on other devices
                            updateOrderLastReadAt(orderId, role).catch(e => console.error(e));
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderId, currentUserId, lastReadAt, isOpen]);

    useEffect(() => {
        const handleOpenChat = () => {
            if (!isOpen) {
                toggleChat();
            }
        };

        window.addEventListener('open-order-chat', handleOpenChat);
        return () => window.removeEventListener('open-order-chat', handleOpenChat);
    }, [isOpen]);

    const toggleChat = async () => {
        const nextState = !isOpen;
        setIsOpen(nextState);

        if (nextState) {
            setUnreadCount(0);
            try {
                await updateOrderLastReadAt(orderId, role);
            } catch (error) {
                console.error('Failed to update last read at:', error);
            }
        }
    };

    return (
        <div className="fixed bottom-24 md:bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
            {/* Chat Window */}
            <div
                className={cn(
                    "bg-card shadow-2xl border border-primary/10 overflow-hidden flex flex-col transition-all duration-500 ease-in-out pointer-events-auto",
                    isOpen
                        ? "fixed inset-0 z-[60] opacity-100 translate-y-0 rounded-none md:absolute md:inset-auto md:bottom-0 md:right-0 md:w-[450px] md:h-[700px] md:rounded-3xl md:translate-y-0"
                        : "opacity-0 translate-y-full pointer-events-none absolute bottom-0 right-0 w-0 h-0"
                )}
            >
                {/* Header for the window */}
                <div className="bg-primary p-4 md:p-3 flex justify-between items-center text-primary-foreground shrink-0 shadow-md">
                    <div className="flex items-center gap-3 pl-2">
                        <MessageSquare className="w-5 h-5" />
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-widest leading-none">
                                {partnerName || 'Order Chat'}
                            </span>
                            <span className="text-[10px] opacity-70 font-medium">Message Board</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 md:w-5 md:h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden relative bg-background">
                    <OrderChat
                        orderId={orderId}
                        currentUserId={currentUserId}
                        role={role}
                        partnerName={partnerName}
                    />
                </div>
            </div>

            {/* Toggle Button */}
            <button
                onClick={toggleChat}
                className={cn(
                    "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 pointer-events-auto relative",
                    isOpen ? "bg-secondary text-secondary-foreground rotate-90" : "bg-primary text-primary-foreground rotate-0"
                )}
            >
                {isOpen ? (
                    <X className="w-7 h-7" />
                ) : (
                    <>
                        <MessageSquare className="w-7 h-7" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-background animate-bounce shadow-lg">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </>
                )}
            </button>
        </div>
    );
}
