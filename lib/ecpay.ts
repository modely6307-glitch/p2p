export const ECPAY_CONFIG = {
    // Test Environment Settings (Stage)
    LOGISTICS_MAP_URL: 'https://logistics-stage.ecpay.com.tw/Express/map',
    MERCHANT_ID: '2000132', // Stage B2C Merchant ID
    HASH_KEY: '5294y06JbISpM5x9',
    HASH_IV: 'v77hoKGq4kWxNNIS',
};

export type ECPayCVSMapParams = {
    LogisticsType: 'CVS';
    LogisticsSubType: 'UNIMART';
    IsCollection: 'N' | 'Y';
    ServerReplyURL: string;
    ExtraData?: string;
    Device?: '0' | '1'; // 0: PC, 1: Mobile
};

/**
 * Creates a hidden form and submits it to ECPay to open the CVS Map.
 * Since this is a POST request, we must use a form.
 */
export function openECPayCVSMap(params: Omit<ECPayCVSMapParams, 'LogisticsType' | 'LogisticsSubType'>) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = ECPAY_CONFIG.LOGISTICS_MAP_URL;
    form.target = '_blank'; // Open map in new tab

    const data: Record<string, string> = {
        MerchantID: ECPAY_CONFIG.MERCHANT_ID,
        LogisticsType: 'CVS',
        LogisticsSubType: 'UNIMART',
        IsCollection: params.IsCollection,
        ServerReplyURL: params.ServerReplyURL,
        ExtraData: params.ExtraData || '',
        Device: params.Device || '0'
    };

    Object.entries(data).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}
