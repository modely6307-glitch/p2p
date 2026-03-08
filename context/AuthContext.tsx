'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/types';

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
    const mountedRef = useRef(true);
    const initDoneRef = useRef(false);

    const loadProfile = useCallback(async (uid: string): Promise<Profile | null> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', uid)
                .maybeSingle();
            if (error) {
                console.error('AuthContext: Profile fetch error', error);
                return null;
            }
            return data;
        } catch (e) {
            console.error('AuthContext: Profile fetch exception', e);
            return null;
        }
    }, []);

    // Centralized setter — only updates if still mounted
    const applyAuth = useCallback(async (authUser: User | null) => {
        if (!mountedRef.current) return;
        setUser(authUser);
        if (authUser) {
            const prof = await loadProfile(authUser.id);
            if (mountedRef.current) setProfile(prof);
        } else {
            setProfile(null);
        }
    }, [loadProfile]);

    const refresh = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        await applyAuth(session?.user ?? null);
    }, [applyAuth]);

    useEffect(() => {
        mountedRef.current = true;
        initDoneRef.current = false;

        const init = async () => {
            try {
                // ONLY use getSession() — fast, reads from localStorage, no network
                // This is the recommended approach by Supabase for client-side init
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('AuthContext: getSession error', error);
                }

                if (!mountedRef.current) return;

                const sessionUser = session?.user ?? null;
                await applyAuth(sessionUser);
            } catch (err) {
                console.error('AuthContext: Init error', err);
            } finally {
                if (mountedRef.current) {
                    setLoading(false);
                    initDoneRef.current = true;
                }
            }
        };

        init();

        // onAuthStateChange handles ALL subsequent updates:
        // - SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
        // - It automatically refreshes expired tokens
        // This is the correct way to keep auth state in sync
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mountedRef.current) return;

                const currentUser = session?.user ?? null;

                // Update user immediately
                setUser(currentUser);

                // Load profile for the user
                if (currentUser) {
                    const prof = await loadProfile(currentUser.id);
                    if (mountedRef.current) setProfile(prof);
                } else {
                    setProfile(null);
                }

                // Ensure loading is false after any auth event
                if (mountedRef.current) setLoading(false);
            }
        );

        return () => {
            mountedRef.current = false;
            subscription.unsubscribe();
        };
    }, [applyAuth, loadProfile]);

    // Safety net: NEVER stay loading for more than 2 seconds
    useEffect(() => {
        if (!loading) return;
        const timer = setTimeout(() => {
            if (loading && mountedRef.current) {
                console.warn('AuthContext: Safety timeout — force unlocking UI');
                setLoading(false);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [loading]);

    return (
        <AuthContext.Provider value={{ user, profile, loading, refresh }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => useContext(AuthContext);
