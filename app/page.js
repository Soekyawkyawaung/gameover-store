"use client";

import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Search, Filter, X, ArrowLeft, Check, Gamepad2, CreditCard, ChevronRight, Timer, Tag, Trash2 } from 'lucide-react'; 
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import HeroSlider from '../components/HeroSlider';
import Checkout from '../components/Checkout';
import Auth from '../components/Auth'; 
import Profile from '../components/Profile';
import AdminPanel from '../components/AdminPanel';
import ProductDetail from '../components/ProductDetail'; 
import Cart from '../components/Cart';         
import Wishlist from '../components/Wishlist'; 
import MyOrders from '../components/MyOrders'; 
import LiveChat from '../components/LiveChat'; 

const CountdownTimer = ({ endTime, textColor = 'text-white' }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endTime) - new Date();
      if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
      
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60), 
        ended: false
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => { setTimeLeft(calculateTimeLeft()); }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  if (timeLeft.ended) return null;

  const DigitBox = ({ val, label }) => (
    <div className="flex flex-col items-center">
      <div className={`font-black text-lg md:text-2xl ${textColor} tracking-tight leading-none tabular-nums`}>{String(val).padStart(2, '0')}</div>
      <div className={`text-[8px] font-bold uppercase ${textColor === 'text-white' ? 'text-gray-400' : 'text-black/60 dark:text-gray-400'}`}>{label}</div>
    </div>
  );

  return (
    <div className="flex items-center gap-1.5 md:gap-2.5">
      {timeLeft.days > 0 && (
        <>
          <DigitBox val={timeLeft.days} label="d" />
          <div className={`text-xl font-bold ${textColor} -mt-3`}>:</div>
        </>
      )}
      <DigitBox val={timeLeft.hours} label="h" />
      <div className={`text-xl font-bold ${textColor} -mt-3`}>:</div>
      <DigitBox val={timeLeft.minutes} label="m" />
      <div className={`text-xl font-bold ${textColor} -mt-3`}>:</div>
      <DigitBox val={timeLeft.seconds} label="s" /> 
    </div>
  );
};

export default function Home() {
  const [currentView, setCurrentView] = useState('store'); 
  const [showAuth, setShowAuth] = useState(false); 
  
  const [games, setGames] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  
  const [promotedGamesIds, setPromotedGamesIds] = useState({}); 
  const [activePromotions, setActivePromotions] = useState([]); 

  const [isLoading, setIsLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState(null);

  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [recPage, setRecPage] = useState(0); 

  // --- NEW SEARCH STATES ---
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);

  const [seeAllTitle, setSeeAllTitle] = useState('');
  const [seeAllBaseGames, setSeeAllBaseGames] = useState([]); 
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedPrices, setSelectedPrices] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  useEffect(() => {
    const fetchStoreData = async () => {
      setIsLoading(true);
      const now = new Date().toISOString();

      const [gamesResult, giftsResult, promosResult] = await Promise.all([
        supabase.from('games').select('*').order('created_at', { ascending: false }),
        supabase.from('gift_cards').select('*').order('created_at', { ascending: false }),
        supabase.from('promotions').select('*').lte('start_time', now).gte('end_time', now).order('end_time', { ascending: true })
      ]);
      
      const gamesData = gamesResult.data || [];
      const giftsData = giftsResult.data || [];
      const promosData = promosResult.data || [];

      const promoMap = {};
      promosData.forEach(p => { 
        promoMap[p.game_id] = {
            activated: p.discount_price,
            deactivated: p.deactivated_discount_price
        }; 
      });
      setPromotedGamesIds(promoMap);

      if (promosData.length > 0) {
        const grouped = [];
        promosData.forEach(promo => {
            const linkedGame = gamesData.find(g => g.id === promo.game_id);
            if(!linkedGame) return;
            
            const key = promo.promo_type === 'text_countdown' ? promo.promo_text : promo.promo_image_url;
            let group = grouped.find(g => g.key === key && g.end_time === promo.end_time);
            
            if(!group) {
                group = { key, ...promo, games: [] };
                grouped.push(group);
            }
            group.games.push(linkedGame);
        });
        setActivePromotions(grouped);
      } else {
        setActivePromotions([]);
      }

      setGames(gamesData);
      setGiftCards(giftsData);
      setIsLoading(false);

      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedGameId = urlParams.get('game');
        
        if (sharedGameId) {
          const foundGame = gamesData.find(g => g.id.toString() === sharedGameId) 
                         || giftsData.find(g => g.id.toString() === sharedGameId);
          
          if (foundGame) {
            setSelectedGame(foundGame);
            setCurrentView('details');
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }
    };
    
    fetchStoreData();

    const savedRecent = JSON.parse(localStorage.getItem('gameover_recently_viewed') || '[]');
    setRecentlyViewed(savedRecent);

    // LOAD RECENT SEARCHES
    const savedSearches = JSON.parse(localStorage.getItem('gameover_searches') || '[]');
    setRecentSearches(savedSearches);
  }, []);

  const getDerivedPrice = (game) => {
    const isGift = !!game.options;
    if (isGift) {
      const lowest = game.options?.length > 0 ? Math.min(...game.options.map(o => Number(o.price))) : 0;
      return { price: lowest, deactivatedPrice: null, isGift: true, isPromo: false, regularPrice: null };
    }
    
    const promo = promotedGamesIds[game.id];
    const basePrice = game.discount_price || game.price;

    if (promo) {
        return { 
            price: promo.activated || basePrice, 
            deactivatedPrice: promo.deactivated || game.deactivated_discount || game.deactivated_price,
            isGift: false, 
            isPromo: true,
            regularPrice: basePrice
        };
    }
    
    return { 
        price: basePrice, 
        deactivatedPrice: game.deactivated_discount || game.deactivated_price,
        isGift: false, 
        isPromo: false,
        regularPrice: game.discount_price ? game.price : null 
    };
  };

  const isPreOrder = (game) => game.collections?.some(c => c.toLowerCase().includes('pre-order') || c.toLowerCase().includes('preorder'));

  const newGames = games.filter(game => game.collections?.some(c => c.toLowerCase().includes('new games')) && !isPreOrder(game));
  const ps5GamesCategory = games.filter(game => game.collections?.some(c => c.toLowerCase().includes('ps5 games')) && !isPreOrder(game));
  const preOrderGames = games.filter(game => isPreOrder(game));
  const ps4GamesCategory = games.filter(game => game.collections?.some(c => c.toLowerCase().includes('ps4 games')) && !isPreOrder(game));

  const searchResults = games.filter(game => game.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // --- SMART RECOMMENDED (DISCOUNTS ONLY) ---
  const discountedGames = games.filter(game => {
    const dp = getDerivedPrice(game);
    return dp.regularPrice && dp.price < dp.regularPrice;
  });

  let dynamicRecs = discountedGames.slice(0, 6);
  if (recentlyViewed.length > 0 && discountedGames.length > 0) {
    const lastGenre = recentlyViewed[0].collections?.filter(t => t !== 'PS4 Games' && t !== 'PS5 Games')[0];
    const related = discountedGames.filter(g => g.id !== recentlyViewed[0].id && g.collections?.includes(lastGenre));
    if (related.length > 0) {
      dynamicRecs = [...related, ...discountedGames.filter(g => !related.find(r => r.id === g.id))].slice(0, 6);
    }
  }
  const visibleRecs = dynamicRecs.slice(recPage * 3, recPage * 3 + 3);

  const allUniqueGenres = [...new Set(games.flatMap(g => g.collections?.filter(c => c !== "PS4 Games" && c !== "PS5 Games") || []))];
  const priceRanges = ['10,000 - 50,000 MMK', '50,000 - 100,000 MMK', '100,000 - 150,000 MMK', 'Over 150,000 MMK'];

  // --- ACTIONS ---
  const handleGameClick = (item) => {
    let recent = [...recentlyViewed];
    recent = recent.filter(g => g.id !== item.id); 
    recent.unshift(item); 
    recent = recent.slice(0, 5); 
    
    setRecentlyViewed(recent);
    localStorage.setItem('gameover_recently_viewed', JSON.stringify(recent));

    setSelectedGame(item);
    setCurrentView('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchItemClick = (item) => {
    let updatedSearches = [...recentSearches].filter(g => g.id !== item.id);
    updatedSearches.unshift(item);
    updatedSearches = updatedSearches.slice(0, 3);
    setRecentSearches(updatedSearches);
    localStorage.setItem('gameover_searches', JSON.stringify(updatedSearches));

    setIsSearchActive(false);
    setSearchQuery('');
    handleGameClick(item);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('gameover_searches');
  };

  const handleSeeAllClick = (title, gamesList) => {
    setSeeAllTitle(title);
    setSeeAllBaseGames(gamesList);
    setSelectedPrices([]); setSelectedGenres([]); setSelectedPlatforms([]);
    setCurrentView('seeAll');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const checkAuthAndNavigate = async (view) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setCurrentView(view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setShowAuth(true);
    }
  };

  const renderPlatformTags = (collections, releaseDate = null) => {
    if (!collections) return null;
    let platforms = [];
    if (collections.includes("PS4 Games")) platforms.push("PS4");
    if (collections.includes("PS5 Games")) platforms.push("PS5");
    
    const preOrder = isPreOrder({ collections }); 
    let preOrderTag = null;
    if (preOrder) {
      if (releaseDate) {
        const daysToRelease = Math.ceil((new Date(releaseDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysToRelease > 0) preOrderTag = `In ${daysToRelease} Days`;
        else if (daysToRelease === 0) preOrderTag = "Today!";
        else preOrderTag = "Available Now"; 
      } else {
        preOrderTag = "PRE-ORDER";
      }
    }

    if (platforms.length === 0 && !preOrderTag) return null;
    return (
      <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
        {platforms.length > 0 && (
          <div className="bg-gray-900/80 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-gray-700/50 flex gap-1">
            {platforms.map(p => <span key={p}>{p}</span>)}
          </div>
        )}
        {preOrderTag && (
          <div className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-orange-600 flex gap-1 items-center">
            {preOrderTag !== "Available Now" && <Tag className="h-2.5 w-2.5" />} {preOrderTag}
          </div>
        )}
      </div>
    );
  };

  const SeeAllCard = ({ title, categoryArray }) => (
    <div onClick={() => handleSeeAllClick(title, categoryArray)} className="min-w-[140px] max-w-[140px] snap-start flex flex-col justify-start cursor-pointer active:scale-95 transition-transform group">
      <div className="aspect-square w-full rounded-xl bg-[#141414] flex flex-col items-center justify-center text-white shadow-sm border border-gray-800 hover:bg-black dark:hover:bg-gray-900 transition-colors">
        <span className="text-sm font-bold tracking-widest">See All</span>
        <ChevronRight className="w-6 h-6 mt-1" />
      </div>
    </div>
  );

  const filteredSeeAllGames = seeAllBaseGames.filter(item => {
    const isGift = !!item.options;
    const dp = getDerivedPrice(item);
    const price = Number(dp.price);

    let matchesPrice = true;
    if (selectedPrices.length > 0) {
      matchesPrice = selectedPrices.some(range => {
        if (range === '10,000 - 50,000 MMK') return price >= 10000 && price <= 50000;
        if (range === '50,000 - 100,000 MMK') return price > 50000 && price <= 100000;
        if (range === '100,000 - 150,000 MMK') return price > 100000 && price <= 150000;
        if (range === 'Over 150,000 MMK') return price > 150000;
        return false;
      });
    }
    let matchesGenre = true;
    if (selectedGenres.length > 0 && !isGift) matchesGenre = selectedGenres.some(g => item.collections?.includes(g));
    let matchesPlatform = true;
    if (selectedPlatforms.length > 0 && !isGift) {
      const hasPS4 = item.collections?.includes("PS4 Games");
      const hasPS5 = item.collections?.includes("PS5 Games");
      matchesPlatform = (selectedPlatforms.includes('PS4') && hasPS4) || (selectedPlatforms.includes('PS5') && hasPS5);
    }
    return matchesPrice && matchesGenre && matchesPlatform;
  });

  const toggleFilter = (type, value) => {
    if (type === 'price') setSelectedPrices(prev => prev.includes(value) ? [] : [value]);
    if (type === 'genre') setSelectedGenres(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    if (type === 'platform') setSelectedPlatforms(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const activeFilterCount = (selectedPrices.length > 0 ? 1 : 0) + selectedGenres.length + selectedPlatforms.length;

  if (currentView === 'admin') return <><Toaster position="top-center" /><AdminPanel onBackToStore={() => setCurrentView('store')} /></>;

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-300">
      <div className="relative mx-auto min-h-screen max-w-md bg-white dark:bg-[#121212] shadow-2xl pb-20 overflow-x-hidden transition-colors duration-300">
        <Toaster position="top-center" />
        
        {currentView !== 'details' && currentView !== 'cart' && currentView !== 'wishlist' && currentView !== 'orders' && currentView !== 'seeAll' && currentView !== 'checkout' && 
          <Header onSignInClick={() => setShowAuth(true)} onProfileClick={() => setCurrentView('profile')} onAdminClick={() => setCurrentView('admin')} onCartClick={() => checkAuthAndNavigate('cart')} onWishlistClick={() => checkAuthAndNavigate('wishlist')} onOrdersClick={() => checkAuthAndNavigate('orders')}/>
        }
        
        {showAuth && <Auth onClose={() => setShowAuth(false)} />}
        
        <main className="w-full">
          {currentView === 'profile' && <Profile onBack={() => setCurrentView('store')} />}
          {currentView === 'cart' && <Cart onBack={() => setCurrentView('store')} onCheckout={() => setCurrentView('checkout')} promotedGamesIds={promotedGamesIds} />}
          {currentView === 'wishlist' && <Wishlist onBack={() => setCurrentView('store')} onGameClick={handleGameClick} promotedGamesIds={promotedGamesIds} />}
          {currentView === 'orders' && <MyOrders onBack={() => setCurrentView('store')} />}
          {currentView === 'checkout' && <div className="animate-in slide-in-from-right duration-300 bg-white dark:bg-[#121212] min-h-screen pt-4"><button onClick={() => setCurrentView('cart')} className="mx-4 mb-2 text-sm font-bold text-blue-600 hover:underline">← Back to Cart</button><Checkout promotedGamesIds={promotedGamesIds} /></div>}
          {currentView === 'details' && selectedGame && <ProductDetail game={selectedGame} allGames={[...games, ...giftCards]} onBack={() => setCurrentView('store')} onBuyNow={() => checkAuthAndNavigate('checkout')} onGameClick={handleGameClick} promoPrice={promotedGamesIds[selectedGame.id]} />}
          
          {/* --- SEE ALL GRID --- */}
          {currentView === 'seeAll' && (
            <div className="animate-in slide-in-from-right duration-300 min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
              <div className="sticky top-0 z-40 flex items-center justify-between bg-white dark:bg-[#121212] px-4 py-4 shadow-sm dark:border-b dark:border-gray-800">
                <div className="flex items-center">
                  <button onClick={() => setCurrentView('store')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"><ArrowLeft className="h-6 w-6 text-gray-800 dark:text-gray-200" /></button>
                  <h1 className="ml-2 text-xl font-black text-gray-900 dark:text-white truncate max-w-[200px]">{seeAllTitle}</h1>
                </div>
                <button onClick={() => setIsFilterOpen(true)} className="relative p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <Filter className="h-5 w-5 text-gray-800 dark:text-gray-200" />
                  {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black dark:bg-white text-[9px] font-bold text-white dark:text-black border border-white dark:border-[#121212]">{activeFilterCount}</span>}
                </button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                {filteredSeeAllGames.length === 0 ? <div className="col-span-2 text-center py-20 text-gray-500 font-bold">No items match your filters.</div> : filteredSeeAllGames.map(item => {
                    const dp = getDerivedPrice(item);
                    return (
                      <div key={item.id} onClick={() => handleGameClick(item)} className="flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform group relative">
                        {!dp.isGift && renderPlatformTags(item.collections, item.release_date)}
                        <div className={`aspect-square w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-center ${dp.isGift ? 'p-4' : ''}`}>
                          <img src={item.cover_image || item.image} alt={item.name} className={`w-full h-full group-hover:scale-110 transition-transform ${dp.isGift ? 'object-contain' : 'object-cover'}`} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.name}</h3>
                          <div className="flex flex-col mt-0.5">
                            <p className={`text-xs font-black ${dp.isPromo ? 'text-red-600 dark:text-red-500' : 'text-black dark:text-white'}`}>
                                {dp.isGift ? `From ${dp.price.toLocaleString()} MMK` : `${dp.price.toLocaleString()} MMK`}
                            </p>
                            {dp.regularPrice && dp.price < dp.regularPrice && (
                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 line-through mt-0.5">{dp.regularPrice.toLocaleString()} MMK</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
              
              {/* FILTERS OVERLAY */}
              {isFilterOpen && (
                <div className="fixed inset-0 z-[200] flex flex-col bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white animate-in slide-in-from-bottom duration-300">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212]">
                    <h2 className="text-lg font-bold">Sort and Filter</h2>
                    <button onClick={() => setIsFilterOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X className="h-6 w-6 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 pb-32">
                    <div className="mb-6 bg-white dark:bg-[#121212] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                      <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Price</h3>
                      <div className="flex flex-wrap gap-2">
                        {priceRanges.map(range => (
                          <button key={range} onClick={() => toggleFilter('price', range)} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${selectedPrices.includes(range) ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-md' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'}`}>{range}</button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-6 bg-white dark:bg-[#121212] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                      <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Platform (Games Only)</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {['PS4', 'PS5'].map(plat => (
                          <button key={plat} onClick={() => toggleFilter('platform', plat)} className={`py-4 flex flex-col items-center justify-center gap-2 rounded-xl text-lg font-black italic tracking-tighter border transition-all ${selectedPlatforms.includes(plat) ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-md' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                            <Gamepad2 className={`h-6 w-6 ${selectedPlatforms.includes(plat) ? 'text-white dark:text-black' : 'text-gray-400'}`} />{plat}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-6 bg-white dark:bg-[#121212] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                      <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Genre</h3>
                      <div className="flex flex-col">
                        {allUniqueGenres.map(genre => (
                          <label key={genre} className="flex items-center justify-between py-3 cursor-pointer group border-b border-gray-50 dark:border-gray-800 last:border-0">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">{genre}</span>
                            <div className={`h-6 w-6 rounded-lg border flex items-center justify-center transition-all ${selectedGenres.includes(genre) ? 'bg-black dark:bg-white border-black dark:border-white shadow-sm' : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'}`}>
                              {selectedGenres.includes(genre) && <Check className="h-4 w-4 text-white dark:text-black" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={selectedGenres.includes(genre)} onChange={() => toggleFilter('genre', genre)} />
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
                    <button onClick={() => { setSelectedPrices([]); setSelectedGenres([]); setSelectedPlatforms([]); }} className="flex-1 py-4 text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors">Clear all</button>
                    <button onClick={() => setIsFilterOpen(false)} className="flex-[2] py-4 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-bold shadow-lg shadow-gray-500/30 active:scale-95 transition-all">Show {filteredSeeAllGames.length} results</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MAIN STORE VIEW */}
          {currentView === 'store' && (
             <div className="animate-in fade-in duration-500">
              
              {/* --- APP-STYLE SEARCH BAR --- */}
              <div className={`px-4 py-4 flex items-center gap-3 transition-colors ${isSearchActive ? 'bg-white dark:bg-[#121212]' : 'bg-transparent'}`}>
                <div className="flex-1 flex items-center rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-3 border border-transparent focus-within:border-black dark:focus-within:border-white transition-all">
                  <Search className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search games & gift cards..." 
                    value={searchQuery} 
                    onFocus={() => setIsSearchActive(true)}
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="ml-3 w-full bg-transparent text-sm font-bold outline-none placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white" 
                  />
                  {searchQuery && <button onClick={() => setSearchQuery('')}><X className="h-4 w-4 text-gray-500"/></button>}
                </div>
                {isSearchActive && (
                  <button onClick={() => { setIsSearchActive(false); setSearchQuery(''); }} className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Cancel
                  </button>
                )}
              </div>

              {/* --- FULL-SCREEN SEARCH OVERLAY --- */}
              {isSearchActive ? (
                <div className="px-4 pb-20 animate-in slide-in-from-bottom-2 duration-300 bg-white dark:bg-[#121212] min-h-screen">
                  {searchQuery ? (
                    <div className="mt-4">
                      {searchResults.length === 0 ? (
                        <p className="text-sm font-semibold text-gray-500">No products found.</p>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {searchResults.map((game) => { 
                            const dp = getDerivedPrice(game); 
                            return (
                              <div key={game.id} onClick={() => handleSearchItemClick(game)} className="flex overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212] shadow-sm cursor-pointer active:scale-[0.98] transition-transform relative group">
                                {renderPlatformTags(game.collections, game.release_date)}
                                <div className="w-1/3 aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                  <img src={game.cover_image} alt={game.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="flex w-2/3 flex-col justify-between p-3">
                                  <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">{game.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className={`text-sm font-extrabold ${dp.isPromo ? 'text-red-600 dark:text-red-500' : 'text-black dark:text-white'}`}>
                                        {dp.price.toLocaleString()} MMK
                                      </p>
                                      {dp.regularPrice && dp.price < dp.regularPrice && (
                                        <p className="text-[10px] font-bold text-gray-400 line-through">
                                          {dp.regularPrice.toLocaleString()} MMK
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2">
                      
                      {/* RECENT SEARCHES */}
                      {recentSearches.length > 0 && (
                        <div className="mb-8">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white">Recent Searches</h3>
                            <button onClick={clearRecentSearches} className="text-xs font-bold text-gray-500 hover:text-red-500 flex items-center gap-1 active:scale-95 transition-transform">
                              <Trash2 className="w-3.5 h-3.5"/> Clear All
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {recentSearches.map(game => (
                              <div key={game.id} onClick={() => handleSearchItemClick(game)} className="flex flex-col gap-2 cursor-pointer group active:scale-95 transition-transform">
                                <div className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm relative">
                                  <img src={game.cover_image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                </div>
                                <p className="text-[10px] font-bold text-gray-900 dark:text-white truncate text-center">{game.name}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TRENDING SEARCHES */}
                      <div>
                        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4">Trending Searches</h3>
                        <div className="flex flex-col gap-5">
                          {games.slice(0, 5).map((game, idx) => {
                            const dp = getDerivedPrice(game);
                            const rankColor = idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-500' : 'text-gray-400 dark:text-gray-600';
                            
                            return (
                              <div key={game.id} onClick={() => handleSearchItemClick(game)} className="flex items-center gap-4 cursor-pointer group active:scale-95 transition-transform">
                                <span className={`text-xl font-black italic w-6 text-center ${rankColor}`}>{idx + 1}</span>
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 flex-shrink-0 shadow-sm">
                                  <img src={game.cover_image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="flex flex-col flex-1 truncate">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{game.name}</h4>
                                    {dp.regularPrice && dp.price < dp.regularPrice && (
                                      <span className="text-[8px] font-black text-white bg-red-600 px-1.5 py-0.5 rounded shadow-sm">SALE</span>
                                    )}
                                  </div>
                                  <p className={`text-xs font-black mt-1 ${dp.isPromo ? 'text-red-600 dark:text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {dp.price.toLocaleString()} MMK
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (

              <>
                <HeroSlider />

                {isLoading ? <div className="p-8 text-center text-sm font-bold text-gray-500">Loading your store...</div> : (
                  <div className="mt-6">
                    
                    {/* NEW GAMES */}
                    <div className="px-4 flex justify-between items-end mb-4">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">New games for you</h2>
                      {newGames.length > 10 && (<button onClick={() => handleSeeAllClick('New games for you', newGames)} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">See all &gt;</button>)}
                    </div>
                    <div className="flex overflow-x-auto px-4 pb-4 gap-4 snap-x hide-scrollbar">
                      {newGames.length === 0 ? <p className="text-sm font-semibold text-gray-500 w-full text-center py-4">No new games added yet.</p> : (<>{newGames.slice(0, 10).map(game => { const dp = getDerivedPrice(game); return (<div key={game.id} onClick={() => handleGameClick(game)} className="min-w-[140px] max-w-[140px] snap-start flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform group relative">{renderPlatformTags(game.collections, game.release_date)}<div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-800"><img src={game.cover_image} alt={game.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" /></div><div><h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{game.name}</h3><p className={`text-xs font-black mt-0.5 ${dp.isPromo ? 'text-red-600 dark:text-red-500' : 'text-black dark:text-white'}`}>{dp.price.toLocaleString()} MMK</p>{dp.regularPrice && dp.price < dp.regularPrice && (<p className="text-[9px] font-bold text-gray-400 line-through">{dp.regularPrice.toLocaleString()} MMK</p>)}</div></div>);})}{newGames.length > 10 && <SeeAllCard title="New games for you" categoryArray={newGames} />}</>)}
                    </div>

                    {/* 2-BLOCK GRID */}
                    <div className="px-4 mt-6 mb-8 grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-800 p-3 flex flex-col relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="text-sm font-black text-gray-900 dark:text-white italic tracking-tight">Recommended</h2>
                          {dynamicRecs.length > 3 && (
                            <button onClick={() => setRecPage(p => p === 0 ? 1 : 0)} className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-full text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                              <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${recPage === 1 ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                        
                        {dynamicRecs.length > 0 ? (
                          <div className="flex flex-col gap-3 flex-1 justify-center animate-in fade-in duration-300" key={recPage}>
                            {visibleRecs.map(game => { 
                              const dp = getDerivedPrice(game); 
                              return (
                                <div key={game.id} onClick={() => handleGameClick(game)} className="flex items-center gap-2.5 cursor-pointer group">
                                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 border border-gray-100 dark:border-gray-800 relative">
                                    <img src={game.cover_image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                  </div>
                                  <div className="flex flex-col flex-1 overflow-hidden">
                                    <p className="text-[10px] font-bold text-gray-900 dark:text-white truncate leading-tight">{game.name}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <p className={`text-[10px] font-black ${dp.isPromo ? 'text-red-600 dark:text-red-500' : 'text-black dark:text-white'}`}>{dp.price.toLocaleString()} MMK</p>
                                      {dp.regularPrice && dp.price < dp.regularPrice && (
                                        <p className="text-[8px] font-bold text-gray-400 line-through">{dp.regularPrice.toLocaleString()}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-[10px] font-bold text-gray-400 text-center">No discounted items</div>
                        )}
                      </div>

                      <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-800 p-3 flex flex-col">
                        <h2 className="text-sm font-black text-gray-900 dark:text-white mb-3 flex items-center justify-between">
                          <span className="italic tracking-tight">History</span>
                        </h2>
                        {recentlyViewed.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2 flex-1">
                            {recentlyViewed.slice(0, 4).map(item => { 
                              const dp = getDerivedPrice(item); 
                              return (
                                <div key={item.id} onClick={() => handleGameClick(item)} className="cursor-pointer group flex flex-col">
                                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative mb-1 border border-gray-100 dark:border-gray-800">
                                    <img src={item.cover_image || item.image} className={`w-full h-full ${dp.isGift ? 'object-contain p-1' : 'object-cover'} group-hover:scale-105 transition-transform`} />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <p className={`text-[9px] font-black truncate ${dp.isPromo ? 'text-red-600 dark:text-red-500' : 'text-black dark:text-white'}`}>{dp.price.toLocaleString()}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-xs font-bold text-gray-400">No recent history</div>
                        )}
                      </div>
                    </div>

                    {/* TRENDING PS5 GAMES */}
                    <div className="px-4 flex justify-between items-end mb-4">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Trending PS5 Games</h2>
                      {ps5GamesCategory.length > 10 && (<button onClick={() => handleSeeAllClick('Trending PS5 Games', ps5GamesCategory)} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">See all &gt;</button>)}
                    </div>
                    <div className="flex overflow-x-auto px-4 pb-4 gap-4 snap-x hide-scrollbar">
                      {ps5GamesCategory.length === 0 ? <p className="text-sm font-semibold text-gray-500 w-full text-center py-4">No PS5 games added yet.</p> : (<>{ps5GamesCategory.slice(0, 10).map(game => { const dp = getDerivedPrice(game); return (<div key={game.id} onClick={() => handleGameClick(game)} className="min-w-[140px] max-w-[140px] snap-start flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform group relative">{renderPlatformTags(game.collections, game.release_date)}<div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-800"><img src={game.cover_image} alt={game.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" /></div><div><h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{game.name}</h3><p className={`text-xs font-black mt-0.5 ${dp.isPromo ? 'text-red-600 dark:text-red-500' : 'text-black dark:text-white'}`}>{dp.price.toLocaleString()} MMK</p>{dp.regularPrice && dp.price < dp.regularPrice && (<p className="text-[9px] font-bold text-gray-400 line-through">{dp.regularPrice.toLocaleString()} MMK</p>)}</div></div>);})}{ps5GamesCategory.length > 10 && <SeeAllCard title="Trending PS5 Games" categoryArray={ps5GamesCategory} />}</>)}
                    </div>

                    {/* GROUPED DISCOUNT PROMOTION BLOCK */}
                    {activePromotions.length > 0 && (
                      <div className="mt-8 mb-8 animate-in fade-in duration-500 bg-red-50 dark:bg-red-900/10 py-6 border-y border-red-100 dark:border-red-900/20">
                        <div className="px-4 mb-4">
                          <h2 className="text-lg font-black text-red-600 dark:text-red-500 flex items-center gap-2 tracking-tighter italic">
                            <Tag className="w-5 h-5" /> SPECIAL OFFERS
                          </h2>
                        </div>
                        
                        <div className="flex overflow-x-auto px-4 gap-6 snap-x hide-scrollbar">
                          {activePromotions.map((promoGroup, idx) => (
                            <div key={idx} className="snap-start flex-shrink-0 w-[95%] sm:w-[400px] flex flex-col gap-4">
                              
                              {(promoGroup.promo_type === 'only_photo' || promoGroup.promo_type === 'photo_countdown') && (
                                <div 
                                  onClick={() => handleSeeAllClick(promoGroup.promo_type === 'only_photo' ? 'Special Offer' : promoGroup.promo_text || 'Special Offer', promoGroup.games)}
                                  className="relative aspect-[16/8] w-full rounded-3xl overflow-hidden shadow-lg shadow-red-500/10 dark:shadow-red-500/5 border-4 border-white dark:border-gray-800 cursor-pointer active:scale-[0.98] transition-transform group"
                                >
                                  <img src={promoGroup.promo_image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-5 flex flex-col justify-between pointer-events-none">
                                    <div className="flex justify-between items-start">
                                      <Tag className="w-6 h-6 text-white bg-red-600 p-1 rounded-full shadow-md" />
                                      {promoGroup.promo_type === 'photo_countdown' && (
                                        <div className="bg-gray-900/80 backdrop-blur-md p-3 rounded-2xl border border-gray-700/50 flex items-center gap-3">
                                          <Timer className="w-6 h-6 text-red-500"/>
                                          <CountdownTimer endTime={promoGroup.end_time} />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {promoGroup.promo_type === 'text_countdown' && (
                                <div 
                                  onClick={() => handleSeeAllClick(promoGroup.promo_text || 'Special Offer', promoGroup.games)}
                                  className="w-full rounded-3xl p-6 bg-gradient-to-br from-red-600 to-red-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg shadow-red-500/20 border-4 border-white dark:border-gray-800 cursor-pointer active:scale-[0.98] transition-transform group"
                                >
                                  <div className="flex flex-col flex-1 overflow-hidden">
                                    <h3 className="text-xl font-black text-white italic tracking-tighter leading-tight truncate">{promoGroup.promo_text}</h3>
                                    <p className="text-xs font-bold text-white/70 mt-1 uppercase tracking-widest">Tap to see games on sale</p>
                                  </div>
                                  <div className="flex-shrink-0 bg-black/30 backdrop-blur-md p-4 rounded-2xl flex items-center gap-3 border border-white/10 shadow-inner">
                                    <Timer className="w-6 h-6 text-red-400"/>
                                    <CountdownTimer endTime={promoGroup.end_time} textColor="text-white" />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PRE-ORDERS */}
                    <div className="px-4 flex justify-between items-end mb-4 mt-8">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pre-Orders</h2>
                      {preOrderGames.length > 10 && (<button onClick={() => handleSeeAllClick('Pre-Orders', preOrderGames)} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">See all &gt;</button>)}
                    </div>
                    <div className="flex overflow-x-auto px-4 pb-4 gap-4 snap-x hide-scrollbar">
                      {preOrderGames.length === 0 ? <p className="text-sm font-semibold text-gray-500 w-full text-center py-4">No Pre-Orders available right now.</p> : (<>{preOrderGames.slice(0, 10).map(game => { const dp = getDerivedPrice(game); return (<div key={game.id} onClick={() => handleGameClick(game)} className="min-w-[140px] max-w-[140px] snap-start flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform group relative">{renderPlatformTags(game.collections, game.release_date)}<div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-800"><img src={game.cover_image} alt={game.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" /></div><div><h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{game.name}</h3><p className={`text-xs font-black mt-0.5 ${dp.isPromo ? 'text-red-600 dark:text-red-500' : 'text-black dark:text-white'}`}>{dp.price.toLocaleString()} MMK</p>{dp.regularPrice && dp.price < dp.regularPrice && (<p className="text-[9px] font-bold text-gray-400 line-through">{dp.regularPrice.toLocaleString()} MMK</p>)}</div></div>);})}{preOrderGames.length > 10 && <SeeAllCard title="Pre-Orders" categoryArray={preOrderGames} />}</>)}
                    </div>

                    {/* WALLET TOP-UP BLOCK */}
                    {giftCards.length > 0 && (
                      <div className="mt-8 mb-8 animate-in fade-in duration-700">
                        <div className="px-4 flex justify-between items-end mb-4"><h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><CreditCard className="w-5 h-5 text-gray-400"/> Wallet Top-Up</h2>{giftCards.length > 5 && (<button onClick={() => handleSeeAllClick('Wallet Top-Up', giftCards)} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">See all &gt;</button>)}</div>
                        <div className="flex overflow-x-auto px-4 pb-4 gap-4 snap-x hide-scrollbar">
                          {giftCards.slice(0, 5).map((card) => { const dp = getDerivedPrice(card); return (<div key={card.id} onClick={() => handleGameClick(card)} className="min-w-[260px] snap-start flex items-center bg-white dark:bg-[#121212] p-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm cursor-pointer active:scale-[0.97] transition-all relative group overflow-hidden"><div className="w-20 h-20 flex-shrink-0 bg-gray-50 dark:bg-gray-800 rounded-xl p-2 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden"><img src={card.image} className="w-full h-full object-contain group-hover:scale-110 transition-transform" alt={card.name} /></div><div className="ml-3 flex-1 flex flex-col justify-center truncate pr-2"><h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug mb-1 truncate whitespace-normal line-clamp-2">{card.name}</h3><p className={`text-sm font-black mt-1 ${dp.isPromo ? 'text-red-600 dark:text-red-500' : 'text-black dark:text-white'}`}>From {dp.price.toLocaleString()} MMK</p></div></div>);})}
                          {giftCards.length > 5 && (<div onClick={() => handleSeeAllClick('Wallet Top-Up', giftCards)} className="min-w-[100px] snap-start flex items-center justify-center cursor-pointer group active:scale-95 transition-transform"><div className="h-[106px] w-full px-6 rounded-2xl bg-[#141414] flex flex-col items-center justify-center text-white shadow-sm border border-gray-800 hover:bg-black transition-colors"><span className="text-xs font-bold tracking-widest mb-1 text-center whitespace-nowrap">SEE ALL</span><ChevronRight className="w-5 h-5" /></div></div>)}
                        </div>
                      </div>
                    )}

                    {/* PS4 GAMES BLOCK */}
                    {ps4GamesCategory.length > 0 && (
                      <div className="mb-12 animate-in fade-in duration-700">
                        <div className="px-4 flex justify-between items-end mb-4"><h2 className="text-lg font-bold text-gray-900 dark:text-white">PS4 Games</h2>{ps4GamesCategory.length > 10 && (<button onClick={() => handleSeeAllClick('PS4 Games', ps4GamesCategory)} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">See all &gt;</button>)}</div>
                        <div className="flex overflow-x-auto px-4 pb-4 gap-4 snap-x hide-scrollbar">
                          {ps4GamesCategory.slice(0, 10).map(game => { const dp = getDerivedPrice(game); return (<div key={game.id} onClick={() => handleGameClick(game)} className="min-w-[140px] max-w-[140px] snap-start flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform group relative">{renderPlatformTags(game.collections, game.release_date)}<div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-800"><img src={game.cover_image} alt={game.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" /></div><div><h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{game.name}</h3><p className={`text-xs font-black mt-0.5 ${dp.isPromo ? 'text-red-600 dark:text-red-500' : 'text-black dark:text-white'}`}>{dp.price.toLocaleString()} MMK</p>{dp.regularPrice && dp.price < dp.regularPrice && (<p className="text-[9px] font-bold text-gray-400 line-through">{dp.regularPrice.toLocaleString()} MMK</p>)}</div></div>);})}{ps4GamesCategory.length > 10 && <SeeAllCard title="PS4 Games" categoryArray={ps4GamesCategory} />}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </>
              )}
            </div>
          )}
        </main>
        {currentView === 'store' && !isSearchActive && <LiveChat />}
      </div>
    </div>
  );
}