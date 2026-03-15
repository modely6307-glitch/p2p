import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  let currentOrderId = null;
  try {
    const body = await req.json();
    const { orderId, itemName, country, city, persist = true } = body;
    currentOrderId = orderId;

    if (!orderId || !itemName || !country) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is missing');
      return NextResponse.json({ error: 'Config error' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const locationStr = city ? `${country} 的 ${city} 區域` : country;
    const prompt = `你是一個專業的海外代購教練。
使用者想在 ${locationStr} 購買 "${itemName}"。
請幫我列出在該地區最有可能買到此商品的 3 個實體店名以及它們的大致地址。

請嚴格遵守以下 JSON 格式回傳，不要有任何額外的文字：
[
  {"name": "店名", "address": "大致地址", "mapUrl": "Google Map 搜尋連結"}
]
(mapUrl 請直接幫我生成 Google Maps 搜尋該店名的 URL，例如 https://www.google.com/maps/search/?api=1&query=店名)`;

    console.log(`[AI Search] Triggered for Order ${orderId}: ${itemName} in ${country}`);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(`[AI Search] Raw AI Response:`, text);
    
    // Clean up potential markdown code blocks
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let aiResults = [];
    try {
      aiResults = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('AI Response parse error:', cleanedText);
      throw new Error('AI produced invalid JSON');
    }

    if (persist) {
      const supabase = getSupabaseAdmin();

      const { error } = await supabase
        .from('orders')
        .update({
          ai_search_status: 'COMPLETED',
          ai_search_results: aiResults
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order with AI results:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`[AI Search] Successfully updated Order ${orderId}`);
    }

    return NextResponse.json({ success: true, results: aiResults });

  } catch (error: any) {
    console.error('Error in AI Search:', error);
    
    // Attempt to mark as FAILED in DB so front-end stops loading
    if (currentOrderId) {
        try {
            const supabase = getSupabaseAdmin();
            await supabase.from('orders').update({ ai_search_status: 'FAILED' }).eq('id', currentOrderId);
            console.log(`[AI Search] Marked Order ${currentOrderId} as FAILED`);
        } catch(e) {
            console.error('[AI Search] Failed to update status to FAILED:', e);
        }
    }

    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
