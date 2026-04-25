"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Package, Clock, CheckCircle, Key, Gamepad2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MyOrders = ({ onBack }) => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deliveryPopup, setDeliveryPopup] = useState(null); // Controls the modal

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
    <div className="flex min-h-screen flex-col bg-gray-50 pb-20 animate-in slide-in-from-right duration-300 relative">
      <div className="sticky top-0 z-40 flex items-center bg-white px-4 py-4 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-all"><ArrowLeft className="h-6 w-6 text-gray-800" /></button>
        <h1 className="ml-2 text-xl font-black text-gray-900">My Orders</h1>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900">No orders yet</h2>
            <p className="text-sm text-gray-500 mt-2">When you buy games, they will appear here!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                
                {/* Header of the Card */}
                <div className="flex justify-between items-center bg-gray-50 p-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs font-bold text-gray-500">Order No.</p>
                    <p className="text-sm font-black text-gray-900">{order.order_no}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                    {order.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-100 px-2 py-1 rounded mt-1"><Clock className="h-3 w-3"/> Pending</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded mt-1"><CheckCircle className="h-3 w-3"/> Paid</span>
                    )}
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-4">
                  {/* Loop through the items and show their Cover Photo, Name, and Price */}
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="h-14 w-14 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                        {/* Fallback for old orders that didn't have images saved */}
                        {item.cover_image ? (
                          <img src={item.cover_image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <Gamepad2 className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 leading-tight">{item.name}</span>
                        <span className="text-xs font-extrabold text-gray-500 mt-0.5">{item.price} MMK</span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-2 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-black text-[#000000] text-lg">{order.total_price.toLocaleString()} MMK</span>
                  </div>

                  {/* RETRIEVE BUTTON (Only shows when Paid AND Admin has entered info) */}
                  {order.status === 'paid' && order.delivery_info && (
                    <button 
                      onClick={() => setDeliveryPopup({ orderNo: order.order_no, info: order.delivery_info })}
                      className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-green-700 active:scale-95 transition-all"
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

      {/* --- POPUP MODAL --- */}
      {deliveryPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-center text-xl font-black text-gray-900 mb-1">Your Game Details</h3>
            <p className="text-center text-xs font-bold text-gray-500 mb-6">Order: {deliveryPopup.orderNo}</p>
            
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 mb-6 max-h-64 overflow-y-auto">
              <p className="font-mono text-sm font-medium text-gray-800 whitespace-pre-wrap break-all leading-relaxed">
                {deliveryPopup.info}
              </p>
            </div>

            <button 
              onClick={() => setDeliveryPopup(null)}
              className="w-full rounded-xl bg-black py-3.5 font-bold text-white hover:bg-gray-800 active:scale-95 transition-all"
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