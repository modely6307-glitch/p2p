'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  fetchOrderById,
  updateOrderStatus,
  assignTraveler,
  updateOrderDetails,
  uploadFile,
  rateUser,
  incrementOrderStats
} from '@/utils/api';
import { Order, OrderStatus } from '@/types';
import { StepProgressBar } from '@/components/StepProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, Truck, CheckCircle, AlertTriangle, ShieldCheck, ThumbsUp, ThumbsDown, Camera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const getCurrencySymbol = (currency: string) => {
  const symbols: Record<string, string> = {
    'USD': '$',
    'TWD': 'NT$',
    'JPY': '¥',
    'KRW': '₩',
    'EUR': '€',
  };
  return symbols[currency] || '$';
};

import { getCountryFlag } from '@/utils/countries';
import { useLanguage } from '@/context/LanguageContext';

const maskEmail = (email: string | undefined) => {
  if (!email) return 'User';
  const prefix = email.split('@')[0];
  const displayPrefix = prefix.slice(0, 3);
  return (displayPrefix + '***').slice(0, 6).padEnd(6, '*');
};

export default function OrderDetails() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'buyer' | 'traveler' | 'admin'>('buyer');
  const [uploading, setUploading] = useState(false);
  const [purchasePhotoUploading, setPurchasePhotoUploading] = useState(false);
  const [modelNumberInput, setModelNumberInput] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showFormula, setShowFormula] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrder();
    }
  }, [id, user]);

  const loadOrder = async () => {
    try {
      const data = await fetchOrderById(id);
      setOrder(data);

      // Auto-set role based on current user
      if (user) {
        if (data.buyer_id === user.id) {
          setRole('buyer');
        } else if (data.traveler_id === user.id) {
          setRole('traveler');
        } else {
          setRole('traveler');
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async () => {
    if (!order || !user) return;
    try {
      await assignTraveler(order.id, user.id);
      await loadOrder();
    } catch (error) {
      console.error('Error accepting order:', error);
    }
  };

  const handleConfirmEscrow = async () => {
    if (!order) return;
    try {
      await updateOrderStatus(order.id, 'ESCROWED');
      await loadOrder();
    } catch (error) {
      console.error('Error confirming escrow:', error);
    }
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!order || !user || !e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const path = `${order.id}/receipt-${Date.now()}`;
      const url = await uploadFile(file, 'receipts', path);

      await updateOrderDetails(order.id, {
        receipt_url: url,
        status: 'BOUGHT'
      });
      await loadOrder();
    } catch (error) {
      console.error('Error uploading receipt:', error);
      alert(t('error') + ': Firebase Storage');
    } finally {
      setUploading(false);
    }
  };

  const handleAddTracking = async () => {
    if (!order || !trackingNumber) return;
    try {
      await updateOrderDetails(order.id, {
        tracking_number: trackingNumber,
        status: 'SHIPPED'
      });
      await loadOrder();
    } catch (error) {
      console.error('Error adding tracking:', error);
    }
  };

  const handleUploadPurchasePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!order || !user || !e.target.files || e.target.files.length === 0) return;
    setPurchasePhotoUploading(true);
    try {
      const file = e.target.files[0];
      const path = `${order.id}/purchase-${Date.now()}`;
      const url = await uploadFile(file, 'purchase_photos', path);

      await updateOrderDetails(order.id, {
        purchase_photo_url: url
      });
      await loadOrder();
    } catch (error) {
      console.error('Error uploading purchase photo:', error);
      alert(t('error'));
    } finally {
      setPurchasePhotoUploading(false);
    }
  };

  const handleUpdateModelNumber = async () => {
    if (!order || !modelNumberInput) return;
    try {
      await updateOrderDetails(order.id, {
        model_number: modelNumberInput
      });
      await loadOrder();
    } catch (error) {
      console.error('Error updating model number:', error);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!order || !order.traveler_id) return;
    try {
      await updateOrderStatus(order.id, 'COMPLETED');
      await incrementOrderStats(order.traveler_id, order.target_price + order.reward_fee);
      await loadOrder();
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  const handleRateUser = async (isPositive: boolean) => {
    if (!order) return;
    const targetUserId = role === 'buyer' ? order.traveler_id : order.buyer_id;
    if (!targetUserId) return;
    try {
      await rateUser(targetUserId, isPositive);
      setRatingSubmitted(true);
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return <div className="p-4 text-center">{t('common.no_data')}</div>;
  }

  const currencySymbol = getCurrencySymbol(order.currency);
  const countryConfig = getCountryFlag(order.country);

  const partnerProfile = role === 'buyer' ? order.traveler : order.buyer;
  const partnerRoleName = role === 'buyer' ? t('order.traveler') : t('order.buyer');
  const partnerDisplayName = partnerProfile?.display_name || maskEmail(partnerProfile?.email || undefined);
  const partnerRating = partnerProfile?.total_rating_count && partnerProfile.total_rating_count > 0
    ? Math.round((partnerProfile.positive_rating_count / partnerProfile.total_rating_count) * 100)
    : null;

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 max-w-3xl lg:mx-auto">
      {/* Role Switcher for Demo */}
      <div className="flex justify-end gap-2 mb-4">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
          className="bg-secondary text-secondary-foreground text-xs rounded p-1"
        >
          <option value="buyer">{t('order.buyer')}</option>
          <option value="traveler">{t('order.traveler')}</option>
          <option value="admin">{t('profile.admin')}</option>
        </select>
      </div>

      <header>
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-secondary text-secondary-foreground flex items-center gap-1">
                {countryConfig.flag} {t(`countries.${order.country}`)}
              </span>
              <StatusBadge status={order.status} />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold">{order.item_name}</h1>
            <p className="text-muted-foreground text-xs">{t('order.order_no')} #{order.id.slice(0, 8)}</p>
          </div>
        </div>

        {/* Partner Profile Display */}
        {partnerProfile && (
          <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-lg">👤</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{partnerRoleName}</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm">{partnerDisplayName}</p>
                  {partnerProfile.is_verified && <ShieldCheck className="w-4 h-4 text-blue-500 fill-blue-500/10" />}
                </div>
              </div>
            </div>
            {partnerRating !== null && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('profile.reputation')}</p>
                <p className="text-sm font-black text-yellow-600">⭐ {partnerRating}%</p>
              </div>
            )}
          </div>
        )}

        {order.photo_url && (
          <div className="mb-4 rounded-2xl overflow-hidden border border-border shadow-sm">
            <img src={order.photo_url} alt={order.item_name} className="w-full h-auto max-h-64 object-cover" />
          </div>
        )}

        <div className="bg-secondary/10 p-4 rounded-2xl border border-border/50 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 text-[10px]">{t('order.wish_notes')}</h3>
          <p className="text-sm leading-relaxed">{order.description}</p>
        </div>

        {order.shipping_address && (
          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-2 text-[10px] flex items-center gap-2">
              <ShieldCheck className="w-3 h-3" />
              {t('order.shipping_info_title')}
            </h3>
            {(() => {
              const isRevealed = role === 'buyer' || role === 'admin' || ['ESCROWED', 'BOUGHT', 'SHIPPED', 'COMPLETED'].includes(order.status);
              if (isRevealed) {
                return <p className="text-sm font-medium">{order.shipping_address}</p>;
              } else {
                return (
                  <div className="flex items-center gap-2 text-muted-foreground italic">
                    <span className="text-sm">🔒 {t('order.address_locked')}</span>
                  </div>
                );
              }
            })()}
          </div>
        )}
      </header>

      <StepProgressBar currentStatus={order.status} />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">{t('order.target_price')}</span>
            <div className="text-right">
              <div className="font-medium text-sm">
                {currencySymbol}{order.target_price}
                <span className="text-[10px] text-muted-foreground ml-1 font-normal">(@ {order.exchange_rate})</span>
              </div>
              <div className="text-[10px] text-muted-foreground">≈ NT${Math.round(order.target_price * (order.exchange_rate || 1)).toLocaleString()}</div>
            </div>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">{t('order.reward_fee')}</span>
            <span className="font-bold text-green-600">NT${order.reward_fee.toLocaleString()}</span>
          </div>
          {role !== 'traveler' && order.buyer_platform_fee > 0 && (
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">{t('create.buyer_fee')}</span>
              <span className="font-medium text-xs text-muted-foreground">NT${order.buyer_platform_fee.toLocaleString()}</span>
            </div>
          )}
          {order.expected_shipping_date && (
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">{t('create.shipping_date')}</span>
              <span className="font-bold flex items-center gap-1">
                📅 {order.expected_shipping_date}
                {order.auto_extend && <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1 rounded ml-1">Auto-Extend</span>}
              </span>
            </div>
          )}
          <div className="flex justify-between py-4 items-center">
            <span className="font-black text-foreground">
              {role === 'traveler' ? t('order.budget_info') : t('order.total_budget')}
            </span>
            <div className="text-right">
              <div className="text-2xl font-black text-primary">
                NT${(role === 'traveler'
                  ? Math.round((order.target_price * (order.exchange_rate || 1)) + order.reward_fee)
                  : order.total_amount_twd || 0
                ).toLocaleString()}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {role === 'traveler' ? t('order.traveler_gross_total') : `(${t('order.buyer_paid_total')})`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {role === 'traveler' && order.traveler_platform_fee > 0 && (
        <div className="space-y-2">
          <div
            className="bg-green-500/5 rounded-2xl p-4 border border-green-500/20 cursor-pointer hover:bg-green-500/10 transition-colors flex justify-between items-center"
            onClick={() => setShowFormula(!showFormula)}
          >
            <div>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">
                {t('order.traveler_net')}
                <span className="ml-1 opacity-50 underline decoration-dotted">{showFormula ? '▲' : '▼'}</span>
              </p>
              <p className="font-black text-xl text-green-600">
                NT$ {((order.target_price * (order.exchange_rate || 1)) + order.reward_fee - (order.traveler_platform_fee || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">{t('create.traveler_fee')}</p>
              <p className="text-xs font-bold text-red-500">-NT${order.traveler_platform_fee}</p>
            </div>
          </div>

          {showFormula && (
            <div className="px-4 py-3 bg-secondary/20 rounded-xl border border-border/50 animate-in fade-in slide-in-from-top-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{t('create.formula_title')}</p>
              <div className="space-y-1 text-xs font-mono text-muted-foreground">
                <div className="flex justify-between">
                  <span>({order.target_price} {order.currency} × {order.exchange_rate})</span>
                  <span>NT$ {Math.round(order.target_price * (order.exchange_rate || 1))}</span>
                </div>
                <div className="flex justify-between">
                  <span>+ {t('order.reward_fee')}</span>
                  <span>NT$ {order.reward_fee}</span>
                </div>
                <div className="flex justify-between text-red-500/70">
                  <span>- {t('create.traveler_fee')}</span>
                  <span>NT$ {order.traveler_platform_fee}</span>
                </div>
                <div className="pt-1 border-t border-border/30 flex justify-between font-bold text-foreground">
                  <span>{t('order.traveler_net')}</span>
                  <span>NT$ {Math.round((order.target_price * (order.exchange_rate || 1)) + order.reward_fee - (order.traveler_platform_fee || 0))}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(order.receipt_url || order.tracking_number) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              {t('order.delivery_info')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.purchase_photo_url && (
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('create.proof_purchase_photo')}</span>
                <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-background p-1">
                  <img src={order.purchase_photo_url} alt="Purchase" className="w-full h-auto max-h-48 object-contain rounded-lg" />
                </div>
              </div>
            )}
            {order.receipt_url && (
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('create.proof_receipt')}</span>
                <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-background p-1">
                  <img src={order.receipt_url} alt="Receipt" className="w-full h-auto max-h-48 object-contain rounded-lg" />
                </div>
              </div>
            )}
            {order.model_number && (
              <div className="flex justify-between items-center bg-background p-3 rounded-xl border border-border/50">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('create.proof_model')}</span>
                <span className="font-mono text-sm font-bold bg-muted px-2 py-1 rounded">{order.model_number}</span>
              </div>
            )}
            {order.tracking_number && (
              <div className="flex justify-between items-center bg-background p-3 rounded-xl border border-border/50">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('order.tracking_no')}</span>
                <span className="font-mono text-sm font-bold bg-muted px-2 py-1 rounded">{order.tracking_number}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-secondary/20 border-primary/20">
        <CardContent className="pt-6">
          {order.status === 'OPEN' && (
            <div className="space-y-4">
              {role !== 'traveler' ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <CardTitle className="text-base">{t('status.OPEN')}</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('order.wait_accept')}</p>
                </>
              ) : (
                <Button onClick={handleAcceptOrder} fullWidth className="h-14 font-black text-lg shadow-xl shadow-primary/20 bg-primary hover:scale-[1.02] transition-transform">
                  {t('order.accept_btn')}
                </Button>
              )}
            </div>
          )}

          {order.status === 'MATCHED' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <CardTitle className="text-base">{role === 'buyer' ? t('order.wait_escrow') : '等待買家付款'}</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">{t('order.buyer_pay_hint')}</p>
              {role === 'admin' && (
                <Button onClick={handleConfirmEscrow} fullWidth variant="outline" className="h-12 font-bold">
                  {t('order.admin_confirm_escrow')}
                </Button>
              )}
            </div>
          )}

          {order.status === 'ESCROWED' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <CardTitle className="text-base">{role === 'traveler' ? (t('translations.order.next_steps_escrowed') || '買方已付款, 請提供採購證明') : t('status.ESCROWED')}</CardTitle>
              </div>

              <div className="space-y-6">
                <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                  <p className="text-sm font-bold text-primary mb-1">{t('order.traveler_buy_hint')}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('order.upload_guide')}</p>
                </div>

                {role === 'traveler' && (
                  <div className="space-y-6">
                    {/* Mandatory Product Photo */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('create.proof_purchase_photo')}</p>
                      {order.purchase_photo_url ? (
                        <div className="relative rounded-xl overflow-hidden border border-border group">
                          <img src={order.purchase_photo_url} alt="Purchase" className="w-full h-auto max-h-48 object-cover" />
                          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <input type="file" onChange={handleUploadPurchasePhoto} className="hidden" />
                            <span className="text-white text-xs font-bold">{t('order.receipt_update')}</span>
                          </label>
                        </div>
                      ) : (
                        <div className="relative group">
                          <input
                            type="file"
                            onChange={handleUploadPurchasePhoto}
                            disabled={purchasePhotoUploading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="h-24 border-2 border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors">
                            <Camera className={`w-8 h-8 ${purchasePhotoUploading ? 'animate-bounce' : ''} text-primary mb-2`} />
                            <p className="text-xs font-bold text-primary uppercase tracking-wider">
                              {purchasePhotoUploading ? t('common.loading') : t('order.upload_purchase_photo')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Optional Receipt */}
                    {order.require_receipt && (
                      <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('create.proof_receipt')}</p>
                        {order.receipt_url ? (
                          <div className="relative rounded-xl overflow-hidden border border-border group">
                            <img src={order.receipt_url} alt="Receipt" className="w-full h-auto max-h-48 object-cover" />
                            <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                              <input type="file" onChange={handleUploadReceipt} className="hidden" />
                              <span className="text-white text-xs font-bold">{t('order.receipt_update')}</span>
                            </label>
                          </div>
                        ) : (
                          <div className="relative group">
                            <input
                              type="file"
                              onChange={handleUploadReceipt}
                              disabled={uploading}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="h-24 border-2 border-dashed border-border/30 rounded-xl flex flex-col items-center justify-center bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                              <Upload className={`w-8 h-8 ${uploading ? 'animate-bounce' : ''} text-muted-foreground mb-2`} />
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {uploading ? t('common.loading') : t('order.receipt_update')}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Optional Model Number */}
                    {order.require_model_number && (
                      <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('create.proof_model')}</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder={t('order.model_placeholder')}
                            value={modelNumberInput || order.model_number || ''}
                            onChange={(e) => setModelNumberInput(e.target.value)}
                          />
                          <Button
                            size="sm"
                            onClick={handleUpdateModelNumber}
                            disabled={!modelNumberInput || modelNumberInput === order.model_number}
                          >
                            {t('common.save')}
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">{t('order.proof_guide_model')}</p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-border/30">
                      <Button
                        fullWidth
                        className="h-12 font-bold"
                        disabled={!order.purchase_photo_url || (order.require_receipt && !order.receipt_url) || (order.require_model_number && !order.model_number)}
                        onClick={async () => {
                          await updateOrderStatus(order.id, 'BOUGHT');
                          await loadOrder();
                        }}
                      >
                        {t('admin.finish_purchase_btn')}
                      </Button>
                      {(!order.purchase_photo_url || (order.require_receipt && !order.receipt_url) || (order.require_model_number && !order.model_number)) && (
                        <p className="text-[9px] text-red-500 mt-2 text-center font-bold animate-pulse">請先完成所有要求的證明上傳</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {order.status === 'BOUGHT' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <CardTitle className="text-base">{t('status.BOUGHT')}</CardTitle>
              </div>
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                <p className="text-xs font-bold text-primary uppercase tracking-widest text-[10px]">{t('order.shipping_info')}</p>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('order.tracking_placeholder')}
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="bg-background"
                  />
                  <Button onClick={handleAddTracking} className="px-6 font-bold">{t('order.ship_btn')}</Button>
                </div>
              </div>
            </div>
          )}

          {order.status === 'SHIPPED' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <CardTitle className="text-base">{t('status.SHIPPED')}</CardTitle>
              </div>
              <div className="flex items-center gap-2 text-blue-500 mb-2">
                <Truck className="w-5 h-5" />
                <span className="text-sm font-medium">{t('order.shipped_msg')}</span>
              </div>
              <p className="text-sm">{t('order.tracking_no')}：<span className="font-mono bg-muted px-1 rounded">{order.tracking_number}</span></p>
              {role === 'buyer' && (
                <Button onClick={handleConfirmReceipt} fullWidth className="bg-green-600 hover:bg-green-700 font-bold h-12 rounded-xl mt-4">
                  {t('order.received_btn')}
                </Button>
              )}
            </div>
          )}

          {order.status === 'COMPLETED' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-600" />
                <CardTitle className="text-base">{t('status.COMPLETED')}</CardTitle>
              </div>
              <div className="text-center py-4 bg-green-500/5 rounded-2xl border border-green-500/10">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-500 mb-2">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-green-600">{t('order.completed_msg')}</h3>
                <p className="text-sm text-muted-foreground">{t('order.release_hint')}</p>
              </div>

              {!ratingSubmitted ? (
                <div className="bg-background p-4 rounded-xl border border-border shadow-sm">
                  <p className="text-sm font-bold text-center mb-3">
                    {t('order.rate_user_prompt', { role: role === 'buyer' ? t('order.traveler') : t('order.buyer') })}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 border-green-500/30 text-green-600 hover:bg-green-500/10 hover:border-green-500"
                      onClick={() => handleRateUser(true)}
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" /> {t('order.positive')}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-12 border-red-500/30 text-red-600 hover:bg-red-500/10 hover:border-red-500"
                      onClick={() => handleRateUser(false)}
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" /> {t('order.negative')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground bg-background p-3 rounded-xl">
                  {t('order.rate_thanks')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
