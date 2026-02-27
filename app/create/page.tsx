'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder, fetchProfile, uploadFile } from '@/utils/api';
import { Profile } from '@/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2, Camera, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

import { useLanguage } from '@/context/LanguageContext';

export default function CreateWish() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    item_name: '',
    target_price: '',
    reward_fee: '',
    description: '',
    country: 'Japan',
    currency: 'JPY',
    exchange_rate: '0.22',
  });

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile(user.id).then(setUserProfile);
    }
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

  const calculateTotal = () => {
    const price = parseFloat(formData.target_price || '0');
    const rate = parseFloat(formData.exchange_rate || '1');
    const reward = parseFloat(formData.reward_fee || '0');
    return (price * rate) + reward;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    const totalTwd = calculateTotal();

    // Enforcement: Standard users limit 5000 TWD
    if (userProfile.level === 'STANDARD' && totalTwd > 5000) {
      alert(t('create.limit_alert', { total: totalTwd.toFixed(0) }));
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
        country: formData.country,
        currency: formData.currency,
        photo_url: photo_url,
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
      const selectedCurrency = currencies.find(c => c.code === value);
      // If manually changing currency, we can also reset rate to a known default if available
      // but keeping it simple for now as country change is the main trigger.
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const currentCurrencySymbol = currencies.find(c => c.code === formData.currency)?.symbol || '$';

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-0 hover:bg-transparent">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-2xl font-bold">{t('create.title')}</h1>
      </header>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Country & Rate Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-muted-foreground">{t('create.country')}</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="flex h-12 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {countries.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.flag} {t(`countries.${c.name}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-muted-foreground text-[10px] uppercase truncate">{t('create.currency')}</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="flex h-12 w-full rounded-xl border border-input bg-transparent px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-muted-foreground text-[10px] uppercase truncate">{t('create.ex_rate')}</label>
                <Input
                  name="exchange_rate"
                  type="number"
                  step="0.0001"
                  value={formData.exchange_rate}
                  onChange={handleChange}
                  disabled={formData.currency === 'TWD'}
                  className="px-2"
                />
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
                    <p className="text-xs font-mono text-muted-foreground">
                      ({formData.target_price || 0} {formData.currency} × {formData.exchange_rate}) + {formData.reward_fee || 0}
                    </p>
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
    </div>
  );
}
