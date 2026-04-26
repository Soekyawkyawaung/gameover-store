"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, ShoppingCart, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Cart = ({ onBack, onCheckout, promotedGamesIds = {} }) => {
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCart();
  }, []);

  const getDerivedPrice = (item) => {
    const isGift = !!item.gift_cards;
    const targetItem = isGift ? item.gift_cards : item.games;
    if (!targetItem) return { price: 0, isPromo: false };

    if (isGift) {
      return { price: item.selected_option?.price || 0, isPromo: false };
    }

    const promo = promotedGamesIds[targetItem.id];
    const isActivated = item.account_type === 'Activated Account';
    
    const regularPrice = isActivated 
      ? (targetItem.discount_price || targetItem.price)
      : (targetItem.deactivated_discount || targetItem.deactivated_price);

    if (promo && ((isActivated && promo.activated) || (!isActivated && promo.deactivated))) {
      return {
        price: isActivated ? promo.activated : promo.deactivated,
        regularPrice: regularPrice,
        isPromo: true
      };
    }

    return { price: regularPrice, isPromo: false };
  };

  const fetchCart = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase
          .from('cart')
          .select('id, account_type, selected_option, quantity, games(*), gift_cards(*)')
          .eq('user_id', session.user.id)
          .order('id', { ascending: true });

        if (error) throw error;

        if (data) {
          setCartItems(data);
          calculateTotal(data);
        }
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => {
      const { price } = getDerivedPrice(item);
      return sum + (Number(price) * (item.quantity || 1));
    }, 0);
    setTotalPrice(total);
  };

  const handleRemoveItem = async (id) => {
    try {
      const { error } = await supabase.from('cart').delete().eq('id', id);
      if (error) throw error;
      
      const updatedCart = cartItems.filter(item => item.id !== id);
      setCartItems(updatedCart);
      calculateTotal(updatedCart);
      toast.success("Item removed");
      window.dispatchEvent(new Event('cartUpdated')); 
    } catch (error) {
      toast.error("Failed to remove item");
    }
  };

  const handleUpdateQuantity = async (id, currentQty, change) => {
    const newQty = currentQty + change;
    if (newQty < 1) return;

    const updatedCart = cartItems.map(item => 
      item.id === id ? { ...item, quantity: newQty } : item
    );
    setCartItems(updatedCart);
    calculateTotal(updatedCart);

    try {
      const { error } = await supabase.from('cart').update({ quantity: newQty }).eq('id', id);
      if (error) throw error;
    } catch (error) {
      toast.error("Failed to update quantity");
      fetchCart(); 
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <div className="sticky top-0 z-50 flex items-center bg-white px-4 py-4 shadow-sm border-b border-gray-100">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100"><ArrowLeft className="h-6 w-6 text-gray-800" /></button>
          <h1 className="ml-2 text-lg font-black text-gray-900">Your Cart</h1>
        </div>
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-black" /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 animate-in slide-in-from-right duration-300">
      
      <div className="sticky top-0 z-50 flex items-center bg-white px-4 py-4 shadow-sm border-b border-gray-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
          <ArrowLeft className="h-6 w-6 text-gray-800" />
        </button>
        <h1 className="ml-2 text-lg font-black text-gray-900">Your Cart</h1>
      </div>

      {cartItems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="rounded-full bg-gray-200 p-6 mb-4"><ShoppingCart className="h-10 w-10 text-gray-400" /></div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-sm font-semibold text-gray-500 mb-8">Looks like you haven't added any games or gift cards yet.</p>
          <button onClick={onBack} className="rounded-xl bg-black px-8 py-3.5 font-bold text-white shadow-lg active:scale-95 transition-all hover:bg-gray-800">
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="flex flex-col p-4 pb-32">
          <div className="flex flex-col gap-4">
            {cartItems.map(item => {
              const isGift = !!item.gift_cards;
              const targetItem = isGift ? item.gift_cards : item.games;
              const itemQty = item.quantity || 1;
              
              if (!targetItem) return null; 

              const dp = getDerivedPrice(item);
              const totalItemPrice = Number(dp.price) * itemQty;

              return (
                <div key={item.id} className="flex overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="w-28 bg-gray-100 flex items-center justify-center p-2">
                    <img src={targetItem.cover_image || targetItem.image} alt={targetItem.name} className={`h-full w-full ${isGift ? 'object-contain' : 'object-cover rounded-lg'}`} />
                  </div>
                  
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div className="flex justify-between items-start">
                      <div className="pr-2">
                        <h3 className="text-sm font-bold text-gray-900 leading-tight">{targetItem.name}</h3>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1 mb-2">
                          {isGift ? item.selected_option?.label : item.account_type}
                        </p>
                        
                        <div className="flex items-center gap-3 bg-gray-50 rounded-full px-2 py-1 border border-gray-200 w-fit">
                          <button 
                            onClick={() => handleUpdateQuantity(item.id, itemQty, -1)}
                            disabled={itemQty <= 1}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-gray-600 shadow-sm border border-gray-200 font-bold disabled:opacity-30 active:scale-95 transition-all"
                          >-</button>
                          <span className="text-xs font-black w-4 text-center text-gray-900">{itemQty}</span>
                          <button 
                            onClick={() => handleUpdateQuantity(item.id, itemQty, 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-black text-white shadow-sm font-bold active:scale-95 transition-all"
                          >+</button>
                        </div>
                      </div>

                      <button onClick={() => handleRemoveItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`font-black ${dp.isPromo ? 'text-red-600' : 'text-black'}`}>
                        {totalItemPrice.toLocaleString()} MMK
                      </span>
                      {dp.isPromo && dp.regularPrice && (
                        <span className="text-[10px] font-bold text-gray-400 line-through">
                          {(dp.regularPrice * itemQty).toLocaleString()} MMK
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t border-gray-100 bg-white p-4 z-40">
          <div className="mb-4 flex justify-between items-center px-1">
            <span className="text-sm font-bold text-gray-500">Subtotal</span>
            <span className="text-xl font-black text-black">{totalPrice.toLocaleString()} MMK</span>
          </div>
          <button 
            onClick={onCheckout} 
            className="w-full rounded-xl bg-black py-4 font-black text-white shadow-lg shadow-gray-500/30 active:scale-95 transition-transform hover:bg-gray-800"
          >
            PROCEED TO CHECKOUT
          </button>
        </div>
      )}
    </div>
  );
};

export default Cart;