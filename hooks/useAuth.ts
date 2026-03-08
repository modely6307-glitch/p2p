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
            // Speed up: Try to get session from local storage first
            const { data: { session } } = await supabase.auth.getSession();
            if (isMounted && session?.user) {
                setUser(session.user);
                fetchProfile(session.user.id);
            }

            try {
                const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
                if (userError) throw userError;

                if (!isMounted) return;
                setUser(authUser);

                if (authUser) {
                    fetchProfile(authUser.id);
                } else {
                    setProfile(null);
                }
            } catch (err) {
                console.error('useAuth: Init error', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        const fetchProfile = async (uid: string) => {
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', uid)
                .maybeSingle();
            if (isMounted) setProfile(userProfile);
        };

        // Safety timeout to prevent permanent loading screens
        const safetyTimer = setTimeout(() => {
            if (isMounted && loading) {
                console.warn('useAuth: Safety timeout triggered');
                setLoading(false);
            }
        }, 2000);

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
        // Only redirect if auth is strictly required and we are NOT on the login page
        // and only after loading has finished to be sure about the state
        if (!loading && requireAuth && !user) {
            const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';
            if (!isLoginPage) {
                console.log('useAuth: Unauthenticated user on protected route, redirecting to login');
                router.push('/login');
            }
        }
    }, [loading, requireAuth, user, router]);

    return { user, profile, loading };
}
