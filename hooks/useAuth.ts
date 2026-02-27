import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export function useAuth(requireAuth: boolean = true) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);

            if (requireAuth && !user) {
                router.push('/login');
            }
        };

        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (requireAuth && !session?.user) {
                router.push('/login');
            }
        });

        return () => subscription.unsubscribe();
    }, [requireAuth, router]);

    return { user, loading };
}
