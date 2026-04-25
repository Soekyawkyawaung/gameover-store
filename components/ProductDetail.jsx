"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Heart, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const ProductDetail = ({ game, allGames, onBack, onBuyNow, onGameClick }) => {
  const [isAddingCart, setIsAddingCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  
  const isGiftCard = !!game.options;

  // Account Type, Option & Quantity States
  const [accountType, setAccountType] = useState('Activated Account');
  const [selectedOption, setSelectedOption] = useState(null);
  const [quantity, setQuantity] = useState(1); // NEW: Quantity State

  // Read More & Trailer States
  const [isExpanded, setIsExpanded] = useState(false);
  const DESCRIPTION_LIMIT = 200; 
  const shouldTruncate = game.description && game.description.length > DESCRIPTION_LIMIT;
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);

  useEffect(() => {
    checkWishlistStatus();
    setIsExpanded(false); 
    setIsPlayingTrailer(false);
    setAccountType('Activated Account'); 
    setQuantity(1); // Reset quantity on new item
    if (isGiftCard && game.options && game.options.length > 0) {
      setSelectedOption(game.options[0]);
    } else {
      setSelectedOption(null);
    }
  }, [game.id]);

  const checkWishlistStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && !isGiftCard) {
      const { data } = await supabase.from('wishlist').select('id').eq('user_id', session.user.id).eq('game_id', game.id).single();
      setIsWishlisted(!!data);
    }
  };

  const handleToggleWishlist = async () => {
    if (isGiftCard) return; 
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return toast.error("Please sign in to add to wishlist");

    setIsWishlistLoading(true);
    try {
      if (isWishlisted) {
        await supabase.from('wishlist').delete().eq('user_id', session.user.id).eq('game_id', game.id);
        setIsWishlisted(false);
        toast.success("Removed from Wishlist");
      } else {
        await supabase.from('wishlist').insert([{ user_id: session.user.id, game_id: game.id }]);
        setIsWishlisted(true);
        toast.success("Added to Wishlist!");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const handleAddToCart = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return toast.error("Please sign in to add to cart");

    setIsAddingCart(true);
    try {
      const cartData = {
        user_id: session.user.id,
        game_id: !isGiftCard ? game.id : null,
        account_type: !isGiftCard ? accountType : null,
        gift_card_id: isGiftCard ? game.id : null,
        selected_option: isGiftCard ? selectedOption : null,
        quantity: isGiftCard ? quantity : 1 // Save the quantity!
      };

      // Check if exact same item exists in cart to update quantity instead of duplicating
      let existingQuery = supabase.from('cart').select('id, quantity').eq('user_id', session.user.id);
      if (!isGiftCard) existingQuery = existingQuery.eq('game_id', game.id).eq('account_type', accountType);
      else existingQuery = existingQuery.eq('gift_card_id', game.id).eq('selected_option->>label', selectedOption.label);
      
      const { data: existingCart } = await existingQuery.single();
      
      if (existingCart) {
        // If it exists, just increase the quantity
        await supabase.from('cart').update({ quantity: existingCart.quantity + (isGiftCard ? quantity : 1) }).eq('id', existingCart.id);
        toast.success("Cart updated!");
      } else {
        const { error } = await supabase.from('cart').insert([cartData]);
        if (error) throw error;
        toast.success("Added to Cart!");
      }
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      toast.error("Failed to add to cart");
    } finally {
      setIsAddingCart(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    onBuyNow();
  };

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = getYouTubeId(game.youtube_link);
  const isPreOrder = game.collections?.some(c => c.toLowerCase().includes('pre-order') || c.toLowerCase().includes('preorder'));
  const recommendedGames = allGames.filter(g => g.id !== game.id && !g.options).slice(0, 6);

  // Dynamic Total Price Calculation
  const currentBasePrice = isGiftCard 
    ? (selectedOption ? Number(selectedOption.price) : 0)
    : (accountType === 'Activated Account' ? (game.discount_price || game.price) : (game.deactivated_discount || game.deactivated_price));
  
  const totalPrice = currentBasePrice * (isGiftCard ? quantity : 1);

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 animate-in fade-in duration-300">
      
      <div className="sticky top-0 z-50 flex items-center justify-between bg-white px-4 py-4 shadow-sm border-b border-gray-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95"><ArrowLeft className="h-6 w-6 text-gray-800" /></button>
        <h1 className="text-sm font-black text-gray-900 truncate px-4 uppercase">{game.name}</h1>
        {!isGiftCard ? (
          <button onClick={handleToggleWishlist} disabled={isWishlistLoading} className="p-2 -mr-2 rounded-full hover:bg-gray-100 active:scale-95">
            <Heart className={`h-6 w-6 transition-colors ${isWishlisted ? 'fill-[#000000] text-[#000000]' : 'text-gray-400'}`} />
          </button>
        ) : <div className="w-10"></div>}
      </div>

      <div className={`w-full aspect-square bg-gray-50 flex items-center justify-center ${isGiftCard ? 'p-12' : ''}`}>
        <img src={game.cover_image || game.image} alt={game.name} className={isGiftCard ? "w-full h-full object-contain drop-shadow-xl" : "w-full h-full object-cover"} />
      </div>

      <div className="p-5">
        <h2 className="text-xl font-black text-gray-900 mb-6">{game.name}</h2>
        
        {/* --- OFFGAMERS STYLE GIFT CARD UI --- */}
        {isGiftCard ? (
          <div className="flex flex-col mb-8 border-b border-gray-100 pb-8">
            <div className="grid grid-cols-2 gap-3 mb-6">
              {game.options?.map((opt, idx) => (
                <button 
                  key={idx}
                  onClick={() => setSelectedOption(opt)}
                  className={`py-4 px-3 rounded-2xl border-2 text-center transition-all ${selectedOption?.label === opt.label ? 'border-black bg-white shadow-sm ring-1 ring-black/5' : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'}`}
                >
                  <p className={`text-sm font-black ${selectedOption?.label === opt.label ? 'text-black' : 'text-gray-600'}`}>{opt.label}</p>
                </button>
              ))}
            </div>

            {/* QUANTITY SELECTOR */}
            <div className="flex justify-center">
              <div className="flex items-center gap-6 bg-gray-50 rounded-full px-5 py-2 border border-gray-200 shadow-inner">
                <button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-600 hover:text-black hover:bg-gray-100 shadow-sm border border-gray-200 font-bold text-xl transition-colors active:scale-95"
                >-</button>
                <span className="font-black text-lg w-6 text-center text-gray-900">{quantity}</span>
                <button 
                  onClick={() => setQuantity(q => q + 1)} 
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-black text-white shadow-md font-bold text-xl transition-transform active:scale-95"
                >+</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Select Account Type</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setAccountType('Activated Account')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${accountType === 'Activated Account' ? 'border-black bg-black text-white shadow-md' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}
              >
                <p className="text-xs font-bold mb-1 opacity-80">Activated</p>
                <p className={`text-sm font-black ${accountType === 'Activated Account' ? 'text-white' : 'text-black'}`}>
                  {game.discount_price ? game.discount_price.toLocaleString() : game.price.toLocaleString()} MMK
                </p>
              </button>

              {game.deactivated_price && (
                <button 
                  onClick={() => setAccountType('Deactivated Account')}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${accountType === 'Deactivated Account' ? 'border-black bg-black text-white shadow-md' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}
                >
                  <p className="text-xs font-bold mb-1 opacity-80">Deactivated</p>
                  <p className={`text-sm font-black ${accountType === 'Deactivated Account' ? 'text-white' : 'text-black'}`}>
                    {game.deactivated_discount ? game.deactivated_discount.toLocaleString() : game.deactivated_price.toLocaleString()} MMK
                  </p>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {!isGiftCard && (
          <div className="flex flex-wrap gap-2 mb-6">
            {game.size && <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{game.size}</span>}
            {game.collections?.map(tag => (
              <span key={tag} className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{tag}</span>
            ))}
          </div>
        )}

        {/* INLINE GAME TRAILER */}
        {!isGiftCard && game.youtube_link && (
          <div className="mb-6 border-t border-gray-100 pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Game Trailer</h3>
            {!isPlayingTrailer && youtubeId ? (
              <button onClick={() => setIsPlayingTrailer(true)} className="w-full flex items-center justify-center gap-2 bg-gray-100 text-black py-3 rounded-xl font-bold hover:bg-gray-200 active:scale-95 transition-all">
                <PlayCircle className="h-5 w-5" /> Watch Trailer
              </button>
            ) : isPlayingTrailer && youtubeId ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm">
                <iframe src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`} className="absolute top-0 left-0 w-full h-full border-0" allow="autoplay; encrypted-media" allowFullScreen></iframe>
              </div>
            ) : null}
          </div>
        )}

        {/* Description */}
        <div className="mb-6 pt-4">
          <h3 className="text-sm font-black text-gray-900 mb-2">Product Info</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
            {shouldTruncate && !isExpanded ? `${game.description.substring(0, DESCRIPTION_LIMIT)}...` : game.description}
          </p>
          {shouldTruncate && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="mt-2 flex items-center gap-1 text-xs font-black text-blue-600 active:scale-95 transition-transform">
              {isExpanded ? <>SHOW LESS <ChevronUp className="h-4 w-4" /></> : <>READ MORE <ChevronDown className="h-4 w-4" /></>}
            </button>
          )}
        </div>

      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 z-50">
        {/* Dynamic Total Price Header */}
        <div className="flex justify-between items-center mb-3 px-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total {isGiftCard && `(x${quantity})`}</span>
          <span className="text-lg font-black text-black">{totalPrice.toLocaleString()} MMK</span>
        </div>
        
        <div className="flex gap-3">
          <button onClick={handleAddToCart} disabled={isAddingCart || (isGiftCard && !selectedOption)} className="flex items-center justify-center w-14 rounded-xl bg-gray-100 text-gray-900 font-bold active:scale-95 transition-transform disabled:opacity-50">
            <ShoppingCart className="h-5 w-5" />
          </button>
          <button onClick={handleBuyNow} disabled={isGiftCard && !selectedOption} className="flex-1 items-center justify-center rounded-xl bg-black text-white font-black py-3.5 shadow-lg shadow-gray-500/30 active:scale-95 transition-transform hover:bg-gray-800 disabled:opacity-50">
            {isPreOrder ? 'PRE-ORDER' : 'BUY NOW'}
          </button>
        </div>
      </div>

    </div>
  );
};

export default ProductDetail;