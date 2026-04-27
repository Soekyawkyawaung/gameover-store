"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, ShoppingCart, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Wishlist = ({ onBack, onGameClick }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setIsLoading(false);
      return;
    }
    setUser(session.user);

    const { data, error } = await supabase
      .from('wishlist')
      .select('id, game_id, games(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWishlistItems(data);
    }
    setIsLoading(false);
  };

  const handleRemove = async (wishlistId) => {
    const { error } = await supabase.from('wishlist').delete().eq('id', wishlistId);
    if (error) {
      toast.error("Could not remove item.");
    } else {
      toast.success("Removed from wishlist");
      setWishlistItems(prev => prev.filter(item => item.id !== wishlistId));
    }
  };

  const handleAddToCart = async (gameId) => {
    try {
      const { error } = await supabase.from('cart').insert([{ user_id: user.id, game_id: gameId }]);
      if (error && error.code === '23505') {
        toast.success("Already in your cart!");
      } else if (error) {
        throw error;
      } else {
        toast.success("Added to Cart!");
        window.dispatchEvent(new Event('cartUpdated')); 
      }
    } catch (error) {
      toast.error("Could not add to cart.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-[#0a0a0a] pb-20 animate-in slide-in-from-right duration-300 transition-colors duration-300">
      <div className="sticky top-0 z-50 flex items-center bg-white dark:bg-[#121212] px-4 py-4 shadow-sm border-b border-gray-100 dark:border-gray-800">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
          <ArrowLeft className="h-6 w-6 text-gray-800 dark:text-gray-200" />
        </button>
        <h1 className="ml-2 text-xl font-black text-gray-900 dark:text-white">My Wishlist</h1>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-500" /></div>
        ) : wishlistItems.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your wishlist is empty</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Save items you want to buy later!</p>
            <button onClick={onBack} className="mt-6 rounded-xl bg-black dark:bg-white px-6 py-3 font-bold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">Explore Games</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {wishlistItems.map((item) => (
              <div key={item.id} className="flex overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212] shadow-sm">
                <div onClick={() => onGameClick(item.games)} className="w-1/3 cursor-pointer bg-gray-100 dark:bg-gray-800 aspect-square">
                  <img src={item.games.cover_image} alt={item.games.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex w-2/3 flex-col justify-between p-3">
                  <div onClick={() => onGameClick(item.games)} className="cursor-pointer">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{item.games.name}</h3>
                    <p className="mt-1 text-sm font-extrabold text-[#000000] dark:text-gray-300">{item.games.discount_price || item.games.price} MMK</p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleRemove(item.id)} className="flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      <Trash2 className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleAddToCart(item.games.id)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black dark:bg-white py-2 text-xs font-bold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                      <ShoppingCart className="h-4 w-4" /> Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;