'use client';

import React, { useEffect, useState } from 'react';
import { fetchProfileAction, updateMyProfileAction } from '@/app/actions/profile';
import { Profile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Trophy, DollarSign, Star, LogOut, ShieldCheck, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { openECPayCVSMap } from '@/lib/ecpay';
import { getURL } from '@/utils/get-url';
import { PlusSquare, Trash2 } from 'lucide-react';

import { useLanguage } from '@/context/LanguageContext';

export default function ProfilePage() {
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const { language, setLanguage, t } = useLanguage();

  const maskEmail = (email: string | undefined) => {
    if (!email) return 'User';
    const prefix = email.split('@')[0];
    const displayPrefix = prefix.slice(0, 3);
    return (displayPrefix + '***').slice(0, 6).padEnd(6, '*');
  };

  // Use cached profile immediately, then fetch fresh data in the background.
  useEffect(() => {
    // If no user yet, wait for auth to finish before deciding
    if (!user) {
      if (!authLoading) {
        setLoading(false);
      }
      return;
    }

    // Show cached data instantly to avoid spinner on navigation
    if (authProfile) {
      setProfile(authProfile);
      setNewNickname(prev => prev || authProfile.display_name || '');
      setNewAddress(prev => prev || authProfile.address || '');
      setLoading(false);
    }

    // Always fetch fresh data in the background
    loadProfile();
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ECPAY_CVS_STORE_SELECTED') {
        const payload = event.data.payload;
        addFavoriteStore({
          store_id: payload.store_id,
          store_name: payload.store_name,
          store_address: payload.store_address
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [profile]);

  const addFavoriteStore = async (store: any) => {
    if (!user || !profile) return;
    const currentStores = profile.favorite_stores || [];
    if (currentStores.find(s => s.store_id === store.store_id)) return;

    const newStores = [...currentStores, store];
    try {
      const res = await updateMyProfileAction(user.id, { favorite_stores: newStores });
      if (!res.success) throw new Error(res.error);
      setProfile(prev => prev ? { ...prev, favorite_stores: newStores } : null);
    } catch (error) {
      console.error('Error updating favorite stores:', error);
    }
  };

  const removeFavoriteStore = async (storeId: string) => {
    if (!user || !profile) return;
    const newStores = (profile.favorite_stores || []).filter(s => s.store_id !== storeId);
    try {
      const res = await updateMyProfileAction(user.id, { favorite_stores: newStores });
      if (!res.success) throw new Error(res.error);
      setProfile(prev => prev ? { ...prev, favorite_stores: newStores } : null);
    } catch (error) {
      console.error('Error removing favorite store:', error);
    }
  };

  const simulateStoreSelection = () => {
    addFavoriteStore({
      store_id: '991182',
      store_name: '新台大門市 (Mock)',
      store_address: '台北市大安區羅斯福路四段1號'
    });
  };

  const loadProfile = async () => {
    if (!user) return;
    try {
      const res = await fetchProfileAction(user.id);
      if (!res.success || !res.data) throw new Error(res.error);
      const data = res.data;
      setProfile(data);
      setNewNickname(data.display_name || '');
      setNewAddress(data.address || '');
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNickname = async () => {
    if (!user || !newNickname.trim()) return;
    try {
      const res = await updateMyProfileAction(user.id, { display_name: newNickname });
      if (!res.success) throw new Error(res.error);
      setProfile(prev => prev ? { ...prev, display_name: newNickname } : null);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving nickname:', error);
    }
  };

  const handleSaveAddress = async () => {
    if (!user) return;
    try {
      const res = await updateMyProfileAction(user.id, { address: newAddress });
      if (!res.success) throw new Error(res.error);
      setProfile(prev => prev ? { ...prev, address: newAddress } : null);
      setIsEditingAddress(false);
    } catch (error) {
      console.error('Error saving address:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="p-4 pt-8 lg:p-8 space-y-6 max-w-2xl lg:mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-3xl skeleton shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-6 skeleton rounded-lg w-40" />
            <div className="h-4 skeleton rounded-lg w-28" />
          </div>
        </div>
        <div className="h-32 skeleton rounded-2xl" />
        <div className="h-48 skeleton rounded-2xl" />
      </div>
    );
  }

  if (!profile) return <div>{t('profile.not_found')}</div>;

  const successRate = profile.total_rating_count > 0
    ? Math.round((profile.positive_rating_count / profile.total_rating_count) * 100)
    : 0;

  const displayName = profile.display_name || maskEmail(user?.email);

  return (
    <div className="p-4 pt-8 lg:p-8 space-y-6 max-w-2xl lg:mx-auto">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    className="bg-background border border-border rounded px-2 py-1 text-sm font-bold w-32"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    autoFocus
                  />
                  <Button size="sm" className="h-8 px-2" onClick={handleSaveNickname}>{t('common.save')}</Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setIsEditing(false)}>{t('common.cancel')}</Button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold">{displayName}</h2>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="p-1 h-auto hover:bg-transparent text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucude-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                  </Button>
                  {profile?.is_verified && <ShieldCheck className="w-5 h-5 text-blue-500 fill-blue-500/10" />}
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold text-[10px]">
              {profile.level === 'ADMIN' ? t('profile.admin') : profile.level === 'VERIFIED' ? t('profile.verified_user') : t('profile.standard_user')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
            className="text-[10px] font-bold h-8 border border-border bg-secondary/20"
          >
            {language === 'zh' ? 'EN' : '繁中'}
          </Button>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground p-2">
              <LogOut className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-secondary/10 border-none shadow-none">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
            <span className="text-2xl font-bold">{profile.completed_orders_count}</span>
            <span className="text-xs text-muted-foreground">{t('profile.orders_completed')}</span>
          </CardContent>
        </Card>

        <Card className="bg-secondary/10 border-none shadow-none">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <DollarSign className="w-6 h-6 text-green-500 mb-2" />
            <span className="text-2xl font-bold">${profile.total_order_amount.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">{t('profile.total_volume')}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            {t('profile.address_label')}
          </CardTitle>
          {!isEditingAddress && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditingAddress(true)} className="text-xs text-primary h-auto p-0 hover:bg-transparent">
              {t('common.edit')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditingAddress ? (
            <div className="space-y-3">
              <Textarea
                className="min-h-[100px] text-sm"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder={t('create.address_placeholder')}
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-8" onClick={handleSaveAddress}>{t('common.save')}</Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => { setIsEditingAddress(false); setNewAddress(profile.address || ''); }}>{t('common.cancel')}</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed italic bg-secondary/5 p-3 rounded-xl border border-border/50">
              {profile.address || t('profile.no_address')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-[#008134]">
            <PlusSquare className="w-5 h-5" />
            {t('profile.favorite_stores')}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openECPayCVSMap({
                IsCollection: 'N',
                ServerReplyURL: `${getURL()}api/ecpay/cvs-callback`,
                Device: window.innerWidth < 768 ? '1' : '0'
              })}
              className="text-xs text-[#008134] h-auto p-0 hover:bg-transparent"
            >
              {t('profile.add_store')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={simulateStoreSelection}
              className="text-[10px] text-blue-500 font-bold h-auto p-0 hover:bg-transparent"
            >
              Mock
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(!profile.favorite_stores || profile.favorite_stores.length === 0) ? (
            <p className="text-sm text-muted-foreground italic text-center py-4">{t('profile.no_favorite_stores')}</p>
          ) : (
            <div className="space-y-3">
              {profile.favorite_stores.map((store) => (
                <div key={store.store_id} className="p-3 rounded-xl bg-[#008134]/5 border border-[#008134]/20 flex justify-between items-center group">
                  <div>
                    <h4 className="text-sm font-bold text-[#008134]">{store.store_name} ({store.store_id})</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">{store.store_address}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFavoriteStore(store.store_id)}
                    className="opacity-20 group-hover:opacity-100 transition-opacity p-2 h-auto text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            {t('profile.reputation')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.total_rating_count === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {t('profile.no_ratings')}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-primary">{successRate}%</div>
                <div className="text-xs text-muted-foreground">{t('profile.positive_rate')}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{profile.total_rating_count}</div>
                <div className="text-xs text-muted-foreground">{t('profile.total_reviews')}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="pt-4">
        <Button
          variant="outline"
          fullWidth
          onClick={handleLogout}
          className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-all rounded-xl h-12 font-semibold"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t('profile.logout_btn')}
        </Button>
      </div>
    </div>
  );
}
