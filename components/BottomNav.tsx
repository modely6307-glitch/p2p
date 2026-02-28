'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusSquare, LayoutDashboard, User } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export const BottomNav = () => {
  const pathname = usePathname();
  const { t } = useLanguage();

  const links = [
    { href: '/market', label: t('nav.market'), icon: Home },
    { href: '/create', label: t('nav.create'), icon: PlusSquare },
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/profile', label: t('nav.profile'), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center space-y-1 w-full h-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : 'stroke-1'}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
