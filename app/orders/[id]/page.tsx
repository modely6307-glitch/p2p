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
  incrementOrderStats,
  raiseDispute,
  resolveDispute,
  fetchWishGroup,
  batchAssignTraveler,
  followOrder,
  fetchTravelerGroupOrders
} from '@/utils/api';
import { Order, OrderStatus } from '@/types';
import { StepProgressBar } from '@/components/StepProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import { OrderChat } from '@/components/OrderChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, Truck, CheckCircle, AlertTriangle, ShieldCheck, ThumbsUp, ThumbsDown, Camera, CreditCard, X, PlusSquare } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { openECPayCVSMap } from '@/lib/ecpay';

const maskEmail = (email: string | null | undefined) => {
  if (!email) return 'User';
  const prefix = email.split('@')[0];
  const displayPrefix = prefix.slice(0, 3);
  return (displayPrefix + '***').slice(0, 6).padEnd(6, '*');
};

export default function OrderDetails() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, profile, loading: authLoading } = useAuth(false);
  const { t } = useLanguage();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'buyer' | 'traveler' | 'admin' | 'visitor'>('visitor');
  const [uploading, setUploading] = useState(false);
  const [purchasePhotoUploading, setPurchasePhotoUploading] = useState(false);
  const [modelNumberInput, setModelNumberInput] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showFormula, setShowFormula] = useState(false);

  // Follow Order States
  const [wishGroup, setWishGroup] = useState<Order[]>([]);
  const [batchAcceptCount, setBatchAcceptCount] = useState(1);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followMethod, setFollowMethod] = useState<'HOME' | '711'>('HOME');
  const [followAddress, setFollowAddress] = useState('');
  const [followCvsStore, setFollowCvsStore] = useState<any>(null);
  const [followName, setFollowName] = useState('');
  const [followPhone, setFollowPhone] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);

  // Group Buy Fulfillment States
  const [travelerGroup, setTravelerGroup] = useState<Order[]>([]);
  const [syncEvidence, setSyncEvidence] = useState(true);
  const [batchTracking, setBatchTracking] = useState<Record<string, string>>({});
  const [activeChatTab, setActiveChatTab] = useState<string>('');

  // Dispute States
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState<File | null>(null);
  const [disputeEvidencePreview, setDisputeEvidencePreview] = useState<string | null>(null);
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [adminResolutionNotes, setAdminResolutionNotes] = useState('');

  useEffect(() => {
    loadOrder();
  }, [id, user, profile]);

  const loadOrder = async () => {
    try {
      const data = await fetchOrderById(id);
      setOrder(data);

      if (!data.traveler_id && ['OPEN', 'ESCROWED'].includes(data.status)) {
        const group = await fetchWishGroup(data.parent_order_id || null, data.id);
        setWishGroup(group);
      }

      // Auto-set role based on current user or profile
      if (profile?.level === 'ADMIN') {
        setRole('admin');
      } else if (user) {
        if (data.buyer_id === user.id) {
          setRole('buyer');
        } else if (data.traveler_id === user.id) {
          setRole('traveler');
          const tGroup = await fetchTravelerGroupOrders(data.parent_order_id || null, data.id, user.id);
          setTravelerGroup(tGroup);
          if (tGroup.length > 0 && !activeChatTab) {
            const currentOrderInGroup = tGroup.find(o => o.id === id);
            setActiveChatTab(currentOrderInGroup?.id || tGroup[0].id);
          }
        } else {
          setRole('visitor');
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
    if (!currentViewOrder || !user) return;
    if (currentViewOrder.status === 'DELISTED') {
      alert(t('order.delisted_msg'));
      return;
    }
    try {
      const { acceptOrder } = await import('@/app/actions/orders');
      let orderIds = [currentViewOrder.id];
      if (wishGroup.length > 0) {
        orderIds = wishGroup.slice(0, batchAcceptCount).map(o => o.id);
      }
      const result = await acceptOrder(orderIds);
      if (!result.success) throw new Error(result.error);

      await loadOrder();
    } catch (error: any) {
      console.error('Error accepting order:', error);
      alert(error.message || t('common.error'));
    }
  };

  const handleConfirmEscrow = async () => {
    if (!currentViewOrder) return;
    try {
      const { confirmEscrow } = await import('@/app/actions/orders');
      const result = await confirmEscrow(currentViewOrder.id);
      if (!result.success) throw new Error(result.error);
      await loadOrder();
    } catch (error: any) {
      console.error('Error confirming escrow:', error);
      alert(error.message || t('common.error'));
    }
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentViewOrder || !user || !e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const path = `${currentViewOrder.id}/receipt-${Date.now()}`;
      const url = await uploadFile(file, 'receipts', path);

      const { updateReceipt, batchUpdateReceipt } = await import('@/app/actions/orders');

      if (syncEvidence && travelerGroup.length > 1) {
        const ids = travelerGroup.filter(o => o.status === 'ESCROWED').map(o => o.id);
        const result = await batchUpdateReceipt(ids, url);
        if (!result.success) throw new Error(result.error);
      } else {
        const result = await updateReceipt(currentViewOrder.id, url);
        if (!result.success) throw new Error(result.error);
      }

      await loadOrder();
    } catch (error: any) {
      console.error('Error uploading receipt:', error);
      alert(error.message || t('error') + ': Firebase Storage');
    } finally {
      setUploading(false);
    }
  };

  const handleAddTracking = async () => {
    if (!currentViewOrder || !trackingNumber) return;
    try {
      const { updateOrderTracking } = await import('@/app/actions/orders');
      const result = await updateOrderTracking(currentViewOrder.id, trackingNumber);
      if (!result.success) throw new Error(result.error);
      await loadOrder();
    } catch (error: any) {
      console.error('Error adding tracking:', error);
      alert(error.message || t('common.error'));
    }
  };

  const handleNotifyPaid = async () => {
    if (!currentViewOrder) return;
    try {
      const { notifyPaid } = await import('@/app/actions/orders');
      const result = await notifyPaid(currentViewOrder.id);
      if (!result.success) throw new Error(result.error);
      alert(t('order.notify_paid_success'));
      await loadOrder();
    } catch (error: any) {
      console.error('Error sent notification:', error);
      alert(error.message || t('common.error'));
    }
  };


  const handleBatchAddTracking = async () => {
    const updates = Object.entries(batchTracking)
      .filter(([_, tracking]) => tracking.trim() !== '')
      .map(([orderId, trackingNumber]) => ({ orderId, trackingNumber: trackingNumber as string }));

    if (updates.length === 0) return;

    try {
      const { batchUpdateTrackingNumbers } = await import('@/app/actions/orders');
      const result = await batchUpdateTrackingNumbers(updates);
      if (!result.success) throw new Error(result.error);
      await loadOrder();
      alert('批量出貨成功');
    } catch (error: any) {
      console.error('Error batch adding tracking:', error);
      alert(error.message || t('common.error'));
    }
  };

  const handleUploadPurchasePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentViewOrder || !user || !e.target.files || e.target.files.length === 0) return;
    setPurchasePhotoUploading(true);
    try {
      const file = e.target.files[0];
      const path = `${currentViewOrder.id}/purchase-${Date.now()}`;
      const url = await uploadFile(file, 'purchase_photos', path);

      const { updatePurchasePhoto, batchUpdatePurchasePhoto } = await import('@/app/actions/orders');

      if (syncEvidence && travelerGroup.length > 1) {
        const ids = travelerGroup.filter(o => o.status === 'ESCROWED').map(o => o.id);
        const result = await batchUpdatePurchasePhoto(ids, url);
        if (!result.success) throw new Error(result.error);
      } else {
        const result = await updatePurchasePhoto(currentViewOrder.id, url);
        if (!result.success) throw new Error(result.error);
      }

      await loadOrder();
    } catch (error: any) {
      console.error('Error uploading purchase photo:', error);
      alert(error.message || t('error'));
    } finally {
      setPurchasePhotoUploading(false);
    }
  };

  const handleUpdateModelNumber = async () => {
    if (!currentViewOrder || !modelNumberInput) return;
    try {
      const { updateModelNumber } = await import('@/app/actions/orders');
      const result = await updateModelNumber(currentViewOrder.id, modelNumberInput);
      if (!result.success) throw new Error(result.error);
      await loadOrder();
    } catch (error: any) {
      console.error('Error updating model number:', error);
      alert(error.message || t('common.error'));
    }
  };

  const handleConfirmReceipt = async () => {
    if (!currentViewOrder || !currentViewOrder.traveler_id) return;
    try {
      const { confirmReceipt } = await import('@/app/actions/orders');
      const result = await confirmReceipt(currentViewOrder.id);
      if (!result.success) {
        throw new Error(result.error);
      }
      await loadOrder();
    } catch (error: any) {
      console.error('Error completing order:', error);
      alert(error.message || t('common.error'));
    }
  };

  const handleRateUser = async (isPositive: boolean, targetOrderId?: string, targetId?: string | null) => {
    if (!order) return;
    const finalOrderId = targetOrderId || order.id;
    const finalTargetUserId = targetId || (role === 'buyer' ? order.traveler_id : order.buyer_id);

    if (!finalTargetUserId) return;
    try {
      const { submitUserRating } = await import('@/app/actions/orders');
      const result = await submitUserRating(finalOrderId, finalTargetUserId, isPositive);
      if (!result.success) throw new Error(result.error);

      if (!targetOrderId) {
        setRatingSubmitted(true);
      }
      await loadOrder();
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      alert(error.message || t('common.error'));
    }
  };

  const handleDelist = async () => {
    if (!order) return;
    const isFollowOrder = !!order.parent_order_id;
    const confirmMsg = isFollowOrder ? '確定要取消跟單嗎？' : t('order.delist_confirm');

    if (!confirm(confirmMsg)) return;
    try {
      const { delistOrderGroup } = await import('@/app/actions/orders');
      const result = await delistOrderGroup(order.id);
      if (!result.success) throw new Error(result.error);
      await loadOrder();
    } catch (error: any) {
      console.error('Error delisting order:', error);
      alert(error.message || t('common.error'));
    }
  };

  const handleRelist = async () => {
    if (!order) return;
    if (!confirm(t('order.relist_confirm'))) return;
    try {
      const { relistOrder } = await import('@/app/actions/orders');
      const result = await relistOrder(order.id);
      if (!result.success) throw new Error(result.error);
      await loadOrder();
    } catch (error: any) {
      console.error('Error relisting order:', error);
      alert(error.message || t('common.error'));
    }
  };

  const handleRaiseDispute = async () => {
    if (!currentViewOrder || !user || !disputeReason) return;
    setIsSubmittingDispute(true);
    try {
      let evidenceUrl = null;
      if (disputeEvidence) {
        const path = `${currentViewOrder.id}/dispute-${Date.now()}`;
        evidenceUrl = await uploadFile(disputeEvidence, 'disputes', path);
      }
      const { raiseDispute } = await import('@/app/actions/orders');
      const result = await raiseDispute(currentViewOrder.id, disputeReason, evidenceUrl);
      if (!result.success) throw new Error(result.error);

      setShowDisputeModal(false);
      setDisputeReason('');
      setDisputeEvidence(null);
      setDisputeEvidencePreview(null);
      await loadOrder();
    } catch (error: any) {
      console.error('Error raising dispute:', error);
      alert(error.message || t('common.error'));
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const handleResolveDispute = async (status: OrderStatus) => {
    if (!currentViewOrder) return;
    const actionName = status === 'DELISTED' ? '取消訂單退款' : '完成訂單撥款';
    if (!confirm(`確定要將此訂單裁決為：「${actionName}」嗎？這個操作無法還原。`)) return;
    try {
      const { resolveDispute } = await import('@/app/actions/orders');
      const result = await resolveDispute(currentViewOrder.id, status, adminResolutionNotes);
      if (!result.success) throw new Error(result.error);

      await loadOrder();
    } catch (error: any) {
      console.error('Error resolving dispute:', error);
      alert(error.message || t('common.error'));
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

  const currentViewOrder = (role === 'traveler' && travelerGroup.length > 1 && activeChatTab)
    ? (travelerGroup.find(o => o.id === activeChatTab) || order)
    : order;

  const partnerProfile = ['buyer', 'visitor'].includes(role) ? currentViewOrder?.traveler : currentViewOrder?.buyer;
  const partnerRoleName = ['buyer', 'visitor'].includes(role) ? t('order.traveler') : t('order.buyer');
  const partnerDisplayName = partnerProfile?.display_name || maskEmail(partnerProfile?.email || undefined);
  const partnerRating = partnerProfile?.total_rating_count && partnerProfile.total_rating_count > 0
    ? Math.round((partnerProfile.positive_rating_count / partnerProfile.total_rating_count) * 100)
    : null;

  if (!currentViewOrder) return null;

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 max-w-3xl lg:mx-auto">
      <header>
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-secondary text-secondary-foreground flex items-center gap-1">
                {countryConfig.flag} {t(`countries.${currentViewOrder.country}`)}
              </span>
              <StatusBadge status={currentViewOrder.status} />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold">{currentViewOrder.item_name}</h1>
            <p className="text-muted-foreground text-xs">{t('order.order_no')} #{currentViewOrder.id.slice(0, 8)}</p>
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
        {currentViewOrder.photo_url && (
          <div className="mb-4 rounded-2xl overflow-hidden border border-border shadow-sm">
            <img src={currentViewOrder.photo_url} alt={currentViewOrder.item_name} className="w-full h-auto max-h-64 object-cover" />
          </div>
        )}

        <div className="bg-secondary/10 p-4 rounded-2xl border border-border/50 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 text-[10px]">{t('order.wish_notes')}</h3>
          <p className="text-sm leading-relaxed">{currentViewOrder.description}</p>
        </div>

        {currentViewOrder.shipping_address && (
          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-2 text-[10px] flex items-center gap-2">
              <ShieldCheck className="w-3 h-3" />
              {t('order.shipping_info_title')}
            </h3>
            {(() => {
              const isRevealed = role === 'buyer' || role === 'admin' || (role === 'traveler' && ['ESCROWED', 'BOUGHT', 'SHIPPED', 'COMPLETED'].includes(currentViewOrder.status));
              if (isRevealed) {
                return <p className="text-sm font-medium">{currentViewOrder.shipping_address}</p>;
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

      <StepProgressBar currentStatus={currentViewOrder.status} />

      {currentViewOrder.status === 'DISPUTE' && (
        <Card className="border-red-500/50 bg-red-500/5 mb-6 shadow-xl shadow-red-500/10">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-bold text-red-600">{t('status.DISPUTE')}</h3>
            </div>
            <p className="text-sm font-medium text-red-500">{t('order.dispute_warning')}</p>
            <div className="bg-background/80 p-4 rounded-xl space-y-2 border border-red-500/20">
              <p className="text-xs font-bold text-red-500/70 uppercase tracking-widest">{t('order.dispute_reason')}</p>
              <p className="text-sm">{currentViewOrder.dispute_reason}</p>
              {currentViewOrder.dispute_evidence_url && (
                <div className="mt-3">
                  <p className="text-xs font-bold text-red-500/70 uppercase tracking-widest mb-1">
                    {t('order.dispute_evidence_uploaded')}
                  </p>
                  <img src={currentViewOrder.dispute_evidence_url} alt="Evidence" className="max-h-48 rounded-lg border border-red-500/20 shadow-sm" />
                </div>
              )}
            </div>

            {role === 'admin' && (
              <div className="pt-4 border-t border-red-500/20 space-y-3">
                <p className="text-xs font-bold text-red-500/70 uppercase tracking-widest">管理員裁決</p>
                <Textarea
                  placeholder="輸入裁決說明 / 退款備註..."
                  value={adminResolutionNotes}
                  onChange={(e) => setAdminResolutionNotes(e.target.value)}
                  className="bg-background min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button onClick={() => handleResolveDispute('DELISTED')} variant="outline" className="flex-1 border-red-500 text-red-600 hover:bg-red-500/10 hover:text-red-700">
                    取消訂單退款
                  </Button>
                  <Button onClick={() => handleResolveDispute('COMPLETED')} className="flex-1 bg-green-600 hover:bg-green-700">
                    完成訂單撥款
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">{t('order.target_price')}</span>
            <div className="text-right">
              <div className="font-medium text-sm">
                {currencySymbol}{currentViewOrder.target_price}
                <span className="text-[10px] text-muted-foreground ml-1 font-normal">(@ {currentViewOrder.exchange_rate})</span>
              </div>
              <div className="text-[10px] text-muted-foreground">≈ NT${Math.round(currentViewOrder.target_price * (currentViewOrder.exchange_rate || 1)).toLocaleString()}</div>
            </div>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">{t('order.reward_fee')}</span>
            <span className="font-bold text-green-600">NT${currentViewOrder.reward_fee.toLocaleString()}</span>
          </div>
          {['buyer', 'admin'].includes(role) && currentViewOrder.buyer_platform_fee > 0 && (
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">{t('create.buyer_fee')}</span>
              <span className="font-medium text-xs text-muted-foreground">NT${currentViewOrder.buyer_platform_fee.toLocaleString()}</span>
            </div>
          )}
          {currentViewOrder.expected_shipping_date && (
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">{t('create.return_date_short')}</span>
              <span className="font-bold flex items-center gap-1">
                📅 {currentViewOrder.expected_shipping_date}
                {currentViewOrder.auto_extend && <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1 rounded ml-1">Auto-Extend</span>}
              </span>
            </div>
          )}
          <div className="flex justify-between py-4 items-center">
            <span className="font-black text-foreground">
              {['traveler', 'visitor'].includes(role) ? t('order.budget_info') : t('order.total_budget')}
            </span>
            <div className="text-right">
              <div className="text-2xl font-black text-primary">
                NT${(['traveler', 'visitor'].includes(role)
                  ? Math.round((currentViewOrder.target_price * (currentViewOrder.exchange_rate || 1)) + currentViewOrder.reward_fee)
                  : currentViewOrder.total_amount_twd || 0
                ).toLocaleString()}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {['traveler', 'visitor'].includes(role) ? t('order.traveler_gross_total') : `(${t('order.buyer_paid_total')})`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {['traveler', 'visitor'].includes(role) && currentViewOrder.traveler_platform_fee > 0 && (
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
                NT$ {((currentViewOrder.target_price * (currentViewOrder.exchange_rate || 1)) + currentViewOrder.reward_fee - (currentViewOrder.traveler_platform_fee || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">{t('create.traveler_fee')}</p>
              <p className="text-xs font-bold text-red-500">-NT${currentViewOrder.traveler_platform_fee}</p>
            </div>
          </div>

          {showFormula && (
            <div className="px-4 py-3 bg-secondary/20 rounded-xl border border-border/50 animate-in fade-in slide-in-from-top-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{t('create.formula_title')}</p>
              <div className="space-y-1 text-xs font-mono text-muted-foreground">
                <div className="flex justify-between">
                  <span>({currentViewOrder.target_price} {currentViewOrder.currency} × {currentViewOrder.exchange_rate})</span>
                  <span>NT$ {Math.round(currentViewOrder.target_price * (currentViewOrder.exchange_rate || 1))}</span>
                </div>
                <div className="flex justify-between">
                  <span>+ {t('order.reward_fee')}</span>
                  <span>NT$ {currentViewOrder.reward_fee}</span>
                </div>
                <div className="flex justify-between text-red-500/70">
                  <span>- {t('create.traveler_fee')}</span>
                  <span>NT$ {currentViewOrder.traveler_platform_fee}</span>
                </div>
                <div className="pt-1 border-t border-border/30 flex justify-between font-bold text-foreground">
                  <span>{t('order.traveler_net')}</span>
                  <span>NT$ {Math.round((currentViewOrder.target_price * (currentViewOrder.exchange_rate || 1)) + currentViewOrder.reward_fee - (currentViewOrder.traveler_platform_fee || 0))}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(currentViewOrder.receipt_url || currentViewOrder.tracking_number) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              {t('order.delivery_info')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentViewOrder.purchase_photo_url && (
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('create.proof_purchase_photo')}</span>
                <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-background p-1">
                  <img src={currentViewOrder.purchase_photo_url} alt="Purchase" className="w-full h-auto max-h-48 object-contain rounded-lg" />
                </div>
              </div>
            )}
            {currentViewOrder.receipt_url && (
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('create.proof_receipt')}</span>
                <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-background p-1">
                  <img src={currentViewOrder.receipt_url} alt="Receipt" className="w-full h-auto max-h-48 object-contain rounded-lg" />
                </div>
              </div>
            )}
            {currentViewOrder.model_number && (
              <div className="flex justify-between items-center bg-background p-3 rounded-xl border border-border/50">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('create.proof_model')}</span>
                <span className="font-mono text-sm font-bold bg-muted px-2 py-1 rounded">{currentViewOrder.model_number}</span>
              </div>
            )}
            {currentViewOrder.tracking_number && (
              <div className="flex justify-between items-center bg-background p-3 rounded-xl border border-border/50">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('order.tracking_no')}</span>
                <span className="font-mono text-sm font-bold bg-muted px-2 py-1 rounded">{currentViewOrder.tracking_number}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-secondary/20 border-primary/20">
        <CardContent className="pt-6">
          {!currentViewOrder.traveler_id && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <CardTitle className="text-base">{currentViewOrder.status === 'ESCROWED' ? '代購金已託管，等待接單' : t('status.OPEN')}</CardTitle>
                </div>
                {currentViewOrder.payment_type === 'PRE_ESCROW' && (
                  <div className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-[10px] font-black uppercase tracking-tighter border border-green-500/20 animate-pulse flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {t('order.tag_pre_escrow')}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mb-4">
                {wishGroup.length > 1 ? (
                  <span className="text-xs font-bold text-orange-600 bg-orange-500/10 px-3 py-1 rounded-full ring-1 ring-orange-500/20 shadow-sm border border-orange-500/10 backdrop-blur-sm flex items-center gap-1 shadow-orange-500/5 transition-all animate-in zoom-in">
                    <span className="text-sm">🔥</span> 共 {wishGroup.length} 人集結求購中
                  </span>
                ) : (
                  <span className="text-xs font-medium text-blue-600 bg-blue-500/5 px-3 py-1 rounded-full border border-blue-500/10 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    正在等待旅人接單
                  </span>
                )}
              </div>

              <div className="bg-secondary/10 p-4 rounded-xl space-y-4">
                {user && (currentViewOrder.buyer_id === user.id || wishGroup.some(o => o.buyer_id === user.id)) ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium leading-relaxed bg-primary/5 p-4 rounded-xl border border-primary/20 text-center shadow-sm text-primary">
                      {currentViewOrder.buyer_id === user.id ? (
                        currentViewOrder.payment_type === 'PRE_ESCROW'
                          ? '您選擇了立即託管，請根據下方資訊完成匯款，後續由管理長確認後，代購接單將立刻生效。'
                          : '這是您的許願單，請靜候旅人接單。'
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mx-auto mb-2 text-primary animate-in zoom-in" />
                          您已經成功跟單！請靜候旅人接單。
                        </>
                      )}
                    </p>

                    {/* PRE_ESCROW Buyer Payment Info */}
                    {currentViewOrder.buyer_id === user.id && currentViewOrder.payment_type === 'PRE_ESCROW' && currentViewOrder.status === 'OPEN' && (
                      <div className="space-y-4 mt-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-background p-4 rounded-2xl border border-primary/10 space-y-3 shadow-inner">
                          <div className="flex items-center gap-2 text-primary">
                            <CreditCard className="w-5 h-5" />
                            <h4 className="font-bold text-sm tracking-tight">{t('order.remittance_info')}</h4>
                          </div>

                          <p className="text-[10px] text-muted-foreground leading-relaxed bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 italic">
                            💡 {t('order.remittance_hint')}
                          </p>

                          <div className="space-y-2.5">
                            <div className="flex justify-between items-center bg-secondary/10 p-2.5 rounded-xl border border-border/40">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('order.bank_name')}</span>
                              <span className="text-sm font-black text-foreground">Gull Bank Taiwan (Mock)</span>
                            </div>
                            <div className="flex justify-between items-center bg-secondary/10 p-2.5 rounded-xl border border-border/40">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('order.bank_code')}</span>
                              <span className="text-sm font-black font-mono text-primary">822</span>
                            </div>
                            <div className="flex justify-between items-center bg-secondary/10 p-2.5 rounded-xl border border-border/40">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('order.account_no')}</span>
                              <span className="text-sm font-black font-mono text-primary">1234-5678-9012-3456</span>
                            </div>
                            <div className="flex justify-between items-center bg-secondary/10 p-2.5 rounded-xl border border-border/40">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('order.account_name')}</span>
                              <span className="text-sm font-black text-foreground">Gull Global Co., Ltd.</span>
                            </div>
                          </div>

                          <Button
                            fullWidth
                            onClick={handleNotifyPaid}
                            disabled={currentViewOrder.payment_notification_sent}
                            className={cn(
                              "h-12 font-bold rounded-xl shadow-lg transition-all",
                              currentViewOrder.payment_notification_sent
                                ? "bg-muted text-muted-foreground border-border/50"
                                : "bg-primary hover:scale-[1.02] shadow-primary/20"
                            )}
                          >
                            {currentViewOrder.payment_notification_sent ? (
                              <span className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                {t('order.paid_notified_status')}
                              </span>
                            ) : (
                              t('order.notify_paid_btn')
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {currentViewOrder.buyer_id !== user.id && wishGroup.some(o => o.buyer_id === user.id) && (
                      <Button onClick={() => {
                        const myOrder = wishGroup.find(o => o.buyer_id === user.id);
                        if (myOrder) window.location.href = `/orders/${myOrder.id}`;
                      }} fullWidth variant="outline" className="h-14 font-black text-lg border-primary text-primary hover:bg-primary/5 shadow-sm group">
                        前往我的跟單進度
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-6">
                      {/* Potential Traveler View: Help Buy */}
                      <div className="space-y-3 bg-background p-4 rounded-xl border border-border/50 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">我是代購旅人：</span>
                          <div className="flex items-center gap-3 bg-secondary/10 p-1 rounded-lg border border-border/50">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setBatchAcceptCount(Math.max(1, batchAcceptCount - 1))}>-</Button>
                            <span className="font-black text-lg w-6 text-center text-primary">{batchAcceptCount}</span>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setBatchAcceptCount(Math.min(wishGroup.length || 1, batchAcceptCount + 1))}>+</Button>
                          </div>
                        </div>
                        <Button onClick={handleAcceptOrder} fullWidth className="h-14 font-black text-lg shadow-xl shadow-primary/20 bg-primary hover:scale-[1.02] transition-transform">
                          {t('order.accept_btn')} ({batchAcceptCount} 單)
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground italic px-2">協助購買並賺取外快</p>
                      </div>

                      {/* Potential Buyer View: Follow (if not original buyer) */}
                      {user && order.buyer_id !== user.id && (
                        <div className="space-y-4 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
                          <p className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">或者，我也想要買這個：</p>
                          <Button
                            onClick={() => setShowFollowModal(true)}
                            fullWidth
                            variant="outline"
                            className="h-14 font-black text-lg border-primary text-primary hover:bg-primary/5 shadow-md shadow-primary/5 group"
                          >
                            <PlusSquare className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                            我也要許這個願望 (跟單)
                          </Button>
                          <p className="text-[10px] text-center text-muted-foreground italic px-4">集體許願提高成對率！</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Fulfillment & Communication Hub */}
          {currentViewOrder.status !== 'OPEN' && currentViewOrder.status !== 'DELISTED' && user && role !== 'visitor' && (
            <Card className="border-primary/20 bg-background shadow-xl shadow-primary/5 overflow-hidden border-t-4 border-t-primary">
              {/* Header: Buyer Switcher (Traveler Only) */}
              {role === 'traveler' && travelerGroup.length > 1 && (
                <div className="bg-primary/5 border-b border-primary/10 overflow-hidden">
                  <div className="flex overflow-x-auto no-scrollbar p-2 gap-2">
                    {travelerGroup.map((gOrder) => {
                      const isActive = activeChatTab === gOrder.id;
                      const bName = gOrder.buyer?.display_name || maskEmail(gOrder.buyer?.email);
                      const isCompleted = gOrder.status === 'COMPLETED';
                      const hasDispute = gOrder.status === 'DISPUTE';

                      return (
                        <button
                          key={gOrder.id}
                          onClick={() => setActiveChatTab(gOrder.id)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all border whitespace-nowrap",
                            isActive
                              ? "bg-background border-primary shadow-sm ring-2 ring-primary/10 z-10"
                              : "bg-secondary/10 border-transparent hover:bg-secondary/20 text-muted-foreground"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0",
                            isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            {isActive ? <ShieldCheck className="w-3.5 h-3.5" /> : "👤"}
                          </div>
                          <div className="text-left">
                            <p className={cn("text-[11px] font-black leading-tight", isActive ? "text-primary" : "text-foreground/70")}>
                              {bName}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", gOrder.status === 'ESCROWED' ? "bg-green-500" : "bg-blue-400")} />
                              <span className="text-[9px] font-bold uppercase tracking-tighter opacity-70">
                                {t(`status.${gOrder.status}`)}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <CardContent className="p-0">
                {/* Status-Specific Actions Block */}
                <div className="p-6 border-b border-border/50 bg-gradient-to-b from-transparent to-secondary/5">
                  {currentViewOrder.status === 'MATCHED' && (
                    <div className="space-y-6 text-left">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                        <CardTitle className="text-base">{role === 'buyer' ? t('order.action_pay_title') : t('order.wait_payment_traveler')}</CardTitle>
                      </div>
                      {role === 'buyer' ? (
                        <div className="space-y-4">
                          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-3">
                            <div className="flex items-center gap-2 text-primary">
                              <CreditCard className="w-5 h-5" />
                              <h4 className="font-bold text-sm">{t('order.remittance_info')}</h4>
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">💡 {t('order.remittance_hint')}</p>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center bg-background/50 p-2.5 rounded-xl border border-border/40">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('order.bank_name')}</span>
                                <span className="text-sm font-black">Gull Bank Taiwan (Mock)</span>
                              </div>
                              <div className="flex justify-between items-center bg-background/50 p-2.5 rounded-xl border border-border/40">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('order.bank_code')}</span>
                                <span className="text-sm font-black font-mono text-primary">822</span>
                              </div>
                              <div className="flex justify-between items-center bg-background/50 p-2.5 rounded-xl border border-border/40">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('order.account_no')}</span>
                                <span className="text-sm font-black font-mono text-primary">1234-5678-9012-3456</span>
                              </div>
                            </div>
                            <Button fullWidth onClick={handleNotifyPaid} disabled={currentViewOrder.payment_notification_sent} className="h-12 font-bold rounded-xl shadow-lg">
                              {currentViewOrder.payment_notification_sent ? "已通知管理員" : t('order.notify_paid_btn')}
                            </Button>
                          </div>
                        </div>
                      ) : <p className="text-sm text-muted-foreground">{t('order.buyer_pay_hint')}</p>}
                    </div>
                  )}

                  {currentViewOrder.status === 'ESCROWED' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <CardTitle className="text-base">{role === 'buyer' ? t('order.payment_confirmed') : t('order.next_steps_escrowed')}</CardTitle>
                      </div>
                      {role === 'traveler' ? (
                        <div className="space-y-6">
                          <div className="bg-background/80 p-4 rounded-xl border border-border/50 space-y-3">
                            <p className="text-xs text-muted-foreground leading-relaxed italic">{t('order.upload_guide')}</p>
                            {travelerGroup.filter(o => o.status === 'ESCROWED' && o.id !== currentViewOrder.id).length > 0 && (
                              <div className="flex items-center gap-2 pt-2 border-t border-border/10">
                                <input type="checkbox" id="sync-evidence" checked={syncEvidence} onChange={(e) => setSyncEvidence(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary" />
                                <label htmlFor="sync-evidence" className="text-[11px] font-bold text-primary cursor-pointer">
                                  一鍵同步至其他 {travelerGroup.filter(o => o.status === 'ESCROWED' && o.id !== currentViewOrder.id).length} 個買家
                                </label>
                              </div>
                            )}
                          </div>

                          {/* Product Photo Upload */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{t('create.proof_purchase_photo')}</p>
                              {currentViewOrder.purchase_photo_url ? (
                                <div className="relative rounded-2xl overflow-hidden border border-border aspect-[4/3] group">
                                  <img src={currentViewOrder.purchase_photo_url} className="w-full h-full object-cover" />
                                  <label className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-xs font-bold uppercase tracking-wider">
                                    <input type="file" onChange={handleUploadPurchasePhoto} className="hidden" />
                                    {t('order.receipt_update')}
                                  </label>
                                </div>
                              ) : (
                                <div className="relative group aspect-[4/3]">
                                  <input type="file" onChange={handleUploadPurchasePhoto} disabled={purchasePhotoUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                  <div className="w-full h-full border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center bg-primary/5 hover:bg-primary/10 transition-all">
                                    <Camera className={cn("w-8 h-8 text-primary mb-2", purchasePhotoUploading && "animate-bounce")} />
                                    <span className="text-[10px] font-black text-primary uppercase">{t('order.upload_purchase_photo')}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {currentViewOrder.require_receipt && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{t('create.proof_receipt')}</p>
                                {currentViewOrder.receipt_url ? (
                                  <div className="relative rounded-2xl overflow-hidden border border-border aspect-[4/3] group">
                                    <img src={currentViewOrder.receipt_url} className="w-full h-full object-cover" />
                                    <label className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-xs font-bold uppercase tracking-wider">
                                      <input type="file" onChange={handleUploadReceipt} className="hidden" />
                                      {t('order.receipt_update')}
                                    </label>
                                  </div>
                                ) : (
                                  <div className="relative group aspect-[4/3]">
                                    <input type="file" onChange={handleUploadReceipt} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                    <div className="w-full h-full border-2 border-dashed border-secondary/30 rounded-2xl flex flex-col items-center justify-center bg-secondary/5 hover:bg-secondary/10 transition-all">
                                      <Upload className={cn("w-8 h-8 text-muted-foreground mb-2", uploading && "animate-bounce")} />
                                      <span className="text-[10px] font-black text-muted-foreground uppercase">{t('order.receipt_update')}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <Button fullWidth size="lg" className="h-14 rounded-2xl font-black shadow-xl"
                            disabled={!currentViewOrder.purchase_photo_url || (currentViewOrder.require_receipt && !currentViewOrder.receipt_url)}
                            onClick={async () => {
                              const { finishPurchase, batchFinishPurchase } = await import('@/app/actions/orders');
                              const ids = syncEvidence ? travelerGroup.filter(o => o.status === 'ESCROWED').map(o => o.id) : [currentViewOrder.id];
                              const res = ids.length > 1 ? await batchFinishPurchase(ids) : await finishPurchase(currentViewOrder.id);
                              if (res.success) await loadOrder(); else alert(res.error);
                            }}
                          >
                            {syncEvidence && travelerGroup.filter(o => o.status === 'ESCROWED').length > 1 ? `一鍵完成全部採買 (${travelerGroup.filter(o => o.status === 'ESCROWED').length})` : t('admin.finish_purchase_btn')}
                          </Button>
                        </div>
                      ) : (
                        <div className="bg-green-500/5 p-6 rounded-2xl border border-green-500/10 text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto ring-4 ring-green-500/5">
                            <ShieldCheck className="w-6 h-6 text-green-500" />
                          </div>
                          <p className="text-sm font-bold text-green-600">您的款項已受平台保護</p>
                        </div>
                      )}
                    </div>
                  )}

                  {currentViewOrder.status === 'BOUGHT' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <CardTitle className="text-base">{t('status.BOUGHT')}</CardTitle>
                      </div>
                      {role === 'traveler' ? (
                        <div className="space-y-4">
                          {travelerGroup.filter(o => o.status === 'BOUGHT').length > 1 ? (
                            <div className="bg-secondary/10 rounded-2xl border border-border p-4 space-y-4">
                              <p className="text-xs font-black text-primary uppercase tracking-widest">{t('order.batch_shipping_title') || '批次出貨模式'}</p>
                              <div className="divide-y divide-border/30">
                                {travelerGroup.filter(o => o.status === 'BOUGHT').map(go => (
                                  <div key={go.id} className="py-4 space-y-3 first:pt-0">
                                    <div className="flex justify-between items-center px-1">
                                      <p className="text-xs font-bold text-foreground/80">{go.buyer?.display_name || maskEmail(go.buyer?.email)}</p>
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-white/60 border border-border/50 uppercase">
                                        {go.shipping_method === '711' ? '7-11' : 'Home'}
                                      </span>
                                    </div>
                                    <Input placeholder={t('order.tracking_placeholder')} value={batchTracking[go.id] || go.tracking_number || ''}
                                      onChange={(e) => setBatchTracking(prev => ({ ...prev, [go.id]: e.target.value }))}
                                      className="h-10 bg-background border-primary/20 focus:ring-primary/20" />
                                  </div>
                                ))}
                              </div>
                              <Button fullWidth onClick={handleBatchAddTracking} className="h-12 font-black shadow-lg"
                                disabled={travelerGroup.filter(o => o.status === 'BOUGHT').every(o => !batchTracking[o.id] && !o.tracking_number)}>
                                <Truck className="w-4 h-4 mr-2" /> 確認批次出貨
                              </Button>
                            </div>
                          ) : (
                            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-3">
                              <p className="text-[10px] font-black uppercase text-primary tracking-widest">{t('order.shipping_info')}</p>
                              <div className="flex gap-2">
                                <Input placeholder={t('order.tracking_placeholder')} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                                <Button onClick={handleAddTracking} className="px-6 font-bold">{t('order.ship_btn')}</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : <p className="text-sm text-muted-foreground italic text-center py-4">{t('order.buyer_shipping_hint')}</p>}
                    </div>
                  )}

                  {currentViewOrder.status === 'SHIPPED' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="w-5 h-5 text-blue-500" />
                          <CardTitle className="text-base text-blue-600">{t('status.SHIPPED')}</CardTitle>
                        </div>
                        {role === 'buyer' && (
                          <Button onClick={handleConfirmReceipt} variant="primary" className="h-10 px-6 font-black rounded-xl animate-in fade-in zoom-in duration-500">
                            {t('order.received_btn')}
                          </Button>
                        )}
                      </div>
                      <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 flex justify-between items-center">
                        <div>
                          <p className="text-[9px] font-black uppercase text-blue-500 tracking-widest mb-1">{t('order.tracking_no')}</p>
                          <p className="text-sm font-black font-mono tracking-tight">{currentViewOrder.tracking_number}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-blue-500 hover:bg-blue-500/10"
                          onClick={() => window.open(`https://www.google.com/search?q=${currentViewOrder.tracking_number}`, '_blank')}>
                          追蹤包裹
                        </Button>
                      </div>
                    </div>
                  )}

                  {currentViewOrder.status === 'COMPLETED' && (
                    <div className="space-y-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto ring-8 ring-green-500/5 animate-in zoom-in duration-500">
                        <CheckCircle className="w-10 h-10" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-green-600 tracking-tight">{t('status.COMPLETED')}</h3>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">{t('order.release_hint')}</p>
                      </div>

                      {((role === 'buyer' && !currentViewOrder.rated_by_buyer) || (role === 'traveler' && !currentViewOrder.rated_by_traveler)) && !ratingSubmitted ? (
                        <div className="pt-4 border-t border-border/50 space-y-4">
                          <p className="text-xs font-bold text-foreground/80">給您的交易夥伴一個評價</p>
                          <div className="flex gap-4">
                            <Button variant="outline" className="flex-1 h-12 rounded-2xl border-green-500/20 text-green-600 hover:bg-green-50 font-black"
                              onClick={() => handleRateUser(true, currentViewOrder.id, role === 'buyer' ? currentViewOrder.traveler_id : currentViewOrder.buyer_id)}>
                              <ThumbsUp className="w-4 h-4 mr-2" /> 正評
                            </Button>
                            <Button variant="outline" className="flex-1 h-12 rounded-2xl border-red-500/20 text-red-600 hover:bg-red-50 font-black"
                              onClick={() => handleRateUser(false, currentViewOrder.id, role === 'buyer' ? currentViewOrder.traveler_id : currentViewOrder.buyer_id)}>
                              <ThumbsDown className="w-4 h-4 mr-2" /> 負評
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-secondary/10 py-3 rounded-2xl border border-border/50 text-[11px] font-black text-muted-foreground italic">
                          ✨ {t('order.rating_submitted')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Communication Area */}
                <div className="p-4 bg-background">
                  <OrderChat
                    orderId={activeChatTab || currentViewOrder.id}
                    currentUserId={user.id}
                    role={role as 'buyer' | 'traveler' | 'admin'}
                    partnerName={
                      role === 'traveler' && travelerGroup.length > 1 && activeChatTab
                        ? (travelerGroup.find(o => o.id === activeChatTab)?.buyer?.display_name || maskEmail(travelerGroup.find(o => o.id === activeChatTab)?.buyer?.email))
                        : partnerDisplayName
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {currentViewOrder.status === 'DELISTED' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <CardTitle className="text-base text-gray-400">{t('order.delisted_msg')}</CardTitle>
              </div>
              <div className="text-center py-6 bg-gray-500/5 rounded-2xl border border-gray-500/10">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-500/10 text-gray-400 mb-3">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <p className="text-sm text-muted-foreground">{t('order.delisted_hint')}</p>
              </div>
              {role === 'buyer' && (
                <Button onClick={handleRelist} fullWidth className="h-12 font-bold rounded-xl bg-primary hover:bg-primary/90">
                  {t('order.relist_btn')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispute / Delist buttons */}
      {
        ['ESCROWED', 'BOUGHT', 'SHIPPED'].includes(currentViewOrder.status) && (
          <div className="pt-2">
            <Button onClick={() => setShowDisputeModal(true)} variant="outline" fullWidth className="h-10 text-xs font-bold text-red-400 border-red-500/20 hover:bg-red-500/10 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {t('order.raise_dispute_btn')}
            </Button>
          </div>
        )
      }

      {
        currentViewOrder.status === 'OPEN' && (role === 'buyer' || role === 'admin') && (
          <div className="pt-2">
            <Button onClick={handleDelist} variant="outline" fullWidth className="h-10 text-xs font-bold text-red-400 border-red-500/20 hover:bg-red-500/10 rounded-xl">
              {currentViewOrder.parent_order_id ? '取消跟單' : t('order.delist_btn')}
            </Button>
          </div>
        )
      }

      {/* Follow Modal */}
      {
        showFollowModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-lg shadow-2xl border-primary/20 bg-background max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b border-border/50 pb-4 sticky top-0 bg-background z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                    <PlusSquare className="w-5 h-5" />
                    我也要許這個願望 (跟單)
                  </CardTitle>
                  <button type="button" onClick={() => setShowFollowModal(false)} className="p-1 rounded-full hover:bg-secondary">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('create.shipping_method')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFollowMethod('HOME')}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2",
                        followMethod === 'HOME' ? "bg-primary/5 border-primary ring-1 ring-primary/20" : "bg-secondary/10 border-border/50"
                      )}
                    >
                      <span className="text-xs font-bold">{t('create.home_delivery')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFollowMethod('711')}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2",
                        followMethod === '711' ? "bg-[#008134]/5 border-[#008134] ring-1 ring-[#008134]/20" : "bg-secondary/10 border-border/50"
                      )}
                    >
                      <span className="text-xs font-bold">{t('create.cvs_pickup')}</span>
                    </button>
                  </div>

                  {followMethod === 'HOME' ? (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-medium text-muted-foreground">{t('create.shipping_address')}</label>
                      <Textarea value={followAddress} onChange={(e) => setFollowAddress(e.target.value)} placeholder={t('create.address_placeholder')} className="min-h-[80px]" />
                    </div>
                  ) : (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      {followCvsStore ? (
                        <div className="p-4 rounded-xl bg-[#008134]/5 border border-[#008134]/20 text-sm flex justify-between items-start">
                          <div>
                            <p className="font-bold text-[#008134] flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              {followCvsStore.store_name} ({followCvsStore.store_id})
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">{followCvsStore.store_address}</p>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => openECPayCVSMap({ IsCollection: 'N', ServerReplyURL: `${window.location.origin}/api/ecpay/cvs-callback`, Device: window.innerWidth < 768 ? '1' : '0' })} className="h-7 text-[10px] text-[#008134] hover:bg-[#008134]/10">
                            {t('common.edit')}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button type="button" onClick={() => openECPayCVSMap({ IsCollection: 'N', ServerReplyURL: `${window.location.origin}/api/ecpay/cvs-callback`, Device: window.innerWidth < 768 ? '1' : '0' })} className="flex-1 h-12 rounded-2xl border-dashed border-2 bg-secondary/5 hover:bg-secondary/10 hover:border-[#008134]/50 text-muted-foreground hover:text-[#008134] transition-all flex items-center justify-center gap-2">
                            <PlusSquare className="w-5 h-5" />
                            <span className="font-bold">{t('create.select_store')}</span>
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setFollowCvsStore({ store_id: '123456', store_name: 'Mock Store', store_address: 'Mock City' })} className="h-12 px-4 rounded-2xl border-dashed border-2 text-[10px] font-black uppercase">
                            Mock
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/10">
                    <Input label={t('create.recipient_name')} value={followName} onChange={(e) => setFollowName(e.target.value)} />
                    <Input label={t('create.recipient_phone')} value={followPhone} onChange={(e) => setFollowPhone(e.target.value)} />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/30">
                  <Button
                    fullWidth
                    className="h-12 font-bold bg-primary hover:bg-primary/90"
                    disabled={isFollowing || !followName || !followPhone || ((followMethod === 'HOME' && !followAddress) || (followMethod === '711' && !followCvsStore))}
                    onClick={async () => {
                      if (!user) return;
                      setIsFollowing(true);
                      try {
                        const result = await followOrder(order.id, user.id, {
                          shipping_method: followMethod,
                          shipping_address: followMethod === 'HOME' ? followAddress : `${followCvsStore.store_name} - ${followCvsStore.store_address}`,
                          cvs_store_info: followMethod === '711' ? followCvsStore : null,
                          recipient_name: followName,
                          recipient_phone: followPhone
                        });
                        setShowFollowModal(false);
                        router.push(`/orders/${result.id}`);
                      } catch (e) {
                        console.error(e);
                        alert('跟單失敗');
                      } finally {
                        setIsFollowing(false);
                      }
                    }}
                  >
                    {isFollowing ? <Loader2 className="w-5 h-5 animate-spin" /> : '確認跟單'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }

      {/* Dispute Modal */}
      {
        showDisputeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-md shadow-2xl border-red-500/20 bg-background">
              <CardHeader className="border-b border-border/50 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-red-500 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {t('order.raise_dispute_btn')}
                  </CardTitle>
                  <button type="button" onClick={() => setShowDisputeModal(false)} className="p-1 rounded-full hover:bg-secondary">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">
                    {t('order.dispute_reason')}
                  </label>
                  <Textarea
                    placeholder={t('order.dispute_reason_placeholder')}
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">
                    {t('order.dispute_upload_evidence')}
                  </label>
                  {disputeEvidencePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-border">
                      <img src={disputeEvidencePreview} alt="Evidence" className="w-full h-auto max-h-48 object-contain bg-muted" />
                      <button
                        type="button"
                        onClick={() => { setDisputeEvidence(null); setDisputeEvidencePreview(null); }}
                        className="absolute top-2 right-2 p-1.5 bg-background/90 rounded-full hover:bg-red-500/10 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/50 transition-colors">
                      <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-xs font-bold text-muted-foreground">{t('order.dispute_upload_evidence_btn')}</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setDisputeEvidence(e.target.files[0]);
                            setDisputeEvidencePreview(URL.createObjectURL(e.target.files[0]));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    fullWidth
                    className="bg-red-600 hover:bg-red-700 h-12"
                    disabled={!disputeReason || isSubmittingDispute}
                    onClick={handleRaiseDispute}
                  >
                    {isSubmittingDispute ? <Loader2 className="w-5 h-5 animate-spin" /> : t('order.dispute_submit')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }
    </div >
  );
}
