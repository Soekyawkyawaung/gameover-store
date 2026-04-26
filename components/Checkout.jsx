"use client";

import React, { useState, useEffect } from 'react';
import { UploadCloud, Loader2, CheckCircle, Receipt, Check, FileText, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Checkout = ({ promotedGamesIds = {} }) => {
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [paymentMethod, setPaymentMethod] = useState('kbzpay'); 
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [screenshotFile, setScreenshotFile] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedOrderNo, setGeneratedOrderNo] = useState('');
  
  // Terms and Conditions Modal State
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    fetchCartData();
  }, []);

  // PROMO PRICING LOGIC
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

  const fetchCartData = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data, error } = await supabase
        .from('cart')
        .select('id, account_type, selected_option, quantity, games(*), gift_cards(*)')
        .eq('user_id', session.user.id);
        
      if (!error && data) {
        setCartItems(data);
        
        const total = data.reduce((sum, item) => {
          const dp = getDerivedPrice(item);
          return sum + (Number(dp.price) * (item.quantity || 1));
        }, 0);
        
        setTotalPrice(total);
      }
    }
    setIsLoading(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshotFile(e.target.files[0]);
      setScreenshotPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Intercept Confirm Click to Check for Games & Show T&C
  const handleConfirmClick = () => {
    if (!screenshotFile) {
      toast.error("Please upload your payment screenshot first!");
      return;
    }

    const hasGame = cartItems.some(item => !item.gift_cards && item.games);
    
    if (hasGame) {
      setShowTermsModal(true); // Show T&C for Games
    } else {
      processOrder(); // Bypass T&C for Gift Cards only
    }
  };

  // Actual Order Processing Logic
  const processOrder = async () => {
    setIsSubmitting(true);
    setShowTermsModal(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const orderNo = 'GO' + Math.floor(100000 + Math.random() * 900000); 
      setGeneratedOrderNo(orderNo);

      const fileExt = screenshotFile.name.split('.').pop();
      const fileName = `receipt-${orderNo}-${Date.now()}.${fileExt}`;
      await supabase.storage.from('receipts').upload(fileName, screenshotFile);
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('orders').insert([{
        order_no: orderNo,
        user_id: session.user.id,
        customer_name: session.user.user_metadata?.full_name || session.user.email,
        total_price: totalPrice,
        screenshot_url: publicUrl,
        items: cartItems.map(item => {
          const isGift = !!item.gift_cards;
          const targetItem = isGift ? item.gift_cards : item.games;
          const dp = getDerivedPrice(item);

          return { 
            id: targetItem.id,
            name: targetItem.name, 
            account_type: isGift ? item.selected_option.label : item.account_type,
            price: dp.price, // Save the actual charged price (Promo or Regular)
            quantity: item.quantity || 1,
            cover_image: targetItem.cover_image || targetItem.image 
          };
        }),
        status: 'pending',
        delivery_info: `Payment Method Used: ${paymentMethod.toUpperCase()}`
      }]);
      if (dbError) throw dbError;

      await supabase.from('cart').delete().eq('user_id', session.user.id);
      window.dispatchEvent(new Event('cartUpdated'));

      setIsSuccess(true);
    } catch (error) {
      toast.error(error.message || "Failed to submit payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasPreOrder = cartItems.some(item => 
    item.games?.collections && item.games.collections.some(c => c.toLowerCase().includes('pre-order') || c.toLowerCase().includes('preorder'))
  );

  if (isSuccess) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center animate-in zoom-in duration-500">
        <div className="rounded-full bg-green-100 p-4 mb-6"><CheckCircle className="h-16 w-16 text-green-600" /></div>
        <h2 className="text-2xl font-black text-gray-900">Order Placed!</h2>
        <p className="mt-2 text-lg font-bold text-black">Order No: {generatedOrderNo}</p>
        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
          We are checking your payment. You can track your status in the "My Orders" menu.
        </p>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-black" /></div>;

  return (
    <div className="flex flex-col px-4 pb-20 pt-2 animate-in fade-in duration-300">
      
      {/* Order Summary */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
          <img src="/order-summary.png" alt="Order Summary" className="h-6 w-6 object-contain" />
          Order Summary
        </h2>
        <div className="flex flex-col gap-4">
          {cartItems.map((item) => {
            const isGift = !!item.gift_cards;
            const targetItem = isGift ? item.gift_cards : item.games;
            const itemQty = item.quantity || 1;
            
            if (!targetItem) return null; 

            const dp = getDerivedPrice(item);
            const totalItemPrice = Number(dp.price) * itemQty;

            return (
              <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 gap-2">
                <div className="flex flex-col truncate flex-1 pr-1">
                  <span className="text-sm font-bold text-gray-900 truncate leading-tight">{itemQty}x {targetItem?.name}</span>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">
                    {isGift ? item.selected_option?.label : item.account_type}
                  </span>
                </div>
                <span className={`text-sm font-black whitespace-nowrap ${dp.isPromo ? 'text-red-600' : 'text-black'}`}>
                  {totalItemPrice.toLocaleString()} MMK
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-between border-t border-dashed border-gray-200 pt-4">
          <span className="font-bold text-gray-900">Total</span>
          <span className="text-lg font-black text-black">{totalPrice.toLocaleString()} MMK</span>
        </div>
      </div>

      {/* GameOver Payment Method Selection */}
      <div className="mt-6 rounded-2xl shadow-sm border border-gray-100 bg-white overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-base font-bold text-gray-900">Payment Method</h2>
        </div>
        
        <div className="p-4 flex flex-col gap-3">
          <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'kbzpay' ? 'border-green-500 bg-green-50/30 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100 p-1.5"><img src="/kbz_logo.png" alt="KBZPay Logo" className="max-h-full max-w-full object-contain" /></div>
              <div><p className="font-bold text-gray-900 text-base">KBZPay</p><p className="text-xs font-semibold text-gray-500 mt-0.5">0% commission rate</p></div>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${paymentMethod === 'kbzpay' ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
              {paymentMethod === 'kbzpay' && <Check className="w-4 h-4 text-white" />}
            </div>
            <input type="radio" name="paymentMethod" value="kbzpay" className="hidden" checked={paymentMethod === 'kbzpay'} onChange={(e) => setPaymentMethod(e.target.value)} />
          </label>

          <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'wavepay' ? 'border-green-500 bg-green-50/30 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100 p-1.5"><img src="/wave_logo.jpg" alt="Wave Pay Logo" className="max-h-full max-w-full object-contain rounded-md" /></div>
              <div><p className="font-bold text-gray-900 text-base">Wave Pay</p><p className="text-xs font-semibold text-gray-500 mt-0.5">0% commission rate</p></div>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${paymentMethod === 'wavepay' ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
              {paymentMethod === 'wavepay' && <Check className="w-4 h-4 text-white" />}
            </div>
            <input type="radio" name="paymentMethod" value="wavepay" className="hidden" checked={paymentMethod === 'wavepay'} onChange={(e) => setPaymentMethod(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl shadow-sm border border-gray-100 bg-white">
        <div className="p-8 flex flex-col items-center border-b border-gray-100 bg-gray-50/50">
          {paymentMethod === 'kbzpay' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-56 overflow-hidden rounded-xl bg-white p-2 shadow-lg border-2 border-[#005fb8]"><img src="/kbzpay.jpg" alt="KBZPay QR Code" className="w-full h-auto object-contain" /></div>
              <div className="text-center mt-5">
                <h3 className="text-base font-bold text-gray-800">Mg Pyae Phyoe Oo</h3>
                <p className="text-sm font-black text-[#005fb8] bg-blue-50 px-3 py-1.5 rounded-lg mt-1 tracking-wider">*******1101</p>
              </div>
            </div>
          )}

          {paymentMethod === 'wavepay' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-56 overflow-hidden rounded-xl bg-white p-2 shadow-lg border-2 border-[#fac800]"><img src="/wavepay.jpg" alt="WavePay QR Code" className="w-full h-auto object-contain" /></div>
              <div className="text-center mt-5">
                <h3 className="text-base font-bold text-gray-800">Pyae Phyo Oo</h3>
                <p className="text-sm font-black text-[#fac800] bg-yellow-50 px-3 py-1.5 rounded-lg mt-1 tracking-wider">09259903642</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 text-center bg-white">
          <p className="mb-4 text-sm font-semibold text-gray-500 leading-relaxed px-2">
            After transferring the exact amount via <span className="font-bold text-black">{paymentMethod === 'kbzpay' ? 'KBZPay' : 'Wave Pay'}</span>, please upload a screenshot of your successful transaction.
          </p>
          <label className="relative flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 hover:bg-gray-100 transition-colors">
            {screenshotPreview ? (
              <img src={screenshotPreview} alt="Receipt Preview" className="h-32 object-contain shadow-sm rounded-lg" />
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className="mb-2 h-8 w-8 text-gray-400" />
                <span className="text-sm font-bold text-gray-500">Tap to Select Screenshot</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
      </div>

      <button onClick={handleConfirmClick} disabled={isSubmitting || cartItems.length === 0} className="mt-6 w-full rounded-xl bg-black py-4 font-bold text-white shadow-lg shadow-gray-500/30 hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2">
        {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
        {isSubmitting ? 'Processing Payment...' : (hasPreOrder ? 'Proceed to Pre-Order' : 'Confirm Payment')}
      </button>

      {/* --- GAME TERMS & CONDITIONS CHECKOUT MODAL --- */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTermsModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-black rounded-t-2xl">
              <h3 className="font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5" /> Terms & Conditions</h3>
              <button onClick={() => setShowTermsModal(false)} className="p-1 rounded-full hover:bg-gray-800"><X className="w-5 h-5 text-white" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">
                Share အကောင့်ဖြစ်တာကြောင့် အောက်ပါစည်းကမ်းချက်များကိုလိုက်နာဖို့လိုအပ်ပါတယ်{"\n\n"}
                <span className="font-bold text-black">(Security)</span>{"\n"}
                SIGN IN ID နှင့် Password ကိုမပြောင်းရန်{"\n\n"}
                <span className="font-bold text-black">(First person Lifetime warranty)</span>{"\n"}
                ဂိမ်းအကောင့်ကို တခြားသူတစ်ယောက်ထံ စီးပွားဖြစ်ပြန်လည်ရောင်းချခြင်း /ဂိမ်းစက်ထဲသို့ ထည့်သွင်းရောင်းချခြင်းမပြုလုပ်ရန်{"\n\n"}
                စက်အပြောင်းလဲပြုလုပ်မည်ဆိုပါက Admin များကို အသိပေးပြီး စက်မရောင်းခင် ဂိမ်းအကောင့်ကိုဖျက်ထားပေးဖို့လိုအပ်ပါတယ် ဒီလိုမှ နောက်စက်အသစ်မှာ ဂိမ်းအကောင့်ကိုပြန်သွင်းပေးမှာဖြစ်ပါတယ်{"\n\n"}
                AA နှင့်DA ကိုသေချာနားလည်ဖို့လိုအပ်ပါတယ်{"\n\n"}
                စည်းကမ်းဖောက်ဖျက်ခြင်း တစ်စုံတစ်ရာ ရှိပါက အကောင့်အား ယာယီပိတ်သိမ်းခြင်း သို့မဟုတ် အပြီးတိုင်Ban ခြင်းကိုခံရနိုင်ပါတယ်{"\n"}
                <span className="font-bold text-red-600 mt-3 block">ဝယ်ယူသူအနေနဲ့ အောက်ပါစည်းကမ်းချက်များကိုလိုက်နာနိုင်ပါသလား?</span>
              </p>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button onClick={processOrder} className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 active:scale-95 transition-all flex justify-center items-center gap-2">
                I Agree & Place Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;