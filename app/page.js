"use client";

import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Search, Filter, X, ArrowLeft, Check, Gamepad2 } from 'lucide-react'; 
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

export default function Home() {
  const [currentView, setCurrentView] = useState('store'); 
  const [showAuth, setShowAuth] = useState(false); 
  
  const [games, setGames] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState(null);

  // --- SEE ALL & FILTER STATES ---
  const [seeAllTitle, setSeeAllTitle] = useState('');
  const [seeAllBaseGames, setSeeAllBaseGames] = useState([]); 
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedPrices, setSelectedPrices] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  useEffect(() => {
    const fetchStoreData = async () => {
      setIsLoading(true);
      const { data: gamesData } = await supabase.from('games').select('*').order('created_at', { ascending: false });
      const { data: giftsData } = await supabase.from('gift_cards').select('*').order('created_at', { ascending: false });
      
      if (gamesData) setGames(gamesData);
      if (giftsData) setGiftCards(giftsData);
      setIsLoading(false);
    };
    fetchStoreData();
  }, []);

  const isPreOrder = (game) => game.collections?.some(c => c.toLowerCase().includes('pre-order') || c.toLowerCase().includes('preorder'));

  const newGames = games.filter(game => game.collections?.some(c => c.toLowerCase().includes('new games')) && !isPreOrder(game));
  const ps5GamesCategory = games.filter(game => game.collections?.some(c => c.toLowerCase().includes('ps5 games')) && !isPreOrder(game));
  const preOrderGames = games.filter(game => isPreOrder(game));

  const searchResults = games.filter(game => game.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const allUniqueGenres = [...new Set(games.flatMap(g => g.collections?.filter(c => c !== "PS4 Games" && c !== "PS5 Games") || []))];
  const priceRanges = ['10,000 - 50,000 MMK', '50,000 - 100,000 MMK', '100,000 - 150,000 MMK', 'Over 150,000 MMK'];

  const handleGameClick = (item) => {
    setSelectedGame(item);
    setCurrentView('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const renderPlatformTags = (collections) => {
    if (!collections) return null;
    let platforms = [];
    if (collections.includes("PS4 Games")) platforms.push("PS4");
    if (collections.includes("PS5 Games")) platforms.push("PS5");
    if (platforms.length === 0) return null;
    return (
      <div className="absolute top-2 left-2 bg-gray-900/80 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-gray-700/50 flex gap-1 z-10">
        {platforms.map(p => <span key={p}>{p}</span>)}
      </div>
    );
  };

  const filteredSeeAllGames = seeAllBaseGames.filter(game => {
    const price = Number(game.discount_price || game.price);

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
    if (selectedGenres.length > 0) {
      matchesGenre = selectedGenres.some(g => game.collections?.includes(g));
    }

    let matchesPlatform = true;
    if (selectedPlatforms.length > 0) {
      const hasPS4 = game.collections?.includes("PS4 Games");
      const hasPS5 = game.collections?.includes("PS5 Games");
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

  if (currentView === 'admin') {
    return (
      <>
        <Toaster position="top-center" />
        <AdminPanel onBackToStore={() => setCurrentView('store')} />
      </>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="relative mx-auto min-h-screen max-w-md bg-white shadow-2xl pb-20 overflow-x-hidden">
        <Toaster position="top-center" />

        {currentView !== 'details' && currentView !== 'cart' && currentView !== 'wishlist' && currentView !== 'orders' && currentView !== 'seeAll' && currentView !== 'checkout' && (
          <Header 
            onSignInClick={() => setShowAuth(true)} 
            onProfileClick={() => setCurrentView('profile')}
            onAdminClick={() => setCurrentView('admin')} 
            onCartClick={() => checkAuthAndNavigate('cart')}
            onWishlistClick={() => checkAuthAndNavigate('wishlist')}
            onOrdersClick={() => checkAuthAndNavigate('orders')}
          />
        )}

        {showAuth && <Auth onClose={() => setShowAuth(false)} />}

        <main className="w-full">
          {currentView === 'profile' && <Profile onBack={() => setCurrentView('store')} />}
          {currentView === 'cart' && <Cart onBack={() => setCurrentView('store')} onCheckout={() => setCurrentView('checkout')} />}
          {currentView === 'wishlist' && <Wishlist onBack={() => setCurrentView('store')} onGameClick={handleGameClick} />}
          {currentView === 'orders' && <MyOrders onBack={() => setCurrentView('store')} />}
          
          {currentView === 'checkout' && (
            <div className="animate-in slide-in-from-right duration-300 bg-white min-h-screen pt-4">
              <button onClick={() => setCurrentView('cart')} className="mx-4 mb-2 text-sm font-bold text-blue-600 hover:underline">← Back to Cart</button>
              <Checkout />
            </div>
          )}

          {currentView === 'details' && selectedGame && (
            <ProductDetail 
              game={selectedGame} 
              allGames={[...games, ...giftCards]} 
              onBack={() => setCurrentView('store')} 
              onBuyNow={() => checkAuthAndNavigate('checkout')} 
              onGameClick={handleGameClick} 
            />
          )}

          {/* --- "SEE ALL" GRID VIEW --- */}
          {currentView === 'seeAll' && (
            <div className="animate-in slide-in-from-right duration-300 min-h-screen bg-gray-50">
              <div className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center">
                  <button onClick={() => setCurrentView('store')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-all"><ArrowLeft className="h-6 w-6 text-gray-800" /></button>
                  <h1 className="ml-2 text-xl font-black text-gray-900 truncate max-w-[200px]">{seeAllTitle}</h1>
                </div>
                <button onClick={() => setIsFilterOpen(true)} className="relative p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                  <Filter className="h-5 w-5 text-gray-800" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#000000] text-[9px] font-bold text-white border border-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="p-4 grid grid-cols-2 gap-4">
                {filteredSeeAllGames.length === 0 ? (
                  <div className="col-span-2 text-center py-20 text-gray-500 font-bold">No games match your filters.</div>
                ) : (
                  filteredSeeAllGames.map(game => (
                    <div key={game.id} onClick={() => handleGameClick(game)} className="flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform group relative">
                      {renderPlatformTags(game.collections)}
                      <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
                        <img src={game.cover_image} alt={game.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-900 truncate">{game.name}</h3>
                        <p className="text-xs font-semibold text-[#000000] mt-0.5">{game.discount_price || game.price} MMK</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {isFilterOpen && (
                <div className="fixed inset-0 z-[200] flex flex-col bg-gray-50 text-gray-900 animate-in slide-in-from-bottom duration-300">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                    <h2 className="text-lg font-bold">Sort and Filter</h2>
                    <button onClick={() => setIsFilterOpen(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><X className="h-6 w-6 text-gray-500 hover:text-gray-900" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 pb-32">
                    <div className="mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                      <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Price</h3>
                      <div className="flex flex-wrap gap-2">
                        {priceRanges.map(range => (
                          <button key={range} onClick={() => toggleFilter('price', range)} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${selectedPrices.includes(range) ? 'bg-black text-white border-black shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                            {range}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                      <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Platform</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {['PS4', 'PS5'].map(plat => (
                          <button key={plat} onClick={() => toggleFilter('platform', plat)} className={`py-4 flex flex-col items-center justify-center gap-2 rounded-xl text-lg font-black italic tracking-tighter border transition-all ${selectedPlatforms.includes(plat) ? 'bg-black text-white border-black shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            <Gamepad2 className={`h-6 w-6 ${selectedPlatforms.includes(plat) ? 'text-white' : 'text-gray-400'}`} />
                            {plat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                      <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Genre</h3>
                      <div className="flex flex-col">
                        {allUniqueGenres.map(genre => (
                          <label key={genre} className="flex items-center justify-between py-3 cursor-pointer group border-b border-gray-50 last:border-0">
                            <span className="text-sm font-bold text-gray-700 group-hover:text-black transition-colors">{genre}</span>
                            <div className={`h-6 w-6 rounded-lg border flex items-center justify-center transition-all ${selectedGenres.includes(genre) ? 'bg-[#000000] border-[#000000] shadow-sm' : 'border-gray-300 bg-gray-50 group-hover:border-gray-400'}`}>
                              {selectedGenres.includes(genre) && <Check className="h-4 w-4 text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={selectedGenres.includes(genre)} onChange={() => toggleFilter('genre', genre)} />
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex items-center gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
                    <button onClick={() => { setSelectedPrices([]); setSelectedGenres([]); setSelectedPlatforms([]); }} className="flex-1 py-4 text-sm font-bold text-gray-500 hover:text-black transition-colors">
                      Clear all
                    </button>
                    <button onClick={() => setIsFilterOpen(false)} className="flex-[2] py-4 rounded-xl bg-[#000000] text-white text-sm font-bold shadow-lg shadow-red-500/30 active:scale-95 transition-all hover:bg-red-700">
                      Show {filteredSeeAllGames.length} results
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- MAIN STORE VIEW --- */}
          {currentView === 'store' && (
             <div className="animate-in fade-in duration-500">
              <div className="px-4 py-4">
                <div className="flex items-center rounded-xl bg-gray-100 px-4 py-3 border border-transparent focus-within:border-black focus-within:bg-white transition-all">
                  <Search className="h-5 w-5 text-gray-500" />
                  <input type="text" placeholder="Search games..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ml-3 w-full bg-transparent text-sm font-bold outline-none placeholder-gray-500 text-gray-900" />
                </div>
              </div>

              <HeroSlider />

              {isLoading ? (
                <div className="p-8 text-center text-sm font-bold text-gray-500">Loading your store...</div>
              ) : searchQuery ? (
                <div className="px-4 mt-6">
                  <h2 className="mb-4 text-lg font-bold text-gray-900">Search Results</h2>
                  {searchResults.length === 0 ? (
                    <p className="text-sm font-semibold text-gray-500">No games found.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {searchResults.map((game) => (
                        <div key={game.id} onClick={() => handleGameClick(game)} className="flex overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm cursor-pointer active:scale-[0.98] transition-transform relative group">
                          {renderPlatformTags(game.collections)}
                          <div className="w-1/3 aspect-square bg-gray-100 overflow-hidden"><img src={game.cover_image} alt={game.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" /></div>
                          <div className="flex w-2/3 flex-col justify-between p-3">
                            <div>
                              <h3 className="text-sm font-bold text-gray-900 leading-tight truncate">{game.name}</h3>
                              <p className="mt-1 text-sm font-extrabold text-[#000000]">{game.discount_price || game.price} MMK</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6">
                  
                  {/* NEW GAMES */}
                  <div className="px-4 flex justify-between items-end mb-4">
                    <h2 className="text-lg font-bold text-gray-900">New games for you</h2>
                    {newGames.length > 0 && (
                      <button onClick={() => handleSeeAllClick('New games for you', newGames)} className="text-xs font-bold text-blue-600 hover:underline">See all &gt;</button>
                    )}
                  </div>
                  <div className="flex overflow-x-auto px-4 pb-4 gap-4 snap-x hide-scrollbar">
                    {newGames.length === 0 ? (
                      <p className="text-sm font-semibold text-gray-500 w-full text-center py-4">No new games added yet.</p>
                    ) : (
                      newGames.slice(0, 10).map(game => (
                        <div key={game.id} onClick={() => handleGameClick(game)} className="min-w-[140px] max-w-[140px] snap-start flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform group relative">
                          {renderPlatformTags(game.collections)}
                          <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100"><img src={game.cover_image} alt={game.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" /></div>
                          <div>
                            <h3 className="text-xs font-bold text-gray-900 truncate">{game.name}</h3>
                            <p className="text-xs font-semibold text-[#000000] mt-0.5">{game.discount_price || game.price} MMK</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* TRENDING PS5 GAMES */}
                  <div className="px-4 flex justify-between items-end mb-4 mt-8">
                    <h2 className="text-lg font-bold text-gray-900">Trending PS5 Games</h2>
                    {ps5GamesCategory.length > 0 && (
                      <button onClick={() => handleSeeAllClick('Trending PS5 Games', ps5GamesCategory)} className="text-xs font-bold text-blue-600 hover:underline">See all &gt;</button>
                    )}
                  </div>
                  <div className="flex overflow-x-auto px-4 pb-4 gap-4 snap-x hide-scrollbar">
                    {ps5GamesCategory.length === 0 ? (
                      <p className="text-sm font-semibold text-gray-500 w-full text-center py-4">No PS5 games added yet.</p>
                    ) : (
                      ps5GamesCategory.slice(0, 10).map(game => (
                        <div key={game.id} onClick={() => handleGameClick(game)} className="min-w-[140px] max-w-[140px] snap-start flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform group relative">
                          {renderPlatformTags(game.collections)}
                          <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100"><img src={game.cover_image} alt={game.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" /></div>
                          <div>
                            <h3 className="text-xs font-bold text-gray-900 truncate">{game.name}</h3>
                            <p className="text-xs font-semibold text-[#000000] mt-0.5">{game.discount_price || game.price} MMK</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* PRE-ORDERS */}
                  <div className="px-4 flex justify-between items-end mb-4 mt-8">
                    <h2 className="text-lg font-bold text-gray-900">Pre-Orders</h2>
                    {preOrderGames.length > 0 && (
                      <button onClick={() => handleSeeAllClick('Pre-Orders', preOrderGames)} className="text-xs font-bold text-blue-600 hover:underline">See all &gt;</button>
                    )}
                  </div>
                  <div className="flex overflow-x-auto px-4 pb-4 gap-4 snap-x hide-scrollbar">
                    {preOrderGames.length === 0 ? (
                      <p className="text-sm font-semibold text-gray-500 w-full text-center py-4">No Pre-Orders available right now.</p>
                    ) : (
                      preOrderGames.slice(0, 10).map(game => (
                        <div key={game.id} onClick={() => handleGameClick(game)} className="min-w-[140px] max-w-[140px] snap-start flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform group relative">
                          {renderPlatformTags(game.collections)}
                          <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100"><img src={game.cover_image} alt={game.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" /></div>
                          <div>
                            <h3 className="text-xs font-bold text-gray-900 truncate">{game.name}</h3>
                            <p className="text-xs font-semibold text-[#000000] mt-0.5">{game.discount_price || game.price} MMK</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* --- FIXED: GIFT CARDS SECTION SHOWING LOWEST BASE PRICE --- */}
                  <div className="px-4 mt-8 mb-12">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Gift Cards</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {giftCards.map((card) => {
                        // Find the cheapest option dynamically
                        const lowestPrice = card.options && card.options.length > 0 
                          ? Math.min(...card.options.map(o => Number(o.price))) 
                          : 0;

                        return (
                          <div key={card.id} onClick={() => handleGameClick(card)} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm active:scale-95 transition-transform cursor-pointer group">
                            <div className="aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-gray-50 flex items-center justify-center p-2">
                              <img src={card.image} className="h-full w-full object-contain group-hover:scale-110 transition-transform" alt={card.name} />
                            </div>
                            <h3 className="text-xs font-bold text-gray-900 truncate">{card.name}</h3>
                            <p className="text-xs font-semibold text-[#000000] mt-0.5">
                              From {lowestPrice.toLocaleString()} MMK
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
        </main>
        
        <LiveChat />
      </div>
    </div>
  );
}