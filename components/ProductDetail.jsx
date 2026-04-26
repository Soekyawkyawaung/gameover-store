"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Heart, ChevronDown, ChevronUp, PlayCircle, Image as ImageIcon, X, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const ProductDetail = ({ game, prefilledOption = null, allGames, onBack, onBuyNow, onGameClick, promoPrice }) => {
  const [isAddingCart, setIsAddingCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  
  const isGiftCard = !!game.options;

  const [accountType, setAccountType] = useState('Activated Account');
  const [selectedOption, setSelectedOption] = useState(null);
  const [quantity, setQuantity] = useState(1); 

  const [isExpanded, setIsExpanded] = useState(false);
  const DESCRIPTION_LIMIT = 200; 
  const shouldTruncate = game.description && game.description.length > DESCRIPTION_LIMIT;
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

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

    if (isGiftCard && game.options && game.options.length > 0) {
      setSelectedOption(prefilledOption || game.options[0]);
    } else {
      setSelectedOption(null);
    }
    
    if (!isGiftCard) {
      if (game.activated_stock > 0) {
        setAccountType('Activated Account');
      } else if (game.deactivated_stock > 0) {
        setAccountType('Deactivated Account');
      } else {
        setAccountType('Activated Account'); 
      }
    }
  }, [game.id, prefilledOption]);

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
        toast.success("Removed from Wishlist");
      } else {
        await supabase.from('wishlist').insert([{ user_id: session.user.id, game_id: game.id }]);
        setIsWishlisted(true);
        toast.success("Added to Wishlist!");
      }
    } catch (error) { toast.error("An error occurred"); } finally { setIsWishlistLoading(false); }
  };

  const handleAddToCart = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return toast.error("Please sign in to add to cart");

    if (isOutOfStock) {
      return toast.error("Sorry, this item is out of stock!");
    }

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
        toast.success("Cart updated!");
      } else {
        const { error } = await supabase.from('cart').insert([cartData]);
        if (error) throw error;
        toast.success("Added to Cart!");
      }
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) { toast.error("Failed to add to cart"); } finally { setIsAddingCart(false); }
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) return toast.error("Sorry, this item is out of stock!");
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

  // --- FIXED: Pre-Order Text Logic ---
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

  let regularPrice = 0;
  let finalPrice = 0;
  let isPromoActive = false;

  if (isGiftCard) {
    finalPrice = selectedOption ? Number(selectedOption.price) : 0;
  } else {
    if (accountType === 'Activated Account') {
        regularPrice = game.discount_price || game.price;
        if (promoPrice?.activated) {
            finalPrice = promoPrice.activated;
            isPromoActive = true;
        } else {
            finalPrice = regularPrice;
        }
    } else {
        regularPrice = game.deactivated_discount || game.deactivated_price;
        if (promoPrice?.deactivated) {
            finalPrice = promoPrice.deactivated;
            isPromoActive = true;
        } else {
            finalPrice = regularPrice;
        }
    }
  }
  
  const totalPrice = finalPrice * (isGiftCard ? quantity : 1);

  const isOutOfStock = !isGiftCard && (
    accountType === 'Activated Account' 
      ? (game.activated_stock <= 0) 
      : (game.deactivated_stock <= 0)
  );

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 animate-in fade-in duration-300">
      
      <div className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 py-4 shadow-sm border-b border-gray-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95"><ArrowLeft className="h-6 w-6 text-gray-800" /></button>
        <h1 className="text-sm font-black text-gray-900 truncate px-4 uppercase">{game.name}</h1>
        {!isGiftCard ? (
          <button onClick={handleToggleWishlist} disabled={isWishlistLoading} className="p-2 -mr-2 rounded-full hover:bg-gray-100 active:scale-95">
            <Heart className={`h-6 w-6 transition-colors ${isWishlisted ? 'fill-black text-black' : 'text-gray-400'}`} />
          </button>
        ) : <div className="w-10"></div>}
      </div>

      <div 
        className={`w-full aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden cursor-pointer ${isGiftCard ? 'p-12' : ''}`}
        onClick={() => {
           if (productImages.length > 0) {
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
            <div className="flex flex-col items-center gap-2 text-gray-300">
                <ImageIcon className="w-16 h-16" />
                <span className="text-xs font-bold">No Image Available</span>
            </div>
        )}
      </div>

      <div className="p-5">
        
        {/* FIXED: Removed the Tag icon from the Pre-Order banner */}
        {preOrderTag && (
          <div className="mb-3 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 border border-orange-200">
            {preOrderTag}
            {game.release_date && <span className="font-bold opacity-70">( {new Date(game.release_date).toLocaleDateString('en-GB')} )</span>}
          </div>
        )}

        <h2 className="text-xl font-black text-gray-900 mb-6">{game.name}</h2>
        
        {isGiftCard ? (
          <div className="flex flex-col mb-8 border-b border-gray-100 pb-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Select Denomination</h3>
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

            <div className="flex justify-center">
              <div className="flex items-center gap-6 bg-gray-50 rounded-full px-5 py-2.5 border border-gray-200 shadow-inner">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-600 hover:text-black hover:bg-gray-100 shadow-sm border border-gray-200 font-bold text-xl transition-colors active:scale-95">-</button>
                <span className="font-black text-lg w-6 text-center text-gray-900">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black text-white shadow-md font-bold text-xl transition-transform active:scale-95">+</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Select Account Type</h3>
            <div className="grid grid-cols-2 gap-3">
              
              <button 
                onClick={() => setAccountType('Activated Account')}
                disabled={game.activated_stock <= 0}
                className={`p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden flex flex-col ${accountType === 'Activated Account' ? 'border-black bg-black text-white shadow-md' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'} ${game.activated_stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <p className="text-xs font-bold mb-1 opacity-80">Activated</p>
                {accountType === 'Activated Account' && isPromoActive ? (
                    <div className="flex flex-col">
                        <p className="text-sm font-black text-white">{finalPrice.toLocaleString()} MMK</p>
                        <p className="text-[10px] font-bold text-white/70 line-through">{regularPrice.toLocaleString()} MMK</p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                      <p className={`text-sm font-black ${accountType === 'Activated Account' ? 'text-white' : 'text-black'}`}>
                        {finalPrice.toLocaleString()} MMK
                      </p>
                      {game.discount_price && game.price && game.discount_price < game.price && (
                         <p className={`text-[10px] font-bold line-through ${accountType === 'Activated Account' ? 'text-white/70' : 'text-gray-400'}`}>{game.price.toLocaleString()} MMK</p>
                      )}
                    </div>
                )}
                <div className={`mt-2 text-[9px] font-black px-2 py-1 rounded inline-block uppercase tracking-wider ${game.activated_stock > 0 ? (accountType === 'Activated Account' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600') : 'bg-red-100 text-red-600'}`}>
                  {game.activated_stock > 0 ? `In Stock` : 'Out of Stock'}
                </div>
              </button>

              {game.deactivated_price && (
                <button 
                  onClick={() => setAccountType('Deactivated Account')}
                  disabled={game.deactivated_stock <= 0}
                  className={`p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden flex flex-col ${accountType === 'Deactivated Account' ? 'border-black bg-black text-white shadow-md' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'} ${game.deactivated_stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <p className="text-xs font-bold mb-1 opacity-80">Deactivated</p>
                  {accountType === 'Deactivated Account' && isPromoActive ? (
                      <div className="flex flex-col">
                          <p className="text-sm font-black text-white">{finalPrice.toLocaleString()} MMK</p>
                          <p className="text-[10px] font-bold text-white/70 line-through">{regularPrice.toLocaleString()} MMK</p>
                      </div>
                  ) : (
                      <div className="flex flex-col">
                        <p className={`text-sm font-black ${accountType === 'Deactivated Account' ? 'text-white' : 'text-black'}`}>
                          {finalPrice.toLocaleString()} MMK
                        </p>
                        {game.deactivated_discount && game.deactivated_price && game.deactivated_discount < game.deactivated_price && (
                           <p className={`text-[10px] font-bold line-through ${accountType === 'Deactivated Account' ? 'text-white/70' : 'text-gray-400'}`}>{game.deactivated_price.toLocaleString()} MMK</p>
                        )}
                      </div>
                  )}
                  <div className={`mt-2 text-[9px] font-black px-2 py-1 rounded inline-block uppercase tracking-wider ${game.deactivated_stock > 0 ? (accountType === 'Deactivated Account' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600') : 'bg-red-100 text-red-600'}`}>
                    {game.deactivated_stock > 0 ? `In Stock` : 'Out of Stock'}
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {!isGiftCard && (
          <div className="flex flex-wrap gap-2 mb-6">
            {game.size && <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{game.size}</span>}
            {game.collections?.map(tag => (
              <span key={tag} className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{tag}</span>
            ))}
          </div>
        )}

        {!isGiftCard && productImages.length > 1 && (
            <div className="mb-8 border-t border-gray-100 pt-6 animate-in fade-in duration-500">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Product Gallery</h3>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {productImages.map((imgUrl, index) => (
                        <button 
                            key={index} 
                            onClick={() => {
                                setActiveGalleryIndex(index);
                                setIsGalleryOpen(true);
                            }}
                            className={`aspect-[4/3] rounded-lg overflow-hidden border-2 bg-gray-50 flex items-center justify-center relative transition-all ${activeGalleryIndex === index ? 'border-black shadow-md ring-2 ring-gray-100' : 'border-gray-100 hover:border-gray-300'}`}
                        >
                            <img src={imgUrl} alt={`Screenshot ${index + 1}`} className="max-h-full max-w-full object-contain" />
                            {index === 0 && <span className="absolute top-1 left-1 bg-black/80 text-white text-[7px] font-bold px-1.5 py-0.5 rounded">Cover</span>}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {!isGiftCard && game.youtube_link && (
          <div className="mb-6 border-t border-gray-100 pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Official Trailer</h3>
            {!isPlayingTrailer && youtubeId ? (
              <button onClick={() => setIsPlayingTrailer(true)} className="w-full flex items-center justify-center gap-2 bg-gray-100 text-black py-3 rounded-xl font-bold hover:bg-gray-200 active:scale-95 transition-all">
                <PlayCircle className="h-5 w-5" /> Watch Trailer
              </button>
            ) : isPlayingTrailer && youtubeId ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm border border-gray-100">
                <iframe src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`} className="absolute top-0 left-0 w-full h-full border-0" allow="autoplay; encrypted-media" allowFullScreen></iframe>
              </div>
            ) : null}
          </div>
        )}

        <div className="mb-6 pt-4 border-t border-gray-100">
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

      {recommendedGames.length > 0 && (
        <div className="mb-8 border-t border-gray-100 pt-6">
          <div className="px-4 mb-4">
            <h3 className="text-lg font-bold text-gray-900">Recommended Games</h3>
          </div>
          <div className="flex overflow-x-auto px-4 pb-4 gap-4 snap-x hide-scrollbar">
            {recommendedGames.map(rGame => (
              <div key={rGame.id} onClick={() => onGameClick(rGame)} className="min-w-[130px] max-w-[130px] snap-start flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform">
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
                  <img src={rGame.cover_image} alt={rGame.name} className="h-full w-full object-cover" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 truncate">{rGame.name}</h3>
                  <p className="text-xs font-semibold text-black mt-0.5">{(rGame.discount_price || rGame.price).toLocaleString()} MMK</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 flex flex-col gap-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex justify-between items-center mb-1 px-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total {isGiftCard && `(x${quantity})`}</span>
          <div className="flex flex-col items-end">
            <span className={`text-lg font-black ${isPromoActive ? 'text-red-600' : 'text-black'}`}>{totalPrice.toLocaleString()} MMK</span>
            {isPromoActive && regularPrice && (
               <span className="text-[10px] font-bold text-gray-400 line-through">{(regularPrice * (isGiftCard ? quantity : 1)).toLocaleString()} MMK</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-3">
          <button onClick={handleAddToCart} disabled={isAddingCart || (isGiftCard && !selectedOption) || isOutOfStock} className="flex items-center justify-center w-14 rounded-xl bg-gray-100 text-gray-900 font-bold active:scale-95 transition-transform disabled:opacity-50">
            <ShoppingCart className="h-5 w-5" />
          </button>
          {/* FIXED: PRE-ORDER button text displays without the "In X Days" */}
          <button onClick={handleBuyNow} disabled={(isGiftCard && !selectedOption) || isOutOfStock} className={`flex-1 items-center justify-center rounded-xl text-white font-black py-3.5 shadow-lg active:scale-95 transition-transform hover:bg-gray-800 disabled:opacity-50 ${isOutOfStock ? 'bg-gray-300 shadow-none cursor-not-allowed text-gray-500' : 'bg-black shadow-gray-500/30'}`}>
            {isOutOfStock ? 'OUT OF STOCK' : (preOrderTag ? "PRE-ORDER" : "BUY NOW")}
          </button>
        </div>
      </div>

      {isGalleryOpen && (
        <div className="fixed inset-0 z-[999] bg-[#121212] flex flex-col animate-in fade-in duration-200">
          
          <div className="flex items-center justify-between p-4 absolute top-0 w-full z-10 pointer-events-none">
            <div className="text-sm font-bold text-white tracking-widest px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg pointer-events-auto shadow-sm">
              {activeGalleryIndex + 1} <span className="text-gray-400 mx-1">/</span> {productImages.length}
            </div>
            <button 
              onClick={() => setIsGalleryOpen(false)} 
              className="p-2 bg-black/60 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors pointer-events-auto shadow-sm"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start pt-20 pb-4">
            <img 
              src={productImages[activeGalleryIndex]} 
              alt={`Screenshot ${activeGalleryIndex + 1}`} 
              className="w-full h-auto object-contain max-w-2xl" 
            />
          </div>

          <div className="bg-[#0a0a0a] border-t border-gray-800 pb-8 pt-4">
            <p className="text-center text-white/70 text-[10px] font-bold mb-3 uppercase tracking-widest">Screenshot</p>
            <div className="flex overflow-x-auto px-4 gap-3 snap-x hide-scrollbar justify-start md:justify-center">
              {productImages.map((imgUrl, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveGalleryIndex(idx)}
                  className={`snap-center flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden transition-all duration-300 ${activeGalleryIndex === idx ? 'border-2 border-white opacity-100 scale-105 shadow-lg' : 'border-2 border-transparent opacity-40 hover:opacity-100'}`}
                >
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