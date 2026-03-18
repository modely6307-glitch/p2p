'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Minus } from 'lucide-react';
import { OrderChat } from './OrderChat';
import { cn } from '@/lib/utils';
import { fetchUnreadMessagesCountAction, updateOrderLastReadAtAction } from '@/app/actions/chat';
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
                const res = await fetchUnreadMessagesCountAction(orderId, lastReadAt);
                if (res.success && res.count !== undefined) {
                    setUnreadCount(res.count);
                }
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
                            updateOrderLastReadAtAction(orderId, role).catch(e => console.error(e));
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
                await updateOrderLastReadAtAction(orderId, role);
            } catch (error) {
                console.error('Failed to update last read at:', error);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none flex justify-center">
            {/* Inner responsive container matching <main> layout */}
            <div className="w-full h-full max-w-md mx-auto lg:max-w-none relative pointer-events-none">
                {/* Chat Window */}
                <div
                    className={cn(
                        "bg-background shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out pointer-events-auto",
                        isOpen
                            ? "absolute inset-0 opacity-100 translate-y-0 rounded-none lg:inset-auto lg:bottom-[88px] lg:right-6 lg:w-[450px] lg:h-[700px] lg:border lg:border-border lg:rounded-3xl"
                            : "absolute bottom-24 lg:bottom-6 right-6 w-0 h-0 opacity-0 translate-y-10"
                    )}
                >
                    {/* Header for the window */}
                    <div className="bg-primary p-4 lg:p-3 flex justify-between items-center text-primary-foreground shrink-0 shadow-md">
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
                            className="p-3 lg:p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 lg:w-5 lg:h-5" />
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
                        "absolute right-6 pointer-events-auto shadow-xl items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 w-14 h-14 rounded-full",
                        isOpen
                            ? "hidden lg:flex bg-secondary text-secondary-foreground rotate-90 bottom-6"
                            : "flex bg-primary text-primary-foreground rotate-0 bottom-24 lg:bottom-6"
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
        </div>
    );
}
