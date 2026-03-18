'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { uploadFile } from '@/utils/api';
import { updateMyProfileAction } from '@/app/actions/profile';
import { Profile } from '@/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2, Camera, X, Check, Sparkles, Globe, ChevronRight, Star, ShoppingBag, Zap, Gem, PlusSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

import { useLanguage } from '@/context/LanguageContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiRecommendation } from '@/components/AiRecommendation';
import { openECPayCVSMap } from '@/lib/ecpay';
import { getURL } from '@/utils/get-url';

export default function CreateWish() {
  const router = useRouter();
  const { user, profile: userProfile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const processingRef = useRef(false);
  const { t } = useLanguage();
  const [step, setStep] = useState(0); // 0: Country, 1: Method, 2: AI Tiers, 3: Form
  const [method, setMethod] = useState<'custom' | 'ai' | null>(null);
  const [selectedTier, setSelectedTier] = useState<'low' | 'mid' | 'high'>('mid');
  const [showFormula, setShowFormula] = useState(false);
  const [rememberAddress, setRememberAddress] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLDivElement>(null);

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [formData, setFormData] = useState({
    item_name: '',
    target_price: '',
    reward_fee: '',
    description: '',
    shipping_address: '',
    require_receipt: false,
    require_model_number: false,
    country: 'Japan',
    currency: 'JPY',
    exchange_rate: '0.22',
    expected_shipping_date: '',
    auto_extend: true,
    payment_type: 'MATCH_ESCROW' as 'PRE_ESCROW' | 'MATCH_ESCROW',
    shipping_method: 'HOME' as 'HOME' | '711',
    cvs_store_info: null as any,
    recipient_name: '',
    recipient_phone: '',
    is_partial_payment: false,
    deposit_percentage: 100,
    shipping_fee: '0',
  });

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [settings, setSettings] = useState<import('@/types').SystemSettings | null>(null);

  useEffect(() => {
    // Listen for ECPay Store Selection message
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ECPAY_CVS_STORE_SELECTED') {
        const payload = event.data.payload;
        setFormData(prev => ({
          ...prev,
          cvs_store_info: payload,
          shipping_address: `${payload.store_name} (${payload.store_id}) - ${payload.store_address}`,
          shipping_method: '711',
          shipping_fee: '60'
        }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const simulateStoreSelection = () => {
    const mockStore = {
      store_id: '991182',
      store_name: '新台大門市',
      store_address: '台北市大安區羅斯福路四段1號',
      store_phone: '02-23637142'
    };
    setFormData(prev => ({
      ...prev,
      cvs_store_info: mockStore,
      shipping_address: `${mockStore.store_name} (${mockStore.store_id}) - ${mockStore.store_address}`,
      shipping_method: '711',
      shipping_fee: '60'
    }));
  };

  useEffect(() => {
    // Check for pending AI wish from landing page
    const pending = sessionStorage.getItem('pendingAiWish');
    if (pending) {
      try {
        const item = JSON.parse(pending);
        setFormData(prev => ({
          ...prev,
          item_name: item.name || '',
          target_price: item.price ? item.price.toString() : '',
          description: (item.desc || '') + (item.url ? `\n\n參考連結：${item.url}` : ''),
          country: item.country || 'Japan'
        }));
        setMethod('ai');
        setStep(3);
      } catch (e) {
        console.error('Failed to parse pending AI wish', e);
      }
      sessionStorage.removeItem('pendingAiWish');
    }

    const { fetchSystemSettings } = require('@/utils/api');
    fetchSystemSettings().then(setSettings);
  }, []);

  // Auto-fill address from profile
  useEffect(() => {
    if (userProfile?.address) {
      setFormData(prev => ({ ...prev, shipping_address: userProfile.address || '' }));
    }
  }, [userProfile]);

  const countries = [
    { name: 'Japan', flag: '🇯🇵', currency: 'JPY', defaultRate: 0.22 },
    { name: 'USA', flag: '🇺🇸', currency: 'USD', defaultRate: 32.5 },
    { name: 'Korea', flag: '🇰🇷', currency: 'KRW', defaultRate: 0.024 },
    { name: 'Taiwan', flag: '🇹🇼', currency: 'TWD', defaultRate: 1.0 },
    { name: 'Thailand', flag: '🇹🇭', currency: 'THB', defaultRate: 0.92 },
    { name: 'France', flag: '🇫🇷', currency: 'EUR', defaultRate: 35.2 },
  ];

  const currencies = [
    { code: 'TWD', symbol: 'NT$' },
    { code: 'USD', symbol: '$' },
    { code: 'JPY', symbol: '¥' },
    { code: 'KRW', symbol: '₩' },
    { code: 'EUR', symbol: '€' },
    { code: 'THB', symbol: '฿' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  const calculateFee = (subtotal: number) => {
    if (!settings) return subtotal < 1000 ? 20 : Math.round(subtotal * 0.02);
    if (subtotal < settings.buyer_fee_threshold) return settings.buyer_fee_fixed_amount;
    return Math.round(subtotal * (settings.buyer_fee_percentage / 100));
  };

  const calculateTravelerFee = (subtotal: number) => {
    if (!settings) return subtotal < 1000 ? 20 : Math.round(subtotal * 0.02);
    if (subtotal < settings.traveler_fee_threshold) return settings.traveler_fee_fixed_amount;
    return Math.round(subtotal * (settings.traveler_fee_percentage / 100));
  };

  const calculateSubtotal = () => {
    const price = parseFloat(formData.target_price || '0');
    const rate = parseFloat(formData.exchange_rate || '1');
    const reward = parseFloat(formData.reward_fee || '0');
    const shipping = parseFloat(formData.shipping_fee || '0');
    return (price * rate) + reward + shipping;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + calculateFee(subtotal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processingRef.current) return;
    processingRef.current = true;
    
    try {
      if (!user) { showAlert('請先登入'); return; }
      if (!userProfile) { showAlert('個人資料載入中，請稍後再試'); return; }

      // Explicit field validation with visible feedback
      const missingFields: string[] = [];
      if (!formData.item_name.trim()) missingFields.push('物品名稱');
      if (!formData.description.trim()) missingFields.push('描述/備註');
      if (!formData.recipient_name.trim()) missingFields.push('收件人姓名');
      if (!formData.recipient_phone.trim()) missingFields.push('收件人電話');
      if (!parseFloat(formData.target_price)) missingFields.push('物品原價');
      if (!parseFloat(formData.reward_fee) && parseFloat(formData.reward_fee) !== 0) missingFields.push('補貼/報酬');
      if (formData.shipping_method === 'HOME' && !formData.shipping_address.trim()) missingFields.push('收件地址');

      if (missingFields.length > 0) {
        showAlert(`請填寫以下必填欄位：${missingFields.join('、')}`);
        return;
      }

      if (rememberAddress && formData.shipping_address) {
        await updateMyProfileAction(user.id, {
          address: formData.shipping_address,
          phone: formData.recipient_phone,
          display_name: formData.recipient_name
        });
      }

      if (formData.shipping_method === '711' && !formData.cvs_store_info) {
        showAlert(t('create.select_store'));
        return;
      }

      const subtotal = calculateSubtotal();
      const fee = calculateFee(subtotal);
      const travelerFee = calculateTravelerFee(subtotal);

      // Date Validation
      if (!formData.expected_shipping_date) {
        setErrors(prev => ({ ...prev, expected_shipping_date: t('create.err_date_required') }));
        dateInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showAlert('請選擇預期回國日期');
        return;
      }

      const selectedDate = new Date(formData.expected_shipping_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (selectedDate < today) {
        showAlert(t('create.err_past_date'));
        return;
      }

      const threeDaysLater = new Date();
      threeDaysLater.setHours(0, 0, 0, 0);
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);

      if (!userProfile.is_verified && selectedDate < threeDaysLater) {
        showAlert(t('create.err_verified_only_3days'));
        return;
      }

      // Enforcement: Standard users limit 5000 TWD
      if (!userProfile.is_verified && (subtotal + fee) > 5000) {
        showAlert(t('create.limit_alert', { total: (subtotal + fee).toFixed(0) }));
        return;
      }

      setLoading(true);

      let photo_url = null;
      if (photo) {
        const path = `${user.id}/${Date.now()}-${photo.name}`;
        photo_url = await uploadFile(photo, 'wishes', path);
      }

      // Check AI Search eligibility
      const isUrgent = diffDays <= 7;
      const isHighValue = (subtotal + fee) > 10000;
      const isEligibleForAi = userProfile.is_verified && (isUrgent || isHighValue);

      const { createOrderAction } = await import('@/app/actions/orders');
      const result = await createOrderAction({
        item_name: formData.item_name,
        target_price: parseFloat(formData.target_price),
        reward_fee: parseFloat(formData.reward_fee),
        exchange_rate: parseFloat(formData.exchange_rate),
        description: formData.description,
        shipping_address: formData.shipping_address,
        require_receipt: formData.require_receipt as boolean,
        require_model_number: formData.require_model_number as boolean,
        country: formData.country,
        currency: formData.currency,
        photo_url: photo_url,
        buyer_platform_fee: fee,
        traveler_platform_fee: travelerFee,
        expected_shipping_date: formData.expected_shipping_date,
        auto_extend: formData.auto_extend,
        payment_type: formData.payment_type,
        shipping_method: formData.shipping_method,
        cvs_store_info: formData.cvs_store_info,
        recipient_name: formData.recipient_name,
        recipient_phone: formData.recipient_phone,
        shipping_fee: parseFloat(formData.shipping_fee || '0'),
        is_partial_payment: formData.is_partial_payment,
        deposit_percentage: formData.is_partial_payment ? formData.deposit_percentage : 100,
        deposit_amount: formData.is_partial_payment
          ? Math.round(calculateTotal() * (formData.deposit_percentage / 100))
          : calculateTotal(),
        payment_notification_sent: false,
        ai_search_status: isEligibleForAi ? 'PENDING' : null,
      });

      if (!result.success) throw new Error(result.error);

      if (isEligibleForAi) {
        fetch('/api/ai-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: result.orderId,
            itemName: formData.item_name,
            country: formData.country
          }),
          keepalive: true,
        }).catch(e => console.error('Failed to trigger AI Search:', e));
      }

      router.push(`/orders/${result.orderId}`);
    } catch (error: any) {
      console.error('Error creating wish:', error);
      showAlert(error?.message || t('create.fail') || '發布失敗，請稍後再試');
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'country') {
      const countryConfig = countries.find(c => c.name === value);
      if (countryConfig) {
        setFormData(prev => ({
          ...prev,
          country: value,
          currency: countryConfig.currency,
          exchange_rate: countryConfig.defaultRate.toString()
        }));
      }
      return;
    }

    if (name === 'currency') {
      const countryConfig = countries.find(c => c.currency === value);
      if (countryConfig) {
        setFormData(prev => ({
          ...prev,
          currency: value,
          exchange_rate: countryConfig.defaultRate.toString()
        }));
        return;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectRecommendation = (item: any) => {
    setFormData(prev => ({
      ...prev,
      item_name: item.name,
      target_price: item.price.toString(),
      reward_fee: item.reward.toString(),
      description: item.desc,
    }));
    setStep(3);
  };

  const handleCountrySelect = (c: any) => {
    const config = countries.find(x => x.name === c.name);
    if (config) {
      setFormData(prev => ({
        ...prev,
        country: config.name,
        currency: config.currency,
        exchange_rate: config.defaultRate.toString(),
      }));
    }
    setStep(1);
  };

  const currentCurrencySymbol = currencies.find(c => c.code === formData.currency)?.symbol || '$';

  return (
    <div className="min-h-screen bg-background pb-20 lg:p-8 pt-8 px-4 lg:px-0">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Inline alert (replaces native alert()) */}
        {alertMessage && (
          <div className="mx-4 lg:mx-0 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-medium">
            <span className="flex-1">{alertMessage}</span>
            <button onClick={() => setAlertMessage(null)} className="shrink-0 hover:text-red-900">✕</button>
          </div>
        )}

        <header className="flex items-center gap-4 px-4 lg:px-0">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : router.back()}
            className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight">{t('create.title')}</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
              {step === 0 && t('create.step_country')}
              {step === 1 && t('create.step_method')}
              {step === 2 && t('create.step_ai')}
              {step === 3 && t('create.description')}
            </p>
          </div>
        </header>

        {/* Step 0: Country Selection */}
        {step === 0 && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 px-4 lg:px-0">
            {countries.map((c) => (
              <Card
                key={c.name}
                onClick={() => handleCountrySelect(c)}
                className="p-6 cursor-pointer hover:border-primary/50 transition-all flex flex-col items-center gap-3 bg-secondary/5 border-border/50 group"
              >
                <span className="text-4xl group-hover:scale-110 transition-transform">{c.flag}</span>
                <span className="font-bold text-sm tracking-tight">{t(`countries.${c.name}`)}</span>
              </Card>
            ))}
          </div>
        )}

        {/* Step 1: Method Choice */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 px-4 lg:px-0">
            <Card
              onClick={() => { setMethod('custom'); setStep(3); }}
              className="p-6 cursor-pointer hover:border-primary/50 transition-all bg-secondary/5 border-border/50 group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Globe className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{t('create.method_custom')}</h3>
                <p className="text-xs text-muted-foreground">{t('create.method_custom_desc')}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Card>

            <Card
              onClick={() => { setMethod('ai'); setStep(2); }}
              className="p-6 cursor-pointer hover:border-primary/50 transition-all bg-primary/5 border-primary/20 group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-primary">{t('create.method_ai')}</h3>
                <p className="text-xs text-primary/60">{t('create.method_ai_desc')}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-primary/60" />
            </Card>
          </div>
        )}

        {/* Step 2: AI Recommendation UI */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 px-4 lg:px-0">
            <AiRecommendation
              country={formData.country}
              onProceed={() => setStep(3)}
              onSelectRecommendation={handleSelectRecommendation}
            />
          </div>
        )}

        {/* Step 3: Form */}
        {step === 3 && (
          <Card className="p-6 border-none shadow-none bg-transparent lg:bg-card lg:border lg:shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Country & Currency Info (ReadOnly Wrap) */}
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-border/30 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-2xl shadow-sm border border-border/50">
                    {countries.find(c => c.name === formData.country)?.flag}
                  </div>
                  <div>
                    <h4 className="text-sm font-black">{t(`countries.${formData.country}`)}</h4>
                    <p className="text-[10px] text-muted-foreground font-mono">{formData.currency} @ {formData.exchange_rate}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
                >
                  {t('create.step_country')}
                </button>
              </div>

              {/* Photo Section */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-muted-foreground">{t('create.photo')}</label>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border">
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute top-1 right-1 p-1 bg-background/80 backdrop-blur-sm rounded-full text-foreground hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                      <Camera className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-[10px] mt-2 text-muted-foreground font-medium uppercase tracking-wider">{t('create.upload')}</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  )}
                  <div className="flex-1 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">{t('create.upload')}</p>
                    <p>{t('create.upload_hint')}</p>
                  </div>
                </div>
              </div>

              <Input
                label={t('create.item_name')}
                name="item_name"
                placeholder={t('create.item_name_placeholder')}
                value={formData.item_name}
                onChange={handleChange}
                required
              />

              <Textarea
                label={t('create.description')}
                name="description"
                placeholder={t('create.description_placeholder')}
                value={formData.description}
                onChange={handleChange}
                required
              />

              {/* Shipping Method Selection */}
              <div className="space-y-4 pt-4 border-t border-border/10">
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{t('create.shipping_method')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, shipping_method: 'HOME', shipping_fee: p.shipping_method === '711' ? '0' : p.shipping_fee }))}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2",
                      formData.shipping_method === 'HOME'
                        ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                        : "bg-secondary/10 border-border/50 hover:bg-secondary/20"
                    )}
                  >
                    <Globe className={cn("w-5 h-5", formData.shipping_method === 'HOME' ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-xs font-bold">{t('create.home_delivery')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, shipping_method: '711', shipping_fee: '60' }))}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2",
                      formData.shipping_method === '711'
                        ? "bg-[#008134]/5 border-[#008134] ring-1 ring-[#008134]/20"
                        : "bg-secondary/10 border-border/50 hover:bg-secondary/20"
                    )}
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#008134] flex items-center justify-center text-white text-[10px] font-black">7</div>
                    <span className="text-xs font-bold">{t('create.cvs_pickup')}</span>
                  </button>
                </div>

                {formData.shipping_method === 'HOME' ? (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-muted-foreground">{t('create.shipping_address')}</label>
                    <Textarea
                      name="shipping_address"
                      placeholder={t('create.address_placeholder')}
                      value={formData.shipping_address}
                      onChange={handleChange}
                      required={formData.shipping_method === 'HOME'}
                      className="min-h-[80px]"
                    />
                    <p className="text-[10px] text-muted-foreground italic px-1">{t('create.address_privacy_hint')}</p>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer group px-1">
                      <input
                        type="checkbox"
                        checked={rememberAddress}
                        onChange={(e) => setRememberAddress(e.target.checked)}
                        className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        {t('create.remember_address')}
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    {formData.cvs_store_info ? (
                      <div className="p-4 rounded-2xl bg-[#008134]/5 border border-[#008134]/20 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-[#008134] flex items-center gap-2">
                              <Check className="w-4 h-4" />
                              {formData.cvs_store_info.store_name} ({formData.cvs_store_info.store_id})
                            </h4>
                            <p className="text-[10px] text-muted-foreground mt-1">{formData.cvs_store_info.store_address}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openECPayCVSMap({
                              IsCollection: 'N',
                              ServerReplyURL: `${getURL()}api/ecpay/cvs-callback`,
                              Device: window.innerWidth < 768 ? '1' : '0'
                            })}
                            className="text-[10px] h-7 px-2 hover:bg-[#008134]/10 hover:text-[#008134]"
                          >
                            {t('common.edit')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={() => openECPayCVSMap({
                              IsCollection: 'N',
                              ServerReplyURL: `${getURL()}api/ecpay/cvs-callback`,
                              Device: window.innerWidth < 768 ? '1' : '0'
                            })}
                            className="flex-1 h-12 rounded-2xl border-dashed border-2 bg-secondary/5 hover:bg-secondary/10 hover:border-[#008134]/50 text-muted-foreground hover:text-[#008134] transition-all flex items-center justify-center gap-2"
                          >
                            <PlusSquare className="w-5 h-5" />
                            <span className="font-bold">{t('create.select_store')}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={simulateStoreSelection}
                            className="h-12 px-4 rounded-2xl border-dashed border-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all text-[10px] font-black uppercase"
                          >
                            Mock
                          </Button>
                        </div>

                        {userProfile?.favorite_stores && userProfile.favorite_stores.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">{t('create.use_favorite')}</label>
                            <div className="flex flex-wrap gap-2">
                              {userProfile.favorite_stores.map((store) => (
                                <button
                                  key={store.store_id}
                                  type="button"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    cvs_store_info: store,
                                    shipping_address: `${store.store_name} (${store.store_id}) - ${store.store_address}`
                                  }))}
                                  className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-[#008134]/10 text-[#008134] border border-[#008134]/20 hover:bg-[#008134]/20 transition-colors"
                                >
                                  {store.store_name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground italic px-1">{t('create.address_privacy_hint')}</p>
                  </div>
                )}

                {/* Shipping Fee Input for non-711 methods */}
                <div className="animate-in fade-in slide-in-from-top-2">
                  <Input
                    label={t('create.shipping_fee') || '運費 (TWD)'}
                    name="shipping_fee"
                    type="number"
                    placeholder="0"
                    value={formData.shipping_fee}
                    onChange={handleChange}
                    disabled={formData.shipping_method === '711'}
                    className={cn(formData.shipping_method === '711' && "bg-secondary/20 opacity-70")}
                    hint={formData.shipping_method === '711' ? "7-11 運費固定為 60" : "請輸入物流預估運費"}
                  />
                </div>

                {/* Recipient Information (Always required for logistics tracking) */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Input
                    label={t('create.recipient_name')}
                    name="recipient_name"
                    placeholder={t('create.recipient_name_placeholder')}
                    value={formData.recipient_name}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label={t('create.recipient_phone')}
                    name="recipient_phone"
                    placeholder={t('create.recipient_phone_placeholder')}
                    value={formData.recipient_phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-muted-foreground">{t('create.shipping_date')}</label>
                  <div ref={dateInputRef}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full h-12 justify-start text-left font-normal rounded-xl border-border/50 transition-all",
                            !formData.expected_shipping_date && "text-muted-foreground",
                            errors.expected_shipping_date && "border-red-500 bg-red-500/5 ring-2 ring-red-500/20"
                          )}
                        >
                          <CalendarIcon className={cn("mr-2 h-4 w-4", errors.expected_shipping_date && "text-red-500")} />
                          {formData.expected_shipping_date ? (
                            format(new Date(formData.expected_shipping_date), "PPP")
                          ) : (
                            <span>{t('create.pick_date')}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.expected_shipping_date ? new Date(formData.expected_shipping_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setFormData(prev => ({ ...prev, expected_shipping_date: format(date, 'yyyy-MM-dd') }));
                              setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.expected_shipping_date;
                                return newErrors;
                              });
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.expected_shipping_date ? (
                      <p className="text-[10px] text-red-500 font-bold mt-1.5 px-1 animate-in fade-in slide-in-from-top-1">
                        ⚠️ {errors.expected_shipping_date}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic px-1 mt-1.5">{t('create.shipping_date_hint')}</p>
                    )}
                  </div>
                </div>

                <label className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/10 border border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_extend}
                    onChange={(e) => setFormData(p => ({ ...p, auto_extend: e.target.checked }))}
                    className="w-5 h-5 rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">{t('create.auto_extend')}</span>
                </label>

                {/* Partial Payment Option */}
                {(() => {
                  if (!formData.expected_shipping_date || !settings) return null;
                  const selectedDate = new Date(formData.expected_shipping_date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const partialDiffDays = Math.ceil((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                  if (partialDiffDays <= (settings.deposit_threshold_days || 30)) return null;

                  return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <label className="flex items-center gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-colors cursor-pointer ring-1 ring-blue-500/10">
                        <input
                          type="checkbox"
                          checked={formData.is_partial_payment}
                          onChange={(e) => setFormData(p => ({
                            ...p,
                            is_partial_payment: e.target.checked,
                            deposit_percentage: e.target.checked ? 30 : 100
                          }))}
                          className="w-5 h-5 rounded border-blue-300 text-blue-500 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-bold text-blue-700">{t('create.partial_payment')}</span>
                          <p className="text-[10px] text-blue-600/70 mt-0.5">{t('create.deposit_hint')}</p>
                        </div>
                      </label>

                      {formData.is_partial_payment && (
                        <div className="p-4 rounded-2xl bg-background border border-border shadow-sm space-y-3 animate-in fade-in zoom-in-95">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('create.deposit_percentage')}</label>
                          <div className="flex gap-2">
                            {[30, 50, 70].map(pct => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, deposit_percentage: pct }))}
                                className={cn(
                                  "flex-1 py-3 rounded-xl text-xs font-black transition-all border",
                                  formData.deposit_percentage === pct
                                    ? "bg-blue-500 text-white border-blue-600 shadow-md shadow-blue-500/20"
                                    : "bg-secondary/5 text-muted-foreground border-border/50 hover:bg-secondary/10"
                                )}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-3 bg-secondary/10 p-4 rounded-2xl border border-border/50">
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{t('create.proof_requirements')}</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-background/50 border border-border/30">
                    <div className="w-5 h-5 rounded flex items-center justify-center bg-primary text-primary-foreground">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-sm font-medium">{t('create.proof_purchase_photo')}</span>
                  </div>

                  <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-background/50 transition-colors cursor-pointer border border-transparent hover:border-border/30">
                    <input
                      type="checkbox"
                      checked={formData.require_receipt as boolean}
                      onChange={(e) => setFormData(p => ({ ...p, require_receipt: e.target.checked }))}
                      className="w-5 h-5 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium">{t('create.proof_receipt')}</span>
                  </label>

                  <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-background/50 transition-colors cursor-pointer border border-transparent hover:border-border/30">
                    <input
                      type="checkbox"
                      checked={formData.require_model_number as boolean}
                      onChange={(e) => setFormData(p => ({ ...p, require_model_number: e.target.checked }))}
                      className="w-5 h-5 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium">{t('create.proof_model')}</span>
                  </label>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{t('create.payment_type')}</label>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, payment_type: 'MATCH_ESCROW' }))}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-2xl border transition-all text-left",
                        formData.payment_type === 'MATCH_ESCROW'
                          ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                          : "bg-secondary/10 border-border/50 hover:bg-secondary/20"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5",
                        formData.payment_type === 'MATCH_ESCROW' ? "border-primary" : "border-muted-foreground"
                      )}>
                        {formData.payment_type === 'MATCH_ESCROW' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold">{t('create.match_escrow')}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{t('create.match_escrow_hint')}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, payment_type: 'PRE_ESCROW' }))}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-2xl border transition-all text-left relative overflow-hidden",
                        formData.payment_type === 'PRE_ESCROW'
                          ? "bg-primary/10 border-primary ring-2 ring-primary/30"
                          : "bg-secondary/10 border-border/50 hover:bg-secondary/20"
                      )}
                    >
                      {formData.payment_type === 'PRE_ESCROW' && (
                        <div className="absolute top-0 right-0 p-1 bg-primary text-primary-foreground text-[8px] font-black px-2 rounded-bl-lg uppercase tracking-tighter">Recommended</div>
                      )}
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5",
                        formData.payment_type === 'PRE_ESCROW' ? "border-primary" : "border-muted-foreground"
                      )}>
                        {formData.payment_type === 'PRE_ESCROW' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold flex items-center gap-2">
                          {t('create.pre_escrow')}
                          <div className="px-1.5 py-0.5 bg-primary/20 text-primary rounded-md text-[8px] font-black uppercase">Fast</div>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{t('create.pre_escrow_hint')}</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={`${t('create.price')} (${currentCurrencySymbol})`}
                    name="target_price"
                    type="number"
                    placeholder="0"
                    value={formData.target_price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                  />
                  <Input
                    label={t('create.ex_rate')}
                    name="exchange_rate"
                    type="number"
                    step="0.0001"
                    value={formData.exchange_rate}
                    onChange={handleChange}
                    disabled={formData.currency === 'TWD'}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Input
                    label={`${t('create.reward')} (NT$)`}
                    name="reward_fee"
                    type="number"
                    placeholder="0"
                    value={formData.reward_fee}
                    onChange={handleChange}
                    required
                    min="0"
                    step="1"
                  />
                  <p className="text-[10px] text-muted-foreground italic px-1">{t('create.reward_twd')}</p>
                </div>

                {(formData.target_price || formData.reward_fee) && (
                  <div className="space-y-2">
                    <div
                      className="bg-primary/5 rounded-xl p-3 flex justify-between items-center border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => setShowFormula(!showFormula)}
                    >
                      <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        {t('create.total_est')}
                        <span className="text-[10px] opacity-50 underline decoration-dotted">{showFormula ? '▲' : '▼'}</span>
                      </div>
                      <div className="text-lg font-black text-primary">
                        NT$ {calculateTotal().toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>

                    {showFormula && (
                      <div className="px-3 py-2 bg-secondary/20 rounded-lg border border-border/50 animate-in fade-in slide-in-from-top-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t('create.formula_title')}</p>
                        <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                          ({formData.target_price || 0} {formData.currency} × {formData.exchange_rate} <span className="text-[10px] text-primary/60 italic">{t('create.ex_rate')}</span>)
                          <br />+ NT$ {formData.reward_fee || 0} <span className="text-[10px] text-green-600/60 italic">{t('order.reward_fee')}</span>
                          <br />+ NT$ {formData.shipping_fee || 0} <span className="text-[10px] text-blue-600/60 italic">{t('create.shipping_fee')}</span>
                          <br />+ NT$ {calculateFee(calculateSubtotal())} <span className="text-[10px] text-red-500/60 italic">{t('create.platform_fee')}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-2 opacity-70 italic border-t border-border/30 pt-2">{t('create.formula_help')}</p>
                      </div>
                    )}

                    {formData.is_partial_payment && (
                      <div className="pt-3 space-y-2 border-t border-primary/20 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center text-blue-700 font-black">
                          <span className="text-[10px] uppercase tracking-wider">Pay Now ({formData.deposit_percentage}% Deposit)</span>
                          <span className="text-lg">NT${Math.round(calculateTotal() * (formData.deposit_percentage / 100)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground/60 text-[10px] font-bold">
                          <span className="uppercase tracking-widest">Balance Due Later</span>
                          <span>NT${(calculateTotal() - Math.round(calculateTotal() * (formData.deposit_percentage / 100))).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  fullWidth
                  disabled={loading}
                  className={cn(
                    "font-black h-14 rounded-2xl shadow-lg transition-all",
                    formData.payment_type === 'PRE_ESCROW'
                      ? "bg-primary shadow-primary/20 hover:scale-[1.02]"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : formData.payment_type === 'PRE_ESCROW' ? (
                    `立即支付 NT$ ${formData.is_partial_payment ? Math.round(calculateTotal() * (formData.deposit_percentage / 100)).toLocaleString() : calculateTotal().toLocaleString()} 並刊登`
                  ) : (
                    t('create.submit')
                  )}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground mt-3 px-4 leading-relaxed">
                  {formData.payment_type === 'PRE_ESCROW'
                    ? "✨ 優先刊登：支付後即開始託管，代購接單後系統將自動跳過款項等待階段。"
                    : "⏳ 一般刊登：發布廣告後無需立即支付，待有代購接單後再進行匯款即可。"}
                </p>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
