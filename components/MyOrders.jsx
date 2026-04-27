"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Package, Clock, CheckCircle, Key, Gamepad2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MyOrders = ({ onBack }) => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deliveryPopup, setDeliveryPopup] = useState(null); 

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from('orders').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (data) setOrders(data);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-[#0a0a0a] pb-20 animate-in slide-in-from-right duration-300 relative transition-colors duration-300">
      <div className="sticky top-0 z-40 flex items-center bg-white dark:bg-[#121212] px-4 py-4 shadow-sm border-b border-gray-100 dark:border-gray-800">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"><ArrowLeft className="h-6 w-6 text-gray-800 dark:text-gray-200" /></button>
        <h1 className="ml-2 text-xl font-black text-gray-900 dark:text-white">My Orders</h1>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-500" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">No orders yet</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">When you buy games, they will appear here!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212] shadow-sm overflow-hidden">
                
                <div className="flex justify-between items-center bg-gray-50 dark:bg-[#0a0a0a] p-4 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Order No.</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{order.order_no}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                    {order.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded mt-1"><Clock className="h-3 w-3"/> Pending</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-500 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded mt-1"><CheckCircle className="h-3 w-3"/> Paid</span>
                    )}
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="h-14 w-14 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                        {item.cover_image ? (
                          <img src={item.cover_image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <Gamepad2 className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{item.name}</span>
                        <span className="text-xs font-extrabold text-gray-500 dark:text-gray-400 mt-0.5">{item.price} MMK</span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-2 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <span className="font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="font-black text-[#000000] dark:text-white text-lg">{order.total_price.toLocaleString()} MMK</span>
                  </div>

                  {order.status === 'paid' && order.delivery_info && (
                    <button 
                      onClick={() => setDeliveryPopup({ orderNo: order.order_no, info: order.delivery_info })}
                      className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 dark:bg-green-700 py-3.5 text-sm font-bold text-white shadow-md hover:bg-green-700 dark:hover:bg-green-600 active:scale-95 transition-all"
                    >
                      <Key className="h-4 w-4" /> Retrieve Details
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deliveryPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#121212] p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="mb-4 flex items-center justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />
              </div>
            </div>
            <h3 className="text-center text-xl font-black text-gray-900 dark:text-white mb-1">Your Game Details</h3>
            <p className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-6">Order: {deliveryPopup.orderNo}</p>
            
            <div className="rounded-xl bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 p-4 mb-6 max-h-64 overflow-y-auto">
              <p className="font-mono text-sm font-medium text-gray-800 dark:text-gray-300 whitespace-pre-wrap break-all leading-relaxed">
                {deliveryPopup.info}
              </p>
            </div>

            <button 
              onClick={() => setDeliveryPopup(null)}
              className="w-full rounded-xl bg-black dark:bg-white py-3.5 font-bold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyOrders;