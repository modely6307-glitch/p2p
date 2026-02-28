'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/context/LanguageContext';
import { Plane, ShoppingBag, ArrowRight, Calendar as CalendarIcon, Globe2, ShieldCheck, Zap, Sparkles, Wand2, Star, TrendingUp, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [tripDate, setTripDate] = useState('');
  const [showAI, setShowAI] = useState(false);

  const navigateToMarket = () => {
    const url = tripDate ? `/market?date=${tripDate}` : '/market';
    router.push(url);
  };

  const navigateToCreate = () => {
    router.push('/create');
  };

  const mockRecommendations = [
    { country: 'Japan', flag: '🇯🇵', items: ['Yuzu Skincare', 'Limited Edition KitKats', 'Ceramic Pour Over Set'] },
    { country: 'USA', flag: '🇺🇸', items: ['Stanley Tumblers', 'Lululemon Belt Bags', 'Oura Ring Gen3'] },
    { country: 'Thailand', flag: '🇹🇭', items: ['Handmade Elephant Pants', 'Dried Durian', 'Organic Coconut Oil'] }
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] lg:min-h-screen bg-background overflow-hidden relative selection:bg-primary/30">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-20%] w-[70%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[70%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* AI Modal Overlay */}
      {showAI && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl animate-in fade-in duration-300">
          <Card className="w-full max-w-sm border-2 border-primary/20 bg-background/90 shadow-[0_0_50px_rgba(var(--primary),0.2)] overflow-hidden relative">
            <button onClick={() => setShowAI(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                  <Wand2 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-black">{t('landing.ai_hot_now')}</h3>
                  <p className="text-[10px] text-muted-foreground font-black tracking-widest uppercase">Powered by Gull AI</p>
                </div>
              </div>

              <div className="space-y-4">
                {mockRecommendations.map((rec) => (
                  <div key={rec.country} className="space-y-2 p-3 rounded-xl bg-secondary/20 border border-primary/10">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{rec.flag}</span>
                      <span className="text-sm font-black">{rec.country}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {rec.items.map(item => (
                        <span key={item} className="text-[10px] bg-background px-2 py-0.5 rounded-full border border-border/50 text-muted-foreground">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={() => router.push('/market')} fullWidth className="h-12 font-black rounded-xl shadow-lg shadow-primary/20">
                前往市場接單
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 pt-16 lg:p-12 text-center space-y-12 relative z-10">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-background/50 backdrop-blur-md border border-primary/20 text-primary rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/5">
            <Sparkles className="w-3 h-3 animate-spin-slow" />
            Gull Global Network
          </div>

          <h1 className="flex flex-col gap-4 py-4">
            <span className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent italic px-2">
              Gull 購快
            </span>
            <span className="text-base md:text-xl lg:text-2xl font-bold tracking-[0.3em] text-primary/80 uppercase">
              世界沒界限
            </span>
          </h1>

          <p className="text-muted-foreground/80 text-sm lg:text-base font-medium max-w-[280px] md:max-w-md lg:max-w-lg mx-auto leading-relaxed">
            {t('landing.subtitle')}
          </p>
        </div>

        {/* Action Choice - Grid 1:2 layout for modern look */}
        <div className="w-full max-w-2xl lg:max-w-4xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Traveler Option */}
            <Card className="group relative border-none bg-gradient-to-br from-primary/10 via-background to-background hover:via-primary/5 transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.2)] hover:shadow-primary/20 overflow-hidden ring-1 ring-primary/20 hover:ring-primary/40">
              <div className="absolute -top-12 -right-12 p-3 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 rotate-12 group-hover:rotate-0 scale-150 group-hover:scale-125">
                <Plane className="w-48 h-48 text-primary" />
              </div>
              <CardContent className="p-8 pt-12 flex flex-col items-start gap-6 h-full relative z-10">
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
                      <CalendarIcon className="w-3 h-3 text-primary/40" />
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full h-12 justify-start text-left font-normal rounded-xl bg-background/50 border-primary/10 hover:bg-background/80 transition-all shadow-inner px-3",
                            !tripDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {tripDate ? (
                            format(new Date(tripDate), "PPP")
                          ) : (
                            <span>{t('create.pick_date')}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={tripDate ? new Date(tripDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setTripDate(format(date, 'yyyy-MM-dd'));
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
              <CardContent className="p-8 pt-12 flex flex-col items-start gap-6 h-full relative z-10">
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

          {/* AI Recommendation Card - Full Width */}
          <Card
            onClick={() => setShowAI(true)}
            className="group relative border-none bg-gradient-to-r from-blue-500/10 via-background to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 transition-all duration-500 shadow-xl overflow-hidden ring-1 ring-white/5 cursor-pointer"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] opacity-20 pointer-events-none" />
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-6 text-left w-full">
                <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-500 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/30 group-hover:scale-110 transition-transform duration-500">
                  <Wand2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black tracking-tight">{t('landing.ai_btn')}</h3>
                    <div className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[8px] font-black uppercase tracking-widest">Hot</div>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium max-w-xs">{t('landing.ai_desc')}</p>
                </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto overflow-x-auto no-scrollbar py-2">
                {mockRecommendations.map((rec) => (
                  <div key={rec.country} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-background/50 backdrop-blur-md rounded-xl border border-white/5 group-hover:border-primary/20 transition-all">
                    <span className="text-xl">{rec.flag}</span>
                    <span className="text-xs font-black">{rec.country}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Bar */}
      <div className="w-full max-w-2xl lg:max-w-4xl mx-auto grid grid-cols-3 gap-8 p-6 lg:p-12 pb-16 opacity-40 animate-in fade-in duration-1000 delay-700 fill-mode-both">
        <div className="flex flex-col items-center gap-1.5 group cursor-default">
          <ShieldCheck className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Safe Escrow</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 group cursor-default">
          <CalendarIcon className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
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
