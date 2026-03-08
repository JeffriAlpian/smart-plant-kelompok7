// src/components/Signup.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
// Import ikon Lucide yang disesuaikan untuk form pendaftaran
import { Sprout, Mail, Lock, UserPlus, Cloud, ShieldCheck } from 'lucide-react';

export default function Signup({ onToggleForm }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('Oops! Password tidak cocok.');
    }
    try {
      setError('');
      setLoading(true);
      await signup(email, password);
    } catch (err) {
      setError('Gagal daftar: ' + err.message);
    }
    setLoading(false);
  }

  return (
    // Layout utama yang sama persis dengan Login dan App
    <div className="min-h-screen font-sans flex justify-center text-white sm:py-6 selection:bg-green-300">
      <div className="w-full bg-gradient-to-b from-[#6EB5FF] via-[#85C4FF] to-[#A3D180] relative overflow-hidden sm:rounded-[3rem] sm:border-[8px] sm:border-black/10 sm:shadow-2xl flex flex-col justify-center h-[100dvh] sm:h-[850px] p-8 animate-fadeIn">
        
        {/* Dekorasi Awan di Background */}
        <Cloud size={100} className="absolute top-16 -left-12 text-white/20 pointer-events-none" fill="currentColor" strokeWidth={0} />
        <Cloud size={140} className="absolute top-32 -right-10 text-white/20 pointer-events-none" fill="currentColor" strokeWidth={0} />

        {/* Header Logo */}
        <div className="relative z-10 flex flex-col items-center mb-6 drop-shadow-md">
          <div className="bg-white/30 w-20 h-20 rounded-full flex items-center justify-center mb-3 border-4 border-white/50 shadow-lg backdrop-blur-md">
            <Sprout size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter text-white">Buat Akun</h2>
          <p className="text-white/80 font-bold text-xs tracking-widest uppercase mt-1">Mulai Petualanganmu</p>
        </div>

        {/* Form Container (Glassmorphism) */}
        <div className="bg-white/20 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.1)] border border-white/40 relative z-10">
          
          {error && (
            <div className="bg-red-400/80 backdrop-blur-md text-white text-xs font-bold p-3 rounded-2xl mb-4 flex items-center gap-2 border border-red-200/50 shadow-inner">
              <span className="bg-white text-red-500 rounded-full w-5 h-5 flex items-center justify-center shrink-0">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Email */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none">
                <Mail size={18} />
              </div>
              <input
                type="email"
                placeholder="Email Baru"
                className="w-full bg-black/10 border border-white/20 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-white/60 font-medium outline-none focus:ring-4 focus:ring-white/30 focus:bg-black/20 transition-all shadow-inner"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Input Password */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none">
                <Lock size={18} />
              </div>
              <input
                type="password"
                placeholder="Buat Password"
                className="w-full bg-black/10 border border-white/20 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-white/60 font-medium outline-none focus:ring-4 focus:ring-white/30 focus:bg-black/20 transition-all shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="6"
              />
            </div>

            {/* Input Konfirmasi Password */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none">
                <ShieldCheck size={18} />
              </div>
              <input
                type="password"
                placeholder="Ulangi Password"
                className="w-full bg-black/10 border border-white/20 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-white/60 font-medium outline-none focus:ring-4 focus:ring-white/30 focus:bg-black/20 transition-all shadow-inner"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Tombol Daftar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-white text-[#81B95B] font-black py-4 rounded-full shadow-[0_6px_0_rgba(0,0,0,0.1)] hover:bg-green-50 active:translate-y-1.5 active:shadow-none transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="animate-pulse">Menyiapkan...</span>
              ) : (
                <>
                  <UserPlus size={20} strokeWidth={3} /> DAFTAR SEKARANG
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <div className="relative z-10 mt-6 text-center font-medium text-sm">
          <p className="text-white/80">
            Sudah punya akun?{' '}
            <button 
              onClick={onToggleForm} 
              className="text-white font-black hover:underline underline-offset-4 decoration-2"
            >
              Masuk di sini
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}