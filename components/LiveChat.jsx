"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Image as ImageIcon, Loader2, ArrowLeft, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const LiveChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Chat States
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);

  // Admin Specific States
  const [activeChats, setActiveChats] = useState([]); 
  const [selectedCustomerId, setSelectedCustomerId] = useState(null); 
  const [selectedCustomerName, setSelectedCustomerName] = useState('');

  // Notification States & Refs
  const [unreadCount, setUnreadCount] = useState(0);
  const isOpenRef = useRef(false);
  const selectedCustomerRef = useRef(null);

  // Sync isOpen state to Ref so our background timer can read it
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen && user) {
      // Force a read-count update immediately when opening
      fetchMessageCount(user, isAdmin);
    }
  }, [isOpen, user, isAdmin]);

  useEffect(() => {
    selectedCustomerRef.current = selectedCustomerId;
  }, [selectedCustomerId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Fetch messages for the selected customer
  useEffect(() => {
    if (isAdmin && selectedCustomerId) fetchMessages(selectedCustomerId);
  }, [selectedCustomerId, isAdmin]);

  const fetchMessageCount = async (currentUser, adminCheck) => {
    let query = supabase.from('messages').select('*', { count: 'exact', head: true });
    
    // Admin counts messages sent by customers. Customers count messages sent by admin.
    if (adminCheck) {
      query = query.eq('is_admin', false); 
    } else {
      query = query.eq('room_id', currentUser.id).eq('is_admin', true); 
    }
    
    const { count } = await query;
    
    if (count !== null) {
      const storageKey = `chat_read_count_${currentUser.id}`;
      
      if (isOpenRef.current) {
        localStorage.setItem(storageKey, count.toString());
        setUnreadCount(0);
      } else {
        const lastRead = parseInt(localStorage.getItem(storageKey) || '0');
        if (count > lastRead) {
          setUnreadCount(count - lastRead);
        } else {
          setUnreadCount(0);
        }
      }
    }
  };

  const fetchActiveChats = async () => {
    const { data, error } = await supabase.from('messages').select('room_id, customer_name').order('created_at', { ascending: false });
    if (!error && data) {
      const uniqueChats = [];
      const seenIds = new Set();
      data.forEach(msg => {
        if (!seenIds.has(msg.room_id)) {
          seenIds.add(msg.room_id);
          uniqueChats.push({ id: msg.room_id, name: msg.customer_name });
        }
      });
      setActiveChats(uniqueChats);
    }
  };

  const fetchMessages = async (roomId) => {
    if (!roomId) return;
    const { data, error } = await supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
    if (!error && data) setMessages(data);
  };

  // Initial Setup and Background Polling
  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        // CHANGED: Using GameOver Admin Email
        const adminCheck = session.user.email === 'pyaephyo.gameover@gmail.com';
        setIsAdmin(adminCheck);

        fetchMessageCount(session.user, adminCheck);

        if (adminCheck) fetchActiveChats();
        else fetchMessages(session.user.id);
      }
    };
    initChat();

    const interval = setInterval(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          // CHANGED: Using GameOver Admin Email
          const adminCheck = session.user.email === 'pyaephyo.gameover@gmail.com';
          
          fetchMessageCount(session.user, adminCheck); 
          
          if (adminCheck) {
            fetchActiveChats();
            if (selectedCustomerRef.current) fetchMessages(selectedCustomerRef.current);
          } else {
            fetchMessages(session.user.id);
          }
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (e, imageUrl = null) => {
    e?.preventDefault();
    if (!newMessage.trim() && !imageUrl) return;
    if (!user) { toast.error("Please Sign In to chat."); return; }

    const roomId = isAdmin ? selectedCustomerId : user.id;
    const customerName = isAdmin ? selectedCustomerName : (user.user_metadata?.full_name || user.email);

    const msgData = {
      room_id: roomId,
      sender_id: user.id,
      customer_name: customerName,
      content: newMessage.trim(),
      image_url: imageUrl,
      is_admin: isAdmin
    };

    setNewMessage('');

    const { error } = await supabase.from('messages').insert([msgData]);
    if (error) {
      toast.error("Failed to send message.");
    } else {
      fetchMessages(roomId);
      fetchMessageCount(user, isAdmin); 
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `chat-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('chat_images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('chat_images').getPublicUrl(fileName);
      
      await handleSendMessage(null, publicUrl);
    } catch (error) {
      toast.error("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* FLOATING BUBBLE */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[200] flex items-center justify-center gap-2 rounded-full bg-black p-4 font-bold text-white shadow-2xl hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all"
        >
          <div className="relative">
            <MessageCircle className="h-6 w-6" />
            {/* UNREAD NOTIFICATION BUBBLE */}
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-black shadow-md border-2 border-black animate-in zoom-in duration-300">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="hidden sm:inline pr-2">{isAdmin ? 'Customer Chats' : 'Need Assistant?'}</span>
        </button>
      )}

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[200] flex h-[500px] w-[350px] max-w-[90vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 animate-in slide-in-from-bottom-10 duration-300">
          
          <div className="flex items-center justify-between bg-black p-4 text-white">
            <div className="flex items-center gap-2">
              {isAdmin && selectedCustomerId ? (
                <button onClick={() => setSelectedCustomerId(null)} className="hover:bg-white/20 p-1 rounded-full"><ArrowLeft className="h-5 w-5" /></button>
              ) : (
                <MessageCircle className="h-5 w-5" />
              )}
              <h3 className="font-bold">
                {isAdmin 
                  ? (selectedCustomerId ? selectedCustomerName : 'Customer Inboxes') 
                  : 'GameOver Support'}
              </h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X className="h-5 w-5" /></button>
          </div>

          {isAdmin && !selectedCustomerId ? (
            <div className="flex-1 overflow-y-auto bg-gray-50 p-2">
              {activeChats.length === 0 ? (
                <div className="text-center text-sm text-gray-500 mt-20">No messages yet.</div>
              ) : (
                activeChats.map(chat => (
                  <button 
                    key={chat.id} 
                    onClick={() => { setSelectedCustomerId(chat.id); setSelectedCustomerName(chat.name); }}
                    className="w-full flex items-center gap-3 p-3 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="bg-gray-200 p-2 rounded-full"><User className="h-5 w-5 text-gray-600"/></div>
                    <span className="font-bold text-sm text-gray-900 truncate">{chat.name}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto bg-gray-50 p-4 flex flex-col gap-3">
                {messages.length === 0 ? (
                  <div className="text-center text-xs font-bold text-gray-400 mt-10">Send a message to start chatting! (Photos and Emojis supported)</div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}>
                        {!isMe && <span className="text-[10px] font-bold text-gray-400 mb-1 ml-1">{msg.is_admin ? 'Admin' : msg.customer_name}</span>}
                        <div className={`rounded-2xl p-3 text-sm ${isMe ? 'bg-black text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none shadow-sm'}`}>
                          {msg.image_url && <a href={msg.image_url} target="_blank" rel="noreferrer"><img src={msg.image_url} alt="attachment" className="rounded-lg mb-2 max-w-full h-auto cursor-pointer" /></a>}
                          {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-white p-3 border-t border-gray-200">
                <label className="cursor-pointer p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                  {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-black" /> : <ImageIcon className="h-5 w-5" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                </label>
                
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                  placeholder="Type a message..." 
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none text-gray-900 placeholder-gray-500"
                />
                
                <button type="submit" disabled={!newMessage.trim() && !isUploading} className="p-2 text-black hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-transparent">
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default LiveChat;