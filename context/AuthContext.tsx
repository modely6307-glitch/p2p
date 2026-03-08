'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/types';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    refresh: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const hasInitialized = useRef(false);
    const router = useRouter();
    const pathname = usePathname();

    const fetchProfile = async (uid: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', uid)
                .maybeSingle();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('AuthContext: Profile fetch error', e);
            return null;
        }
    };

    const initialize = async () => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        console.log('AuthContext: Initializing...');
        try {
            // 1. Instant local session check
            const { data: { session } } = await supabase.auth.getSession();
            let currentUser = session?.user ?? null;

            if (currentUser) {
                setUser(currentUser);
                const prof = await fetchProfile(currentUser.id);
                setProfile(prof);
            }

            // 2. Full network verify (essential for first load or refresh)
            const { data: { user: verifiedUser } } = await supabase.auth.getUser();
            if (verifiedUser) {
                setUser(verifiedUser);
                const prof = await fetchProfile(verifiedUser.id);
                setProfile(prof);
            } else {
                setUser(null);
                setProfile(null);
            }
        } catch (err) {
            console.error('AuthContext: Initialization error', err);
        } finally {
            setLoading(false);
            console.log('AuthContext: Initialization complete');
        }
    };

    useEffect(() => {
        initialize();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('AuthContext: Auth event:', event);
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                const prof = await fetchProfile(currentUser.id);
                setProfile(prof);
            } else {
                setProfile(null);
            }

            if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Safety timeout: If something hangs over 3s, unlock UI
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.warn('AuthContext: Safety timeout! Forcing loading=false');
                setLoading(false);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [loading]);

    const refresh = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);
        if (authUser) {
            const prof = await fetchProfile(authUser.id);
            setProfile(prof);
        } else {
            setProfile(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, refresh }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => useContext(AuthContext);
