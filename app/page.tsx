'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/context/LanguageContext';
import { Plane, ShoppingBag, ArrowRight, Calendar, Globe2, ShieldCheck, Zap, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [tripDate, setTripDate] = useState('');

  const navigateToMarket = () => {
    const url = tripDate ? `/market?date=${tripDate}` : '/market';
    router.push(url);
  };

  const navigateToCreate = () => {
    router.push('/create');
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] bg-background overflow-hidden relative selection:bg-primary/30">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-20%] w-[70%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[70%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-12 relative z-10">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-background/50 backdrop-blur-md border border-primary/20 text-primary rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/5">
            <Sparkles className="w-3 h-3 animate-spin-slow" />
            Empowering Global Shoppers
          </div>

          <h1 className="flex flex-col gap-4 py-4">
            <span className="text-5xl md:text-7xl font-black tracking-tighter leading-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent italic px-2">
              Gull 購快
            </span>
            <span className="text-base md:text-xl font-bold tracking-[0.3em] text-primary/80 uppercase">
              世界沒界限
            </span>
          </h1>

          <p className="text-muted-foreground/80 text-sm font-medium max-w-[280px] md:max-w-md mx-auto leading-relaxed">
            {t('landing.subtitle')}
          </p>
        </div>

        {/* Action Choice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mx-auto pt-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both">
          {/* Traveler Option */}
          <Card className="group relative border-none bg-gradient-to-br from-primary/10 via-background to-background hover:via-primary/5 transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.2)] hover:shadow-primary/20 overflow-hidden ring-1 ring-primary/20 hover:ring-primary/40">
            <div className="absolute -top-12 -right-12 p-3 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 rotate-12 group-hover:rotate-0 scale-150 group-hover:scale-125">
              <Plane className="w-48 h-48 text-primary" />
            </div>
            <CardContent className="p-8 flex flex-col items-start gap-6 h-full relative z-10">
              <div className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:rotate-6 transition-all duration-500">
                <Plane className="w-7 h-7" />
              </div>
              <div className="text-left space-y-2">
                <h3 className="text-xl font-black tracking-tight">{t('landing.traveler_btn')}</h3>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">{t('landing.traveler_desc')}</p>
              </div>

              <div className="w-full space-y-4 pt-4 border-t border-primary/10">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest">{t('landing.date_prompt')}</span>
                    <Calendar className="w-3 h-3 text-primary/40" />
                  </div>
                  <Input
                    type="date"
                    value={tripDate}
                    onChange={(e) => setTripDate(e.target.value)}
                    className="h-12 text-sm rounded-xl bg-background/50 border-primary/10 focus:border-primary/40 focus:ring-0 transition-all shadow-inner"
                  />
                </div>
                <Button onClick={navigateToMarket} fullWidth className="group/btn h-14 font-black rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98]">
                  探索願望清單
                  <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Wisher Option */}
          <Card className="group relative border-none bg-gradient-to-br from-foreground/5 via-background to-background hover:via-foreground/5 transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:shadow-white/5 overflow-hidden ring-1 ring-white/10 hover:ring-white/20">
            <div className="absolute -top-12 -right-12 p-3 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 -rotate-12 group-hover:rotate-0 scale-150 group-hover:scale-125">
              <ShoppingBag className="w-48 h-48 text-foreground" />
            </div>
            <CardContent className="p-8 flex flex-col items-start gap-6 h-full relative z-10">
              <div className="w-14 h-14 bg-foreground text-background rounded-2xl flex items-center justify-center shadow-2xl shadow-foreground/20 group-hover:-rotate-6 transition-all duration-500">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div className="text-left space-y-2">
                <h3 className="text-xl font-black tracking-tight">{t('landing.wisher_btn')}</h3>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">{t('landing.wisher_desc')}</p>
              </div>
              <div className="mt-auto w-full pt-6 border-t border-white/5">
                <Button onClick={navigateToCreate} variant="outline" fullWidth className="group/btn h-14 font-black rounded-xl border-foreground/10 hover:bg-foreground hover:text-background transition-all active:scale-[0.98]">
                  發布新願望
                  <Zap className="w-4 h-4 ml-2 fill-current animate-pulse" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Bar */}
      <div className="w-full max-w-2xl mx-auto grid grid-cols-3 gap-8 p-6 pb-16 opacity-40 animate-in fade-in duration-1000 delay-700 fill-mode-both">
        <div className="flex flex-col items-center gap-1.5 group cursor-default">
          <ShieldCheck className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Safe Escrow</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 group cursor-default">
          <Calendar className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Date Match</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 group cursor-default">
          <Globe2 className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Global Reach</span>
        </div>
      </div>
    </div>
  );
}
