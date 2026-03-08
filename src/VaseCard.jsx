import React, { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
// IMPORT LUCIDE ICONS
import { Droplet, Bot, Sparkles, Frown, Smile } from 'lucide-react';

// --- KOMPONEN 1: Animasi Hujan Murni CSS ---
// (Bagian RainAnimation dan CuteSucculent tetap sama, tidak perlu diubah, biarkan seperti kode sebelumnya)
const RainAnimation = () => (
  <div className="absolute inset-0 -top-12.5 overflow-hidden pointer-events-none z-30 flex justify-center w-full h-75">
    <style>{`
      @keyframes rainDrop {
        0% { transform: translateY(0px) scaleY(1); opacity: 0; }
        10% { opacity: 1; }
        80% { transform: translateY(180px) scaleY(1.5); opacity: 1; }
        100% { transform: translateY(200px) scaleY(0.5); opacity: 0; }
      }
      .drop {
        position: absolute; width: 3px; height: 15px;
        background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(150, 200, 255, 0.9));
        border-radius: 50%; animation: rainDrop 0.7s linear infinite;
      }
    `}</style>
    {[...Array(12)].map((_, i) => (
      <div key={i} className="drop" style={{ left: `${15 + Math.random() * 70}%`, animationDelay: `${Math.random() * 0.8}s`, animationDuration: `${0.5 + Math.random() * 0.3}s` }} />
    ))}
  </div>
);

// const CuteSucculent = ({ isWatering }) => (
  // import React from 'react';

const CuteSucculent = ({ moisture }) => {
  // Tentukan apakah tanaman sedang kehausan (misal: kelembaban di bawah 30%)
  const isThirsty = moisture < 30;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      
      {/* CSS Animasi Khusus untuk Tanaman Ini */}
      <style>
        {`
          /* Animasi Bergoyang Bahagia (Happy) */
          @keyframes swayHappy {
            0%, 100% { transform: rotate(-4deg) scale(1); }
            50% { transform: rotate(4deg) scale(1.03); }
          }
          
          /* Animasi Layu / Kehausan (Sad) */
          @keyframes swaySad {
            0%, 100% { transform: rotate(15deg) scale(0.9); }
            50% { transform: rotate(18deg) scale(0.88); }
          }

          /* Terapkan animasi dengan titik tumpu (poros) di bagian bawah pot */
          .animate-plant-happy {
            animation: swayHappy 3s ease-in-out infinite;
            transform-origin: bottom center;
          }
          
          .animate-plant-sad {
            animation: swaySad 4s ease-in-out infinite;
            transform-origin: bottom center;
            /* Membuat warna sedikit pudar/layu jika kehausan */
            filter: grayscale(${isThirsty ? '40%' : '0%'}) drop-shadow(0 10px 15px rgba(0,0,0,0.1));
            transition: all 1s ease;
          }
        `}
      </style>

      {/* Kontainer SVG Tanaman */}
      <div className={`w-40 h-40 transition-all duration-1000 ${isThirsty ? 'animate-plant-sad' : 'animate-plant-happy'}`}>
        
        {/* Gambar Tanaman SVG (Bisa diganti dengan gambar Anda sendiri nanti) */}
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
          {/* Daun Kiri */}
          <path 
            d="M100 120 C 60 120, 30 90, 40 50 C 70 60, 90 90, 100 120 Z" 
            fill={isThirsty ? "#9ca3af" : "#4ade80"} 
            className="transition-colors duration-1000"
          />
          {/* Daun Kanan */}
          <path 
            d="M100 120 C 140 120, 170 90, 160 50 C 130 60, 110 90, 100 120 Z" 
            fill={isThirsty ? "#6b7280" : "#22c55e"} 
            className="transition-colors duration-1000"
          />
          {/* Batang */}
          <path 
            d="M95 120 Q 100 180 100 150 Q 100 180 105 120 Z" 
            fill="#166534" 
          />
          {/* Pot Tanaman */}
          <path 
            d="M70 150 L 130 150 L 120 190 L 80 190 Z" 
            fill="#d97706" 
          />
          {/* Bibir Pot */}
          <rect x="65" y="140" width="70" height="10" rx="3" fill="#b45309" />
          
          {/* Ekspresi Wajah Tanaman (Opsional tapi lucu!) */}
          {isThirsty ? (
            <g>
              {/* Mata Sedih */}
              <line x1="85" y1="165" x2="92" y2="165" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
              <line x1="108" y1="165" x2="115" y2="165" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
              {/* Mulut Sedih */}
              <path d="M 95 175 Q 100 170 105 175" fill="none" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              {/* Mata Bahagia */}
              <path d="M 85 165 Q 88 160 92 165" fill="none" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
              <path d="M 108 165 Q 111 160 115 165" fill="none" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
              {/* Mulut Senyum */}
              <path d="M 95 172 Q 100 178 105 172" fill="none" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}
        </svg>

      </div>

      {/* Teks Status */}
      <div className="mt-4 text-center">
        <h3 className="text-white font-black text-xl drop-shadow-md">
          {isThirsty ? "Aku Haus... 🥺" : "Segar Banget! 🌿"}
        </h3>
      </div>

    </div>
  );
};

const VaseCard = ({ deviceId, moisture, userId }) => {
  const [isWatering, setIsWatering] = useState(false);
  const [history, setHistory] = useState([]);
  const [autoMode, setAutoMode] = useState(false);
  const [lastWaterTime, setLastWaterTime] = useState(0);
  const threshold = 30;
  const cooldown = 30000;

  const prefRef = doc(db, 'users', userId, 'preferences', deviceId);

  useEffect(() => { const unsub = onSnapshot(prefRef, (docSnap) => { if (docSnap.exists()) { const data = docSnap.data(); setAutoMode(data.autoMode || false); setLastWaterTime(data.lastWaterTime || 0); } else { setDoc(prefRef, { autoMode: false, lastWaterTime: 0 }).catch(err => console.error(err)); } }); return unsub; }, [userId, deviceId]);
  const toggleAutoMode = useCallback(async () => { const newMode = !autoMode; setAutoMode(newMode); try { await setDoc(prefRef, { autoMode: newMode }, { merge: true }); } catch (error) { setAutoMode(autoMode); } }, [autoMode, prefRef]);
  useEffect(() => { if (lastWaterTime > 0) { setDoc(prefRef, { lastWaterTime }, { merge: true }).catch(err => console.error(err)); } }, [lastWaterTime, prefRef]);
  
  useEffect(() => { 
      const readingsRef = collection(db, 'devices', deviceId, 'readings'); 
      const q = query(readingsRef, orderBy('timestamp', 'desc'), limit(10)); 
      const unsub = onSnapshot(q, (snapshot) => { 
          const data = snapshot.docs.map(doc => ({ moisture: doc.data().moisture, timestamp: doc.data().timestamp?.toDate().toISOString() || new Date().toISOString() })).reverse(); 
          setHistory(data); 
      }); 
      return unsub; 
  }, [deviceId]);

  useEffect(() => { if (autoMode && moisture < threshold && !isWatering && Date.now() - lastWaterTime > cooldown) { handleWater(); } }, [autoMode, moisture, isWatering, lastWaterTime]);

  const handleWater = async () => {
    setIsWatering(true);
    setLastWaterTime(Date.now());
    setTimeout(async () => {
      try {
        const deviceRef = doc(db, 'devices', deviceId);
        await setDoc(deviceRef, { moisture: 80 }, { merge: true });
        const readingsRef = collection(db, 'devices', deviceId, 'readings');
        await setDoc(doc(readingsRef), { moisture: 80, timestamp: new Date() });
      } catch (err) {}
      setIsWatering(false);
    }, 5000);
  };

  const safeMoisture = Math.min(100, Math.max(0, moisture || 0));
  const isThirsty = safeMoisture < threshold;

  const formatTimeStr = (timestamp) => {
    if (!timestamp) return '--:--';
    const d = new Date(timestamp);
    let h = d.getHours(); const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  const getPetMood = () => {
    if (isWatering) return <><Sparkles size={16} className="inline mr-1 text-blue-400"/> Segar!</>;
    if (isThirsty) return <><Frown size={16} className="inline mr-1"/> Haus...</>;
    return <><Smile size={16} className="inline mr-1"/> Bahagia</>;
  };

  return (
    <div className="flex flex-col min-h-full w-full max-w-sm mx-auto pt-16 pb-8">
      
      <div className="relative w-full flex justify-center -mb-6 z-20 pointer-events-none mt-auto">
        
        {/* Mood Bubble Indicator */}
        <div className={`absolute -top-4 bg-white px-4 py-2 rounded-2xl shadow-xl border-2 z-40 transition-all duration-300 flex items-center justify-center ${isThirsty ? 'border-red-400 text-red-500 animate-bounce' : 'border-green-100 text-[#81B95B]'}`}>
            <span className="text-sm font-extrabold tracking-wide flex items-center">{getPetMood()}</span>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 rotate-45" style={{ borderColor: 'inherit' }}></div>
        </div>

        {isWatering && <RainAnimation />}
        <div className={isThirsty && !isWatering ? 'animate-pulse' : ''}>
            <CuteSucculent isWatering={isWatering} />
        </div>
      </div>

      <div className="bg-white/20 backdrop-blur-xl border border-white/40 w-full rounded-[2.5rem] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.1)] relative z-10 flex flex-col gap-5">
        
        <div className="text-center">
          <h2 className={`text-5xl font-black tracking-tighter drop-shadow-sm ${isThirsty ? 'text-red-100' : 'text-white'}`}>{safeMoisture}%</h2>
          <p className="text-white/80 font-bold text-xs tracking-[0.2em] uppercase mt-1">Kelembaban • {deviceId}</p>
        </div>

        <div className="w-full bg-black/10 rounded-full h-5 backdrop-blur-md overflow-hidden border border-white/20 p-1 shadow-inner relative">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out relative shadow-sm ${isThirsty ? 'bg-red-400' : 'bg-linear-to-r from-white to-green-100'}`} 
            style={{ width: `${safeMoisture}%` }}
          >
            {isThirsty && <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full"></div>}
          </div>
        </div>

        <div className="flex gap-3 w-full">
          <div className="bg-black/10 backdrop-blur-md rounded-3xl p-4 flex-1 border border-white/20 flex flex-col justify-center items-center shadow-inner">
             <span className="text-white/70 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Droplet size={10} /> Terakhir Siram</span>
             <span className="text-white font-black text-xl">{formatTimeStr(lastWaterTime)}</span>
          </div>
          
          <div className="bg-black/10 backdrop-blur-md rounded-3xl p-4 flex-1 border border-white/20 flex flex-col items-center justify-between shadow-inner cursor-pointer" onClick={toggleAutoMode}>
            <span className="text-white/70 text-[10px] uppercase font-bold tracking-wider mb-2 flex items-center gap-1"><Bot size={10} /> Auto Pilot</span>
            <div className={`w-14 h-7 rounded-full p-1 transition-all duration-300 shadow-inner ${autoMode ? 'bg-green-400' : 'bg-black/30'}`}>
              <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${autoMode ? 'translate-x-7' : 'translate-x-0'}`}>
                 {autoMode && <Bot size={12} className="text-green-500" />}
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleWater}
          disabled={isWatering || autoMode}
          className={`w-full font-black text-lg py-4 rounded-full shadow-[0_8px_0_rgba(0,0,0,0.1)] transition-all active:translate-y-2 active:shadow-none flex justify-center items-center gap-2
            ${isWatering || autoMode ? 'bg-white/40 text-white/60 cursor-not-allowed' : 'bg-white text-[#81B95B] hover:bg-green-50'}`}
        >
          {isWatering ? (
            <><Droplet size={20} className="animate-bounce" fill="currentColor" /> Menyiram...</>
          ) : autoMode ? (
            <><Bot size={20} /> Auto Pilot Aktif</>
          ) : (
            <><Droplet size={20} /> Siram Sekarang</>
          )}
        </button>

      </div>
    </div>
  );
};

export default VaseCard;