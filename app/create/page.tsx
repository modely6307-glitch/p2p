'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder } from '@/utils/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2, Camera, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { uploadFile } from '@/utils/api';

export default function CreateWish() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    target_price: '',
    reward_fee: '',
    description: '',
    country: 'Japan',
    currency: 'USD',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const countries = [
    { name: 'Japan', flag: '🇯🇵' },
    { name: 'USA', flag: '🇺🇸' },
    { name: 'Korea', flag: '🇰🇷' },
    { name: 'Taiwan', flag: '🇹🇼' },
    { name: 'Thailand', flag: '🇹🇭' },
    { name: 'France', flag: '🇫🇷' },
  ];

  const currencies = [
    { code: 'USD', symbol: '$' },
    { code: 'TWD', symbol: 'NT$' },
    { code: 'JPY', symbol: '¥' },
    { code: 'KRW', symbol: '₩' },
    { code: 'EUR', symbol: '€' },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
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
        description: formData.description,
        country: formData.country,
        currency: formData.currency,
        photo_url: photo_url,
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating wish:', error);
      alert('Failed to create wish. Please check if the "wishes" storage bucket exists.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-0 hover:bg-transparent">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-2xl font-bold">Create Wish</h1>
      </header>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-muted-foreground">Item Image (Optional)</label>
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
                  <span className="text-[10px] mt-2 text-muted-foreground font-medium uppercase tracking-wider">Upload</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              )}
              <div className="flex-1 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Upload a clear photo</p>
                <p>Helps travelers find the exact item you want. JPG, PNG supported.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-muted-foreground">Country to Buy From</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="flex h-12 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {countries.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-muted-foreground">Currency</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="flex h-12 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {currencies.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.code} ({curr.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Item Name"
            name="item_name"
            placeholder="e.g. iPhone 15 Pro Max"
            value={formData.item_name}
            onChange={handleChange}
            required
          />

          <Textarea
            label="Description / Notes"
            name="description"
            placeholder="Specify color, size, model, and anything else important..."
            value={formData.description}
            onChange={handleChange}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`Target Price (${currencies.find(c => c.code === formData.currency)?.symbol || '$'})`}
              name="target_price"
              type="number"
              placeholder="999"
              value={formData.target_price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
            />
            <Input
              label={`Reward Fee (${currencies.find(c => c.code === formData.currency)?.symbol || '$'})`}
              name="reward_fee"
              type="number"
              placeholder="50"
              value={formData.reward_fee}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              fullWidth
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 rounded-xl"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Post Wish'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
