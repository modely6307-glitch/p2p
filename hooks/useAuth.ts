import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Profile } from '@/types';

export function useAuth(requireAuth: boolean = true) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;
        let authSubscription: any = null;

        const getUserData = async () => {
            try {
                const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
                if (userError) throw userError;

                if (!isMounted) return;
                setUser(authUser);

                if (authUser) {
                    const { data: userProfile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', authUser.id)
                        .maybeSingle(); // Use maybeSingle to avoid error if missing

                    if (!isMounted) return;
                    if (profileError) {
                        console.error('useAuth: Profile error', profileError);
                    }
                    setProfile(userProfile);
                } else {
                    setProfile(null);
                }
            } catch (err) {
                console.error('useAuth: Init error', err);
                if (isMounted) {
                    setUser(null);
                    setProfile(null);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!isMounted) return;
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                const { data: userProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentUser.id)
                    .maybeSingle();
                if (isMounted) setProfile(userProfile);
            } else {
                setProfile(null);
                // setLoading(false); // Removed as initial loading is handled by getUserData's finally
            }
        });
        authSubscription = subscription;

        getUserData();

        return () => {
            isMounted = false;
            if (authSubscription) authSubscription.unsubscribe();
        };
    }, []);

    // Separated redirect logic to prevent loops
    useEffect(() => {
        if (!loading && requireAuth && !user) {
            router.push('/login');
        }
    }, [loading, requireAuth, user, router]);

    return { user, profile, loading };
}
