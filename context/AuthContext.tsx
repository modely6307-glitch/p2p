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

        setUser(currentUser);
        if (currentUser) {
            const prof = await loadProfile(currentUser.id);
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

        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                await updateInternalState(session?.user ?? null);
            } catch (err) {
                console.error("AuthContext initialization error:", err);
            } finally {
                if (mountedRef.current) {
                    setLoading(false);
                }
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: import('@supabase/supabase-js').AuthChangeEvent, session: import('@supabase/supabase-js').Session | null) => {
                if (event === 'INITIAL_SESSION') return;

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
