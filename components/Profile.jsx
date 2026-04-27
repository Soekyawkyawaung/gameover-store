"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Profile = ({ onBack }) => {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true); 
  const [isUpdating, setIsUpdating] = useState(false); 
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setName(user.user_metadata?.full_name || '');
        setAvatarUrl(user.user_metadata?.avatar_url || null);
      } else {
        onBack();
      }
      setLoading(false);
    };
    getUserData();
  }, [onBack]);

  const handleFileUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      setIsUpdating(true);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      toast.success("Photo updated!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name }
    });

    setIsUpdating(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Details saved!");
      await supabase.auth.refreshSession();
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });
    if (signInError) {
      toast.error("Current password incorrect!");
      setIsUpdating(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdating(false);
    if (updateError) toast.error(updateError.message);
    else {
      toast.success("Password updated!");
      setOldPassword('');
      setNewPassword('');
    }
  };

  if (loading) return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center bg-white dark:bg-[#121212]">
      <Loader2 className="h-10 w-10 animate-spin text-red-600 dark:text-red-500" />
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-white dark:bg-[#121212] px-4 py-6 transition-colors duration-300">
      <button onClick={onBack} className="mb-6 self-start text-sm font-bold text-blue-600 dark:text-blue-400">← Back to Store</button>

      <div className="mb-6 w-full rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212] p-6 shadow-sm">
        <h2 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">My Profile</h2>
        <p className="mb-6 text-xs font-semibold text-gray-400 dark:text-gray-500">{user?.email}</p>
        
        <div className="mb-6 flex justify-center">
          <label className="relative flex h-28 w-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0a0a0a] hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            )}
            {isUpdating && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 dark:bg-black/50">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUpdating} />
          </label>
        </div>

        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
          <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0a] px-4 py-3">
            <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              placeholder="Full Name" 
              className="ml-3 w-full bg-transparent text-sm font-bold text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none" 
            />
          </div>
          <button type="submit" disabled={isUpdating} className="w-full rounded-xl bg-black dark:bg-white py-3.5 font-bold text-white dark:text-black active:scale-95 disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
            {isUpdating ? 'Saving...' : 'Save Details'}
          </button>
        </form>
      </div>

      <div className="w-full rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212] p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">Security</h2>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required placeholder="Current Password" 
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0a] px-4 py-3 text-sm font-bold text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none focus:border-black dark:focus:border-white transition-colors" />
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="New Password" 
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0a] px-4 py-3 text-sm font-bold text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none focus:border-black dark:focus:border-white transition-colors" />
          <button type="submit" disabled={isUpdating} className="w-full rounded-xl bg-[#000000] dark:bg-white py-3.5 font-bold text-white dark:text-black active:scale-95 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;