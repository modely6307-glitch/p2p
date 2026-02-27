'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                alert('Check your email for the confirmation link!');
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
                <h1 className="text-4xl font-extrabold tracking-tight">WishEscrow</h1>
                <p className="text-muted-foreground text-sm">P2P Wishlist & Secure Escrow</p>
            </div>

            <Card className="p-6">
                <form onSubmit={handleAuth} className="space-y-4">
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />

                    {error && <p className="text-red-500 text-xs italic">{error}</p>}

                    <Button type="submit" fullWidth disabled={loading}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isSignUp ? 'Sign Up' : 'Log In'}
                    </Button>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-primary text-xs hover:underline"
                        >
                            {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
