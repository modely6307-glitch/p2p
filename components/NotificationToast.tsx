'use client';

import React from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { useLanguage } from '@/context/LanguageContext';
import { X, ArrowRight, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const NotificationToast = () => {
    const { activeToast, dismissToast, markRead } = useNotifications();
    const { t } = useLanguage();
    const router = useRouter();

    if (!activeToast) return null;

    const handleNavigate = () => {
        markRead(activeToast.id);
        router.push(`/orders/${activeToast.orderId}`);
    };

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-top-5 fade-in duration-500 fill-mode-both">
            <div className="bg-background/95 backdrop-blur-xl border border-primary/20 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-4 flex items-start gap-3">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell className="w-5 h-5 text-primary animate-bounce" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-primary uppercase tracking-widest">{t('notification.title')}</span>
                    </div>
                    <p className="text-sm font-bold truncate">{activeToast.itemName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {t(`status.${activeToast.oldStatus}`)} → {t(`status.${activeToast.newStatus}`)}
                    </p>
                    <button
                        onClick={handleNavigate}
                        className="flex items-center gap-1 mt-2 text-xs font-black text-primary hover:underline"
                    >
                        {t('notification.view_order')}
                        <ArrowRight className="w-3 h-3" />
                    </button>
                </div>

                {/* Close */}
                <button
                    onClick={dismissToast}
                    className="w-8 h-8 rounded-lg hover:bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
