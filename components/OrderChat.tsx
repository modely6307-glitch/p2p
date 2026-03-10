import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import { OrderMessage } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, MessageSquare, ImagePlus, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { uploadFile, fetchOrderMessages, sendOrderMessage } from '@/utils/api';

interface OrderChatProps {
    orderId: string;
    currentUserId: string;
    role: 'buyer' | 'traveler' | 'admin';
    partnerName?: string;
}

export function OrderChat({ orderId, currentUserId, role, partnerName }: OrderChatProps) {
    const { t } = useLanguage();
    const [messages, setMessages] = useState<OrderMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchInitialMessages();

        // Subscribe to realtime changes
        const channel = supabase
            .channel(`order_chat_${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'order_messages',
                    filter: `order_id=eq.${orderId}`,
                },
                (payload: import('@supabase/supabase-js').RealtimePostgresInsertPayload<OrderMessage>) => {
                    const newMsg = payload.new;
                    setMessages((prev) => {
                        // Check if exists to prevent duplicates
                        if (prev.find(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderId]);

    useEffect(() => {
        // Scroll to bottom when messages change
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const fetchInitialMessages = async () => {
        try {
            const data = await fetchOrderMessages(orderId);
            setMessages(data as any);
        } catch (e) {
            console.error('Error fetching messages:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !imageFile) || !currentUserId || sending) return;

        setSending(true);
        try {
            let imageUrl = null;
            if (imageFile) {
                const path = `${orderId}/chat-${Date.now()}`;
                imageUrl = await uploadFile(imageFile, 'chat_images', path);
            }

            await sendOrderMessage(orderId, currentUserId, newMessage.trim() || null, imageUrl);

            setNewMessage('');
            removeImage();
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
            setImagePreview(URL.createObjectURL(e.target.files[0]));
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const formatTime = (isoString: string) => {
        const d = new Date(isoString);
        return isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('default', {
            hour: '2-digit', minute: '2-digit'
        }).format(d);
    };

    return (
        <div className="flex flex-col bg-background overflow-hidden h-full w-full relative">

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-full space-y-3 opacity-40">
                        <MessageSquare className="w-12 h-12 text-muted-foreground" />
                        <p className="text-sm font-medium">{t('chat.no_messages') || 'No messages yet. Start the conversation!'}</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.user_id === currentUserId;
                        // Admin gets special styling, but for now we just differentiate me vs others
                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                {/* Sender Name */}
                                <span className="text-[10px] text-muted-foreground font-bold mb-1 mx-1">
                                    {isMe ? (t('chat.you') || 'You') : (role === 'admin' ? (msg.user?.display_name || msg.user?.email || 'User') : (partnerName || 'Partner'))}
                                </span>

                                {/* Message Bubble */}
                                <div
                                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${isMe
                                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                        : 'bg-secondary text-secondary-foreground rounded-tl-sm'
                                        }`}
                                >
                                    {msg.image_url && (
                                        <div className="mb-2">
                                            <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                                                <img src={msg.image_url} alt="Shared image" className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity bg-white" />
                                            </a>
                                        </div>
                                    )}
                                    {msg.content && <p className="text-sm whitespace-pre-wrap word-break">{msg.content}</p>}
                                </div>

                                {/* Time */}
                                <span className="text-[9px] text-muted-foreground/70 mt-1 mx-1">
                                    {formatTime(msg.created_at)}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-border/50 shrink-0 bg-background pb-safe p-3 md:p-4 flex flex-col gap-2 relative z-10">
                {imagePreview && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                        <img src={imagePreview} className="w-full h-full object-cover bg-secondary" alt="Preview" />
                        <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-0 right-0 p-1 bg-background/80 rounded-bl-lg hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-12 w-12 rounded-xl shrink-0 p-0 text-muted-foreground hover:bg-secondary/50 hover:text-primary transition-colors"
                        disabled={sending}
                    >
                        <ImagePlus className="w-6 h-6" />
                    </Button>

                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={t('chat.placeholder') || 'Type a message...'}
                        className="flex-1 rounded-xl h-12 bg-secondary/50 focus-visible:ring-1 focus-visible:ring-primary/50"
                        disabled={sending}
                    />

                    <Button
                        type="submit"
                        disabled={(!newMessage.trim() && !imageFile) || sending}
                        className="h-12 w-12 rounded-xl shrink-0 p-0 bg-primary hover:bg-primary/90 transition-colors"
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </Button>
                </form>
            </div>
        </div>
    );
}
