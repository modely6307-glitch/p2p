'use client';

import React, { useState, useEffect } from 'react';
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
import { AiRecommendation } from '@/components/AiRecommendation';
import { z } from 'zod';
import { experimental_useObject as useObject } from '@ai-sdk/react';

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

  const [aiCountry, setAiCountry] = useState('Japan');

  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  const startDate = threeMonthsAgo.toISOString().split('T')[0];

  const { object: japanData, submit: fetchJapan } = useObject({
    api: '/api/recommend',
    schema: z.object({
      items: z.array(z.object({ name: z.string() }))
    })
  });

  useEffect(() => {
    // 預加載主動顯示的第一個國家以在卡片上展示
    const timer1 = setTimeout(() => {
      fetchJapan({ country: 'Japan', startDate, endDate, attempt: 1 });
    }, 500);

    // 其他國家則背景抓取，建立後台 Cache (無感載入)
    const backgroundCountries = ['Korea', 'Thailand', 'USA', 'UK', 'France'];
    const timer2 = setTimeout(() => {
      backgroundCountries.forEach((country, idx) => {
        // 加上一點間隔避免同時轟炸 API
        setTimeout(async () => {
          try {
            const res = await fetch('/api/recommend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ country, startDate, endDate, attempt: 1 })
            });
            // 消耗串流讓伺服器順利跑完並快取
            if (res.body) {
              const reader = res.body.getReader();
              while (true) {
                const { done } = await reader.read();
                if (done) break;
              }
            }
          } catch (e) { }
        }, idx * 3000);
      });
    }, 2000);

    return () => { clearTimeout(timer1); clearTimeout(timer2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] lg:min-h-screen bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden relative selection:bg-primary/20">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-20%] w-[70%] h-[50%] bg-primary/20 blur-[140px] rounded-full animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-secondary/30 blur-[130px] rounded-full pointer-events-none" />

      {/* AI Modal Overlay */}
      {showAI && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl animate-in fade-in duration-300">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-0 bg-white/95 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative rounded-3xl">
            <button onClick={() => setShowAI(false)} className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-gray-900 bg-gray-100 p-1.5 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                  <Wand2 className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{t('landing.ai_hot_now')}</h3>
                  <p className="text-xs text-muted-foreground font-bold tracking-wider uppercase mt-0.5">Powered by Gull AI</p>
                </div>
              </div>

              {/* Country Tabs */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 pt-2">
                {['Japan', 'Korea', 'Thailand', 'USA', 'UK', 'France'].map(c => (
                  <Button key={c} variant={aiCountry === c ? 'primary' : 'outline'} size="sm" onClick={() => setAiCountry(c)} className="rounded-full shadow-sm shrink-0">
                    {c}
                  </Button>
                ))}
              </div>

              <div className="pt-2">
                <AiRecommendation
                  country={aiCountry}
                  onProceed={() => {
                    router.push('/create');
                    setShowAI(false);
                  }}
                  onSelectRecommendation={(item) => {
                    sessionStorage.setItem('pendingAiWish', JSON.stringify({ ...item, country: aiCountry }));
                    router.push('/create');
                    setShowAI(false);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 pt-16 lg:p-12 text-center space-y-12 relative z-10">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/70 backdrop-blur-xl border border-primary/20 text-primary rounded-full text-xs font-bold uppercase tracking-[0.2em] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(var(--primary),0.1)] transition-all">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            Gull Global Network
          </div>

          <h1 className="flex flex-col gap-3 py-4">
            <span className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-tight bg-gradient-to-br from-gray-900 to-gray-500 bg-clip-text text-transparent italic px-2">
              Gull 購快
            </span>
            <span className="text-base md:text-xl lg:text-2xl font-bold tracking-[0.3em] text-primary uppercase mt-2">
              世界沒界限
            </span>
          </h1>

          <p className="text-muted-foreground/80 text-sm lg:text-base font-medium max-w-[280px] md:max-w-md lg:max-w-lg mx-auto leading-relaxed">
            {t('landing.subtitle')}
          </p>
        </div>

        {/* Action Choice - Grid 1:2 layout for modern look */}
        <div className="w-full max-w-2xl lg:max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Traveler Option */}
            <Card className="group relative border-border/50 bg-white/80 backdrop-blur-xl hover:bg-white transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(var(--primary),0.1)] overflow-hidden">
              <div className="absolute -top-12 -right-12 p-3 opacity-[0.05] group-hover:opacity-10 transition-all duration-700 rotate-12 group-hover:rotate-0 scale-150 group-hover:scale-125">
                <Plane className="w-48 h-48 text-primary" />
              </div>
              <CardContent className="p-8 pt-10 flex flex-col items-start gap-6 h-full relative z-10">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500">
                  <Plane className="w-7 h-7" />
                </div>
                <div className="text-left space-y-2">
                  <h3 className="text-xl font-black tracking-tight">{t('landing.traveler_btn')}</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">{t('landing.traveler_desc')}</p>
                </div>

                <div className="w-full space-y-5 pt-6 border-t border-border/50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{t('landing.date_prompt')}</span>
                      <CalendarIcon className="w-4 h-4 text-primary/60" />
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full h-12 justify-start text-left font-medium rounded-xl bg-white border-border/80 hover:bg-gray-50/80 hover:border-primary/30 transition-all shadow-sm px-4",
                            !tripDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-4 w-4" />
                          {tripDate ? (
                            <span className="text-gray-900">{format(new Date(tripDate), "PPP")}</span>
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
                  <Button onClick={navigateToMarket} fullWidth className="group/btn h-14 font-bold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98] text-base">
                    探索願望清單
                    <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Wisher Option */}
            <Card className="group relative border-border/50 bg-white/80 backdrop-blur-xl hover:bg-white transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(var(--secondary),0.1)] overflow-hidden">
              <div className="absolute -top-12 -right-12 p-3 opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-700 -rotate-12 group-hover:rotate-0 scale-150 group-hover:scale-125">
                <ShoppingBag className="w-48 h-48 text-secondary-foreground" />
              </div>
              <CardContent className="p-8 pt-10 flex flex-col items-start gap-6 h-full relative z-10">
                <div className="w-14 h-14 bg-secondary/30 text-secondary-foreground rounded-2xl flex items-center justify-center group-hover:bg-secondary group-hover:text-secondary-foreground transition-all duration-500">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <div className="text-left space-y-2">
                  <h3 className="text-xl font-black tracking-tight">{t('landing.wisher_btn')}</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">{t('landing.wisher_desc')}</p>
                </div>
                <div className="mt-auto w-full pt-6 border-t border-border/50">
                  <Button onClick={navigateToCreate} variant="outline" fullWidth className="group/btn h-14 font-bold rounded-xl border-border bg-white hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-[0.98] text-base shadow-sm hover:shadow-md">
                    發布新願望
                    <Zap className="w-4 h-4 ml-2 text-yellow-500 animate-pulse" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Recommendation Card - Full Width */}
          <Card
            onClick={() => setShowAI(true)}
            className="group relative border-border/50 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-all duration-500 shadow-md hover:shadow-lg overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_white_0%,_transparent_100%)] opacity-40 pointer-events-none" />
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-6 text-left w-full">
                <div className="w-16 h-16 bg-white text-primary rounded-[1.5rem] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.08)] group-hover:scale-105 transition-transform duration-500">
                  <Wand2 className="w-8 h-8 text-blue-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold tracking-tight text-gray-900">{t('landing.ai_btn')}</h3>
                    <div className="px-2.5 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">Hot</div>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium max-w-xs">{t('landing.ai_desc')}</p>
                </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto overflow-x-auto no-scrollbar py-2">
                {japanData?.items ? japanData.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md rounded-xl border border-white group-hover:border-blue-200 shadow-sm transition-all hover:shadow-md">
                    <span className="text-sm font-bold text-gray-800">{item?.name || '...'}</span>
                  </div>
                )) : (
                  <>
                    <div className="h-10 w-24 bg-white/40 rounded-xl animate-pulse" />
                    <div className="h-10 w-24 bg-white/40 rounded-xl animate-pulse" />
                    <div className="h-10 w-24 bg-white/40 rounded-xl animate-pulse" />
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Bar */}
      <div className="w-full max-w-2xl lg:max-w-4xl mx-auto grid grid-cols-3 gap-8 p-6 lg:p-12 pb-16 opacity-60 animate-in fade-in duration-1000 delay-700 fill-mode-both">
        <div className="flex flex-col items-center gap-2 group cursor-default">
          <ShieldCheck className="w-6 h-6 text-green-500 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Safe Escrow</span>
        </div>
        <div className="flex flex-col items-center gap-2 group cursor-default">
          <CalendarIcon className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date Match</span>
        </div>
        <div className="flex flex-col items-center gap-2 group cursor-default">
          <Globe2 className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Global Reach</span>
        </div>
      </div>
    </div>
  );
}
