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
  followOrder
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
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'buyer' | 'traveler' | 'admin'>('traveler');
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

  // Dispute States
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState<File | null>(null);
  const [disputeEvidencePreview, setDisputeEvidencePreview] = useState<string | null>(null);
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [adminResolutionNotes, setAdminResolutionNotes] = useState('');

  useEffect(() => {
    if (user) {
      loadOrder();
    }
  }, [id, user, profile]);

  const loadOrder = async () => {
    try {
      const data = await fetchOrderById(id);
      setOrder(data);

      if (data.status === 'OPEN') {
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
        } else {
          // If not the buyer or the assigned traveler, they are a generic visitor
          setRole('traveler'); // Keeping 'traveler' for naming consistency but logic will change in UI
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
    if (order.status === 'DELISTED') {
      alert(t('order.delisted_msg'));
      return;
    }
    try {
      const nextStatus = order.payment_type === 'PRE_ESCROW' ? 'ESCROWED' : 'MATCHED';
      if (wishGroup.length > 0) {
        const ordersToAccept = wishGroup.slice(0, batchAcceptCount).map(o => o.id);
        await batchAssignTraveler(ordersToAccept, user.id, nextStatus);
      } else {
        await assignTraveler(order.id, user.id, nextStatus);
      }
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

  const handleNotifyPaid = async () => {
    if (!order) return;
    try {
      await updateOrderDetails(order.id, {
        payment_notification_sent: true
      });
      alert(t('order.notify_paid_success'));
      await loadOrder();
    } catch (error) {
      console.error('Error sent notification:', error);
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
      const amountTwd = Math.round((order.target_price * (order.exchange_rate || 1)) + order.reward_fee);
      await incrementOrderStats(order.traveler_id, amountTwd);
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

  const handleDelist = async () => {
    if (!order) return;
    const isFollowOrder = !!order.parent_order_id;
    const confirmMsg = isFollowOrder ? '確定要取消跟單嗎？' : t('order.delist_confirm');

    if (!confirm(confirmMsg)) return;
    try {
      const { delistOrderGroup } = await import('@/utils/api');
      await delistOrderGroup(order.id);
      if (isFollowOrder) {
        // Follow orders: go back to home after cancellation
        router.push('/');
      } else {
        await loadOrder();
      }
    } catch (error) {
      console.error('Error delisting order:', error);
    }
  };

  const handleRelist = async () => {
    if (!order) return;
    if (!confirm(t('order.relist_confirm'))) return;
    try {
      await updateOrderStatus(order.id, 'OPEN');
      await loadOrder();
    } catch (error) {
      console.error('Error relisting order:', error);
    }
  };

  const handleRaiseDispute = async () => {
    if (!order || !user || !disputeReason) return;
    setIsSubmittingDispute(true);
    try {
      let evidenceUrl = null;
      if (disputeEvidence) {
        const path = `${order.id}/dispute-${Date.now()}`;
        evidenceUrl = await uploadFile(disputeEvidence, 'disputes', path);
      }
      await raiseDispute(order.id, user.id, disputeReason, evidenceUrl);
      setShowDisputeModal(false);
      setDisputeReason('');
      setDisputeEvidence(null);
      setDisputeEvidencePreview(null);
      await loadOrder();
    } catch (error) {
      console.error('Error raising dispute:', error);
      alert(t('common.error'));
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const handleResolveDispute = async (status: OrderStatus) => {
    if (!order) return;
    const actionName = status === 'DELISTED' ? '取消訂單退款' : '完成訂單撥款';
    if (!confirm(`確定要將此訂單裁決為：「${actionName}」嗎？這個操作無法還原。`)) return;
    try {
      if (status === 'COMPLETED' && order.traveler_id) {
        const amountTwd = Math.round((order.target_price * (order.exchange_rate || 1)) + order.reward_fee);
        await incrementOrderStats(order.traveler_id, amountTwd);
      }
      await resolveDispute(order.id, status, adminResolutionNotes);
      await loadOrder();
    } catch (error) {
      console.error('Error resolving dispute:', error);
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

      {order.status === 'DISPUTE' && (
        <Card className="border-red-500/50 bg-red-500/5 mb-6 shadow-xl shadow-red-500/10">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-bold text-red-600">{t('status.DISPUTE')}</h3>
            </div>
            <p className="text-sm font-medium text-red-500">{t('order.dispute_warning')}</p>
            <div className="bg-background/80 p-4 rounded-xl space-y-2 border border-red-500/20">
              <p className="text-xs font-bold text-red-500/70 uppercase tracking-widest">{t('order.dispute_reason')}</p>
              <p className="text-sm">{order.dispute_reason}</p>
              {order.dispute_evidence_url && (
                <div className="mt-3">
                  <p className="text-xs font-bold text-red-500/70 uppercase tracking-widest mb-1">
                    {t('order.dispute_evidence_uploaded')}
                  </p>
                  <img src={order.dispute_evidence_url} alt="Evidence" className="max-h-48 rounded-lg border border-red-500/20 shadow-sm" />
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
              <span className="text-muted-foreground">{t('create.return_date_short')}</span>
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
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <CardTitle className="text-base">{t('status.OPEN')}</CardTitle>
                </div>
                {order.payment_type === 'PRE_ESCROW' && (
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
                {user && (order.buyer_id === user.id || wishGroup.some(o => o.buyer_id === user.id)) ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium leading-relaxed bg-primary/5 p-4 rounded-xl border border-primary/20 text-center shadow-sm text-primary">
                      {order.buyer_id === user.id ? (
                        order.payment_type === 'PRE_ESCROW'
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
                    {order.buyer_id === user.id && order.payment_type === 'PRE_ESCROW' && (
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
                            disabled={order.payment_notification_sent}
                            className={cn(
                              "h-12 font-bold rounded-xl shadow-lg transition-all",
                              order.payment_notification_sent
                                ? "bg-muted text-muted-foreground border-border/50"
                                : "bg-primary hover:scale-[1.02] shadow-primary/20"
                            )}
                          >
                            {order.payment_notification_sent ? (
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

                    {order.buyer_id !== user.id && wishGroup.some(o => o.buyer_id === user.id) && (
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

                      {/* Potential Buyer View: Follow (only for PRE_ESCROW orders) */}
                      {user && order.buyer_id !== user.id && order.payment_type === 'PRE_ESCROW' && (
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

          {order.status === 'MATCHED' && (
            <div className="space-y-6 text-left">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <CardTitle className="text-base">{role === 'buyer' ? t('order.action_pay_title') : t('order.wait_payment_traveler')}</CardTitle>
              </div>

              {role === 'buyer' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-3">
                    <div className="flex items-center gap-2 text-primary">
                      <CreditCard className="w-5 h-5" />
                      <h4 className="font-bold text-sm tracking-tight">{t('order.remittance_info')}</h4>
                    </div>

                    <p className="text-[10px] text-muted-foreground leading-relaxed bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 italic">
                      💡 {t('order.remittance_hint')}
                    </p>

                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center bg-background/50 p-2.5 rounded-xl border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('order.bank_name')}</span>
                        <span className="text-sm font-black text-foreground">Gull Bank Taiwan (Mock)</span>
                      </div>
                      <div className="flex justify-between items-center bg-background/50 p-2.5 rounded-xl border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('order.bank_code')}</span>
                        <span className="text-sm font-black font-mono text-primary">822</span>
                      </div>
                      <div className="flex justify-between items-center bg-background/50 p-2.5 rounded-xl border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('order.account_no')}</span>
                        <span className="text-sm font-black font-mono text-primary">1234-5678-9012-3456</span>
                      </div>
                      <div className="flex justify-between items-center bg-background/50 p-2.5 rounded-xl border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('order.account_name')}</span>
                        <span className="text-sm font-black text-foreground">Gull Global Co., Ltd.</span>
                      </div>
                    </div>



                    <Button
                      fullWidth
                      onClick={handleNotifyPaid}
                      disabled={order.payment_notification_sent}
                      className={cn(
                        "h-12 font-bold rounded-xl shadow-lg transition-all",
                        order.payment_notification_sent
                          ? "bg-muted text-muted-foreground border-border/50"
                          : "bg-primary hover:scale-[1.02] shadow-primary/20"
                      )}
                    >
                      {order.payment_notification_sent ? (
                        <span className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          已通知管理員
                        </span>
                      ) : (
                        t('order.notify_paid_btn')
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('order.buyer_pay_hint')}</p>
              )}

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
                <CardTitle className="text-base">{role === 'buyer' ? t('order.payment_confirmed') : t('order.next_steps_escrowed')}</CardTitle>
              </div>

              <div className="space-y-6">
                {role === 'traveler' ? (
                  <div className="bg-background/50 p-4 rounded-xl border border-border/50 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <p className="text-sm font-bold text-primary mb-1">{t('order.traveler_buy_hint')}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t('order.upload_guide')}</p>
                  </div>
                ) : role === 'buyer' ? (
                  <div className="bg-green-500/5 p-6 rounded-2xl border border-green-500/20 text-center space-y-3 animate-in fade-in zoom-in duration-500">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-green-600">您的款項已受平台保護</h4>
                      <p className="text-sm text-muted-foreground mt-1">{t('order.wait_traveler_buy')}</p>
                    </div>
                  </div>
                ) : null}

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

          {order.status === 'DELISTED' && (
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
              {role === 'buyer' && !order.parent_order_id && (
                <Button onClick={handleRelist} fullWidth className="h-12 font-bold rounded-xl bg-primary hover:bg-primary/90">
                  {t('order.relist_btn')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Chat Board */}
      {
        order.status !== 'OPEN' && order.status !== 'DELISTED' && user && (
          <div className="pt-2">
            <OrderChat
              orderId={order.id}
              currentUserId={user.id}
              role={role}
              partnerName={partnerDisplayName}
            />
          </div>
        )
      }

      {/* Dispute / Delist buttons */}
      {
        ['ESCROWED', 'BOUGHT', 'SHIPPED'].includes(order.status) && (
          <div className="pt-2">
            <Button onClick={() => setShowDisputeModal(true)} variant="outline" fullWidth className="h-10 text-xs font-bold text-red-400 border-red-500/20 hover:bg-red-500/10 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {t('order.raise_dispute_btn')}
            </Button>
          </div>
        )
      }

      {
        order.status === 'OPEN' && (role === 'buyer' || role === 'admin') && (
          <div className="pt-2">
            <Button onClick={handleDelist} variant="outline" fullWidth className="h-10 text-xs font-bold text-red-400 border-red-500/20 hover:bg-red-500/10 rounded-xl">
              {order.parent_order_id ? '取消跟單' : t('order.delist_btn')}
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
