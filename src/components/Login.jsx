// src/components/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
// Import icon dari Lucide untuk mempercantik UI
import { Sprout, Mail, Lock, LogIn, Cloud } from 'lucide-react';

export default function Login({ onToggleForm }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
    } catch (err) {
      setError('Gagal login: Periksa kembali email dan password Anda.');
    }
    setLoading(false);
  }

  return (
    // Membungkus dengan layout utama yang sama persis seperti App.jsx
    <div className="min-h-screen font-sans flex justify-center text-white sm:py-6 selection:bg-green-300">
      <div className="w-full bg-linear-to-b from-[#6EB5FF] via-[#85C4FF] to-[#A3D180] relative overflow-hidden sm:rounded-[3rem] sm:border-[8px] sm:border-black/10 sm:shadow-2xl flex flex-col justify-center h-[100dvh] sm:h-[850px] p-8 animate-fadeIn">
        
        {/* Dekorasi Awan di Background */}
        <Cloud size={120} className="absolute top-20 -left-10 text-white/20 pointer-events-none" fill="currentColor" strokeWidth={0} />
        <Cloud size={160} className="absolute top-48 -right-12 text-white/20 pointer-events-none" fill="currentColor" strokeWidth={0} />

        {/* Header Logo */}
        <div className="relative z-10 flex flex-col items-center mb-8 drop-shadow-md">
          <div className="bg-white/30 w-24 h-24 rounded-full flex items-center justify-center mb-4 border-4 border-white/50 shadow-lg backdrop-blur-md">
            <Sprout size={50} className="text-white" />
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white">Smart Vase</h2>
          <p className="text-white/80 font-bold text-sm tracking-widest uppercase mt-1">Virtual Plant Anda</p>
        </div>

        {/* Form Container (Glassmorphism) */}
        <div className="bg-white/20 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.1)] border border-white/40 relative z-10">
          <h3 className="text-xl font-black text-white mb-6 text-center drop-shadow-sm">Selamat Datang!</h3>
          
          {error && (
            <div className="bg-red-400/80 backdrop-blur-md text-white text-sm font-bold p-4 rounded-2xl mb-6 flex items-center gap-2 border border-red-200/50 shadow-inner">
              <span className="bg-white text-red-500 rounded-full w-5 h-5 flex items-center justify-center shrink-0">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Email */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none">
                <Mail size={20} />
              </div>
              <input
                type="email"
                placeholder="Email Anda"
                className="w-full bg-black/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/60 font-medium outline-none focus:ring-4 focus:ring-white/30 focus:bg-black/20 transition-all shadow-inner"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Input Password */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none">
                <Lock size={20} />
              </div>
              <input
                type="password"
                placeholder="Password"
                className="w-full bg-black/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/60 font-medium outline-none focus:ring-4 focus:ring-white/30 focus:bg-black/20 transition-all shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Tombol Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-white text-[#81B95B] font-black py-4 rounded-full shadow-[0_6px_0_rgba(0,0,0,0.1)] hover:bg-green-50 active:translate-y-1.5 active:shadow-none transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="animate-pulse">Memuat...</span>
              ) : (
                <>
                  <LogIn size={20} strokeWidth={3} /> MASUK
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <div className="relative z-10 mt-8 text-center font-medium">
          <p className="text-white/80">
            Belum punya pot?{' '}
            <button 
              onClick={onToggleForm} 
              className="text-white font-black hover:underline underline-offset-4 decoration-2"
            >
              Daftar di sini
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}