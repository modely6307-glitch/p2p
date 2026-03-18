import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getURL } from './get-url';

describe('getURL', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        // Clear all environment variables that getURL uses
        delete process.env.NEXT_PUBLIC_SITE_URL;
        delete process.env.NEXT_PUBLIC_VERCEL_URL;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('returns NEXT_PUBLIC_SITE_URL if defined', () => {
        process.env.NEXT_PUBLIC_SITE_URL = 'https://my-site.com';
        expect(getURL()).toBe('https://my-site.com/');
    });

    it('returns NEXT_PUBLIC_VERCEL_URL if NEXT_PUBLIC_SITE_URL is not defined', () => {
        process.env.NEXT_PUBLIC_VERCEL_URL = 'my-vercel-site.vercel.app';
        expect(getURL()).toBe('https://my-vercel-site.vercel.app/');
    });

    it('returns default localhost:3000 if no env vars are defined', () => {
        // Mocking window is more complex in jsdom, but getURL handles it
        // In the test environment, if window is not defined, it should fallback to localhost
        expect(getURL()).toBe('http://localhost:3000/');
    });

    it('ensures the URL ends with a slash', () => {
        process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
        expect(getURL()).toBe('https://example.com/');
        
        process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/';
        expect(getURL()).toBe('https://example.com/');
    });

    it('ensures the URL has a protocol', () => {
        process.env.NEXT_PUBLIC_SITE_URL = 'example.com';
        expect(getURL()).toBe('https://example.com/');
    });
});
