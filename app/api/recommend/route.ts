import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/utils/supabase/admin';

// Recommendation Schema for internal use
const recommendationSchema = z.object({
    title: z.string().describe('推薦精選指南標題'),
    description: z.string().describe('這三個月內該國的代購重點趨勢簡短介紹'),
    items: z.array(z.object({
        name: z.string().describe('商品名稱'),
        tier: z.enum(['low', 'mid', 'high']).describe('價格區間'),
        category: z.string().describe('商品分類，例如：藥妝、零食、家電'),
        price: z.number().describe('當地預估售價純數字'),
        currency: z.string().describe('幣別，例如 JPY, USD'),
        url: z.string().describe('商品網址。優先提供官網商品連結，但如果您不確定連結是否為死鏈 (404)，請一律防禦性降級，使用 Google 搜尋該項目的 URL (例如: https://www.google.com/search?q=商品名稱 + 品牌)'),
        reason: z.string().describe('推薦理由與近期網友評價 (約50字內)')
    })).describe('推薦商品清單(6-9樣)'),
    tip: z.string().describe('該國代購注意事項')
});

export async function POST(req: Request) {
    try {
        const {
            country,
            startDate,
            endDate,
            userPreferences,
            purchaseHistory,
            attempt = 1,
            isRefresh = false // New flag to force new AI generation
        } = await req.json();

        if (!country || !startDate || !endDate) {
            return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 0. Validate Environment Variables for Remote
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[Remote Error] GEMINI_API_KEY is missing in environment variables.');
            return new Response(JSON.stringify({ error: 'Server configuration error: Missing AI API Key' }), { status: 500 });
        }

        const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        /**
         * CACHE STRATEGY & PERSONALIZATION HOOK
         * For guest/unlogged users (no userPreferences), we use 'default' hash to share a single daily recommendation.
         * For future personalization (e.g., average order value, purchase history), 
         * we can generate a unique hash here to silo their specific recommended items.
         */
        const userPreferencesHash = userPreferences ? 'personal' : 'default';

        // 1. Try to fetch from Supabase Cache if not a manual refresh
        if (!isRefresh && attempt === 1) {
            const supabaseAdmin = getSupabaseAdmin();
            const { data: cached, error: cacheError } = await supabaseAdmin
                .from('ai_recommendation_cache')
                .select('recommendation_data')
                .eq('country', country)
                .eq('date_key', dateKey)
                .eq('user_preferences_hash', userPreferencesHash)
                .maybeSingle();

            if (cached && !cacheError) {
                console.log(`[Cache Hit] Serving daily recommendation for ${country} (${dateKey})`);
                return new Response(JSON.stringify(cached.recommendation_data), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (cacheError) {
                console.error('[Cache Error] Failed to fetch from Supabase:', cacheError);
            }
        }

        console.log(`[Cache Miss/Refresh] Generating new AI recommendations for ${country}. Attempt: ${attempt}`);

        const google = createGoogleGenerativeAI({
            apiKey: process.env.GEMINI_API_KEY,
        });

        // Personalization placeholders for future expansion
        const personalizationContext = userPreferences
            ? `特別優化給具有以下偏好的用戶: ${userPreferences}`
            : `針對大眾口味進行主流推薦`;

        const prompt = `
你是一位專業的「跨國代購購物顧問系統」。你的任務是為使用者推薦當前最熱門的代購商品。

【任務流程】
1. 搜尋網路趨勢：針對指定的「目標國家」，搜尋台灣各大論壇（如 PTT、Dcard、Mobile01）及最新社群討論。**請務必將搜尋範圍限制在 ${startDate} 到 ${endDate} 這三個月內的最新討論**，找出該國當前最熱門、鄉民最推薦的必買代購商品。
2. 結合使用者偏好：${personalizationContext}。如果提供了「使用者偏好」或「歷史購買數據」，請提高符合該偏好（如：美妝控、科技迷、零食愛好者）商品的推薦權重。
3. 篩選與分類：挑選出 6-9 樣最具代表性的商品，並依據價格分類為 low(平價好物), mid(人氣精選), high(奢華名品) 三個區區。
4. 提供詳細資訊：包含當地價格(純數字)、幣別、官方連結、生動的推薦理由。
5. **連結嚴格要求**：保證每個商品都必須有「url」欄位。提供連結的優先順序為：(1) 官網商品連結 (2) 品牌官網 (3) Google 搜尋商品關鍵字的連結。除非你「非常確定」該官網連結能夠正常存取且不是死鏈(404)，否則請一律防禦性降級，直接提供第(3)種 Google 搜尋連結（例如: https://www.google.com/search?q=商品名稱+品牌）！不要冒險給出無效的官方連結。
${attempt > 1 ? `6. **特別指示**：這是第 ${attempt} 次推薦請求，請務必提供與常規熱門推薦**完全不同**的商品選項，確保推薦的多樣性，不要重複常見的大眾商品！` : ''}

【輸入變數】
- 🌍 目標國家: ${country}
- 📅 搜尋時間範圍: ${startDate} 至 ${endDate} (僅參考此期間的資訊)
- 👤 使用者偏好: ${userPreferences || '無'}
- 🛒 歷史購買紀錄: ${purchaseHistory || '無'} 

請按照 JSON Schema 格式輸出。
`;

        const result = await streamObject({
            model: google('gemini-2.5-flash'),
            schema: recommendationSchema,
            prompt: prompt,
            onFinish: async ({ object }) => {
                if (object && attempt === 1 && !isRefresh) {
                    // Cache the first "stable" recommendation of the day
                    console.log(`[Cache Storage] Archiving daily recommendation for ${country} to Supabase`);
                    const supabaseAdmin = getSupabaseAdmin();
                    const { error: saveError } = await supabaseAdmin
                        .from('ai_recommendation_cache')
                        .upsert({
                            country,
                            date_key: dateKey,
                            recommendation_data: object,
                            user_preferences_hash: userPreferencesHash
                        }, { onConflict: 'country,date_key,user_preferences_hash' });

                    if (saveError) console.error('[Cache Save Error]:', saveError);
                }
            }
        });

        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error('Error in /api/recommend:', error);
        return new Response(JSON.stringify({
            error: 'Failed to generate recommendations',
            details: error.message || 'Unknown error',
            hint: 'Check if Supabase table ai_recommendation_cache exists and GEMINI_API_KEY is valid.'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
