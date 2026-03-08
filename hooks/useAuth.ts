import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';

export function useAuth(requireAuth: boolean = true) {
    const { user, profile, loading, refresh } = useAuthContext();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Redirection logic
        if (!loading && requireAuth && !user) {
            // Check if we are not already on the login page to avoid loops
            if (pathname !== '/login') {
                console.log('useAuth (Context-Bound): Redirecting to /login');
                router.push('/login');
            }
        }
    }, [loading, requireAuth, user, router, pathname]);

    return { user, profile, loading, refresh };
}
