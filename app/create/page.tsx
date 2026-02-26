'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder } from '@/utils/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function CreateWish() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    target_price: '',
    reward_fee: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createOrder({
        buyer_id: 'mock-buyer-123', // Mock user ID
        item_name: formData.item_name,
        target_price: parseFloat(formData.target_price),
        reward_fee: parseFloat(formData.reward_fee),
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating wish:', error);
      alert('Failed to create wish. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          <Input
            label="Item Name"
            name="item_name"
            placeholder="e.g. iPhone 15 Pro Max"
            value={formData.item_name}
            onChange={handleChange}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Target Price ($)"
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
              label="Reward Fee ($)"
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
