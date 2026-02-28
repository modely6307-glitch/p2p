'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder, fetchProfile, uploadFile, updateProfile } from '@/utils/api';
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

export default function CreateWish() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const [step, setStep] = useState(0); // 0: Country, 1: Method, 2: AI Tiers, 3: Form
  const [method, setMethod] = useState<'custom' | 'ai' | null>(null);
  const [selectedTier, setSelectedTier] = useState<'low' | 'mid' | 'high'>('mid');
  const [showFormula, setShowFormula] = useState(false);
  const [rememberAddress, setRememberAddress] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dateInputRef = useRef<HTMLDivElement>(null);

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
  });

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<import('@/types').SystemSettings | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile(user.id).then(data => {
        setUserProfile(data);
        if (data.address) {
          setFormData(prev => ({ ...prev, shipping_address: data.address || '' }));
        }
      });
    }
    const { fetchSystemSettings } = require('@/utils/api');
    fetchSystemSettings().then(setSettings);
  }, [user]);

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

  const aiRecommendations: Record<string, { [key in 'low' | 'mid' | 'high']: { name: string, price: number, reward: number, desc: string, icon: any }[] }> = {
    Japan: {
      low: [
        { name: 'Kao Steam Eye Mask (12P)', price: 1200, reward: 150, desc: 'Popular relaxation item', icon: Zap },
        { name: 'Orihiro Konjac Jelly', price: 250, reward: 80, desc: 'Famous Japanese snack', icon: ShoppingBag },
        { name: 'DHC Lip Cream', price: 600, reward: 100, desc: 'Classic skincare item', icon: Star }
      ],
      mid: [
        { name: 'Pokemon Center Plush', price: 3500, reward: 500, desc: 'Authentic JP Pokemon merch', icon: Sparkles },
        { name: 'Shiseido Anessa Sunscreen', price: 2400, reward: 350, desc: 'No.1 sun protection', icon: Gem },
        { name: 'Porter Tokyo Card Case', price: 9500, reward: 800, desc: 'Premium crafted leather', icon: Gem }
      ],
      high: [
        { name: 'Nintendo Switch OLED', price: 37980, reward: 1500, desc: 'Latest hybrid console', icon: Sparkles },
        { name: 'Sony WH-1000XM5', price: 48000, reward: 2000, desc: 'Best-in-class noise canceling', icon: Zap },
        { name: 'SK-II Facial Treatment Essence', price: 22000, reward: 1200, desc: 'Legendary skincare water', icon: Gem }
      ]
    },
    USA: {
      low: [
        { name: 'Trader Joe Eco Bag', price: 5, reward: 200, desc: 'Sustainable canvas bag', icon: ShoppingBag },
        { name: 'Burt Bees Lip Balm', price: 4, reward: 100, desc: 'Natural beeswax formula', icon: Star },
        { name: 'CeraVe Daily Moisturizer', price: 15, reward: 200, desc: 'Dermatologist recommended', icon: Zap }
      ],
      mid: [
        { name: 'Stanley Quencher H2.0', price: 45, reward: 600, desc: 'Viral insulated tumbler', icon: Sparkles },
        { name: 'Lululemon Everywhere Belt Bag', price: 38, reward: 500, desc: 'Trendy cross-body bag', icon: Gem },
        { name: 'Coach Card Case', price: 75, reward: 800, desc: 'Classic canvas design', icon: Gem }
      ],
      high: [
        { name: 'Apple iPad Air (M2)', price: 599, reward: 2000, desc: 'Powerful versatile tablet', icon: Sparkles },
        { name: 'Dyson Airwrap Styler', price: 599, reward: 2500, desc: 'The ultimate hair tool', icon: Zap },
        { name: 'Michael Kors Mercer Tote', price: 298, reward: 1500, desc: 'Luxury leather handbag', icon: Gem }
      ]
    }
  };

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
    return (price * rate) + reward;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + calculateFee(subtotal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    if (rememberAddress && formData.shipping_address) {
      await updateProfile(user.id, { address: formData.shipping_address });
    }

    const subtotal = calculateSubtotal();
    const fee = calculateFee(subtotal);
    const travelerFee = calculateTravelerFee(subtotal);

    // Date Validation
    if (!formData.expected_shipping_date) {
      setErrors(prev => ({ ...prev, expected_shipping_date: t('create.err_date_required') }));
      dateInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const selectedDate = new Date(formData.expected_shipping_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      alert(t('create.err_past_date'));
      return;
    }

    const threeDaysLater = new Date();
    threeDaysLater.setHours(0, 0, 0, 0);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    if (userProfile.level === 'STANDARD' && selectedDate < threeDaysLater) {
      alert(t('create.err_verified_only_3days'));
      return;
    }

    // Enforcement: Standard users limit 5000 TWD
    if (userProfile.level === 'STANDARD' && (subtotal + fee) > 5000) {
      alert(t('create.limit_alert', { total: (subtotal + fee).toFixed(0) }));
      return;
    }

    setLoading(true);

    try {
      let photo_url = null;
      if (photo) {
        const path = `${user.id}/${Date.now()}-${photo.name}`;
        photo_url = await uploadFile(photo, 'wishes', path);
      }

      await createOrder({
        buyer_id: user.id,
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
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating wish:', error);
      alert(t('create.fail'));
    } finally {
      setLoading(false);
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

        {/* Step 2: AI Tiers */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 px-4 lg:px-0">
            <div className="flex bg-secondary/30 p-1 rounded-xl w-full">
              {(['low', 'mid', 'high'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`flex-1 py-3 rounded-lg text-xs font-black transition-all ${selectedTier === tier ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                >
                  {t(`create.tier_${tier}`)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {(aiRecommendations[formData.country]?.[selectedTier] || aiRecommendations['Japan'][selectedTier]).map((item, idx) => {
                const ItemIcon = item.icon || ShoppingBag;
                return (
                  <Card
                    key={idx}
                    onClick={() => handleSelectRecommendation(item)}
                    className="p-4 cursor-pointer hover:border-primary/50 transition-all border-border/50 bg-secondary/5 group flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <ItemIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{item.name}</h4>
                      <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-black text-primary">{currencies.find(cu => cu.code === formData.currency)?.symbol}{item.price.toLocaleString()}</span>
                        <span className="text-[9px] text-green-600 font-bold bg-green-500/10 px-1.5 rounded-full">+NT${item.reward} Reward</span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
            <p className="text-[10px] text-center text-muted-foreground italic">{t('create.recommendation_hint')}</p>
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

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-muted-foreground">{t('create.shipping_address')}</label>
                <Textarea
                  name="shipping_address"
                  placeholder={t('create.address_placeholder')}
                  value={formData.shipping_address}
                  onChange={handleChange}
                  required
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
                          <br />+ NT$ {calculateFee(calculateSubtotal())} <span className="text-[10px] text-red-500/60 italic">{t('create.platform_fee')}</span>
                        </p>
                        <div className="mt-2 pt-2 border-t border-border/30">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t('create.platform_fee')}</p>
                          <p className="text-xs">NT$ {calculateFee(calculateSubtotal())}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 opacity-70 italic">{t('create.formula_help')}</p>
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 rounded-xl"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('create.submit')}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
