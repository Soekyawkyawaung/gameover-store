"use client";

import React, { useState } from 'react';
import { Camera, Mail, Lock, ShieldCheck, KeyRound, User } from 'lucide-react';
import { supabase } from '../lib/supabase'; 
import toast from 'react-hot-toast';

const Auth = ({ onClose }) => {
  const [step, setStep] = useState('login'); // login, signup, verify, forgot, reset
  const [profilePic, setProfilePic] = useState(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [code, setCode] = useState(''); 
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePic(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Login Successful! Welcome back.");
      onClose();
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password !== verifyPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { full_name: name }
      }
    });
    setLoading(false);

    if (error) {
      toast.error(error.message); 
    } else {
      toast.success("8-digit code sent!");
      setStep('verify'); 
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
    setLoading(false);

    if (error) {
      toast.error("Invalid code. Please try again.");
    } else {
      toast.success("Verification Successful!");
      onClose(); 
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);

    if (error) toast.error(error.message);
    else {
      toast.success("Recovery code sent!");
      setStep('reset');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== verifyPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    setLoading(true);
    const { error: otpError } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
    if (otpError) {
      toast.error("Invalid or expired code.");
      setLoading(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) toast.error(updateError.message);
    else {
      toast.success("Password updated!");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white p-4">
      <button onClick={onClose} className="absolute left-4 top-4 text-sm font-bold text-gray-500 hover:text-black">
        ✕ Close
      </button>

      <div className="w-full max-w-sm rounded-xl border border-gray-100 p-6 shadow-lg">
        <div className="mb-6 flex justify-center">
          <img src="/logo.jpg" alt="Logo" className="h-16 w-auto" />
        </div>

        {step === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <h2 className="text-center text-xl font-bold text-gray-800">Log In</h2>
            <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900">
              <Mail className="h-5 w-5 text-gray-500" />
              <input type="email" required placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="ml-2 w-full bg-transparent text-sm font-medium placeholder-gray-500 outline-none" />
            </div>
            <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900">
              <Lock className="h-5 w-5 text-gray-500" />
              <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="ml-2 w-full bg-transparent text-sm font-medium placeholder-gray-500 outline-none" />
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => setStep('forgot')} className="text-xs font-semibold text-blue-600 hover:underline">Forgot Password?</button>
            </div>
            <button type="submit" disabled={loading} className="mt-2 w-full rounded-lg bg-[#000000] py-2.5 font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50">{loading ? 'Logging in...' : 'Log In'}</button>
            <div className="mt-2 text-center text-sm text-gray-600">
              New user? <button type="button" onClick={() => setStep('signup')} className="font-bold text-[#000000] hover:underline">Sign up</button>
            </div>
          </form>
        )}

        {step === 'signup' && (
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <h2 className="text-center text-xl font-bold text-gray-800">Create Account</h2>
            <div className="flex justify-center">
              <label className="relative flex h-20 w-20 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100">
                {profilePic ? <img src={profilePic} alt="Profile" className="h-full w-full object-cover" /> : <Camera className="h-8 w-8 text-gray-400" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900">
              <User className="h-5 w-5 text-gray-500" />
              <input type="text" required placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="ml-2 w-full bg-transparent text-sm font-medium placeholder-gray-500 outline-none" />
            </div>
            <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900">
              <Mail className="h-5 w-5 text-gray-500" />
              <input type="email" required placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="ml-2 w-full bg-transparent text-sm font-medium placeholder-gray-500 outline-none" />
            </div>
            <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900">
              <Lock className="h-5 w-5 text-gray-500" />
              <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="ml-2 w-full bg-transparent text-sm font-medium placeholder-gray-500 outline-none" />
            </div>
            <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900">
              <Lock className="h-5 w-5 text-gray-500" />
              <input type="password" required placeholder="Re-enter Password" value={verifyPassword} onChange={(e) => setVerifyPassword(e.target.value)} className="ml-2 w-full bg-transparent text-sm font-medium placeholder-gray-500 outline-none" />
            </div>
            <button type="submit" disabled={loading} className="mt-2 w-full rounded-lg bg-[#000000] py-2.5 font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50">{loading ? 'Sending Code...' : 'Sign Up'}</button>
            <div className="mt-2 text-center text-sm text-gray-600">
              Already have an account? <button type="button" onClick={() => setStep('login')} className="font-bold text-[#000000] hover:underline">Log in</button>
            </div>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerify} className="flex flex-col gap-4 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-[#000000]" />
            <h2 className="text-xl font-bold text-gray-800">Verify Email</h2>
            <p className="text-sm text-gray-600">Enter 8-digit code for <br/><span className="font-bold text-black">{email}</span></p>
            <input type="text" required maxLength="8" value={code} onChange={(e) => setCode(e.target.value)} placeholder="00000000" className="mx-auto mt-4 w-56 rounded-lg border-2 border-gray-300 bg-white py-3 text-center text-2xl font-bold tracking-[0.2em] outline-none text-gray-900 focus:border-[#000000]" />
            <button type="submit" disabled={loading} className="mt-4 w-full rounded-lg bg-[#000000] py-2.5 font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50">{loading ? 'Verifying...' : 'Verify & Login'}</button>
          </form>
        )}

        {step === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
            <KeyRound className="mx-auto h-10 w-10 text-gray-800" />
            <h2 className="text-center text-xl font-bold text-gray-800">Reset Password</h2>
            <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900">
              <Mail className="h-5 w-5 text-gray-500" />
              <input type="email" required placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="ml-2 w-full bg-transparent text-sm font-medium placeholder-gray-500 outline-none" />
            </div>
            <button type="submit" disabled={loading} className="mt-2 w-full rounded-lg bg-black py-2.5 font-bold text-white shadow-md hover:bg-gray-800 disabled:opacity-50">{loading ? 'Sending...' : 'Send Recovery Code'}</button>
            <button type="button" onClick={() => setStep('login')} className="mt-2 text-sm font-semibold text-gray-500 hover:underline">← Back to Log In</button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4 text-gray-900">
            <h2 className="text-center text-xl font-bold text-gray-800">Create New Password</h2>
            <input type="text" required maxLength="8" value={code} onChange={(e) => setCode(e.target.value)} placeholder="8-digit code" className="mx-auto w-56 rounded-lg border-2 border-gray-300 py-2 text-center text-xl font-bold tracking-[0.2em] outline-none" />
            <input type="password" required placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg border p-2 text-sm outline-none" />
            <input type="password" required placeholder="Confirm New Password" value={verifyPassword} onChange={(e) => setVerifyPassword(e.target.value)} className="rounded-lg border p-2 text-sm outline-none" />
            <button type="submit" disabled={loading} className="mt-2 w-full rounded-lg bg-[#000000] py-2.5 font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50">{loading ? 'Updating...' : 'Update Password'}</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Auth;