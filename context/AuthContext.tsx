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

    const updateInternalState = useCallback(async (currentUser: User | null) => {
        if (!mountedRef.current) return;

        console.log('[DEBUG AuthContext] updateInternalState called, user:', currentUser?.id ?? 'null');
        setUser(currentUser);
        if (currentUser) {
            const prof = await loadProfile(currentUser.id);
            console.log('[DEBUG AuthContext] profile fetched:', prof ? 'ok' : 'null');
            if (mountedRef.current) setProfile(prof);
        } else {
            setProfile(null);
        }
    }, [loadProfile]);

    const refresh = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        await updateInternalState(session?.user ?? null);
    }, [updateInternalState]);

    useEffect(() => {
        mountedRef.current = true;
        let initialized = false;

        const initializeAuth = async () => {
            console.log('[DEBUG AuthContext] initializeAuth START');
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                console.log('[DEBUG AuthContext] getSession done, hasSession:', !!session, 'error:', error);
                if (error) throw error;
                await updateInternalState(session?.user ?? null);
            } catch (err) {
                console.error("AuthContext initialization error:", err);
            } finally {
                initialized = true;
                if (mountedRef.current) {
                    console.log('[DEBUG AuthContext] setLoading(false)');
                    setLoading(false);
                }
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: import('@supabase/supabase-js').AuthChangeEvent, session: import('@supabase/supabase-js').Session | null) => {
                console.log('[DEBUG AuthContext] onAuthStateChange event:', event, 'initialized:', initialized);
                if (event === 'INITIAL_SESSION') return;
                if (event === 'TOKEN_REFRESHED') return;
                // During initialization, getSession() already handles the current state.
                // Reacting to SIGNED_IN here would set `user` before `setLoading(false)`,
                // causing pages to see user!=null + loading=true and get stuck.
                if (!initialized) {
                    console.log('[DEBUG AuthContext] skipping event during init');
                    return;
                }

                const currentUser = session?.user ?? null;
                await updateInternalState(currentUser);
            }
        );

        return () => {
            mountedRef.current = false;
            subscription.unsubscribe();
        };
    }, [updateInternalState]);

    return (
        <AuthContext.Provider value={{ user, profile, loading, refresh }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => useContext(AuthContext);
