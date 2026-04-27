"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, Menu, Heart, Package, ShieldCheck, X, LogIn, LogOut, FileText, Phone, Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from 'next-themes';

const Header = ({ onSignInClick, onProfileClick, onAdminClick, onCartClick, onWishlistClick, onOrdersClick }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const [showTerms, setShowTerms] = useState(false);
  const [showHotline, setShowHotline] = useState(false);
  
  // --- NEW: Cart Count State ---
  const [cartCount, setCartCount] = useState(0);

  // --- DARK MODE STATES ---
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Automatically fetch the cart total from the database
  const fetchCartCount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from('cart').select('quantity').eq('user_id', session.user.id);
      if (data) {
        // Calculate the total quantity across all items
        const totalItems = data.reduce((sum, item) => sum + (item.quantity || 1), 0);
        setCartCount(totalItems);
      }
    } else {
      setCartCount(0);
    }
  };

  useEffect(() => {
    // Mount theme toggle
    setMounted(true);

    // Initial fetch
    fetchCartCount();
    
    // Listen for changes when user adds/removes items on other pages
    window.addEventListener('cartUpdated', fetchCartCount);

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setIsAdmin(session.user.email === 'pyaephyo.gameover@gmail.com');
      }
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAdmin(session.user.email === 'pyaephyo.gameover@gmail.com');
        fetchCartCount(); // Refetch if they log in
      } else {
        setUser(null);
        setIsAdmin(false);
        setShowProfileDropdown(false);
        setCartCount(0); // Clear bubble if they log out
      }
    });

    return () => {
      window.removeEventListener('cartUpdated', fetchCartCount);
      if (authListener?.subscription) authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowProfileDropdown(false);
    window.location.reload(); 
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white dark:bg-[#121212] shadow-sm border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between transition-colors duration-300">
        
        <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white rounded-full transition-colors">
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-2 cursor-pointer absolute left-1/2 -translate-x-1/2">
          <div className="h-8 w-8 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700 bg-black flex items-center justify-center">
            <img src="/logo.jpg" alt="GameOver Logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-gray-900 dark:text-white hidden sm:block">
            GAME<span className="text-gray-400 dark:text-gray-500">OVER</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          
          {/* --- DARK MODE TOGGLE --- */}
          {mounted && (
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white rounded-full transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </button>
          )}

          {/* --- Shopping Cart with Notification Bubble --- */}
          <button onClick={onCartClick} className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white rounded-full transition-colors">
            <ShoppingCart className="h-6 w-6" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white border-2 border-white dark:border-[#121212] animate-in zoom-in">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => user ? setShowProfileDropdown(!showProfileDropdown) : onSignInClick()} 
              className={`p-2 -mr-2 rounded-full transition-colors ${showProfileDropdown ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'}`}
            >
              <User className="h-6 w-6" />
            </button>

            {showProfileDropdown && user && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)}></div>
                <div className="absolute right-0 top-full mt-4 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.user_metadata?.full_name || 'Customer'}</p>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.email}</p>
                  </div>
                  <div className="py-2">
                    {isAdmin && (
                      <button onClick={() => { setShowProfileDropdown(false); onAdminClick(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white transition-colors">
                        <ShieldCheck className="h-4 w-4" /> Admin Panel
                      </button>
                    )}
                    <button onClick={() => { setShowProfileDropdown(false); onProfileClick(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white transition-colors">
                      <User className="h-4 w-4" /> Profile Settings
                    </button>
                    <button onClick={() => { setShowProfileDropdown(false); onOrdersClick(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white transition-colors">
                      <Package className="h-4 w-4" /> My Orders
                    </button>
                    <button onClick={() => { setShowProfileDropdown(false); onWishlistClick(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white transition-colors">
                      <Heart className="h-4 w-4" /> Wishlist
                    </button>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-2 pb-1">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <LogOut className="h-4 w-4" /> Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Slide-out Mobile Sidebar Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setIsMenuOpen(false)}></div>
          
          <div className="relative w-64 max-w-sm bg-white dark:bg-[#121212] h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700 bg-black flex items-center justify-center">
                  <img src="/logo.jpg" alt="GameOver Logo" className="h-full w-full object-cover" />
                </div>
                <h2 className="font-black text-lg tracking-tighter text-gray-900 dark:text-white">GAME<span className="text-gray-400 dark:text-gray-500">OVER</span></h2>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex flex-col p-4 gap-2 flex-1 overflow-y-auto">
              
              {isAdmin && (
                <button onClick={() => { setIsMenuOpen(false); onAdminClick(); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-bold text-gray-900 dark:text-white transition-colors">
                  <ShieldCheck className="h-5 w-5 text-black dark:text-white" /> Admin Panel
                </button>
              )}
              <button onClick={() => { setIsMenuOpen(false); onOrdersClick(); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-bold text-gray-900 dark:text-white transition-colors">
                <Package className="h-5 w-5 text-gray-500 dark:text-gray-400" /> My Orders
              </button>
              <button onClick={() => { setIsMenuOpen(false); onWishlistClick(); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-bold text-gray-900 dark:text-white transition-colors">
                <Heart className="h-5 w-5 text-gray-500 dark:text-gray-400" /> Wishlist
              </button>
              
              {/* SIDEBAR CART BADGE */}
              <button onClick={() => { setIsMenuOpen(false); onCartClick(); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-bold text-gray-900 dark:text-white transition-colors">
                <div className="relative">
                  <ShoppingCart className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white border border-white dark:border-[#121212]">
                      {cartCount}
                    </span>
                  )}
                </div>
                Cart
              </button>
              
              <div className="border-t border-gray-100 dark:border-gray-800 my-2"></div>
              
              <button onClick={() => setShowTerms(true)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-bold text-gray-900 dark:text-white transition-colors">
                <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" /> Terms & Conditions
              </button>
              <button onClick={() => setShowHotline(true)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-bold text-gray-900 dark:text-white transition-colors">
                <Phone className="h-5 w-5 text-gray-500 dark:text-gray-400" /> Hotline
              </button>

              <div className="mt-auto border-t border-gray-100 dark:border-gray-800 pt-4">
                {user ? (
                  <>
                    <button onClick={() => { setIsMenuOpen(false); onProfileClick(); }} className="flex w-full items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-bold text-gray-900 dark:text-white transition-colors">
                      <User className="h-5 w-5 text-gray-500 dark:text-gray-400" /> Profile Settings
                    </button>
                    <button onClick={() => { setIsMenuOpen(false); handleLogout(); }} className="flex w-full items-center gap-3 p-3 mt-2 rounded-xl text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-left font-bold transition-colors">
                      <LogOut className="h-5 w-5" /> Log Out
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setIsMenuOpen(false); onSignInClick(); }} className="flex w-full items-center justify-center gap-2 p-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                    <LogIn className="h-5 w-5" /> Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      {showTerms && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowTerms(false)}></div>
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-2xl">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5" /> Terms & Conditions</h3>
              <button onClick={() => setShowTerms(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-gray-800 dark:text-gray-300 font-medium leading-relaxed whitespace-pre-wrap">
                Share အကောင့်ဖြစ်တာကြောင့် အောက်ပါစည်းကမ်းချက်များကိုလိုက်နာဖို့လိုအပ်ပါတယ်{"\n\n"}
                <span className="font-bold text-black dark:text-white">(Security)</span>{"\n"}
                SIGN IN ID နှင့် Password ကိုမပြောင်းရန်{"\n\n"}
                <span className="font-bold text-black dark:text-white">(First person Lifetime warranty)</span>{"\n"}
                ဂိမ်းအကောင့်ကို တခြားသူတစ်ယောက်ထံ စီးပွားဖြစ်ပြန်လည်ရောင်းချခြင်း /ဂိမ်းစက်ထဲသို့ ထည့်သွင်းရောင်းချခြင်းမပြုလုပ်ရန်{"\n\n"}
                စက်အပြောင်းလဲပြုလုပ်မည်ဆိုပါက Admin များကို အသိပေးပြီး စက်မရောင်းခင် ဂိမ်းအကောင့်ကိုဖျက်ထားပေးဖို့လိုအပ်ပါတယ် ဒီလိုမှ နောက်စက်အသစ်မှာ ဂိမ်းအကောင့်ကိုပြန်သွင်းပေးမှာဖြစ်ပါတယ်{"\n\n"}
                AA နှင့်DA ကိုသေချာနားလည်ဖို့လိုအပ်ပါတယ်{"\n\n"}
                စည်းကမ်းဖောက်ဖျက်ခြင်း တစ်စုံတစ်ရာ ရှိပါက အကောင့်အား ယာယီပိတ်သိမ်းခြင်း သို့မဟုတ် အပြီးတိုင်Ban ခြင်းကိုခံရနိုင်ပါတယ်{"\n"}
                <span className="font-bold text-red-600 dark:text-red-400 mt-2 block">ဝယ်ယူသူအနေနဲ့ အောက်ပါစည်းကမ်းချက်များကိုလိုက်နာနိုင်ပါသလား?</span>
              </p>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-2xl">
              <button onClick={() => setShowTerms(false)} className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-3 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">I Agree</button>
            </div>
          </div>
        </div>
      )}

      {showHotline && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowHotline(false)}></div>
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-2xl">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Phone className="w-5 h-5" /> Customer Support</h3>
              <button onClick={() => setShowHotline(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <a href="tel:09259903642" className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-black dark:hover:border-gray-500 transition-colors">
                <span className="font-bold text-gray-900 dark:text-white tracking-wider">09-259903642</span>
                <span className="text-xs font-black text-white bg-green-600 px-2 py-1 rounded">CALL</span>
              </a>
              <a href="tel:09753341101" className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-black dark:hover:border-gray-500 transition-colors">
                <span className="font-bold text-gray-900 dark:text-white tracking-wider">09-753341101</span>
                <span className="text-xs font-black text-white bg-green-600 px-2 py-1 rounded">CALL</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;