'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

import { useLanguage } from '@/context/LanguageContext';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t } = useLanguage();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                alert(t('login.check_email'));
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push('/dashboard');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 flex flex-col justify-center min-h-[80vh] space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-primary">Gull</h1>
                <p className="text-muted-foreground text-sm font-medium">{t('login.subtitle')}</p>
            </div>

            <Card className="p-8 shadow-xl border-none bg-card/50 backdrop-blur-sm rounded-3xl">
                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{t('login.email')}</label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            className="h-12 rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{t('login.password')}</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="h-12 rounded-xl"
                        />
                    </div>

                    {error && <p className="text-red-500 text-xs font-medium italic animate-shake">{error}</p>}

                    <Button type="submit" fullWidth disabled={loading} className="h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isSignUp ? t('login.signup_btn') : t('login.login_btn')}
                    </Button>

                    <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-muted-foreground text-xs hover:text-primary transition-colors font-medium"
                        >
                            {isSignUp ? t('login.switch_to_login') : t('login.switch_to_signup')}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
