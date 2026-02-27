'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from '../translations/en.json';
import zh from '../translations/zh.json';

type Translations = typeof en;
type Language = 'en' | 'zh';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, variables?: Record<string, string | number>) => string;
}

const translations: Record<Language, Translations> = { en, zh };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<Language>('zh');

    useEffect(() => {
        const savedLang = localStorage.getItem('language') as Language;
        if (savedLang && (savedLang === 'en' || savedLang === 'zh')) {
            setLanguageState(savedLang);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang;
    };

    const t = (path: string, variables?: Record<string, string | number>): string => {
        const keys = path.split('.');
        let result: any = translations[language];

        for (const key of keys) {
            if (result[key] === undefined) {
                console.warn(`Translation key not found: ${path}`);
                return path;
            }
            result = result[key];
        }

        if (typeof result !== 'string') return path;

        if (variables) {
            Object.entries(variables).forEach(([key, value]) => {
                result = result.replace(`{${key}}`, String(value));
            });
        }

        return result;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
