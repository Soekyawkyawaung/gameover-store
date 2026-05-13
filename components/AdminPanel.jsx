"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Image as ImageIcon, UploadCloud, Loader2, Tag, Percent, Ticket, ShoppingBag, Package, Calendar, ShieldAlert, Gamepad2, CreditCard, Menu, Tags, CalendarClock, Wand2, LogOut, PlusCircle, Edit, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const AdminPanel = ({ onBackToStore }) => {
  const [activeTab, setActiveTab] = useState('orders'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- DATA STATES ---
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderMonth, setOrderMonth] = useState('');
  const [orderYear, setOrderYear] = useState('');

  const [games, setGames] = useState([]);
  const [gameSearch, setGameSearch] = useState(''); 
  const [showGameForm, setShowGameForm] = useState(false);

  // --- PAGINATION STATES ---
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState('1');
  const ITEMS_PER_PAGE = 20;

  const [promotions, setPromotions] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);

  // --- NEW GAME / EDIT GAME STATES ---
  const initialGameState = {
    name: '', description: '', size: '', youtube_link: '', collections: '', release_date: '',
    price: '', discount_price: '', activated_stock: 0,
    deactivated_price: '', deactivated_discount: '', deactivated_stock: 0,
    ps4_price: '', ps4_discount_price: '', ps4_stock: 0,
    ps4_deactivated_price: '', ps4_deactivated_discount: '', ps4_deactivated_stock: 0,
    ps5_price: '', ps5_discount_price: '', ps5_stock: 0,
    ps5_deactivated_price: '', ps5_deactivated_discount: '', ps5_deactivated_stock: 0,
  };

  const [newGame, setNewGame] = useState(initialGameState);
  const [editingGame, setEditingGame] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverUrlInput, setCoverUrlInput] = useState(''); 
  const [coverPreview, setCoverPreview] = useState(null);
  const [screenshotInputs, setScreenshotInputs] = useState(() => 
    Array.from({ length: 6 }, () => ({ file: null, url: '', preview: null }))
  );
  
  const [isPS5, setIsPS5] = useState(false);
  const [isPS4, setIsPS4] = useState(false);
  const [uniqueCollections, setUniqueCollections] = useState([]);
  const quickTags = ["Action-Adventure", "Role playing games", "Shooter", "Adventure", "Horror", "Action", "Fighting", "Party", "New Games", "Strategy", "Pre-orders", "Racing", "Driving", "Sports"];
  const [descLanguage, setDescLanguage] = useState('en');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  // --- NEW PROMO STATES ---
  const initialPromoState = {
    game_id: '', promo_type: 'only_photo', start_time: '', end_time: '',
    promo_text: '', discount_price: '', deactivated_discount_price: '',
    ps4_promo_price: '', ps4_deact_promo_price: '',
    ps5_promo_price: '', ps5_deact_promo_price: ''
  };
  const [newPromo, setNewPromo] = useState(initialPromoState);
  const [promoImageFile, setPromoImageFile] = useState(null);
  const [promoPreview, setPromoPreview] = useState(null);
  const [promoGameIds, setPromoGameIds] = useState([]); 
  const [promoPrices, setPromoPrices] = useState({}); 
  const [startDay, setStartDay] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDay, setEndDay] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showPromoForm, setShowPromoForm] = useState(false);

  // --- GIFT CARD STATES ---
  const [showGiftForm, setShowGiftForm] = useState(false);
  const [editGiftId, setEditGiftId] = useState(null);
  const [giftName, setGiftName] = useState('');
  const [giftDescription, setGiftDescription] = useState('');
  const [giftOptions, setGiftOptions] = useState([{ label: '', price: '' }]);
  const [giftCoverPreview, setGiftCoverPreview] = useState(null);
  const [giftCoverFile, setGiftCoverFile] = useState(null);

  // --- SLIDER STATES ---
  const [sliderFiles, setSliderFiles] = useState({ 1: null, 2: null, 3: null, 4: null, 5: null });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (games.length > 0) {
      const allTags = games.flatMap(g => g.collections || []);
      const textTags = allTags.filter(t => t !== "PS5 Games" && t !== "PS4 Games");
      const unique = [...new Set(textTags)];
      setUniqueCollections(unique);
    }
  }, [games]);

  // Reset pagination to Page 1 when the user types in the search bar
  useEffect(() => {
    setCurrentPage(1);
    setJumpPageInput('1');
  }, [gameSearch]);

  // --- REALTIME BROWSER NOTIFICATIONS ---
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    const orderSubscription = supabase
      .channel('admin-order-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const audio = new Audio('/notification-ding.mp3');
        audio.play().catch(e => console.log("Audio play blocked by browser"));

        if (Notification.permission === 'granted') {
          new Notification('New Order Received! 🎮', {
            body: `Order ${payload.new.order_no} placed for ${payload.new.total_price?.toLocaleString()} MMK.`,
            icon: '/logo.jpg', 
          });
        }
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderSubscription);
    };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [oRes, gRes, pRes, gcRes, hRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('games').select('*').order('created_at', { ascending: false }),
        supabase.from('promotions').select('*, games(name)').order('created_at', { ascending: false }),
        supabase.from('gift_cards').select('*').order('created_at', { ascending: false }),
        supabase.from('hero_slider').select('*').order('created_at', { ascending: false })
      ]);
      setOrders(oRes.data || []);
      setGames(gRes.data || []);
      setPromotions(pRes.data || []);
      setGiftCards(gcRes.data || []);
      setHeroSlides(hRes.data || []);
    } catch (error) { toast.error("Failed to load data"); }
    setIsLoading(false);
  };

  // --- UPLOAD HELPER ---
  const uploadImage = async (file, bucket) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  // --- GAME MANAGEMENT ---
  const handlePlatformToggle = (platform, isChecked) => {
    if (platform === 'PS5 Games') setIsPS5(isChecked);
    if (platform === 'PS4 Games') setIsPS4(isChecked);
  };

  const handleQuickAddCollection = (tag) => {
    const target = editingGame ? editingGame : newGame;
    const currentTags = target.collections ? target.collections.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (!currentTags.includes(tag)) {
      const newTagsStr = currentTags.length > 0 ? `${target.collections}, ${tag}` : tag;
      if (editingGame) setEditingGame({...editingGame, collections: newTagsStr});
      else setNewGame({...newGame, collections: newTagsStr});
    }
  };

  const handleScreenshotFileChange = (index, file) => {
    if (!file) return;
    setScreenshotInputs(prev => prev.map((item, i) => 
      i === index ? { ...item, file: file, preview: URL.createObjectURL(file), url: '' } : item
    ));
  };

  const handleScreenshotUrlChange = (index, url) => {
    setScreenshotInputs(prev => prev.map((item, i) => 
      i === index ? { ...item, url: url, preview: url, file: null } : item
    ));
  };

  const clearScreenshotSlot = (index) => {
    setScreenshotInputs(prev => prev.map((item, i) => 
      i === index ? { file: null, url: '', preview: null } : item
    ));
  };

  const handleGenerateDescription = async () => {
    const targetName = editingGame ? editingGame.name : newGame.name;
    if (!targetName) return toast.error("Please enter a Game Name first!");
    
    setIsGeneratingDesc(true);
    try {
      const response = await fetch('/api/ai-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameName: targetName, language: descLanguage })
      });
      
      if (!response.ok) throw new Error("Failed to generate description");
      const data = await response.json();
      
      if (editingGame) setEditingGame({...editingGame, description: data.description});
      else setNewGame({...newGame, description: data.description});
      
      toast.success("AI Description generated!");
    } catch (error) { toast.error(error.message); } 
    finally { setIsGeneratingDesc(false); }
  };

  const resetGameForm = () => {
    setEditingGame(null);
    setNewGame(initialGameState);
    setIsPS5(false);
    setIsPS4(false);
    setCoverImageFile(null);
    setCoverUrlInput('');
    setCoverPreview(null);
    setScreenshotInputs(Array.from({ length: 6 }, () => ({ file: null, url: '', preview: null })));
    setShowGameForm(false);
  };

  const handleEditGameClick = (game) => {
    setEditingGame(game);
    const safeCollections = Array.isArray(game.collections) ? game.collections : [];
    setIsPS5(safeCollections.includes("PS5 Games"));
    setIsPS4(safeCollections.includes("PS4 Games"));
    setEditingGame({
      ...game,
      collections: safeCollections.filter(tag => tag !== "PS5 Games" && tag !== "PS4 Games").join(', ')
    });

    setCoverImageFile(null); 
    setCoverUrlInput(''); 
    setCoverPreview(game.cover_image); 

    const existingSs = Array.isArray(game.screenshots) ? game.screenshots : [];
    setScreenshotInputs(Array.from({ length: 6 }, (_, i) => ({
      file: null, 
      url: existingSs[i] || '', 
      preview: existingSs[i] || null
    })));

    setShowGameForm(true);
  };

  const handleSaveGame = async (e, isEditing) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let gamePayload = { ...(isEditing ? editingGame : newGame) };
      
      const numFields = ['price', 'discount_price', 'activated_stock', 'deactivated_price', 'deactivated_discount', 'deactivated_stock', 'ps4_price', 'ps4_discount_price', 'ps4_stock', 'ps4_deactivated_price', 'ps4_deactivated_discount', 'ps4_deactivated_stock', 'ps5_price', 'ps5_discount_price', 'ps5_stock', 'ps5_deactivated_price', 'ps5_deactivated_discount', 'ps5_deactivated_stock'];
      numFields.forEach(field => {
        gamePayload[field] = gamePayload[field] ? Number(gamePayload[field]) : 0; 
      });

      if (!gamePayload.release_date) gamePayload.release_date = null;

      let finalCoverUrl = gamePayload.cover_image;
      if (coverImageFile) {
        finalCoverUrl = await uploadImage(coverImageFile, 'game_covers');
      } else if (coverUrlInput) {
        finalCoverUrl = coverUrlInput;
      }
      if (!finalCoverUrl && !isEditing) throw new Error("Cover image is required!");
      gamePayload.cover_image = finalCoverUrl;
      
      let finalScreenshotUrls = [];
      for (let i = 0; i < screenshotInputs.length; i++) {
        const input = screenshotInputs[i];
        if (input.file) {
          finalScreenshotUrls.push(await uploadImage(input.file, 'game_covers'));
        } else if (input.url) {
          finalScreenshotUrls.push(input.url);
        }
      }
      gamePayload.screenshots = finalScreenshotUrls;

      let collectionsArray = gamePayload.collections ? gamePayload.collections.split(',').map(tag => tag.trim()).filter(Boolean) : [];
      if (isPS5) collectionsArray.push("PS5 Games");
      if (isPS4) collectionsArray.push("PS4 Games");
      gamePayload.collections = [...new Set(collectionsArray)]; 

      if (isEditing) {
        const { error } = await supabase.from('games').update(gamePayload).eq('id', editingGame.id);
        if (error) throw error;
        toast.success("Game updated!");
      } else {
        const { error } = await supabase.from('games').insert([gamePayload]);
        if (error) throw error;
        toast.success("Game added!");
      }
      
      resetGameForm();
      fetchData();
    } catch (error) { 
      toast.error(error.message || "An error occurred while saving the game."); 
    }
    setIsSubmitting(false);
  };

  const handleDeleteGame = async (id) => {
    if (!window.confirm("Are you sure you want to delete this game?")) return;
    await supabase.from('games').delete().eq('id', id);
    toast.success("Deleted");
    fetchData();
  };

  // --- PROMOTION MANAGEMENT ---
  const handleSavePromo = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (promoGameIds.length === 0) throw new Error("Please select at least one game to promote!");
      if (!startDay || !startTime || !endDay || !endTime) throw new Error("Time range is required!");
      
      const startTimeStamp = `${startDay}T${startTime}:00`;
      const endTimeStamp = `${endDay}T${endTime}:00`;
      if (new Date(startTimeStamp) >= new Date(endTimeStamp)) throw new Error("End time must be after start time.");

      let promoImageUrl = null;
      if (newPromo.promo_type !== 'text_countdown') {
        if (promoImageFile) promoImageUrl = await uploadImage(promoImageFile, 'promo_images');
        else if (promoPreview) promoImageUrl = promoPreview; 
        else throw new Error("Promo photo is required!");
      }

      const finalStartTime = new Date(startTimeStamp).toISOString();
      const finalEndTime = new Date(endTimeStamp).toISOString();

      const promoDataArray = promoGameIds.map(id => {
        return {
          game_id: id,
          promo_type: newPromo.promo_type,
          discount_price: parseFloat(promoPrices[id]?.activated) || null,
          deactivated_discount_price: parseFloat(promoPrices[id]?.deactivated) || null,
          ps5_promo_price: parseFloat(promoPrices[id]?.ps5_activated) || null,
          ps5_deact_promo_price: parseFloat(promoPrices[id]?.ps5_deactivated) || null,
          ps4_promo_price: parseFloat(promoPrices[id]?.ps4_activated) || null,
          ps4_deact_promo_price: parseFloat(promoPrices[id]?.ps4_deactivated) || null,
          start_time: finalStartTime,
          end_time: finalEndTime,
          promo_image_url: promoImageUrl,
          promo_text: newPromo.promo_type === 'text_countdown' ? newPromo.promo_text : null
        }
      });

      const { error } = await supabase.from('promotions').insert(promoDataArray);
      if (error) throw error;

      toast.success(`Discount Promo Scheduled for ${promoGameIds.length} game(s)!`);
      setShowPromoForm(false);
      resetPromoForm();
      fetchData();
    } catch (error) { toast.error(error.message); }
    setIsSubmitting(false);
  };

  const resetPromoForm = () => {
    setPromoGameIds([]); setNewPromo(initialPromoState); setPromoImageFile(null); 
    setPromoPreview(null); setPromoPrices({}); 
    setStartDay(''); setStartTime(''); setEndDay(''); setEndTime('');
  };

  const handleDeletePromo = async (id) => {
    if (!window.confirm("Delete this discount promo? Price will instantly revert to regular on store.")) return;
    await supabase.from('promotions').delete().eq('id', id);
    toast.success("Promo deleted.");
    fetchData();
  };

  // --- ORDER MANAGEMENT ---
  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    try {
      const status = e.target.status.value;
      const deliveryInfo = e.target.deliveryInfo.value;
      const { error } = await supabase.from('orders').update({ status, delivery_info: deliveryInfo }).eq('id', selectedOrder.id);
      if (error) throw error;
      toast.success("Order Updated!");
      setSelectedOrder(null);
      fetchData(); 
    } catch (error) { toast.error(error.message); }
  };

  // --- GIFT CARD MANAGEMENT ---
  const handleAddOption = () => setGiftOptions([...giftOptions, { label: '', price: '' }]);
  const handleRemoveOption = (index) => setGiftOptions(giftOptions.filter((_, i) => i !== index));
  const handleOptionChange = (index, field, value) => {
    const newOptions = [...giftOptions];
    newOptions[index][field] = value;
    setGiftOptions(newOptions);
  };

  const handleSaveGift = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalImageUrl = giftCoverPreview;
      if (giftCoverFile) {
        finalImageUrl = await uploadImage(giftCoverFile, 'game_covers');
      }
      if (!finalImageUrl) throw new Error("An image is required!");

      const giftData = {
        name: giftName,
        description: giftDescription,
        image: finalImageUrl,
        options: giftOptions.filter(opt => opt.label && opt.price)
      };

      if (editGiftId) {
        await supabase.from('gift_cards').update(giftData).eq('id', editGiftId);
        toast.success("Gift Card Updated!");
      } else {
        await supabase.from('gift_cards').insert([giftData]);
        toast.success("Gift Card Added!");
      }
      resetGiftForm();
      fetchData();
    } catch (error) { toast.error(error.message); }
    finally { setIsSubmitting(false); }
  };

  const resetGiftForm = () => {
    setEditGiftId(null); setGiftName(''); setGiftDescription('');
    setGiftOptions([{ label: '', price: '' }]); setGiftCoverPreview(null);
    setGiftCoverFile(null); setShowGiftForm(false);
  };

  const handleEditGift = (gift) => {
    setEditGiftId(gift.id); setGiftName(gift.name); setGiftDescription(gift.description);
    setGiftOptions(gift.options); setGiftCoverPreview(gift.image); setShowGiftForm(true);
  };

  const handleDeleteGift = async (id) => {
    if (!window.confirm("Delete this gift card?")) return;
    await supabase.from('gift_cards').delete().eq('id', id);
    fetchData();
  };

  // --- SLIDER MANAGEMENT ---
  const handleSaveSlider = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      for (let i = 1; i <= 5; i++) {
        const file = sliderFiles[i];
        if (file) {
          const { data: existingFiles } = await supabase.storage.from('banners').list();
          const filesToDelete = existingFiles?.filter(f => f.name.startsWith(`slider-${i}-`)).map(f => f.name) || [];
          if (filesToDelete.length > 0) await supabase.storage.from('banners').remove(filesToDelete);
          
          const fileExt = file.name.split('.').pop();
          const fileName = `slider-${i}-${Date.now()}.${fileExt}`;
          await supabase.storage.from('banners').upload(fileName, file);
        }
      }
      toast.success("Slider images updated!");
      setSliderFiles({ 1: null, 2: null, 3: null, 4: null, 5: null });
    } catch (error) { toast.error(error.message); } 
    finally { setIsSubmitting(false); }
  };

  const renderPricingBlock = (title, prefix, stateObj, isEditing) => (
    <div className="col-span-1 md:col-span-2 border-t border-gray-200 dark:border-gray-800 pt-6 mt-4">
      <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4 uppercase tracking-widest bg-gray-100 dark:bg-gray-800 py-2 px-3 rounded-lg inline-block">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50/50 dark:bg-green-900/10 p-5 rounded-2xl border border-green-100 dark:border-green-900/20">
          <h4 className="text-xs font-bold text-green-700 dark:text-green-500 mb-4 uppercase">Activated Account</h4>
          <div className="flex flex-col gap-3">
            <input type="number" placeholder="Regular Price" value={stateObj[`${prefix}price`] || ''} onChange={(e) => isEditing ? setEditingGame({...editingGame, [`${prefix}price`]: e.target.value}) : setNewGame({...newGame, [`${prefix}price`]: e.target.value})} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#121212] px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-black dark:focus:border-white" />
            <input type="number" placeholder="Discount Price (Optional)" value={stateObj[`${prefix}discount_price`] || ''} onChange={(e) => isEditing ? setEditingGame({...editingGame, [`${prefix}discount_price`]: e.target.value}) : setNewGame({...newGame, [`${prefix}discount_price`]: e.target.value})} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#121212] px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-black dark:focus:border-white" />
            <input type="number" placeholder="Stock Quantity" value={stateObj[`${prefix}stock`] || ''} onChange={(e) => isEditing ? setEditingGame({...editingGame, [`${prefix}stock`]: e.target.value}) : setNewGame({...newGame, [`${prefix}stock`]: e.target.value})} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#121212] px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-black dark:focus:border-white" />
          </div>
        </div>
        
        <div className="bg-orange-50/50 dark:bg-orange-900/10 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/20">
          <h4 className="text-xs font-bold text-orange-700 dark:text-orange-500 mb-4 uppercase">Deactivated Account (Optional)</h4>
          <div className="flex flex-col gap-3">
            <input type="number" placeholder="Regular Price" value={stateObj[`${prefix}deactivated_price`] || ''} onChange={(e) => isEditing ? setEditingGame({...editingGame, [`${prefix}deactivated_price`]: e.target.value}) : setNewGame({...newGame, [`${prefix}deactivated_price`]: e.target.value})} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#121212] px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-black dark:focus:border-white" />
            <input type="number" placeholder="Discount Price (Optional)" value={stateObj[`${prefix}deactivated_discount`] || ''} onChange={(e) => isEditing ? setEditingGame({...editingGame, [`${prefix}deactivated_discount`]: e.target.value}) : setNewGame({...newGame, [`${prefix}deactivated_discount`]: e.target.value})} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#121212] px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-black dark:focus:border-white" />
            <input type="number" placeholder="Stock Quantity" value={stateObj[`${prefix}deactivated_stock`] || ''} onChange={(e) => isEditing ? setEditingGame({...editingGame, [`${prefix}deactivated_stock`]: e.target.value}) : setNewGame({...newGame, [`${prefix}deactivated_stock`]: e.target.value})} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#121212] px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-black dark:focus:border-white" />
          </div>
        </div>
      </div>
    </div>
  );

  const getPlatformTags = (gameCollections) => {
    if(!gameCollections) return "";
    let platforms = [];
    if (gameCollections.includes("PS4 Games")) platforms.push("PS4");
    if (gameCollections.includes("PS5 Games")) platforms.push("PS5");
    if (platforms.length === 2) return "PS4 | PS5";
    return platforms.join("");
  };

  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const filteredOrders = orders.filter(order => {
    const searchLower = orderSearch.toLowerCase();
    const matchesSearch = order.order_no.toLowerCase().includes(searchLower) || (order.customer_name && order.customer_name.toLowerCase().includes(searchLower)) || order.items.some(item => item.name.toLowerCase().includes(searchLower));
    const orderDate = new Date(order.created_at);
    const matchesMonth = orderMonth ? orderDate.getMonth() + 1 === parseInt(orderMonth) : true;
    const matchesYear = orderYear ? orderDate.getFullYear() === parseInt(orderYear) : true;
    return matchesSearch && matchesMonth && matchesYear;
  });

  const filteredGames = games.filter(game => {
    const searchLower = gameSearch.toLowerCase();
    return game.name.toLowerCase().includes(searchLower) || (game.collections && game.collections.some(c => c.toLowerCase().includes(searchLower)));
  });

  // --- PAGINATION LOGIC ---
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / ITEMS_PER_PAGE));
  const currentGames = filteredGames.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setJumpPageInput(newPage.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleJumpPage = (e) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error(`Please enter a page between 1 and ${totalPages}`);
      setJumpPageInput(currentPage.toString());
    }
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]"><Loader2 className="h-10 w-10 animate-spin text-black dark:text-white" /></div>;

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans relative overflow-hidden">
      
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[150] bg-black/50 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-[200] w-64 transform bg-gray-900 flex flex-col text-white shadow-xl transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">ADMIN PANEL</h1>
            <p className="text-xs text-gray-400 mt-1">GAME OVER STORE</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X className="h-6 w-6" /></button>
        </div>
        <nav className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto">
          
          <button onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }} className={`flex w-full items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'orders' ? 'bg-black text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <div className="flex items-center gap-3"><ShoppingBag className="h-5 w-5" /> Manage Orders</div>
            {pendingOrdersCount > 0 && <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold shadow-sm ${activeTab === 'orders' ? 'bg-white text-black' : 'bg-black text-white'}`}>{pendingOrdersCount}</span>}
          </button>

          <button onClick={() => { setActiveTab('games'); setShowGameForm(false); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'games' ? 'bg-black text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <Gamepad2 className="h-5 w-5" /> Manage Games
          </button>

          <button onClick={() => { setActiveTab('discount'); setShowPromoForm(false); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'discount' ? 'bg-black text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <Tag className="h-5 w-5" /> Manage Discount (Promo)
          </button>

          <button onClick={() => { setActiveTab('giftcards'); setShowGiftForm(false); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'giftcards' ? 'bg-black text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <CreditCard className="h-5 w-5" /> Manage Gift Cards
          </button>
          
          <button onClick={() => { setActiveTab('slider'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'slider' ? 'bg-black text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <ImageIcon className="h-5 w-5" /> Hero Slider
          </button>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button onClick={onBackToStore} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-colors">
            <LogOut className="h-4 w-4" /> Exit Admin
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        <div className="md:hidden flex items-center justify-between bg-white px-4 py-3 shadow-sm border-b border-gray-100 z-40">
          <div className="flex items-center gap-3">
            <Menu onClick={() => setIsSidebarOpen(true)} className="h-6 w-6 text-gray-800 cursor-pointer" />
            <h1 className="text-lg font-black text-gray-900 tracking-tight">GAME<span className="text-gray-400">OVER</span></h1>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-10">

          {/* --- MANAGE DISCOUNT TAB --- */}
          {activeTab === 'discount' && !showPromoForm && (
            <div className="max-w-7xl animate-in fade-in duration-300">
              <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Discount Promotions</h2>
                  <p className="text-gray-500 mt-1 text-sm md:text-base">Automatically return to regular price when promo ends.</p>
                </div>
                <button onClick={() => setShowPromoForm(true)} className="w-full md:w-auto flex justify-center items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 active:scale-95 transition-all">
                  <Tag className="h-5 w-5" /> Add New Promo
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                      <th className="p-4 font-semibold">Game</th>
                      <th className="p-4 font-semibold">Promo Type</th>
                      <th className="p-4 font-semibold">Promo Price</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.length === 0 ? (
                      <tr><td colSpan="5" className="p-10 text-center text-gray-500 font-bold">No active or scheduled promos.</td></tr>
                    ) : (
                      promotions.map(promo => {
                        const now = new Date();
                        const start = new Date(promo.start_time);
                        const end = new Date(promo.end_time);
                        let status = "Scheduled";
                        let statusColor = "bg-blue-100 text-blue-700";
                        if (now >= start && now <= end) { status = "Active"; statusColor = "bg-green-100 text-green-700"; }
                        if (now > end) { status = "Ended"; statusColor = "bg-gray-100 text-gray-500"; }

                        return (
                          <tr key={promo.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-4 font-bold text-gray-900">{promo.games?.name || 'N/A'}</td>
                            <td className="p-4">
                              <span className="text-xs font-black text-gray-900 uppercase block">
                                {promo.promo_type.replace('_', ' ')}
                              </span>
                              {promo.promo_text && (
                                <span className="text-[10px] font-bold text-blue-600 mt-1 block">
                                  "{promo.promo_text}"
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-xs font-semibold text-gray-800">
                              {promo.ps5_promo_price && <span className="block text-green-600">PS5 Act: {promo.ps5_promo_price} | Deact: {promo.ps5_deact_promo_price || 'N/A'}</span>}
                              {promo.ps4_promo_price && <span className="block text-blue-600 mt-1">PS4 Act: {promo.ps4_promo_price} | Deact: {promo.ps4_deact_promo_price || 'N/A'}</span>}
                              {promo.discount_price && <span className="block text-black mt-1">Gen Act: {promo.discount_price} | Deact: {promo.deactivated_discount_price || 'N/A'}</span>}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${statusColor}`}>{status}</span>
                              <div className="text-[10px] text-gray-400 mt-1">{start.toLocaleString('en-GB')} - {end.toLocaleString('en-GB')}</div>
                            </td>
                            <td className="p-4 text-right">
                              <button onClick={() => handleDeletePromo(promo.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="h-4 w-4"/></button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- ADD PROMO FORM --- */}
          {activeTab === 'discount' && showPromoForm && (
            <div className="max-w-5xl animate-in fade-in duration-300">
              <button onClick={() => setShowPromoForm(false)} className="mb-6 text-sm font-bold text-blue-600 hover:underline">← Back to List</button>
              <form onSubmit={handleSavePromo} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-8">
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">
                  <Tag className="h-5 w-5 text-black" /> Add Discount Promotion
                </h3>
                
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">1. Choose Game(s)</label>
                    <select 
                      value="" 
                      onChange={(e)=>{
                        if(e.target.value && !promoGameIds.includes(e.target.value)) {
                          setPromoGameIds([...promoGameIds, e.target.value]);
                        }
                      }} 
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-black font-semibold text-sm cursor-pointer bg-white"
                    >
                      <option value="">-- Click to add games to this promotion --</option>
                      {games.filter(g => !giftCards.some(gc => gc.id === g.id)).map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>

                    {promoGameIds.length > 0 && (
                      <div className="flex flex-col gap-4 mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-inner">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Set Specific Discount Prices:</span>
                        {promoGameIds.map(id => {
                          const game = games.find(g => g.id === id);
                          return (
                            <div key={id} className="flex flex-col bg-white border border-gray-200 shadow-sm px-4 py-4 rounded-xl animate-in zoom-in duration-200 relative">
                              <button type="button" onClick={() => { setPromoGameIds(promoGameIds.filter(gid => gid !== id)); const newPrices = {...promoPrices}; delete newPrices[id]; setPromoPrices(newPrices); }} className="absolute top-2 right-2 p-1.5 bg-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><X className="w-4 h-4"/></button>
                              
                              <span className="text-base font-black text-gray-900 truncate mb-4 border-b border-gray-100 pb-2">{game?.name}</span>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {game?.ps5_price && (
                                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                    <span className="text-[10px] font-black uppercase text-green-700 mb-2 block">PS5 Pricing</span>
                                    <div className="flex flex-col gap-2">
                                      <input type="number" placeholder={`PS5 Act Promo (Reg: ${game.ps5_price})`} value={promoPrices[id]?.ps5_activated || ''} onChange={(e) => setPromoPrices({...promoPrices, [id]: {...promoPrices[id], ps5_activated: e.target.value}})} className="w-full rounded text-sm font-bold border-gray-300 px-3 py-2 outline-none" />
                                      {game.ps5_deactivated_price && <input type="number" placeholder={`PS5 Deact Promo (Reg: ${game.ps5_deactivated_price})`} value={promoPrices[id]?.ps5_deactivated || ''} onChange={(e) => setPromoPrices({...promoPrices, [id]: {...promoPrices[id], ps5_deactivated: e.target.value}})} className="w-full rounded text-sm font-bold border-gray-300 px-3 py-2 outline-none" />}
                                    </div>
                                  </div>
                                )}

                                {game?.ps4_price && (
                                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <span className="text-[10px] font-black uppercase text-blue-700 mb-2 block">PS4 Pricing</span>
                                    <div className="flex flex-col gap-2">
                                      <input type="number" placeholder={`PS4 Act Promo (Reg: ${game.ps4_price})`} value={promoPrices[id]?.ps4_activated || ''} onChange={(e) => setPromoPrices({...promoPrices, [id]: {...promoPrices[id], ps4_activated: e.target.value}})} className="w-full rounded text-sm font-bold border-gray-300 px-3 py-2 outline-none" />
                                      {game.ps4_deactivated_price && <input type="number" placeholder={`PS4 Deact Promo (Reg: ${game.ps4_deactivated_price})`} value={promoPrices[id]?.ps4_deactivated || ''} onChange={(e) => setPromoPrices({...promoPrices, [id]: {...promoPrices[id], ps4_deactivated: e.target.value}})} className="w-full rounded text-sm font-bold border-gray-300 px-3 py-2 outline-none" />}
                                    </div>
                                  </div>
                                )}

                                {!game?.ps5_price && !game?.ps4_price && (
                                  <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 col-span-1 md:col-span-2">
                                    <span className="text-[10px] font-black uppercase text-gray-700 mb-2 block">General Pricing</span>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                      <input type="number" required placeholder={`Act Promo (Reg: ${game?.price})`} value={promoPrices[id]?.activated || ''} onChange={(e) => setPromoPrices({...promoPrices, [id]: {...promoPrices[id], activated: e.target.value}})} className="flex-1 rounded text-sm font-bold border-gray-300 px-3 py-2 outline-none" />
                                      {game?.deactivated_price && <input type="number" placeholder={`Deact Promo (Reg: ${game?.deactivated_price})`} value={promoPrices[id]?.deactivated || ''} onChange={(e) => setPromoPrices({...promoPrices, [id]: {...promoPrices[id], deactivated: e.target.value}})} className="flex-1 rounded text-sm font-bold border-gray-300 px-3 py-2 outline-none" />}
                                    </div>
                                  </div>
                                )}
                              </div>

                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2 mt-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">2. Promotion Banner Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {value: 'only_photo', label: 'Only Photo'},
                        {value: 'photo_countdown', label: 'Photo with Countdown'},
                        {value: 'text_countdown', label: 'Text with Countdown'},
                      ].map(type => (
                        <label key={type.value} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${newPromo.promo_type === type.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                          <input type="radio" checked={newPromo.promo_type === type.value} onChange={()=>setNewPromo({...newPromo, promo_type: type.value})} className="form-radio h-5 w-5 text-gray-900 focus:ring-0 border-gray-300" />
                          <span className="text-sm font-bold">{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {newPromo.promo_type !== 'text_countdown' && (
                    <div className="md:col-span-2 p-4 border border-gray-200 rounded-xl bg-gray-50 animate-in fade-in duration-300">
                      <label className="block text-sm font-bold text-gray-700 mb-2">3. Promotion Photo (Visible on Home)</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Upload File</p>
                            <input type="file" accept="image/*" onChange={(e)=>{ if(e.target.files[0]){ setPromoImageFile(e.target.files[0]); setPromoPreview(URL.createObjectURL(e.target.files[0])); }}} className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:bg-gray-100 file:text-black hover:file:bg-gray-200 cursor-pointer bg-white" />
                         </div>
                         <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
                            <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Or Paste URL</p>
                            <input type="url" value={promoImageFile ? '' : (promoPreview || '')} onChange={(e) => { setPromoPreview(e.target.value); setPromoImageFile(null); }} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black bg-white" placeholder="https://..." />
                         </div>
                      </div>
                      {promoPreview && <img src={promoPreview} className="h-40 md:h-60 rounded-xl object-contain bg-white border border-gray-200 p-2 shadow-sm" />}
                    </div>
                  )}

                  {newPromo.promo_type === 'text_countdown' && (
                    <div className="md:col-span-2 animate-in fade-in duration-300">
                      <label className="block text-sm font-bold text-gray-700 mb-2">3. Promotion Text (Visible on Home)</label>
                      <input type="text" required value={newPromo.promo_text} onChange={(e)=>setNewPromo({...newPromo, promo_text: e.target.value})} placeholder="e.g. FLASH SALE! - PS4 GOW RAGNAROK" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black bg-white" />
                    </div>
                  )}

                  <div className="p-4 border border-dashed border-gray-300 rounded-xl bg-gray-50 shadow-sm md:col-span-2 mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Tags className="h-4 w-4 text-green-600"/> Promo Start Day & Time</label>
                        <div className="flex gap-2">
                          <input type="date" required value={startDay} onChange={(e)=>setStartDay(e.target.value)} className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black bg-white" />
                          <input type="time" required value={startTime} onChange={(e)=>setStartTime(e.target.value)} className="w-36 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black bg-white" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-red-600"/> Promo End Day & Time</label>
                        <div className="flex gap-2">
                          <input type="date" required value={endDay} onChange={(e)=>setEndDay(e.target.value)} className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black bg-white" />
                          <input type="time" required value={endTime} onChange={(e)=>setEndTime(e.target.value)} className="w-36 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black bg-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end pt-6">
                    <button type="submit" disabled={isSubmitting} className="w-full md:w-auto flex justify-center items-center gap-2 rounded-xl bg-black px-8 py-3.5 font-bold text-white hover:bg-gray-800 active:scale-95 disabled:opacity-50 transition-all shadow-lg">
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Activate Discount Promo
                    </button>
                  </div>

                </div>
              </form>
            </div>
          )}

          {/* --- ORDERS TAB --- */}
          {activeTab === 'orders' && !selectedOrder && (
            <div className="max-w-7xl animate-in fade-in duration-300">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Recent Orders</h2>
              
              <div className="flex flex-col md:flex-row flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-1 items-center rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                  <Search className="h-5 w-5 text-gray-400" />
                  <input type="text" placeholder="Search order no, customer, or game..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="ml-2 w-full bg-transparent text-sm outline-none text-gray-900" />
                </div>
                <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
                  <Filter className="h-5 w-5 text-gray-400 hidden md:block" />
                  <select value={orderMonth} onChange={(e) => setOrderMonth(e.target.value)} className="flex-1 md:flex-none rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none">
                    <option value="">All Months</option>
                    {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</option>)}
                  </select>
                  <select value={orderYear} onChange={(e) => setOrderYear(e.target.value)} className="flex-1 md:flex-none rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none">
                    <option value="">All Years</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                      <th className="p-4 font-semibold">Order No</th>
                      <th className="p-4 font-semibold">Customer</th>
                      <th className="p-4 font-semibold">Date & Time</th> 
                      <th className="p-4 font-semibold">Amount</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan="6" className="p-8 text-center text-gray-500">No orders match your filters.</td></tr>
                    ) : (
                      filteredOrders.map(order => (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4 font-black text-sm text-black">{order.order_no}</td>
                          <td className="p-4 text-sm font-semibold text-gray-800">{order.customer_name || 'N/A'}</td>
                          <td className="p-4 text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-4 text-sm font-black text-black">{order.total_price.toLocaleString()} MMK</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${order.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                              {order.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => setSelectedOrder(order)} className="px-4 py-2 bg-gray-100 text-black rounded-lg text-sm font-bold hover:bg-gray-200">Review</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ORDER REVIEW MODAL */}
          {activeTab === 'orders' && selectedOrder && (
            <div className="max-w-4xl animate-in fade-in duration-300">
              <button onClick={() => setSelectedOrder(null)} className="mb-6 text-sm font-bold text-blue-600 hover:underline">← Back to Orders</button>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-8">
                <div className="mb-6">
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-1">Order {selectedOrder.order_no}</h3>
                  <p className="text-sm font-bold text-gray-500">Customer: <span className="text-gray-900">{selectedOrder.customer_name || 'N/A'}</span></p>
                  <p className="text-sm font-bold text-gray-500">Time: <span className="text-gray-900">{new Date(selectedOrder.created_at).toLocaleString()}</span></p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-bold text-gray-700 mb-3">Purchased Items:</h4>
                    <ul className="list-disc pl-5 text-sm font-semibold text-gray-900 mb-6">
                      {selectedOrder.items.map((i, idx) => <li key={idx} className="mb-1">{i.name} {i.account_type && i.account_type !== 'Game' ? `(${i.account_type})` : ''} - {i.price} MMK (Qty: {i.quantity || 1})</li>)}
                    </ul>
                   <form onSubmit={handleUpdateOrder} className="flex flex-col gap-4">
                      
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 mb-2">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1">Customer Paid Via</span>
                        <span className="text-base font-black text-gray-900 dark:text-white">
                          {selectedOrder.delivery_info?.includes('Payment Method Used:') 
                            ? selectedOrder.delivery_info.split('Payment Method Used:')[1].trim() 
                            : 'Already Verified / See Receipt'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Payment Status</label>
                        <select name="status" defaultValue={selectedOrder.status} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none font-semibold">
                          <option value="pending">Pending (Awaiting Payment)</option>
                          <option value="paid">Paid (Money Received)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Redeem Code / Account Details to Send to User</label>
                        <textarea 
                          name="deliveryInfo" 
                          defaultValue={selectedOrder.delivery_info?.includes('Payment Method Used:') ? selectedOrder.delivery_info.split('Payment Method Used:')[0].trim() : (selectedOrder.delivery_info || '')} 
                          rows="4" 
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none placeholder-gray-400" 
                          placeholder="Type the game code or account password here..."
                        ></textarea>
                      </div>
                      <button type="submit" className="mt-2 w-full md:w-auto rounded-xl bg-black px-6 py-3 font-bold text-white hover:bg-gray-800 transition-colors active:scale-95">
                        Save & Notify User
                      </button>
                    </form>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-700 mb-3">Customer Payment Screenshot:</h4>
                    <div className="border border-gray-200 rounded-xl p-2 bg-gray-50 h-64 md:h-80 flex items-center justify-center overflow-hidden">
                      <img src={selectedOrder.screenshot_url} alt="Receipt" className="h-full w-full object-contain" />
                    </div>
                    <a href={selectedOrder.screenshot_url} target="_blank" className="block text-center mt-3 text-sm font-bold text-blue-600 hover:underline">Open Image in New Tab</a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- GAMES TAB --- */}
          {activeTab === 'games' && !showGameForm && (
            <div className="max-w-6xl animate-in fade-in duration-300">
              <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Store Catalog</h2>
                  <p className="text-gray-500 mt-1 text-sm md:text-base">Manage your games, prices, and categories.</p>
                </div>
                <button onClick={() => { resetGameForm(); setShowGameForm(true); }} className="w-full md:w-auto flex justify-center items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 active:scale-95 transition-all">
                  <PlusCircle className="h-5 w-5" /> Add New Game
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-1 items-center rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                  <Search className="h-5 w-5 text-gray-400" />
                  <input type="text" placeholder="Search games by name or category tag..." value={gameSearch} onChange={(e) => setGameSearch(e.target.value)} className="ml-2 w-full bg-transparent text-sm outline-none text-gray-900" />
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-black" /></div>
              ) : (
                <>
                  <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-x-auto hide-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
                          <th className="p-4 font-semibold">Game</th>
                          <th className="p-4 font-semibold">Platform & Price</th>
                          <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentGames.length === 0 ? (
                          <tr><td colSpan="3" className="p-8 text-center text-gray-500">No games match your search.</td></tr>
                        ) : (
                          currentGames.map(game => (
                            <tr key={game.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="p-4 flex items-center gap-3 md:gap-4">
                                <div className="h-10 w-10 md:h-12 md:w-12 rounded object-cover overflow-hidden bg-gray-100 border border-gray-100 relative group flex-shrink-0">
                                  <img src={game.cover_image} alt={game.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                                  {getPlatformTags(game.collections) && (
                                    <div className="absolute top-0.5 left-0.5 bg-gray-800/80 text-white text-[8px] font-bold px-1 py-[1px] rounded shadow hidden md:block">{getPlatformTags(game.collections)}</div>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm md:text-base text-gray-900 truncate max-w-[200px] md:max-w-xs">{game.name}</span>
                                  <div className="text-[10px] text-gray-400 mt-0.5 hidden md:block">
                                    {game.collections?.filter(t => t !== "PS5 Games" && t !== "PS4 Games").join(', ')}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col gap-1 text-[11px] md:text-xs font-semibold text-gray-800">
                                  {Boolean(game.ps5_price) && <span><span className="font-black text-black">PS5 Act:</span> {game.ps5_discount_price || game.ps5_price} | <span className="font-black text-gray-600">Deact:</span> {game.ps5_deactivated_discount || game.ps5_deactivated_price || 'N/A'}</span>}
                                  {Boolean(game.ps4_price) && <span><span className="font-black text-black">PS4 Act:</span> {game.ps4_discount_price || game.ps4_price} | <span className="font-black text-gray-600">Deact:</span> {game.ps4_deactivated_discount || game.ps4_deactivated_price || 'N/A'}</span>}
                                  {!game.ps5_price && !game.ps4_price && Boolean(game.price) && <span><span className="font-black text-black">Gen Act:</span> {game.discount_price || game.price} | <span className="font-black text-gray-600">Deact:</span> {game.deactivated_discount || game.deactivated_price || 'N/A'}</span>}
                                </div>
                              </td>
                              <td className="p-4 flex justify-end gap-2">
                                <button onClick={() => handleEditGameClick(game)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"><Edit className="h-4 w-4" /></button>
                                <button onClick={() => handleDeleteGame(game.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"><Trash2 className="h-4 w-4" /></button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#121212] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handlePageChange(currentPage - 1)} 
                          disabled={currentPage === 1}
                          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button 
                          onClick={() => handlePageChange(currentPage + 1)} 
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                      <form onSubmit={handleJumpPage} className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Go to:</span>
                        <input 
                          type="number" 
                          min="1" 
                          max={totalPages}
                          value={jumpPageInput}
                          onChange={(e) => setJumpPageInput(e.target.value)}
                          className="w-16 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-center text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-black dark:focus:border-white"
                        />
                        <button type="submit" className="px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black font-bold text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors active:scale-95">
                          Go
                        </button>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* --- ADD/EDIT GAME FORM --- */}
          {activeTab === 'games' && showGameForm && (
            <div className="max-w-4xl animate-in fade-in duration-300">
              <button onClick={resetGameForm} className="mb-6 text-sm font-bold text-blue-600 hover:underline">← Back to Catalog</button>
              <form onSubmit={(e) => handleSaveGame(e, !!editingGame)} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-8">
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">
                  <PlusCircle className="h-5 w-5 text-black" /> {editingGame ? 'Edit Game' : 'Add New Game'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* COVER IMAGE */}
                  <div className="col-span-1 md:col-span-2 flex flex-col gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Game Cover Image</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Option 1: Upload File</p>
                        <input type="file" accept="image/*" onChange={(e) => { if(e.target.files[0]) { setCoverImageFile(e.target.files[0]); setCoverPreview(URL.createObjectURL(e.target.files[0])); setCoverUrlInput(''); } }} className="w-full text-xs md:text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-gray-100 file:text-black hover:file:bg-gray-200 cursor-pointer" />
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
                        <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Option 2: Paste Image URL</p>
                        <input type="url" value={coverUrlInput} onChange={(e) => { setCoverUrlInput(e.target.value); setCoverPreview(e.target.value); setCoverImageFile(null); }} placeholder="https://example.com/image.jpg" className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none focus:border-black transition-colors" />
                      </div>
                    </div>
                    {coverPreview && (
                      <div className="w-full h-64 md:h-80 rounded-xl overflow-hidden bg-white border-2 border-dashed border-gray-200 p-2 relative mt-2 flex items-center justify-center">
                        <img src={coverPreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                        {(isPS5 || isPS4) && (
                          <div className="absolute top-4 left-4 bg-gray-800/90 text-white text-sm md:text-xl font-extrabold px-4 py-2 rounded-xl shadow-xl border border-gray-700">
                            {isPS4 && <span>PS4</span>}
                            {isPS5 && isPS4 && <span className="px-2 text-gray-500">|</span>}
                            {isPS5 && <span>PS5</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* GAME SCREENSHOTS */}
                  <div className="col-span-1 md:col-span-2 flex flex-col gap-4 p-5 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 mt-4">
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-4 mb-2">
                      <h4 className="text-base font-bold text-gray-900 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-black" /> Game Screenshots <span className="text-xs text-gray-500 font-medium">(Max 6 photos, optional)</span></h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {screenshotInputs.map((input, index) => (
                        <div key={index} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative animate-in fade-in duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold">{index + 1}</span>
                            {input.preview && <button type="button" onClick={() => clearScreenshotSlot(index)} className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600"><X className="w-4 h-4" /></button>}
                          </div>
                          {input.preview ? (
                            <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-50 border border-gray-100 mb-4 flex items-center justify-center p-2 relative group">
                              <img src={input.preview} alt={`Screenshot ${index + 1}`} className="max-h-full max-w-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 mb-4 flex flex-col items-center justify-center gap-2 text-gray-400">
                                <UploadCloud className="w-8 h-8 opacity-60" />
                                <span className="text-xs font-bold">Slot {index+1} Empty</span>
                            </div>
                          )}
                          <div className="space-y-3">
                            <input type="file" accept="image/*" onChange={(e) => handleScreenshotFileChange(index, e.target.files[0])} className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-black hover:file:bg-gray-200 cursor-pointer" />
                            <input type="url" value={input.url} onChange={(e) => handleScreenshotUrlChange(index, e.target.value)} placeholder={`Or paste image URL...`} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none focus:border-black transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 mt-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Game Name</label>
                    <input type="text" required value={editingGame ? editingGame.name : newGame.name} onChange={(e) => editingGame ? setEditingGame({...editingGame, name: e.target.value}) : setNewGame({...newGame, name: e.target.value})} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-black transition-colors" placeholder="e.g. Spiderman 2" />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Release Date <span className="text-gray-400">(Optional)</span></label>
                    <input type="date" value={editingGame ? editingGame.release_date : newGame.release_date} onChange={(e) => editingGame ? setEditingGame({...editingGame, release_date: e.target.value}) : setNewGame({...newGame, release_date: e.target.value})} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-black transition-colors bg-white" />
                  </div>
                  
                  {/* PLATFORM SELECTION */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Tags className="h-4 w-4" /> Platform Selection</label>
                    <div className="flex flex-col md:flex-row gap-3 md:gap-4 p-4 rounded-xl border border-gray-200 bg-white">
                      <label className="flex flex-1 items-center gap-3 p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer border border-gray-200">
                        <input type="checkbox" checked={isPS5} onChange={(e) => handlePlatformToggle('PS5 Games', e.target.checked)} className="form-checkbox h-5 w-5 text-black rounded-md border-gray-300 focus:ring-0" />
                        <span className="text-sm font-bold text-gray-800">PlayStation 5 (PS5 Tag)</span>
                      </label>
                      <label className="flex flex-1 items-center gap-3 p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer border border-gray-200">
                        <input type="checkbox" checked={isPS4} onChange={(e) => handlePlatformToggle('PS4 Games', e.target.checked)} className="form-checkbox h-5 w-5 text-black rounded-md border-gray-300 focus:ring-0" />
                        <span className="text-sm font-bold text-gray-800">PlayStation 4 (PS4 Tag)</span>
                      </label>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Collections (Separate with commas)</label>
                    <input type="text" value={editingGame ? editingGame.collections : newGame.collections} onChange={(e) => editingGame ? setEditingGame({...editingGame, collections: e.target.value}) : setNewGame({...newGame, collections: e.target.value})} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-black transition-colors" placeholder="e.g. Action, Classic" />
                    {uniqueCollections.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 w-full md:w-auto">Quick add:</span>
                        {uniqueCollections.map(tag => (
                          <button type="button" key={tag} onClick={() => handleQuickAddCollection(tag)} className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 transition-colors active:scale-95 shadow-sm">
                            + {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* DYNAMIC PRICING BLOCKS */}
                  {isPS5 && renderPricingBlock("PS5 Pricing & Stock", "ps5_", editingGame || newGame, !!editingGame)}
                  {isPS4 && renderPricingBlock("PS4 Pricing & Stock", "ps4_", editingGame || newGame, !!editingGame)}
                  {(!isPS5 && !isPS4) && renderPricingBlock("General Pricing & Stock", "", editingGame || newGame, !!editingGame)}

                  <div className="col-span-1 md:col-span-2 mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Game Size (GB)</label>
                      <input type="text" value={editingGame ? editingGame.size : newGame.size} onChange={(e) => editingGame ? setEditingGame({...editingGame, size: e.target.value}) : setNewGame({...newGame, size: e.target.value})} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-black transition-colors" placeholder="e.g. 80GB" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">YouTube Trailer URL</label>
                      <input type="url" value={editingGame ? editingGame.youtube_link : newGame.youtube_link} onChange={(e) => editingGame ? setEditingGame({...editingGame, youtube_link: e.target.value}) : setNewGame({...newGame, youtube_link: e.target.value})} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-black transition-colors" placeholder="https://youtube.com/..." />
                    </div>
                  </div>
                  
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-3">
                      <label className="block text-sm font-bold text-gray-700">Description</label>
                      <div className="flex items-center gap-2">
                        <select value={descLanguage} onChange={(e) => setDescLanguage(e.target.value)} className="text-xs font-bold text-gray-900 rounded-lg border border-gray-300 px-3 py-2 outline-none bg-white focus:border-black cursor-pointer">
                          <option value="en">English</option>
                          <option value="mm">Myanmar</option>
                        </select>
                        <button type="button" onClick={handleGenerateDescription} disabled={isGeneratingDesc || (editingGame ? !editingGame.name : !newGame.name)} className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-sm">
                          {isGeneratingDesc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                          {isGeneratingDesc ? 'Generating...' : 'AI Write'}
                        </button>
                      </div>
                    </div>
                    <textarea required value={editingGame ? editingGame.description : newGame.description} onChange={(e) => editingGame ? setEditingGame({...editingGame, description: e.target.value}) : setNewGame({...newGame, description: e.target.value})} rows="4" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-black transition-colors bg-white" placeholder="Game description..." />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 flex justify-end mt-4">
                    <button type="submit" disabled={isSubmitting} className="w-full md:w-auto flex justify-center items-center gap-2 rounded-xl bg-black px-8 py-3.5 font-bold text-white hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50">
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Save Game
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* --- GIFT CARDS TAB --- */}
          {activeTab === 'giftcards' && !showGiftForm && (
            <div className="max-w-6xl animate-in fade-in duration-300">
              <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Gift Cards</h2>
                <button onClick={() => setShowGiftForm(true)} className="w-full md:w-auto flex justify-center items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800">
                  <PlusCircle className="h-5 w-5" /> Add Gift Card
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                      <th className="p-4 font-semibold">Card Name</th>
                      <th className="p-4 font-semibold">Denomination Options</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giftCards.map(gift => (
                      <tr key={gift.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 flex items-center gap-3">
                          <img src={gift.image} className="h-10 w-10 md:h-12 md:w-12 rounded object-cover border flex-shrink-0" alt="" />
                          <span className="font-bold text-sm md:text-base text-gray-900 truncate max-w-[150px] md:max-w-[200px]">{gift.name}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {gift.options.map((opt, idx) => (
                              <span key={idx} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-[10px] md:text-xs font-bold border border-gray-200">{opt.label}: {Number(opt.price).toLocaleString()}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 flex justify-end gap-2">
                          <button onClick={() => handleEditGift(gift)} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Edit className="h-4 w-4"/></button>
                          <button onClick={() => handleDeleteGift(gift.id)} className="p-2 text-red-600 bg-red-50 rounded-lg"><Trash2 className="h-4 w-4"/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'giftcards' && showGiftForm && (
            <div className="max-w-3xl animate-in fade-in duration-300">
              <button onClick={resetGiftForm} className="mb-6 text-sm font-bold text-blue-600 hover:underline">← Back to List</button>
              <form onSubmit={handleSaveGift} className="bg-white rounded-2xl p-4 md:p-8 border border-gray-200 shadow-sm">
                <h3 className="text-xl font-bold mb-6 text-black">{editGiftId ? 'Edit' : 'Add'} Gift Card</h3>
                
                <div className="grid gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Image</label>
                    <input type="file" accept="image/*" onChange={(e) => { if(e.target.files[0]) { setGiftCoverFile(e.target.files[0]); setGiftCoverPreview(URL.createObjectURL(e.target.files[0])); } }} className="w-full text-xs md:text-sm text-gray-500 mb-4" />
                    {giftCoverPreview && <img src={giftCoverPreview} className="h-32 md:h-40 rounded-xl object-contain bg-gray-50 p-2 border-2 border-dashed" alt="" />}
                  </div>

                  <input type="text" placeholder="Card Name (e.g. Razer Gold Global)" required value={giftName} onChange={(e)=>setGiftName(e.target.value)} className="w-full p-3 md:p-4 rounded-xl border border-gray-300 outline-none focus:border-black font-bold text-gray-900 text-sm md:text-base" />
                  
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-bold text-gray-700">Denominations & Pricing</label>
                      <button type="button" onClick={handleAddOption} className="text-xs font-bold text-blue-600 flex items-center gap-1"><Plus className="h-3 w-3"/> Add Option</button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {giftOptions.map((opt, idx) => (
                        <div key={idx} className="flex gap-2 md:gap-3 items-center">
                          <input type="text" placeholder="Label ($10)" value={opt.label} onChange={(e)=>handleOptionChange(idx, 'label', e.target.value)} className="flex-1 p-2 md:p-3 rounded-xl border border-gray-300 text-xs md:text-sm font-bold text-gray-900 w-1/3" />
                          <input type="number" placeholder="Price (35000)" value={opt.price} onChange={(e)=>handleOptionChange(idx, 'price', e.target.value)} className="flex-1 p-2 md:p-3 rounded-xl border border-gray-300 text-xs md:text-sm font-bold text-gray-900 w-1/3" />
                          <button type="button" onClick={()=>handleRemoveOption(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><X className="h-4 w-4 md:h-5 md:w-5"/></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <textarea placeholder="Description" rows="3" value={giftDescription} onChange={(e)=>setGiftDescription(e.target.value)} className="w-full p-3 md:p-4 rounded-xl border border-gray-300 outline-none focus:border-black font-medium text-gray-900 text-sm md:text-base" />
                  
                  <button type="submit" disabled={isSubmitting} className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Save className="h-5 w-5"/>} Save Gift Card
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* --- SLIDER TAB --- */}
          {activeTab === 'slider' && (
            <div className="max-w-4xl animate-in fade-in duration-300">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">Hero Slider Settings</h2>
              <form onSubmit={handleSaveSlider} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-8">
                 <div className="grid grid-cols-1 gap-4 md:gap-6">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <div key={num} className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 p-4 border rounded-xl border-gray-100 bg-gray-50">
                      <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-500 flex-shrink-0">{num}</div>
                      <div className="flex-1 w-full">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Slider Image {num}</label>
                        <input type="file" accept="image/*" onChange={(e) => setSliderFiles(prev => ({...prev, [num]: e.target.files[0]}))} className="w-full text-xs md:text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 md:file:px-4 file:rounded-full file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-gray-100 file:text-black hover:file:bg-gray-200 cursor-pointer" />
                      </div>
                    </div>
                  ))}
                 </div>
                 <div className="mt-6 md:mt-8 flex justify-end">
                  <button type="submit" disabled={isSubmitting} className="w-full md:w-auto flex justify-center items-center gap-2 rounded-xl bg-black px-8 py-3.5 font-bold text-white hover:bg-gray-800 disabled:opacity-50 transition-all">
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Update Slider
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;