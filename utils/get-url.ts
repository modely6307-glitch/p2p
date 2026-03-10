/**
 * Helper to get the current site URL dynamically.
 * Priority: NEXT_PUBLIC_SITE_URL > NEXT_PUBLIC_VERCEL_URL > localhost
 */
export const getURL = () => {
    let url =
        process?.env?.NEXT_PUBLIC_SITE_URL ?? // Custom site URL (Production)
        process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel
        (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000/');

    // Ensure it has a protocol
    url = url.includes('http') ? url : `https://${url}`;

    // Ensure it ends with a slash (or handles it consistently)
    return url.endsWith('/') ? url : `${url}/`;
};
