'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchProfile } from '@/utils/api';
import { Profile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, User, Trophy, DollarSign, Star, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/hooks/useAuth';

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth(false);
  const targetUserId = params.id as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const maskEmail = (email: string | undefined) => {
    if (!email) return 'User';
    const prefix = email.split('@')[0];
    const displayPrefix = prefix.slice(0, 3);
    return (displayPrefix + '***').slice(0, 6).padEnd(6, '*');
  };

  useEffect(() => {
    // If user is looking at their own profile, redirect to the editable one
    if (currentUser?.id === targetUserId) {
        router.replace('/profile');
        return;
    }

    const loadProfile = async () => {
      try {
        const data = await fetchProfile(targetUserId);
        setProfile(data);
      } catch (error) {
        console.error('[DEBUG Profile] loadProfile ERROR:', error);
      } finally {
        setLoading(false);
      }
    };

    if (targetUserId) {
      loadProfile();
    }
  }, [targetUserId, currentUser, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return <div className="p-8 text-center">{t('profile.not_found')}</div>;

  const successRate = profile.total_rating_count > 0
    ? Math.round((profile.positive_rating_count / profile.total_rating_count) * 100)
    : 0;

  const displayName = profile.display_name || 'User';

  return (
    <div className="p-4 pt-8 lg:p-8 space-y-6 max-w-2xl lg:mx-auto">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2 text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" />
        返回
      </Button>

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{displayName}</h2>
                {profile?.is_verified && <ShieldCheck className="w-5 h-5 text-blue-500 fill-blue-500/10" />}
            </div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold text-[10px]">
              {profile.level === 'ADMIN' ? t('profile.admin') : profile.level === 'VERIFIED' ? t('profile.verified_user') : t('profile.standard_user')}
            </p>
          </div>
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
    </div>
  );
}
