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

  // --- NEW SMART PRICE LOGIC ---
  const getDerivedPrice = (item) => {
    const isGift = !!item.gift_cards;
    const targetItem = isGift ? item.gift_cards : item.games;
    if (!targetItem) return { price: 0, isPromo: false };

    if (isGift) {
      return { price: item.selected_option?.price || 0, isPromo: false };
    }

    const promo = promotedGamesIds[targetItem.id];
    const accType = item.account_type || '';

    let regularPrice = 0;
    let promoPrice = null;

    if (accType.includes('PS5')) {
      if (accType.includes('Deactivated')) {
        regularPrice = targetItem.ps5_deactivated_discount || targetItem.ps5_deactivated_price || 0;
        promoPrice = promo?.ps5_deact_promo_price;
      } else {
        regularPrice = targetItem.ps5_discount_price || targetItem.ps5_price || 0;
        promoPrice = promo?.ps5_promo_price;
      }
    } else if (accType.includes('PS4')) {
      if (accType.includes('Deactivated')) {
        regularPrice = targetItem.ps4_deactivated_discount || targetItem.ps4_deactivated_price || 0;
        promoPrice = promo?.ps4_deact_promo_price;
      } else {
        regularPrice = targetItem.ps4_discount_price || targetItem.ps4_price || 0;
        promoPrice = promo?.ps4_promo_price;
      }
    } else {
      // General Fallback
      if (accType.includes('Deactivated')) {
        regularPrice = targetItem.deactivated_discount || targetItem.deactivated_price || 0;
        promoPrice = promo?.deactivated;
      } else {
        regularPrice = targetItem.discount_price || targetItem.price || 0;
        promoPrice = promo?.activated;
      }
    }

    if (promoPrice) {
      return { price: promoPrice, regularPrice: regularPrice, isPromo: true };
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
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-300">
        <div className="sticky top-0 z-50 flex items-center bg-white dark:bg-[#121212] px-4 py-4 shadow-sm border-b border-gray-100 dark:border-gray-800">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft className="h-6 w-6 text-gray-800 dark:text-gray-200" /></button>
          <h1 className="ml-2 text-lg font-black text-gray-900 dark:text-white">Your Cart</h1>
        </div>
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-black dark:text-white" /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#0a0a0a] animate-in slide-in-from-right duration-300 transition-colors duration-300">
      
      <div className="sticky top-0 z-50 flex items-center bg-white dark:bg-[#121212] px-4 py-4 shadow-sm border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all">
          <ArrowLeft className="h-6 w-6 text-gray-800 dark:text-gray-200" />
        </button>
        <h1 className="ml-2 text-lg font-black text-gray-900 dark:text-white">Your Cart</h1>
      </div>

      {cartItems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="rounded-full bg-gray-200 dark:bg-gray-800 p-6 mb-4"><ShoppingCart className="h-10 w-10 text-gray-400 dark:text-gray-500" /></div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-8">Looks like you haven't added any games or gift cards yet.</p>
          <button onClick={onBack} className="rounded-xl bg-black dark:bg-white px-8 py-3.5 font-bold text-white dark:text-black shadow-lg active:scale-95 transition-all hover:bg-gray-800 dark:hover:bg-gray-200">
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
                <div key={item.id} className="flex overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212] shadow-sm">
                  <div className="w-28 bg-gray-100 dark:bg-gray-800 flex items-center justify-center p-2">
                    <img src={targetItem.cover_image || targetItem.image} alt={targetItem.name} className={`h-full w-full ${isGift ? 'object-contain' : 'object-cover rounded-lg'}`} />
                  </div>
                  
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div className="flex justify-between items-start">
                      <div className="pr-2">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{targetItem.name}</h3>
                        <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1 mb-2">
                          {isGift ? item.selected_option?.label : item.account_type}
                        </p>
                        
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#0a0a0a] rounded-full px-2 py-1 border border-gray-200 dark:border-gray-800 w-fit">
                          <button 
                            onClick={() => handleUpdateQuantity(item.id, itemQty, -1)}
                            disabled={itemQty <= 1}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700 font-bold disabled:opacity-30 active:scale-95 transition-all"
                          >-</button>
                          <span className="text-xs font-black w-4 text-center text-gray-900 dark:text-white">{itemQty}</span>
                          <button 
                            onClick={() => handleUpdateQuantity(item.id, itemQty, 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black shadow-sm font-bold active:scale-95 transition-all"
                          >+</button>
                        </div>
                      </div>

                      <button onClick={() => handleRemoveItem(item.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`font-black ${dp.isPromo ? 'text-red-600 dark:text-red-500' : 'text-black dark:text-white'}`}>
                        {totalItemPrice.toLocaleString()} MMK
                      </span>
                      {dp.isPromo && dp.regularPrice && (
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 line-through">
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
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212] p-4 z-40 transition-colors duration-300">
          <div className="mb-4 flex justify-between items-center px-1">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Subtotal</span>
            <span className="text-xl font-black text-black dark:text-white">{totalPrice.toLocaleString()} MMK</span>
          </div>
          <button 
            onClick={onCheckout} 
            className="w-full rounded-xl bg-black dark:bg-white py-4 font-black text-white dark:text-black shadow-lg shadow-gray-500/30 dark:shadow-none active:scale-95 transition-transform hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            PROCEED TO CHECKOUT
          </button>
        </div>
      )}
    </div>
  );
};

export default Cart;