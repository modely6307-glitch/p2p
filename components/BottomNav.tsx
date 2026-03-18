'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, LayoutDashboard, User, ShieldAlert, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export const BottomNav = () => {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { unreadCount, activeTaskCount } = useNotifications();
  const { profile } = useAuth(false);

  const isAdmin = profile?.level === 'ADMIN';

  const links = isAdmin ? [
    { href: '/admin', label: '管理後台', icon: LayoutDashboard, badge: 0 },
    { href: '/admin/disputes', label: '爭議處理', icon: ShieldAlert, badge: 0 },
    { href: '/profile', label: t('nav.profile'), icon: User, badge: 0 },
  ] : [
    { href: '/market', label: t('nav.market'), icon: Home, badge: 0 },
    { href: '/create', label: t('nav.create'), icon: PlusCircle, badge: 0 },
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, badge: unreadCount + activeTaskCount },
    { href: '/profile', label: t('nav.profile'), icon: User, badge: 0 },
  ];

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        {/* Frosted glass effect */}
        <div className="bg-background/70 backdrop-blur-2xl border-t border-border/60 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
          <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2 pb-safe">
            {links.map(({ href, label, icon: Icon, badge }) => {
              const isActive = pathname === href;
              const isCreate = href === '/create';

              if (isCreate) {
                return (
                  <Link
                    key={href}
                    href={href}
                    className="relative flex flex-col items-center justify-center -mt-5"
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300",
                      isActive
                        ? "bg-primary shadow-primary/40 scale-105"
                        : "bg-primary hover:bg-primary/90 shadow-primary/30 hover:scale-105 active:scale-95"
                    )}>
                      <Icon className="w-6 h-6 text-white stroke-2" />
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold mt-1.5",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}>{label}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  className="relative flex flex-col items-center justify-center gap-1 w-full h-full py-2 transition-all duration-200"
                >
                  <div className={cn(
                    "w-10 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
                    isActive ? "bg-primary/12" : "bg-transparent"
                  )}>
                    <div className="relative">
                      <Icon className={cn(
                        "w-5 h-5 transition-all duration-200",
                        isActive ? "text-primary stroke-2" : "text-muted-foreground stroke-[1.5]"
                      )} />
                      {badge > 0 && (
                        <span className="absolute -top-2 -right-3 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-sm shadow-red-500/40 animate-in zoom-in-50 duration-300">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] font-semibold transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Desktop Sidebar Nav */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 w-64 flex-col bg-background/90 backdrop-blur-xl border-r border-border/60">
        {/* Logo / Brand */}
        <div className="p-6 pb-5">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 shrink-0">
              <div className="absolute inset-0 bg-primary rounded-xl rotate-6 opacity-20 group-hover:rotate-12 transition-transform duration-300" />
              <div className="relative w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform duration-300">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-none">Gull 購快</h1>
              <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.18em] mt-0.5">Global Shopping</p>
            </div>
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-border/50 mb-3" />

        {/* Nav Links */}
        <div className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {links.map(({ href, label, icon: Icon, badge }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                <Icon className={cn(
                  "w-4.5 h-4.5 shrink-0 transition-all",
                  isActive ? "stroke-2 text-primary-foreground" : "stroke-[1.5] group-hover:stroke-2"
                )} />
                <span className="flex-1">{label}</span>
                {badge > 0 ? (
                  <span className="min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1.5 shadow-sm shadow-red-500/30">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : isActive ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground/50" />
                ) : null}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border/40">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground/40 font-medium">© 2026 Gull</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-muted-foreground/40 font-medium">Live</span>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
