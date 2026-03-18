'use client';

import React from 'react';
import zh from '@/translations/zh.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TranslationReviewPage() {
  // Flattening the nested JSON for easier review in a table format
  const flattenJson = (obj: any, prefix = '') => {
    let result: Record<string, string> = {};
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        Object.assign(result, flattenJson(obj[key], fullKey));
      } else {
        result[fullKey] = obj[key];
      }
    }
    return result;
  };

  const flattenedZh = flattenJson(zh);
  const categories = Object.keys(zh);
  const indexedEntries = Object.entries(flattenedZh).map(([key, value], index) => ({ key, value: String(value), globalIndex: index + 1 }));

  return (
    <div className="container mx-auto py-12 px-4 space-y-8 bg-gray-50/50 min-h-screen">
      <div className="space-y-2 text-center mb-12">
        <h1 className="text-4xl font-black tracking-tight text-gray-900">文案審核頁面</h1>
        <p className="text-muted-foreground font-medium italic">ZH-TW 語系檔對稿備份 (translations/zh.json)</p>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {categories.map((category) => (
          <Card key={category} className="border-none shadow-xl bg-white/80 backdrop-blur-md rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10 px-8 py-6">
              <CardTitle className="text-xl font-black text-primary uppercase tracking-widest flex items-center gap-3">
                <span className="w-2 h-8 bg-primary rounded-full" />
                Category: {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground w-16 text-center">#</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground w-1/3">Key Path</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Chinese Content (ZH)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {indexedEntries
                      .filter(({ key }) => key.startsWith(`${category}.`))
                      .map(({ key, value, globalIndex }) => (
                        <tr key={key} className="hover:bg-primary/5 transition-colors group text-left">
                          <td className="px-6 py-4 text-[11px] font-mono text-muted-foreground/40 text-center">
                            {globalIndex}
                          </td>
                          <td className="px-6 py-4 font-mono text-[11px] text-primary/60 font-medium break-all">
                            {key}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-800 leading-relaxed">
                            {value}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <footer className="text-center py-12 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
        End of Translation Review
      </footer>
    </div>
  );
}
