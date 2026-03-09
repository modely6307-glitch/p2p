'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
    const router = useRouter();
    const [status, setStatus] = useState('Completing sign in...');

    useEffect(() => {
        let mounted = true;

        const handleAuthCallback = async () => {
            // @supabase/supabase-js automatically parses URL on load.
            // Wait slightly for it to parse the hash or params locally.
            const { data: { session }, error } = await supabase.auth.getSession();

            if (session) {
                if (mounted) router.push('/dashboard');
            } else if (error) {
                if (mounted) setStatus('Error: ' + error.message);
            } else {
                if (mounted) setStatus('Processing authentication...');
            }
        };

        handleAuthCallback();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: import('@supabase/supabase-js').AuthChangeEvent) => {
            if (event === 'SIGNED_IN' && mounted) router.push('/dashboard');
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [router]);

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
            <div className="bg-card shadow-lg p-8 items-center space-y-4 rounded-3xl flex flex-col justify-center border-none backdrop-blur-sm bg-card/50">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">{status}</p>
            </div>
        </div>
    );
}
