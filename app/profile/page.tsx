'use client';

import React, { useEffect, useState } from 'react';
import { fetchProfile, updateProfile } from '@/utils/api';
import { Profile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, User, Trophy, DollarSign, Star, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  const maskEmail = (email: string | undefined) => {
    if (!email) return 'User';
    const prefix = email.split('@')[0];
    const displayPrefix = prefix.slice(0, 3);
    return (displayPrefix + '***').slice(0, 6).padEnd(6, '*');
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const data = await fetchProfile(user.id);
      setProfile(data);
      setNewNickname(data.display_name || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNickname = async () => {
    if (!user || !newNickname.trim()) return;
    try {
      await updateProfile(user.id, { display_name: newNickname });
      setProfile(prev => prev ? { ...prev, display_name: newNickname } : null);
      setIsEditing(false);
    } catch (error) {
      alert('Failed to update nickname');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return <div>Profile not found</div>;

  const successRate = profile.total_rating_count > 0
    ? Math.round((profile.positive_rating_count / profile.total_rating_count) * 100)
    : 0;

  const displayName = profile.display_name || maskEmail(user?.email);

  return (
    <div className="p-4 space-y-6">
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
                  <Button size="sm" className="h-8 px-2" onClick={handleSaveNickname}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setIsEditing(false)}>Cancel</Button>
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
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold text-[10px]">{profile?.level || 'STANDARD'} USER</p>
          </div>
        </div>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="w-5 h-5" />
          </Button>
        )}
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-secondary/10 border-none shadow-none">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
            <span className="text-2xl font-bold">{profile.completed_orders_count}</span>
            <span className="text-xs text-muted-foreground">Orders Completed</span>
          </CardContent>
        </Card>

        <Card className="bg-secondary/10 border-none shadow-none">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <DollarSign className="w-6 h-6 text-green-500 mb-2" />
            <span className="text-2xl font-bold">${profile.total_order_amount.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">Total Volume</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Reputation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.total_rating_count === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No ratings yet
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-primary">{successRate}%</div>
                <div className="text-xs text-muted-foreground">Positive Rating</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{profile.total_rating_count}</div>
                <div className="text-xs text-muted-foreground">Total Reviews</div>
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
          Log Out
        </Button>
      </div>
    </div>
  );
}
