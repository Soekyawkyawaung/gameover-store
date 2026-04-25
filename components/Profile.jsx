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
      
      // Update metadata
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
      // This forces the local session to refresh so the Header sees the change
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
    <div className="flex h-[60vh] w-full flex-col items-center justify-center bg-white">
      <Loader2 className="h-10 w-10 animate-spin text-red-600" />
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-white px-4 py-6">
      <button onClick={onBack} className="mb-6 self-start text-sm font-bold text-blue-600">← Back to Store</button>

      <div className="mb-6 w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-xl font-bold text-gray-900">My Profile</h2>
        <p className="mb-6 text-xs font-semibold text-gray-400">{user?.email}</p>
        
        <div className="mb-6 flex justify-center">
          <label className="relative flex h-28 w-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-10 w-10 text-gray-400" />
            )}
            {isUpdating && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUpdating} />
          </label>
        </div>

        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
          <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <UserIcon className="h-5 w-5 text-gray-500" />
            {/* Added text-gray-900 to ensure the name is visible */}
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              placeholder="Full Name" 
              className="ml-3 w-full bg-transparent text-sm font-bold text-gray-900 placeholder-gray-500 outline-none" 
            />
          </div>
          <button type="submit" disabled={isUpdating} className="w-full rounded-xl bg-black py-3.5 font-bold text-white active:scale-95 disabled:opacity-50">
            {isUpdating ? 'Saving...' : 'Save Details'}
          </button>
        </form>
      </div>

      <div className="w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-gray-900">Security</h2>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required placeholder="Current Password" 
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 placeholder-gray-500 outline-none" />
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="New Password" 
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 placeholder-gray-500 outline-none" />
          <button type="submit" disabled={isUpdating} className="w-full rounded-xl bg-[#000000] py-3.5 font-bold text-white active:scale-95">
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;