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

    // Fetch wishlist joined with game details
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
        window.dispatchEvent(new Event('cartUpdated')); // Update header cart number
      }
    } catch (error) {
      toast.error("Could not add to cart.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-20 animate-in slide-in-from-right duration-300">
      <div className="sticky top-0 z-50 flex items-center bg-white px-4 py-4 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-all">
          <ArrowLeft className="h-6 w-6 text-gray-800" />
        </button>
        <h1 className="ml-2 text-xl font-black text-gray-900">My Wishlist</h1>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>
        ) : wishlistItems.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-lg font-bold text-gray-900">Your wishlist is empty</h2>
            <p className="text-sm text-gray-500 mt-2">Save items you want to buy later!</p>
            <button onClick={onBack} className="mt-6 rounded-xl bg-black px-6 py-3 font-bold text-white">Explore Games</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {wishlistItems.map((item) => (
              <div key={item.id} className="flex overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                <div onClick={() => onGameClick(item.games)} className="w-1/3 cursor-pointer bg-gray-100 aspect-square">
                  <img src={item.games.cover_image} alt={item.games.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex w-2/3 flex-col justify-between p-3">
                  <div onClick={() => onGameClick(item.games)} className="cursor-pointer">
                    <h3 className="text-sm font-bold text-gray-900 leading-tight">{item.games.name}</h3>
                    <p className="mt-1 text-sm font-extrabold text-[#000000]">{item.games.discount_price || item.games.price} MMK</p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleRemove(item.id)} className="flex items-center justify-center rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleAddToCart(item.games.id)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black py-2 text-xs font-bold text-white hover:bg-gray-800">
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