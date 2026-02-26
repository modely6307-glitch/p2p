'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  fetchOrderById,
  updateOrderStatus,
  assignTraveler,
  updateOrderDetails,
  uploadFile
} from '@/utils/api';
import { Order, OrderStatus } from '@/types';
import { StepProgressBar } from '@/components/StepProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, Truck, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function OrderDetails() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'buyer' | 'traveler' | 'admin'>('buyer');
  const [uploading, setUploading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

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
          // If neither, maybe allow as traveler to accept (if OPEN)
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
    if (!order || !e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    try {
      // Mock upload or real if bucket exists.
      // For prototype without configured storage, we'll just mock the URL update
      // const url = await uploadFile(e.target.files[0], 'receipts', `${order.id}/receipt`);

      // Simulating successful upload since storage might not be set up in this env
      const mockUrl = 'https://via.placeholder.com/300?text=Receipt';

      await updateOrderDetails(order.id, {
        receipt_url: mockUrl,
        status: 'BOUGHT'
      });
      await loadOrder();
    } catch (error) {
      console.error('Error uploading receipt:', error);
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

  const handleConfirmReceipt = async () => {
    if (!order) return;
    try {
      await updateOrderStatus(order.id, 'COMPLETED');
      await loadOrder();
    } catch (error) {
      console.error('Error completing order:', error);
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
    return <div className="p-4 text-center">Order not found</div>;
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Role Switcher for Demo */}
      <div className="flex justify-end gap-2 mb-4">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
          className="bg-secondary text-secondary-foreground text-xs rounded p-1"
        >
          <option value="buyer">View as Buyer</option>
          <option value="traveler">View as Traveler</option>
          <option value="admin">View as Admin</option>
        </select>
      </div>

      <header>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{order.item_name}</h1>
            <p className="text-muted-foreground text-sm">Order #{order.id.slice(0, 8)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </header>

      <StepProgressBar currentStatus={order.status} />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Target Price</span>
            <span className="font-medium">${order.target_price}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Reward Fee</span>
            <span className="font-medium text-green-500">+${order.reward_fee}</span>
          </div>
          <div className="flex justify-between py-2 font-bold text-lg">
            <span>Total</span>
            <span>${order.target_price + order.reward_fee}</span>
          </div>
        </CardContent>
      </Card>

      {/* Action Area */}
      <Card className="bg-secondary/20 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {order.status === 'OPEN' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Wait for a traveler to accept this wish.</p>
              {role === 'traveler' && (
                <Button onClick={handleAcceptOrder} fullWidth>Accept Order</Button>
              )}
            </div>
          )}

          {order.status === 'MATCHED' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-500 mb-2">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-medium">Awaiting Escrow</span>
              </div>
              <p className="text-sm text-muted-foreground">Buyer must fund the escrow account.</p>
              {role === 'admin' && (
                <Button onClick={handleConfirmEscrow} fullWidth variant="outline">
                  [Admin] Confirm Funds Received
                </Button>
              )}
            </div>
          )}

          {order.status === 'ESCROWED' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Traveler needs to buy the item and upload receipt.</p>
              {role === 'traveler' && (
                <div className="space-y-2">
                  <Input type="file" onChange={handleUploadReceipt} disabled={uploading} />
                  {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
                </div>
              )}
            </div>
          )}

          {order.status === 'BOUGHT' && (
            <div className="space-y-4">
              <div className="bg-background rounded p-2 text-center">
                <p className="text-xs text-muted-foreground mb-1">Receipt</p>
                {order.receipt_url ? (
                  <img src={order.receipt_url} alt="Receipt" className="max-h-40 mx-auto rounded" />
                ) : (
                  <span className="text-xs">No receipt image</span>
                )}
              </div>
              {role === 'traveler' && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Tracking Number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                  <Button onClick={handleAddTracking}>Ship</Button>
                </div>
              )}
            </div>
          )}

          {order.status === 'SHIPPED' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-500 mb-2">
                <Truck className="w-5 h-5" />
                <span className="text-sm font-medium">Item Shipped</span>
              </div>
              <p className="text-sm">Tracking: <span className="font-mono bg-muted px-1 rounded">{order.tracking_number}</span></p>
              {role === 'buyer' && (
                <Button onClick={handleConfirmReceipt} fullWidth className="bg-green-600 hover:bg-green-700">
                  Confirm Receipt
                </Button>
              )}
            </div>
          )}

          {order.status === 'COMPLETED' && (
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-500 mb-2">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-green-500">Order Completed</h3>
              <p className="text-sm text-muted-foreground">Funds have been released to the traveler.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
