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

    // AUTO-REDIRECT if already logged in
    React.useEffect(() => {
        const checkExistingSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('level')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (profile?.level === 'ADMIN') {
                    router.push('/admin');
                } else {
                    router.push('/dashboard');
                }
            }
        };
        checkExistingSession();
    }, [router]);

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
                const { data: { user }, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                if (user) {
                    // Fetch profile to check level
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('level')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (profile?.level === 'ADMIN') {
                        router.push('/admin');
                    } else {
                        router.push('/dashboard');
                    }
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 lg:p-8 flex flex-col justify-center min-h-[80vh] space-y-8 max-w-md mx-auto">
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

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card/50 px-2 text-muted-foreground rounded backdrop-blur-md">
                                {t('login.or_continue_with') || 'Or continue with'}
                            </span>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        fullWidth
                        disabled={loading}
                        onClick={handleGoogleLogin}
                        className="h-12 rounded-xl font-bold text-base hover:bg-muted/50 w-full"
                    >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            <path fill="none" d="M1 1h22v22H1z" />
                        </svg>
                        {t('login.google_login')}
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
