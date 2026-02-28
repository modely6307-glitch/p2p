'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusSquare, LayoutDashboard, User } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useNotifications } from '@/context/NotificationContext';

export const BottomNav = () => {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();

  const links = [
    { href: '/market', label: t('nav.market'), icon: Home, badge: 0 },
    { href: '/create', label: t('nav.create'), icon: PlusSquare, badge: 0 },
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, badge: unreadCount },
    { href: '/profile', label: t('nav.profile'), icon: User, badge: 0 },
  ];

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border pb-safe lg:hidden">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
          {links.map(({ href, label, icon: Icon, badge }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex flex-col items-center justify-center space-y-1 w-full h-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                  }`}
              >
                <div className="relative">
                  <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : 'stroke-1'}`} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shadow-red-500/30 animate-in zoom-in-50 duration-300">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar Nav */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 w-64 bg-background/80 backdrop-blur-xl border-r border-border flex-col">
        {/* Logo / Brand */}
        <div className="p-6 pt-10 pb-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              G
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Gull</h1>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Global Shopping</p>
            </div>
          </Link>
        </div>

        {/* Nav Links */}
        <div className="flex-1 px-3 py-6 space-y-1">
          {links.map(({ href, label, icon: Icon, badge }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 group ${isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-2' : 'stroke-[1.5] group-hover:stroke-2'} transition-all`} />
                <span>{label}</span>
                {badge > 0 ? (
                  <span className="ml-auto min-w-[20px] h-[20px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shadow-red-500/30">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : isActive ? (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground/60" />
                ) : null}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground/50 font-medium text-center">© 2026 Gull</p>
        </div>
      </nav>
    </>
  );
};
