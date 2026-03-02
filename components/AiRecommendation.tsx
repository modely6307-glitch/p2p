'use client';

import React, { useState, useEffect } from 'react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, AlertCircle, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

const itemSchema = z.object({
    name: z.string(),
    tier: z.enum(['low', 'mid', 'high']),
    category: z.string(),
    price: z.number(),
    currency: z.string(),
    url: z.string().optional(),
    reason: z.string()
});

const schema = z.object({
    title: z.string(),
    description: z.string(),
    items: z.array(itemSchema),
    tip: z.string()
});

interface AiRecommendationProps {
    country: string;
    onProceed: () => void;
    onSelectRecommendation: (item: any) => void;
}

export function AiRecommendation({ country, onProceed, onSelectRecommendation }: AiRecommendationProps) {
    const { t } = useLanguage();
    const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
    const [attempt, setAttempt] = useState(1);

    const toggleExpand = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedItems(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    const startDate = threeMonthsAgo.toISOString().split('T')[0];

    const { object, submit, isLoading, error, stop } = useObject({
        api: '/api/recommend',
        schema,
    });

    useEffect(() => {
        submit({ country, startDate, endDate, attempt });
        return () => stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [country, attempt]);

    return (
        <Card className="p-1 border-none shadow-none bg-transparent animate-in fade-in slide-in-from-bottom-4">
            {!object && isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-6 bg-secondary/10 rounded-3xl border border-border/50 relative overflow-hidden">
                    {/* Animated Background Gradients */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse" />

                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                        <div className="w-16 h-16 rounded-2xl bg-background border flex items-center justify-center relative z-10 shadow-lg">
                            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                        </div>
                    </div>
                    <div className="space-y-2 text-center">
                        <h3 className="text-lg font-black tracking-tight">{t('create.ai_analyzing') || 'AI 正在分析最新趨勢...'}</h3>
                        <p className="text-xs text-muted-foreground animate-pulse">
                            {t('create.ai_analyzing_desc') || '正在搜尋 PTT, Dcard 與各大社群論壇'}
                        </p>
                    </div>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-red-500/5 rounded-3xl border border-red-500/20 text-center px-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-red-600 mb-1">分析失敗</h3>
                        <p className="text-xs text-red-500/80 mb-4">{error.message || 'Failed to generate AI recommendations.'}</p>
                        <Button variant="outline" size="sm" onClick={() => submit({ country, startDate, endDate, attempt })} className="border-red-500/50 text-red-600 hover:bg-red-500/10">
                            <RefreshCw className="w-4 h-4 mr-2" /> 重新嘗試
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {object?.title && (
                        <div className="px-2 animate-in fade-in slide-in-from-top-2">
                            <h2 className="text-lg md:text-xl font-black text-primary flex items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                {object.title}
                            </h2>
                            <p className="text-xs text-muted-foreground mt-1">{object.description}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        {object?.items?.map((item, idx) => (
                            <Card
                                key={idx}
                                onClick={() => onSelectRecommendation({ name: item?.name || '', price: item?.price || 0, reward: 0, desc: item?.reason || '', url: item?.url })}
                                className="overflow-hidden border border-border/50 bg-card hover:border-primary/50 cursor-pointer transition-all group scale-100 hover:scale-[1.01] shadow-sm relative animate-in fade-in zoom-in"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                {/* Decorative top border based on tier */}
                                <div className={cn(
                                    "absolute top-0 left-0 w-full h-1",
                                    item?.tier === 'high' ? "bg-amber-500" : item?.tier === 'mid' ? "bg-blue-500" : "bg-emerald-500",
                                    !item?.tier && "bg-muted"
                                )} />

                                <div className="p-4 flex flex-col gap-4 mt-1">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-base text-foreground leading-tight">
                                                {item?.name || <div className="h-4 w-3/4 bg-secondary/50 rounded animate-pulse" />}
                                            </h4>
                                            {item?.category ? (
                                                <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium uppercase tracking-widest mt-2 inline-block">
                                                    {item.category}
                                                </span>
                                            ) : (
                                                <div className="h-4 w-16 bg-secondary/50 rounded-full animate-pulse mt-2" />
                                            )}
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <div className="text-sm font-black text-primary">
                                                {item?.price ? `${item.currency || ''} ${item.price.toLocaleString()}` : <div className="h-4 w-16 bg-secondary/50 rounded animate-pulse" />}
                                            </div>
                                            {item?.url && (
                                                <a href={item.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 mt-1 font-medium">
                                                    {item.url.includes('google.com/search') ? 'Google 商品連結' : '查看官網'} <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* AI Summary Block */}
                                    <div className="bg-secondary/10 rounded-2xl border border-border/30 overflow-hidden relative">
                                        <div
                                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/20 transition-colors"
                                            onClick={(e) => toggleExpand(idx, e)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                                <span className="text-xs font-bold text-foreground">AI Review Summary</span>
                                            </div>
                                            {expandedItems[idx] ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                        </div>

                                        <div className={cn("px-3 pb-3 text-xs text-muted-foreground leading-relaxed", !expandedItems[idx] && "line-clamp-2 pb-0 pt-0 mx-3 mb-3 border-t border-transparent")}>
                                            {item?.reason ? item.reason : (
                                                <div className="space-y-1.5 mt-1">
                                                    <div className="h-3 w-full bg-secondary/50 rounded animate-pulse" />
                                                    <div className="h-3 w-4/5 bg-secondary/50 rounded animate-pulse" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {object?.tip && (
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 p-3 rounded-xl text-xs flex items-start gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="font-medium leading-relaxed">{object.tip}</p>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Button
                            variant="outline"
                            onClick={(e) => { e.preventDefault(); setAttempt(prev => prev + 1); }}
                            className="flex-1 h-14 rounded-2xl md:w-1/2 shrink-0 font-bold border-primary/20 hover:bg-primary/5 text-primary"
                            disabled={isLoading}
                        >
                            <RefreshCw className={cn("w-5 h-5 mr-2", isLoading && "animate-spin")} />
                            {t('create.ai_refresh') || '換一批商品'}
                        </Button>
                        <Button
                            onClick={onProceed}
                            className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-14 rounded-2xl font-bold shadow-sm md:w-1/2"
                            disabled={isLoading}
                        >
                            {t('create.ai_manual') || '都不喜歡，自定義手動輸入'}
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>
                </div>
            )
            }
        </Card >
    );
}
