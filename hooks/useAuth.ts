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

        const fetchProfile = async (uid: string) => {
            console.log('useAuth: Fetching profile for', uid);
            try {
                const { data: userProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', uid)
                    .maybeSingle();

                if (isMounted) {
                    console.log('useAuth: Profile loaded, level:', userProfile?.level);
                    setProfile(userProfile);
                }
            } catch (err) {
                console.error('useAuth: Profile error', err);
            }
        };

        const initializeAuth = async () => {
            console.log('useAuth: Initializing auth sequence...');
            try {
                // 1. Initial local check
                const { data: { session } } = await supabase.auth.getSession();
                if (isMounted && session?.user) {
                    console.log('useAuth: Local session found');
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                }

                // 2. Full network verify
                const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
                if (userError) throw userError;

                if (isMounted) {
                    console.log('useAuth: User verified:', authUser?.id);
                    setUser(authUser);
                    if (authUser) {
                        await fetchProfile(authUser.id);
                    } else {
                        setProfile(null);
                    }
                }
            } catch (err) {
                console.error('useAuth: Init error', err);
            } finally {
                if (isMounted) {
                    console.log('useAuth: Initialization complete, setting loading=false');
                    setLoading(false);
                }
            }
        };

        // Safety timeout to prevent permanent loading screens
        const safetyTimer = setTimeout(() => {
            if (isMounted && loading) {
                console.warn('useAuth: SAFETY TIMEOUT - Forcing UI unlock');
                setLoading(false);
            }
        }, 3500);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;
            console.log('useAuth: Auth event:', event);
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                fetchProfile(currentUser.id);
            } else {
                setProfile(null);
                if (event === 'SIGNED_OUT') setLoading(false);
            }
        });
        authSubscription = subscription;

        initializeAuth();

        return () => {
            isMounted = false;
            clearTimeout(safetyTimer);
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
                console.log('useAuth: Attempting redirect to /login');
                router.push('/login');
            }
        }
    }, [loading, requireAuth, user, router]);

    return { user, profile, loading };
}
