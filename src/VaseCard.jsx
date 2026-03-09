import React, { useState, useEffect } from "react";
import {
  Droplet,
  Bot,
  Sparkles,
  Frown,
  Smile,
  Trash2,
  Activity,
} from "lucide-react";

// --- ANIMASI HUJAN ---
const RainAnimation = () => (
  <div className="absolute inset-0 -top-12 overflow-hidden pointer-events-none z-30 flex justify-center w-full h-75">
    <style>{`
      @keyframes rainDrop {
        0% { transform: translateY(-20px) scaleY(1); opacity: 0; }
        10% { opacity: 1; }
        80% { transform: translateY(180px) scaleY(1.5); opacity: 1; }
        100% { transform: translateY(200px) scaleY(0.5); opacity: 0; }
      }
      .drop {
        position: absolute; width: 3px; height: 18px;
        background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(167, 216, 255, 0.9));
        border-radius: 50%; 
        animation: rainDrop 0.6s linear infinite;
      }
    `}</style>
    {[...Array(15)].map((_, i) => (
      <div
        key={i}
        className="drop"
        style={{
          left: `${15 + Math.random() * 70}%`,
          animationDelay: `${Math.random() * 0.8}s`,
          animationDuration: `${0.4 + Math.random() * 0.3}s`,
        }}
      />
    ))}
  </div>
);

// --- KARAKTER PET TERAKOTA BARU MENGGUNAKAN GAMBAR/GIF---
const KawaiiPlant = ({ moisture, isWatering, currentTime}) => {
  const isThirsty = moisture < 30;

  const currentHour = currentTime.getHours();
  const isNight = currentHour >= 18 || currentHour < 6;

  // Tentukan path gambar (pastikan file ada di folder public/)
  // Jika kamu punya 3 GIF berbeda, kamu bisa ubah logikanya di sini!
  let petImage = "/plant/3.gif";
  if (isWatering) petImage = "/plant/2.gif";
  else if (isThirsty) petImage = "/plant/1.gif";
  else if (isNight) petImage = "/plant/4.gif";

  return (
    <div className="flex flex-col items-center justify-center p-4 relative">
      {/* Halo Cahaya Latar Belakang */}
      <div
        className={`absolute inset-0 blur-3xl rounded-full opacity-40 transition-colors duration-1000 z-0 ${
          isThirsty && !isWatering ? "bg-red-500" : "bg-green-400"
        }`}
      ></div>

      {/* GAMBAR PET KAMU DI SINI */}
      <div className="z-10 relative">
        <img
          src={petImage}
          alt="My Kawaii Plant"
          className={`w-54 h-54 object-contain drop-shadow-2xl transition-all duration-700
            ${isWatering ? "pet-watering" : isThirsty ? "pet-sad" : "pet-happy"}
          `}
        />
      </div>

      {/* Teks Status */}
      <div className="mt-3 text-center z-10">
        <h3 className="text-white font-black text-2xl drop-shadow-[0_2.5px_5px_rgba(0,0,0,0.85)] tracking-wide">
          {isWatering
            ? "Aaaah Segar! 💦"
            : isThirsty
            ? "Haus Banget... 🥺"
            : "Aku Sehat! 🌿"}
        </h3>
      </div>
    </div>
  );
};

// --- KOMPONEN UTAMA ---
const VaseCard = ({ device, onWater, onDelete, onToggleAuto }) => {
  const [isWatering, setIsWatering] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const threshold = 30;
  const cooldown = 30000;

  const safeMoisture = Math.min(100, Math.max(0, device.moisture || 0));
  const isThirsty = safeMoisture < threshold;

  // --- WAKTU & TEMA ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ GUNAKAN INI UNTUK TOMBOL "SIRAM MANUAL" DI LAYAR
  const handleManualClick = async () => {
    if (isWatering) return; // Mencegah spam klik bertubi-tubi

    setIsWatering(true); // Ubah status tombol jadi "Sedang Menyiram..." (disable)

    // onWater() di sini memanggil fungsi handleWaterDevice yang kita buat sebelumnya
    // (yang isinya: updateDoc waterCommand: true)
    await onWater();

    setTimeout(() => {
      setIsWatering(false);
    }, 5000);
  };

  const triggerDelete = async () => {
    const isConfirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus pot ini dari taman?",
    );
    if (!isConfirmed) return;

    setIsDeleting(true);
    await onDelete();
  };

  const formatTimeStr = (timestamp) => {
    if (!timestamp) return "--:--";
    const d = new Date(timestamp);
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  const getPetMood = () => {
    if (isWatering)
      return (
        <>
          <Sparkles size={16} className="inline mr-1 text-blue-500" /> Wuuusshh!
        </>
      );
    if (isThirsty)
      return (
        <>
          <Frown size={16} className="inline mr-1" /> Help!
        </>
      );
    return (
      <>
        <Smile size={16} className="inline mr-1" /> Nyaman
      </>
    );
  };

  return (
    <div
      className={`flex flex-col min-h-full w-full max-w-sm mx-auto pt-16 pb-8 transition-opacity duration-500 ${
        isDeleting ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      {/* SECTION PET */}
      <div className="relative w-full flex justify-center -mb-8 z-20 pointer-events-none mt-auto">
        <div
          className={`absolute -top-6 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-xl border-2 z-40 transition-all duration-300 flex items-center justify-center 
            ${
              isWatering
                ? "border-blue-300 text-blue-600 animate-bounce"
                : isThirsty
                ? "border-red-400 text-red-500 animate-pulse"
                : "border-green-200 text-[#6ea34a]"
            }`}
        >
          <span className="text-sm font-extrabold tracking-wide flex items-center">
            {getPetMood()}
          </span>
          <div
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white/90 border-b-2 border-r-2 rotate-45"
            style={{ borderColor: "inherit" }}
          ></div>
        </div>

        {isWatering && <RainAnimation />}
        <KawaiiPlant moisture={safeMoisture} isWatering={isWatering} currentTime={currentTime} />
      </div>

      {/* SECTION KARTU KONTROL */}
      <div className="bg-white/10 backdrop-blur-2xl border border-white/30 w-full rounded-[2.5rem] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative z-10 flex flex-col gap-6">
        {/* Tombol Hapus */}
        <button
          onClick={triggerDelete}
          disabled={isDeleting}
          className="absolute top-5 right-5 z-50 p-2.5 rounded-full text-white/50 bg-black/10 hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-300 disabled:opacity-50 group"
          title="Hapus Pot"
        >
          <Trash2
            size={18}
            className={`${
              isDeleting ? "animate-spin" : "group-hover:scale-110"
            }`}
          />
        </button>

        {/* Info Kelembapan */}
        <div className="text-center mt-2">
          <h2
            className={`text-6xl font-black tracking-tighter drop-shadow-md transition-colors duration-500 ${
              isThirsty && !isWatering ? "text-red-300" : "text-white"
            }`}
          >
            {safeMoisture}%
          </h2>
          <p className="text-white/80 font-bold text-xs tracking-[0.25em] uppercase mt-2 flex items-center justify-center gap-1.5">
            <Activity
              size={12}
              className={
                isThirsty && !isWatering
                  ? "animate-pulse text-red-300"
                  : "text-green-300"
              }
            />
            ID • {device.id}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/20 rounded-full h-6 backdrop-blur-md overflow-hidden border border-white/20 p-1 shadow-inner relative">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out relative shadow-sm 
              ${
                isWatering
                  ? "bg-linear-to-r from-blue-400 to-cyan-300"
                  : isThirsty
                  ? "bg-linear-to-r from-red-500 to-orange-400"
                  : "bg-linear-to-r from-green-300 to-emerald-400"
              }`}
            style={{ width: `${safeMoisture}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_ease-in-out_infinite] rounded-full"></div>
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-linear-to-b from-white/40 to-transparent rounded-t-full"></div>
          </div>
        </div>

        {/* Kotak Info */}
        <div className="flex gap-4 w-full">
          <div className="bg-black/20 backdrop-blur-md rounded-3xl p-4 flex-1 border border-white/10 flex flex-col justify-center items-center shadow-inner hover:bg-black/30 transition-colors">
            <span className="text-white/60 text-[9px] uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1">
              <Droplet size={10} className="text-blue-300" /> HISTORY
            </span>
            <span className="text-white font-black text-lg tracking-tight">
              {formatTimeStr(device.lastWaterTime)}
            </span>
          </div>

          <div
            className={`backdrop-blur-md rounded-3xl p-4 flex-1 border flex flex-col items-center justify-between shadow-inner cursor-pointer transition-colors
              ${
                device.autoMode
                  ? "bg-green-500/20 border-green-400/50"
                  : "bg-black/20 border-white/10 hover:bg-black/30"
              }`}
            onClick={onToggleAuto}
          >
            <span
              className={`text-[9px] uppercase font-bold tracking-widest mb-2 flex items-center gap-1 ${
                device.autoMode ? "text-green-300" : "text-white/60"
              }`}
            >
              <Bot size={10} /> AUTO MODE
            </span>
            <div
              className={`w-14 h-7 rounded-full p-1 transition-all duration-300 shadow-inner flex items-center ${
                device.autoMode ? "bg-green-400" : "bg-black/40"
              }`}
            >
              <div
                className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                  device.autoMode ? "translate-x-7" : "translate-x-0"
                }`}
              >
                {device.autoMode && (
                  <Bot size={11} className="text-green-500" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tombol Siram Utama */}
        <button
          onClick={handleManualClick}
          disabled={isWatering || device.autoMode}
          className={`w-full font-black text-lg py-4 rounded-2xl transition-all duration-300 flex justify-center items-center gap-2 group relative overflow-hidden
            ${
              isWatering || device.autoMode
                ? "bg-white/20 text-white/50 cursor-not-allowed shadow-none"
                : "bg-white text-emerald-600 hover:text-emerald-500 shadow-[0_10px_20px_rgba(255,255,255,0.3)] hover:shadow-[0_5px_10px_rgba(255,255,255,0.2)] hover:-translate-y-1 active:translate-y-1 active:shadow-none"
            }`}
        >
          {!(isWatering || device.autoMode) && (
            <div className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 group-hover:animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-white/50 to-transparent transform -skew-x-12 z-0"></div>
          )}

          <span className="relative z-10 flex items-center gap-2">
            {isWatering ? (
              <>
                <Droplet
                  size={22}
                  className="animate-bounce text-blue-400"
                  fill="currentColor"
                />{" "}
                MENYIRAM...
              </>
            ) : device.autoMode ? (
              <>
                <Bot size={22} /> AUTO PILOT AKTIF
              </>
            ) : (
              <>
                <Droplet
                  size={22}
                  className="group-hover:scale-110 transition-transform"
                />{" "}
                SIRAM SEKARANG
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
};

export default VaseCard;
