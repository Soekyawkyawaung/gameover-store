"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Heart, ChevronDown, ChevronUp, PlayCircle, Image as ImageIcon, X, Tag, Share2, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const ProductDetail = ({ game, prefilledOption = null, allGames, onBack, onBuyNow, onGameClick, promoPrice }) => {
  const [isAddingCart, setIsAddingCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  
  const isGiftCard = !!game.options;

  const [accountType, setAccountType] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [quantity, setQuantity] = useState(1); 

  const [isExpanded, setIsExpanded] = useState(false);
  const DESCRIPTION_LIMIT = 200; 
  const shouldTruncate = game.description && game.description.length > DESCRIPTION_LIMIT;
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  
  // --- NEW: MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- HAPTIC FEEDBACK HELPER ---
  const triggerHaptic = (pattern = 50) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  };

  // --- DYNAMIC ACCOUNT TYPES LOGIC ---
  const availableAccounts = React.useMemo(() => {
    if (isGiftCard) return [];
    const accounts = [];

    // PS4 Accounts
    if (game.ps4_price) {
      accounts.push({ id: 'Activated (PS4)', label: 'Activated (PS4)', price: game.ps4_discount_price || game.ps4_price, original: game.ps4_price, stock: game.ps4_stock, promo: promoPrice?.ps4_promo_price });
      if (game.ps4_deactivated_price) {
        accounts.push({ id: 'Deactivated (PS4)', label: 'Deactivated (PS4)', price: game.ps4_deactivated_discount || game.ps4_deactivated_price, original: game.ps4_deactivated_price, stock: game.ps4_deactivated_stock, promo: promoPrice?.ps4_deact_promo_price });
      }
    }

    // PS5 Accounts
    if (game.ps5_price) {
      accounts.push({ id: 'Activated (PS5)', label: 'Activated (PS5)', price: game.ps5_discount_price || game.ps5_price, original: game.ps5_price, stock: game.ps5_stock, promo: promoPrice?.ps5_promo_price });
      if (game.ps5_deactivated_price) {
        accounts.push({ id: 'Deactivated (PS5)', label: 'Deactivated (PS5)', price: game.ps5_deactivated_discount || game.ps5_deactivated_price, original: game.ps5_deactivated_price, stock: game.ps5_deactivated_stock, promo: promoPrice?.ps5_deact_promo_price });
      }
    }

    // Legacy Fallback
    if (accounts.length === 0 && (game.price || game.discount_price)) {
      accounts.push({ id: 'Activated Account', label: 'Activated Edition', price: game.discount_price || game.price, original: game.price, stock: game.activated_stock, promo: promoPrice?.activated });
      if (game.deactivated_price || game.deactivated_discount) {
        accounts.push({ id: 'Deactivated Account', label: 'Deactivated Edition', price: game.deactivated_discount || game.deactivated_price, original: game.deactivated_price, stock: game.deactivated_stock, promo: promoPrice?.deactivated });
      }
    }
    return accounts;
  }, [game, promoPrice, isGiftCard]);

  const productImages = React.useMemo(() => {
    const images = [];
    if (game.cover_image || game.image) images.push(game.cover_image || game.image);
    if (game.screenshots && Array.isArray(game.screenshots)) {
      images.push(...game.screenshots.filter(url => url));
    }
    return images;
  }, [game]);

  useEffect(() => {
    checkWishlistStatus();
    setIsExpanded(false); 
    setIsPlayingTrailer(false);
    setQuantity(1); 
    setIsGalleryOpen(false);
    setActiveGalleryIndex(0);
    setIsModalOpen(false);

    if (isGiftCard && game.options && game.options.length > 0) {
      setSelectedOption(prefilledOption || game.options[0]);
    } else {
      setSelectedOption(null);
    }
    
    if (!isGiftCard && availableAccounts.length > 0) {
      const inStock = availableAccounts.find(acc => acc.stock > 0);
      setAccountType(inStock ? inStock.id : availableAccounts[0].id);
    }
  }, [game.id, prefilledOption, availableAccounts]);

  const checkWishlistStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && !isGiftCard) {
      const { data } = await supabase.from('wishlist').select('id').eq('user_id', session.user.id).eq('game_id', game.id).maybeSingle();
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
        triggerHaptic([100, 50, 100]);
        toast.success("Removed from Wishlist");
      } else {
        await supabase.from('wishlist').insert([{ user_id: session.user.id, game_id: game.id }]);
        setIsWishlisted(true);
        triggerHaptic([50, 50, 50]);
        toast.success("Added to Wishlist!");
      }
    } catch (error) { toast.error("An error occurred"); } finally { setIsWishlistLoading(false); }
  };

  const handleAddToCart = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return toast.error("Please sign in to add to cart");

    if (isOutOfStock) return toast.error("Sorry, this item is out of stock!");

    setIsAddingCart(true);
    try {
      const cartData = {
        user_id: session.user.id,
        game_id: !isGiftCard ? game.id : null,
        account_type: !isGiftCard ? accountType : null,
        gift_card_id: isGiftCard ? game.id : null,
        selected_option: isGiftCard ? selectedOption : null,
        quantity: isGiftCard ? quantity : 1 
      };

      let existingQuery = supabase.from('cart').select('id, quantity').eq('user_id', session.user.id);
      if (!isGiftCard) existingQuery = existingQuery.eq('game_id', game.id).eq('account_type', accountType);
      else existingQuery = existingQuery.eq('gift_card_id', game.id).eq('selected_option->>label', selectedOption.label);
      
      const { data: existingCart } = await existingQuery.maybeSingle();
      
      if (existingCart) {
        await supabase.from('cart').update({ quantity: existingCart.quantity + (isGiftCard ? quantity : 1) }).eq('id', existingCart.id);
        triggerHaptic([50, 50, 50]);
        toast.success("Cart updated!");
      } else {
        const { error } = await supabase.from('cart').insert([cartData]);
        if (error) throw error;
        triggerHaptic([50, 50, 50]);
        toast.success("Added to Cart!");
      }
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) { toast.error("Failed to add to cart"); } finally { setIsAddingCart(false); }
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) return toast.error("Sorry, this item is out of stock!");
    await handleAddToCart();
    triggerHaptic([50, 50, 50]);
    onBuyNow();
  };

  const handleShare = async () => {
    triggerHaptic(30);
    const shareUrl = `${window.location.origin}/?game=${game.id}`;
    const shareData = {
      title: game.name,
      text: `Check out ${game.name} on Game Over Store!`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
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

  let preOrderTag = null;
  if (isPreOrder) {
    if (game.release_date) {
      const daysToRelease = Math.ceil((new Date(game.release_date) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysToRelease > 0) preOrderTag = "PRE-ORDER";
      else if (daysToRelease === 0) preOrderTag = "Released Today!";
      else preOrderTag = "Available Now"; 
    } else {
      preOrderTag = "PRE-ORDER";
    }
  }

  const activeAccountData = availableAccounts.find(acc => acc.id === accountType);
  const finalPrice = isGiftCard 
    ? (selectedOption ? Number(selectedOption.price) : 0) 
    : (activeAccountData ? (activeAccountData.promo || activeAccountData.price) : 0);
  
  const originalPriceForDisplay = isGiftCard ? null : (activeAccountData?.promo ? activeAccountData.price : activeAccountData?.original);
  const isPromoActive = !isGiftCard && !!activeAccountData?.promo;
  const totalPrice = finalPrice * (isGiftCard ? quantity : 1);
  const isOutOfStock = !isGiftCard && activeAccountData && activeAccountData.stock <= 0;

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#121212] pb-32 animate-in fade-in duration-300 transition-colors relative">
      
      <div className="sticky top-0 z-40 flex items-center justify-between bg-white dark:bg-[#121212] px-4 py-4 shadow-sm border-b border-gray-100 dark:border-gray-800 transition-colors">
        <button onClick={() => { triggerHaptic(30); onBack(); }} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"><ArrowLeft className="h-6 w-6 text-gray-800 dark:text-gray-200" /></button>
        <h1 className="text-sm font-black text-gray-900 dark:text-white truncate px-4 uppercase">{game.name}</h1>
        
        <div className="flex items-center gap-1">
          <button onClick={handleShare} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all">
            <Share2 className="h-5 w-5 text-gray-800 dark:text-gray-200" />
          </button>

          {!isGiftCard ? (
            <button onClick={handleToggleWishlist} disabled={isWishlistLoading} className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all">
              <Heart className={`h-5 w-5 transition-colors ${isWishlisted ? 'fill-black dark:fill-white text-black dark:text-white' : 'text-gray-400 dark:text-gray-500'}`} />
            </button>
          ) : <div className="w-10"></div>}
        </div>
      </div>

      <div 
        className={`w-full aspect-square bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden cursor-pointer ${isGiftCard ? 'p-12' : ''}`}
        onClick={() => {
           if (productImages.length > 0) {
             triggerHaptic(30);
             setActiveGalleryIndex(0);
             setIsGalleryOpen(true);
           }
        }}
      >
        <img 
            src={productImages[activeGalleryIndex] || game.cover_image || game.image} 
            alt={game.name} 
            className={isGiftCard ? "w-full h-full object-contain drop-shadow-xl" : "w-full h-full object-cover animate-in fade-in duration-300"} 
        />
        {!productImages[activeGalleryIndex] && !game.cover_image && !game.image && (
            <div className="flex flex-col items-center gap-2 text-gray-300 dark:text-gray-600">
                <ImageIcon className="w-16 h-16" />
                <span className="text-xs font-bold">No Image Available</span>
            </div>
        )}
      </div>

      <div className="p-5">
        
        {preOrderTag && (
          <div className="mb-3 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 border border-orange-200 dark:border-orange-900/50 w-fit">
            {preOrderTag}
            {game.release_date && <span className="font-bold opacity-70">( {new Date(game.release_date).toLocaleDateString('en-GB')} )</span>}
          </div>
        )}

        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">{game.name}</h2>
        
        {/* --- NATIVE APP STYLE ACCOUNT/DENOMINATION SELECTOR --- */}
        <div className="mb-6">
          <button 
            onClick={() => { triggerHaptic(30); setIsModalOpen(true); }}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-100 dark:bg-[#1c1c1e] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors active:scale-[0.98] border border-transparent dark:border-gray-800 shadow-sm"
          >
            <div className="flex flex-col items-start gap-1 text-left flex-1 pr-4">
              <span className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                {isGiftCard 
                  ? (selectedOption ? selectedOption.label : 'Select Denomination') 
                  : (activeAccountData ? activeAccountData.label : 'Select Edition')
                }
              </span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {isGiftCard 
                  ? (selectedOption ? `${Number(selectedOption.price).toLocaleString()} MMK` : 'Tap to view options') 
                  : (activeAccountData 
                      ? `${(activeAccountData.promo || activeAccountData.price).toLocaleString()} MMK ${game.release_date ? ` • Release Date: ${new Date(game.release_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}` : ''}` 
                      : 'Tap to view editions')
                }
              </span>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-400 dark:text-gray-300 flex-shrink-0" />
          </button>
        </div>

        {/* QUANTITY SELECTOR (GIFT CARDS ONLY) */}
        {isGiftCard && (
          <div className="flex justify-center mb-8 border-b border-gray-100 dark:border-gray-800 pb-8">
            <div className="flex items-center gap-6 bg-gray-50 dark:bg-[#0a0a0a] rounded-full px-5 py-2.5 border border-gray-200 dark:border-gray-800 shadow-inner">
              <button onClick={() => { triggerHaptic(30); setQuantity(q => Math.max(1, q - 1)); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-700 font-bold text-xl transition-colors active:scale-95">-</button>
              <span className="font-black text-lg w-6 text-center text-gray-900 dark:text-white">{quantity}</span>
              <button onClick={() => { triggerHaptic(30); setQuantity(q => q + 1); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black shadow-md font-bold text-xl transition-transform active:scale-95">+</button>
            </div>
          </div>
        )}

        {!isGiftCard && (
          <div className="flex flex-wrap gap-2 mb-6">
            {game.size && <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold px-2 py-1 rounded">{game.size}</span>}
            {game.collections?.map(tag => (
              <span key={tag} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold px-2 py-1 rounded">{tag}</span>
            ))}
          </div>
        )}

        {!isGiftCard && productImages.length > 1 && (
            <div className="mb-8 border-t border-gray-100 dark:border-gray-800 pt-6 animate-in fade-in duration-500">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Product Gallery</h3>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {productImages.map((imgUrl, index) => (
                        <button 
                            key={index} 
                            onClick={() => {
                                triggerHaptic(30);
                                setActiveGalleryIndex(index);
                                setIsGalleryOpen(true);
                            }}
                            className={`aspect-[4/3] rounded-lg overflow-hidden border-2 bg-gray-50 dark:bg-gray-900 flex items-center justify-center relative transition-all ${activeGalleryIndex === index ? 'border-black dark:border-white shadow-md ring-2 ring-gray-100 dark:ring-gray-800' : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}`}
                        >
                            <img src={imgUrl} alt={`Screenshot ${index + 1}`} className="max-h-full max-w-full object-contain" />
                            {index === 0 && <span className="absolute top-1 left-1 bg-black/80 text-white text-[7px] font-bold px-1.5 py-0.5 rounded">Cover</span>}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {!isGiftCard && game.youtube_link && (
          <div className="mb-6 border-t border-gray-100 dark:border-gray-800 pt-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Official Trailer</h3>
            {!isPlayingTrailer && youtubeId ? (
              <button onClick={() => { triggerHaptic(30); setIsPlayingTrailer(true); }} className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-black dark:text-white py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all">
                <PlayCircle className="h-5 w-5" /> Watch Trailer
              </button>
            ) : isPlayingTrailer && youtubeId ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm border border-gray-100 dark:border-gray-800">
                <iframe src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`} className="absolute top-0 left-0 w-full h-full border-0" allow="autoplay; encrypted-media" allowFullScreen></iframe>
              </div>
            ) : null}
          </div>
        )}

        <div className="mb-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2">Product Info</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
            {shouldTruncate && !isExpanded ? `${game.description.substring(0, DESCRIPTION_LIMIT)}...` : game.description}
          </p>
          {shouldTruncate && (
            <button onClick={() => { triggerHaptic(30); setIsExpanded(!isExpanded); }} className="mt-2 flex items-center gap-1 text-xs font-black text-blue-600 dark:text-blue-400 active:scale-95 transition-transform">
              {isExpanded ? <>SHOW LESS <ChevronUp className="h-4 w-4" /></> : <>READ MORE <ChevronDown className="h-4 w-4" /></>}
            </button>
          )}
        </div>

      </div>

      {recommendedGames.length > 0 && (
        <div className="mb-8 border-t border-gray-100 dark:border-gray-800 pt-6">
          <div className="px-4 mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recommended Games</h3>
          </div>
          <div className="flex overflow-x-auto px-4 pb-4 gap-4 snap-x hide-scrollbar">
            {recommendedGames.map(rGame => {
              const rGamePrice = rGame.discount_price || rGame.price || rGame.ps5_discount_price || rGame.ps5_price || rGame.ps4_discount_price || rGame.ps4_price || 0;
              return (
                <div key={rGame.id} onClick={() => { triggerHaptic(30); onGameClick(rGame); }} className="min-w-[130px] max-w-[130px] snap-start flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform">
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-800">
                    <img src={rGame.cover_image} alt={rGame.name} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{rGame.name}</h3>
                    <p className="text-xs font-semibold text-black dark:text-gray-300 mt-0.5">{(Number(rGamePrice) || 0).toLocaleString()} MMK</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] transition-colors">
        <div className="flex justify-between items-center mb-1 px-1">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total {isGiftCard && `(x${quantity})`}</span>
          <div className="flex flex-col items-end">
            <span className={`text-lg font-black ${isPromoActive ? 'text-red-600 dark:text-red-500' : 'text-black dark:text-white'}`}>{totalPrice.toLocaleString()} MMK</span>
            {isPromoActive && originalPriceForDisplay && (
               <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 line-through">{(originalPriceForDisplay * (isGiftCard ? quantity : 1)).toLocaleString()} MMK</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-3">
          <button onClick={handleAddToCart} disabled={isAddingCart || (isGiftCard && !selectedOption) || isOutOfStock} className="flex items-center justify-center w-14 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold active:scale-95 transition-transform disabled:opacity-50">
            <ShoppingCart className="h-5 w-5" />
          </button>
          <button onClick={handleBuyNow} disabled={(isGiftCard && !selectedOption) || isOutOfStock} className={`flex-1 items-center justify-center rounded-xl text-white dark:text-black font-black py-3.5 shadow-lg active:scale-95 transition-transform disabled:opacity-50 ${isOutOfStock ? 'bg-gray-300 dark:bg-gray-700 shadow-none cursor-not-allowed text-gray-500 dark:text-gray-400' : 'bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200'}`}>
            {isOutOfStock ? 'OUT OF STOCK' : (preOrderTag ? "PRE-ORDER" : "BUY NOW")}
          </button>
        </div>
      </div>

      {/* --- ACCOUNT / DENOMINATION POPUP MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => { triggerHaptic(30); setIsModalOpen(false); }}></div>
          <div className="relative bg-white dark:bg-[#121212] w-full max-w-md mx-auto rounded-t-3xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8 duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] border-t border-gray-100 dark:border-gray-800">
            
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                {isGiftCard ? 'Select Denomination' : 'Select Edition'}
              </h3>
              <button onClick={() => { triggerHaptic(30); setIsModalOpen(false); }} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {/* RENDER GAME ACCOUNTS */}
              {!isGiftCard && availableAccounts.map(acc => {
                const isSelected = accountType === acc.id;
                const displayPrice = acc.promo || acc.price;
                const hasDiscount = !!acc.promo || (acc.price < acc.original);
                const originalPriceDisplay = acc.promo ? acc.price : acc.original;
                const isOut = acc.stock <= 0;

                return (
                  <div 
                    key={acc.id} 
                    onClick={() => { 
                      if (!isOut) { 
                        triggerHaptic(30); 
                        setAccountType(acc.id); 
                      } 
                    }}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-black dark:border-white bg-gray-50 dark:bg-[#1a1a1a] shadow-sm' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212] hover:border-gray-200 dark:hover:border-gray-700'} ${isOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-4 flex-1 pr-4">
                      <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <img src={game.cover_image || game.image} alt={game.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{acc.label}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-black text-black dark:text-white">{displayPrice.toLocaleString()} MMK</span>
                          {hasDiscount && <span className="text-[10px] font-bold line-through text-gray-400 dark:text-gray-500">{originalPriceDisplay.toLocaleString()}</span>}
                        </div>
                        {isOut && <span className="text-[10px] font-bold text-red-500 mt-0.5 uppercase tracking-wide">Out of Stock</span>}
                      </div>
                    </div>

                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-black dark:border-white' : 'border-gray-300 dark:border-gray-600'}`}>
                      {isSelected && <div className="w-3 h-3 rounded-full bg-black dark:bg-white animate-in zoom-in duration-200"></div>}
                    </div>
                  </div>
                );
              })}

              {/* RENDER GIFT CARDS */}
              {isGiftCard && game.options?.map((opt, idx) => {
                const isSelected = selectedOption?.label === opt.label;
                return (
                  <div 
                    key={idx} 
                    onClick={() => { triggerHaptic(30); setSelectedOption(opt); }}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-black dark:border-white bg-gray-50 dark:bg-[#1a1a1a] shadow-sm' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212] hover:border-gray-200 dark:hover:border-gray-700'}`}
                  >
                    <div className="flex items-center gap-4 flex-1 pr-4">
                      <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-800 p-1 flex items-center justify-center shadow-sm">
                        <img src={game.cover_image || game.image} alt={game.name} className="max-w-full max-h-full object-contain drop-shadow-sm" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{opt.label}</span>
                        <span className="text-sm font-black text-black dark:text-white mt-1">{Number(opt.price).toLocaleString()} MMK</span>
                      </div>
                    </div>

                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-black dark:border-white' : 'border-gray-300 dark:border-gray-600'}`}>
                      {isSelected && <div className="w-3 h-3 rounded-full bg-black dark:bg-white animate-in zoom-in duration-200"></div>}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212] rounded-b-3xl">
               <button 
                onClick={() => { triggerHaptic([50, 50]); setIsModalOpen(false); }} 
                className="w-full py-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold active:scale-95 transition-transform text-sm"
               >
                 Confirm Selection
               </button>
            </div>

          </div>
        </div>
      )}

      {/* --- GALLERY OVERLAY --- */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-[999] bg-[#121212] flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-4 absolute top-0 w-full z-10 pointer-events-none">
            <div className="text-sm font-bold text-white tracking-widest px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg pointer-events-auto shadow-sm">
              {activeGalleryIndex + 1} <span className="text-gray-400 mx-1">/</span> {productImages.length}
            </div>
            <button onClick={() => { triggerHaptic(30); setIsGalleryOpen(false); }} className="p-2 bg-black/60 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors pointer-events-auto shadow-sm">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start pt-20 pb-4">
            <img src={productImages[activeGalleryIndex]} alt={`Screenshot ${activeGalleryIndex + 1}`} className="w-full h-auto object-contain max-w-2xl" />
          </div>
          <div className="bg-[#0a0a0a] border-t border-gray-800 pb-8 pt-4">
            <p className="text-center text-white/70 text-[10px] font-bold mb-3 uppercase tracking-widest">Screenshot</p>
            <div className="flex overflow-x-auto px-4 gap-3 snap-x hide-scrollbar justify-start md:justify-center">
              {productImages.map((imgUrl, idx) => (
                <button key={idx} onClick={() => { triggerHaptic(30); setActiveGalleryIndex(idx); }} className={`snap-center flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden transition-all duration-300 ${activeGalleryIndex === idx ? 'border-2 border-white opacity-100 scale-105 shadow-lg' : 'border-2 border-transparent opacity-40 hover:opacity-100'}`}>
                  <img src={imgUrl} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductDetail;