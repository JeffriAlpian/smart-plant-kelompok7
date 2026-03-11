import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { getMessaging, getToken } from "firebase/messaging";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { db } from "./firebase";
import { useAuth } from "./contexts/AuthContext";
import useIdleTimeout from "./hooks/useIdleTimeout";

// --- Komponen Anak ---
import Login from "./components/Login";
import Signup from "./components/Signup";
import VaseCard from "./VaseCard";
import QRScanner from "./components/QRScanner";
import HistoryTab from "./components/HistoryTab";
import RootGame from "./components/RootGame";

// --- Ikon ---
import {
  Home,
  History,
  Plus,
  AlarmClock,
  User,
  LogOut,
  Cloud,
  Sprout,
  QrCode,
  Moon,
  Sun,
  Star,
  Award,
  Gamepad2,
  Trophy,
  Droplet,
} from "lucide-react";

export default function App() {
  useIdleTimeout(60);

  const { currentUser, logout } = useAuth();

  // --- STATE MANAGEMENT ---
  const [showLogin, setShowLogin] = useState(true);
  const [devices, setDevices] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState("");
  const [activeTab, setActiveTab] = useState("Home");
  const [showScanner, setShowScanner] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showGame, setShowGame] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem("notif_enabled") === "true";
  });

  // --- WAKTU & TEMA ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();
  const isNight = currentHour >= 18 || currentHour < 6;
  const bgGradient = isNight
    ? "from-[#0B1026] via-[#1B2755] to-[#2B1B54]"
    : "from-[#6EB5FF] via-[#85C4FF] to-[#A3D180]";

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return { hours: hours.toString().padStart(2, "0"), minutes, ampm };
  };
  const time = formatTime(currentTime);

  // --- FIREBASE LISTENERS ---
  useEffect(() => {
    if (!currentUser) return;
    const devicesRef = collection(db, "devices");
    const q = query(devicesRef, where("ownerId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const potList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDevices(potList);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // --- HANDLERS ---
  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceId.trim()) return;
    try {
      const deviceRef = doc(db, "devices", newDeviceId);
      await setDoc(
        deviceRef,
        {
          ownerId: currentUser.uid,
          autoMode: false,
          lastWaterTime: 0,
          moisture: 0,
        },
        { merge: true },
      );
      setNewDeviceId("");
      setShowAddForm(false);
    } catch (error) {
      alert("Gagal menambahkan pot: " + error.message);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    try {
      await deleteDoc(doc(db, "devices", deviceId));
    } catch (error) {
      alert("Gagal menghapus pot. Coba periksa koneksi internet.");
    }
  };

  const handleWaterDevice = async (deviceId) => {
    try {
      await setDoc(
        doc(db, "devices", deviceId),
        { waterCommand: true },
        { merge: true },
      );
      console.log("✅ Perintah siram berhasil dikirim ke Wemos!");
    } catch (error) {
      console.error("❌ Gagal mengirim perintah siram:", error);
    }
  };

  const handleToggleAuto = async (deviceId, currentMode) => {
    try {
      await setDoc(
        doc(db, "devices", deviceId),
        { autoMode: !currentMode },
        { merge: true },
      );
    } catch (error) {
      console.error("Gagal toggle auto mode:", error);
    }
  };

  const handleToggleNotification = async () => {
    if (!currentUser) return;
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    localStorage.setItem("notif_enabled", newValue.toString());

    try {
      const userRef = doc(db, "users", currentUser.uid);
      if (newValue === true) {
        let currentToken = "";
        if (Capacitor.isNativePlatform()) {
          // PushNotification config mobile
          if (Capacitor.getPlatform() === "android") {
            await PushNotifications.createChannel({
              id: "pot_kering_channel",
              name: "Peringatan Pot Kering",
              importance: 5,
              sound: "notif_pot",
              visibility: 1,
              vibration: true,
            });
          }
          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === "prompt") {
            permStatus = await PushNotifications.requestPermissions();
          }
          if (permStatus.receive === "granted") {
            currentToken = await new Promise(async (resolve, reject) => {
              const regListener = await PushNotifications.addListener(
                "registration",
                (token) => {
                  resolve(token.value);
                  if (regListener) regListener.remove();
                },
              );
              const errListener = await PushNotifications.addListener(
                "registrationError",
                (error) => {
                  reject(error);
                  if (errListener) errListener.remove();
                },
              );
              await PushNotifications.register();
            });
          } else {
            alert("Izin notifikasi ditolak oleh HP kamu.");
            setNotificationsEnabled(false);
            localStorage.setItem("notif_enabled", "false");
            return;
          }
        } else {
          // PushNotification config web
          const messaging = getMessaging();
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            currentToken = await getToken(messaging, {
              vapidKey:
                "BODRD_0rgPWCi2xMyLCdrZCvHTmRj-xRLHiIX_JsA1qcQacptRAePWw9Q5GgFMpkdtxqMYEVkOcEpNC5ayhqiro",
            });
          } else {
            alert("Kamu harus mengizinkan notifikasi di pengaturan Browser!");
            setNotificationsEnabled(false);
            localStorage.setItem("notif_enabled", "false");
            return;
          }
        }
        if (currentToken) {
          localStorage.setItem("my_fcm_token", currentToken);
          await updateDoc(userRef, { fcmTokens: arrayUnion(currentToken) });
        }
      } else {
        const savedToken = localStorage.getItem("my_fcm_token");
        if (savedToken) {
          await updateDoc(userRef, { fcmTokens: arrayRemove(savedToken) });
          localStorage.removeItem("my_fcm_token");
        }
      }
    } catch (error) {
      console.error("❌ Gagal memproses notifikasi:", error);
      alert("Gagal menyimpan pengaturan notifikasi ke server. Coba lagi.");
      setNotificationsEnabled(!newValue);
      localStorage.setItem("notif_enabled", (!newValue).toString());
    }
  };

  // --- RENDER PERTAMA (LOGIN/SIGNUP) ---
  if (!currentUser) {
    return showLogin ? (
      <Login onToggleForm={() => setShowLogin(false)} />
    ) : (
      <Signup onToggleForm={() => setShowLogin(true)} />
    );
  }

  // --- HALAMAN GAME ---
  if (showGame) {
    const username = currentUser?.email
      ? currentUser.email.split("@")[0]
      : "Player";

    return (
      <div className="fixed inset-0 w-screen h-screen bg-gray-900 flex items-center justify-center z-50 overflow-hidden">
        <RootGame
          setShowGame={setShowGame}
          username={username}
          userId={currentUser.uid}
        />
      </div>
    );
  }

  // =========================================================
  // 📱 HALAMAN UTAMA APLIKASI
  // =========================================================
  return (
    // Wrapper utama: flex-col untuk mobile, flex-row untuk desktop
    <div className="h-screen w-screen overflow-hidden font-sans flex flex-col md:flex-row text-white bg-gray-900 selection:bg-green-300 transition-colors duration-1000 relative">
      
      {/* 🧭 Navigasi - Berubah jadi sidebar di desktop */}
      <nav className="fixed md:static bottom-4 left-6 right-6 md:w-28 md:h-full bg-white/10 md:bg-black/40 backdrop-blur-xl px-4 py-3 md:py-8 md:px-0 rounded-4xl md:rounded-none flex flex-row md:flex-col justify-between md:justify-center items-center border border-white/20 md:border-t-0 md:border-l-0 md:border-b-0 md:border-r md:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.3)] md:shadow-none z-50 transition-all duration-500">
        <NavIcon
          Icon={Home}
          label="Home"
          active={activeTab === "Home"}
          onClick={() => setActiveTab("Home")}
          isNight={isNight}
        />
        <NavIcon
          Icon={History}
          label="Logs"
          active={activeTab === "History"}
          onClick={() => setActiveTab("History")}
          isNight={isNight}
        />

        <div
          onClick={() => setShowGame(true)}
          className={`relative md:static -top-6 md:top-0 md:my-6 ${
            isNight
              ? "bg-linear-to-b from-indigo-400 to-purple-500 shadow-[0_8px_20px_rgba(99,102,241,0.5)] border-indigo-300"
              : "bg-linear-to-b from-green-300 to-green-500 shadow-[0_8px_20px_rgba(74,222,128,0.5)] border-[#A3D180]"
          } w-14 h-14 md:w-16 md:h-16 rounded-full flex shrink-0 items-center justify-center border-[3px] cursor-pointer transform hover:scale-110 active:scale-95 transition-all text-white`}
        >
          <Gamepad2 size={28} strokeWidth={3} className="drop-shadow-lg" />
        </div>

        <NavIcon
          Icon={AlarmClock}
          label="Alarm"
          active={activeTab === "Alarm"}
          onClick={() => setActiveTab("Alarm")}
          isNight={isNight}
        />
        <NavIcon
          Icon={User}
          label="Profile"
          active={activeTab === "Profile"}
          onClick={() => setActiveTab("Profile")}
          isNight={isNight}
        />
      </nav>

      {/* 🌟 Area Konten Utama */}
      <div className={`flex-1 bg-linear-to-b ${bgGradient} relative overflow-y-auto overflow-x-hidden flex flex-col h-full transition-all duration-1000 ease-in-out`}>
        <BackgroundDecorations isNight={isNight} />

        {/* Header App */}
        <div className="pt-12 md:pt-16 pb-6 px-6 relative z-10 flex flex-col items-center shrink-0">
          <div className="w-full max-w-7xl mx-auto flex justify-between items-center mb-4">
            <span className="bg-black/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/20 text-xs font-black tracking-widest text-white/90 uppercase flex gap-2 items-center shadow-lg">
              <Sprout
                size={14}
                className={isNight ? "text-indigo-300" : "text-green-200"}
              />{" "}
              Virtual Pet
            </span>
          </div>
          
          <div className="flex items-end justify-center drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
            <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-white">
              {time.hours}:{time.minutes}
            </h1>
            <span className="text-2xl md:text-3xl font-bold mb-2 ml-2 text-white/80">
              {time.ampm}
            </span>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="absolute top-6 right-6 md:top-10 md:right-10 bg-linear-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-black p-3 rounded-2xl shadow-[0_6px_0_rgba(180,83,9,1)] active:translate-y-1 active:shadow-none transition-all flex justify-center items-center gap-3 z-20"
          >
            <Plus size={30} />
          </button>
        </div>

        {/* Tab Routing */}
        <div className="flex-1 relative z-10 pb-32 md:pb-12">
          {activeTab === "Home" && (
            <HomeTabContent
              devices={devices}
              setShowAddForm={setShowAddForm}
              handleWaterDevice={handleWaterDevice}
              handleDeleteDevice={handleDeleteDevice}
              handleToggleAuto={handleToggleAuto}
            />
          )}
          {activeTab === "History" && (
            <div className="max-w-7xl mx-auto px-6">
              <HistoryTab devices={devices.map((d) => d.id)} />
            </div>
          )}
          {activeTab === "Alarm" && (
            <AlarmTabContent
              notificationsEnabled={notificationsEnabled}
              handleToggleNotification={handleToggleNotification}
            />
          )}
          {activeTab === "Profile" && (
            <ProfileTabContent
              currentUser={currentUser}
              devices={devices}
              logout={logout}
            />
          )}
        </div>

        {/* Modals */}
        {showAddForm && (
          <AddDeviceModal
            isNight={isNight}
            newDeviceId={newDeviceId}
            setNewDeviceId={setNewDeviceId}
            handleAddDevice={handleAddDevice}
            setShowAddForm={setShowAddForm}
            setShowScanner={setShowScanner}
          />
        )}
        {showScanner && (
          <QRScanner
            onClose={() => setShowScanner(false)}
            onScanSuccess={(scannedText) => {
              setNewDeviceId(scannedText);
              setShowScanner(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ==========================================
// KOMPONEN-KOMPONEN KECIL
// ==========================================

const HomeTabContent = ({
  devices,
  setShowAddForm,
  handleWaterDevice,
  handleDeleteDevice,
  handleToggleAuto,
}) => (
  <div className="w-full px-6 flex flex-col max-w-7xl mx-auto">
    {devices.length === 0 ? (
      <div className="w-full flex flex-col items-center p-8 mt-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-[3rem] p-10 text-center border border-white/20 shadow-2xl w-full max-w-md flex flex-col items-center transform hover:scale-105 transition-transform duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-green-400/30 blur-2xl rounded-full"></div>
            <Sprout
              size={80}
              className="mb-4 text-[#A3D180] drop-shadow-[0_0_15px_rgba(163,209,128,0.8)] relative z-10"
            />
          </div>
          <h2 className="text-3xl font-black mb-2 text-white drop-shadow-md">
            Tamanmu Kosong
          </h2>
          <p className="text-white/80 text-sm font-medium mb-8">
            Tambahkan pot pertamamu untuk mulai merawat pet virtualmu!
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-white text-[#81B95B] font-black py-4 rounded-full shadow-[0_8px_0_rgba(0,0,0,0.2)] active:translate-y-2 active:shadow-none transition-all flex justify-center items-center gap-2"
          >
            <Plus size={20} strokeWidth={3} /> TAMBAH POT MANUAL
          </button>
        </div>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-10">
        {devices.map((device) => (
          // Container disesuaikan tinggi minimalnya untuk pot
          <div key={device.id} className="w-full min-h-125 relative">
            <VaseCard
              device={device}
              onWater={() => handleWaterDevice(device.id)}
              onDelete={() => handleDeleteDevice(device.id)}
              onToggleAuto={() => handleToggleAuto(device.id, device.autoMode)}
            />
          </div>
        ))}
      </div>
    )}
  </div>
);

const AlarmTabContent = ({
  notificationsEnabled,
  handleToggleNotification,
}) => (
  <div className="w-full max-w-2xl mx-auto px-6 pt-4 animate-fadeIn">
    <h2 className="text-2xl font-black text-white mb-6 drop-shadow-md flex items-center gap-2">
      <AlarmClock className="text-white/80" /> Pengingat Rawat
    </h2>
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl mb-4 transition-all duration-300 hover:bg-white/20">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-bold text-lg">Notifikasi Kering</h3>
        <div
          onClick={handleToggleNotification}
          className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 shadow-inner flex items-center ${
            notificationsEnabled
              ? "bg-green-400 border-green-300"
              : "bg-black/30 border-white/10"
          } border`}
        >
          <div
            className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${
              notificationsEnabled ? "translate-x-7" : "translate-x-0"
            }`}
          >
            {notificationsEnabled && (
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            )}
          </div>
        </div>
      </div>
      <p
        className={`text-sm font-medium transition-colors duration-300 ${
          notificationsEnabled ? "text-white/80" : "text-white/50"
        }`}
      >
        Kirim peringatan ke HP jika kelembaban di bawah 30%.
      </p>
    </div>
  </div>
);

const ProfileTabContent = ({ currentUser, devices, logout }) => {
  const [highScore, setHighScore] = useState({ distance: 0, water: 0 });

  useEffect(() => {
    if (!currentUser) return;
    const scoreRef = doc(db, "leaderboard", currentUser.uid);
    const unsubscribe = onSnapshot(scoreRef, (docSnap) => {
      if (docSnap.exists()) {
        setHighScore(docSnap.data());
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  const getUserLevel = (deviceCount) => {
    if (deviceCount === 0) return { level: 1, title: "Pemula" };
    if (deviceCount <= 2) return { level: 2, title: "Sprout" };
    if (deviceCount <= 5) return { level: 3, title: "Gardener" };
    if (deviceCount <= 9) return { level: 4, title: "Botanist" };
    return { level: 5, title: "Forest Master" };
  };

  const userStats = getUserLevel(devices?.length || 0);
  const username = currentUser?.email
    ? currentUser.email.split("@")[0]
    : "User";

  return (
    <div className="w-full max-w-2xl mx-auto px-6 pt-10 animate-fadeIn flex flex-col items-center">
      <div className="relative w-32 h-32 md:w-40 md:h-40 bg-linear-to-br from-white/30 to-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-5 border-[3px] border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.2)] text-white">
        <User size={64} strokeWidth={1.5} />
        <div className="absolute bottom-1 right-1 bg-[#A3D180] text-[#2c3e50] p-2 rounded-full border-2 border-white shadow-lg">
          <Award size={24} fill="currentColor" />
        </div>
      </div>

      <h2 className="text-4xl font-black text-white drop-shadow-md capitalize mt-4">
        {username}
      </h2>
      <p className="mt-3 text-[#afff72] text-sm font-extrabold uppercase tracking-[0.2em] bg-black/20 px-6 py-2 rounded-full backdrop-blur-sm border border-white/10 shadow-inner">
        Pecinta Tanaman
      </p>

      {/* Statistik Pot & Level */}
      <div className="w-full mt-10 mb-6 bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-xl flex justify-around text-center relative">
        <div className="relative z-10 flex flex-col items-center gap-2">
          <span className="text-5xl font-black text-white drop-shadow-sm">
            {devices?.length || 0}
          </span>
          <span className="text-sm text-white/60 font-bold uppercase tracking-wider">
            Total Pot
          </span>
        </div>
        <div className="w-px h-16 bg-white/20 my-auto self-center"></div>
        <div className="relative z-10 flex flex-col items-center gap-2">
          <span className="text-5xl font-black text-[#ffffff] drop-shadow-[0_0_12px_rgba(163,209,128,0.4)]">
            Lvl {userStats.level}
          </span>
          <span className="text-sm text-[#000000] font-bold uppercase tracking-wider bg-white/50 px-3 py-1 rounded-lg backdrop-blur-md">
            {userStats.title}
          </span>
        </div>
      </div>

      {/* 🏆 KARTU SKOR TERTINGGI GAME */}
      <div className="w-full mb-10 bg-linear-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-xl rounded-3xl p-6 border border-emerald-400/30 shadow-[0_8px_30px_rgba(16,185,129,0.15)] flex justify-between items-center relative transition-transform hover:scale-[1.02]">
        <div className="flex items-center gap-5 relative z-10">
          <div className="bg-emerald-400/20 p-4 rounded-2xl border border-emerald-400/50 shadow-inner">
            <Trophy size={32} className="text-white" />
          </div>
          <div>
            <span className="text-white/60 text-xs font-extrabold uppercase tracking-widest block mb-1">
              Rekor Plant Run
            </span>
            <span className="text-3xl font-black text-white drop-shadow-sm">
              {Math.floor(highScore.distance)}{" "}
              <span className="text-lg text-white/60 font-bold">m</span>
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end relative z-10">
          <span className="text-white/80 text-xs font-bold uppercase mb-1 flex items-center gap-1.5">
            <Droplet size={14} className="text-blue-700" fill="currentColor" />{" "}
            Air Terkumpul
          </span>
          <span className="text-2xl font-black text-blue-700 drop-shadow-sm">
            {highScore.water}
          </span>
        </div>
      </div>

      <button
        onClick={logout}
        className="group w-full max-w-sm bg-white/10 hover:bg-rose-500/80 backdrop-blur-md text-white font-bold py-5 rounded-2xl shadow-lg transition-all duration-300 flex justify-center items-center gap-3 border border-white/20 hover:border-rose-400 active:scale-95"
      >
        <LogOut
          size={24}
          className="group-hover:-translate-x-1 transition-transform"
        />
        <span className="tracking-wide text-lg">KELUAR AKUN</span>
      </button>
    </div>
  );
};

const BackgroundDecorations = ({ isNight }) => (
  <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
    {isNight ? (
      <>
        <Moon size={150} className="absolute -top-10 -right-10 md:top-10 md:right-20 text-yellow-100/30 drop-shadow-[0_0_40px_rgba(255,255,255,0.6)] animate-pulse" fill="currentColor" strokeWidth={0} />
        <Star size={20} className="absolute top-12 left-10 md:left-32 text-yellow-200/80 animate-ping" fill="currentColor" />
        <Star size={14} className="absolute top-32 left-32 md:left-1/4 text-white/50 animate-pulse" fill="currentColor" />
        <Star size={24} className="absolute top-20 right-28 md:right-1/3 text-yellow-100/60 animate-pulse" fill="currentColor" />
        <Star size={10} className="absolute top-48 left-16 md:bottom-1/4 md:left-20 text-white/40 animate-ping" fill="currentColor" />
        <Cloud size={180} className="absolute top-40 -left-10 md:top-20 md:left-1/4 text-indigo-300/10 pointer-events-none" fill="currentColor" strokeWidth={0} />
      </>
    ) : (
      <>
        <Sun size={200} className="absolute -top-10 -right-10 md:top-10 md:right-20 text-yellow-300/40 drop-shadow-[0_0_50px_rgba(255,235,59,0.8)] animate-spin-slow" fill="currentColor" strokeWidth={0} />
        <Cloud size={140} className="absolute top-16 left-2 md:left-20 text-white/30 pointer-events-none animate-bounce" fill="currentColor" strokeWidth={0} />
        <Cloud size={200} className="absolute top-40 -right-10 md:top-20 md:right-1/3 text-white/20 pointer-events-none" fill="currentColor" strokeWidth={0} />
      </>
    )}
  </div>
);

const AddDeviceModal = ({
  isNight,
  newDeviceId,
  setNewDeviceId,
  handleAddDevice,
  setShowAddForm,
  setShowScanner,
}) => (
  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
    <div
      className={`bg-linear-to-b ${
        isNight
          ? "from-slate-800 to-slate-900 text-white border-white/10"
          : "from-white to-gray-50 text-gray-800 border-white"
      } rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative border`}
    >
      <h3
        className={`font-black text-3xl mb-2 ${
          isNight ? "text-indigo-400" : "text-[#81B95B]"
        } text-center flex justify-center items-center gap-2`}
      >
        <Sprout size={32} /> Tambah Pot
      </h3>
      <p
        className={`text-center text-sm ${
          isNight ? "text-gray-400" : "text-gray-500"
        } mb-6 font-medium`}
      >
        Masukkan ID Pot Peliharaanmu atau Scan QR Code.
      </p>
      <form onSubmit={handleAddDevice}>
        <div className="relative mb-6">
          <input
            type="text"
            value={newDeviceId}
            onChange={(e) => setNewDeviceId(e.target.value)}
            placeholder="Contoh: POT-01"
            className={`w-full ${
              isNight
                ? "bg-slate-700 text-white placeholder-gray-400 focus:ring-indigo-500/50"
                : "bg-gray-100 text-gray-800 focus:ring-green-300/50"
            } py-4 pl-4 pr-16 rounded-2xl text-center font-bold tracking-wider outline-none focus:ring-4 transition-all`}
          />
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2.5 ${
              isNight
                ? "bg-slate-600 text-indigo-300 hover:bg-indigo-500 hover:text-white border-slate-500"
                : "bg-white text-[#81B95B] hover:bg-[#81B95B] hover:text-white border-gray-200"
            } rounded-xl shadow-sm transition-colors border`}
          >
            <QrCode size={22} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className={`flex-1 py-4 ${
              isNight
                ? "bg-slate-700 text-gray-300 hover:bg-slate-600"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            } rounded-2xl font-black active:scale-95 transition-all`}
          >
            BATAL
          </button>
          <button
            type="submit"
            className={`flex-1 py-4 ${
              isNight
                ? "bg-indigo-500 shadow-[0_6px_0_rgba(67,56,202,1)]"
                : "bg-[#81B95B] shadow-[0_6px_0_rgba(95,147,61,1)]"
            } text-white rounded-2xl font-black active:translate-y-1 active:shadow-none transition-all`}
          >
            SIMPAN
          </button>
        </div>
      </form>
    </div>
  </div>
);

const NavIcon = ({ Icon, label, active, onClick, isNight }) => (
  <div
    onClick={onClick}
    className={`flex flex-col items-center cursor-pointer transition-all duration-300 md:my-4 ${
      active
        ? "opacity-100 transform -translate-y-2 md:-translate-y-0 md:translate-x-2 scale-110"
        : "opacity-50 hover:opacity-100 md:hover:scale-105"
    }`}
  >
    <div
      className={`mb-1 md:mb-2 transition-all ${
        active
          ? (isNight
              ? "bg-indigo-500 text-white"
              : "bg-emerald-400 text-white") + " rounded-2xl p-2 shadow-lg"
          : "p-2"
      }`}
    >
      <Icon
        size={26}
        strokeWidth={active ? 2.5 : 2}
        className="filter drop-shadow-sm"
      />
    </div>
    <span
      className={`text-[10px] md:text-xs font-extrabold uppercase tracking-widest ${
        active ? "text-white" : "text-white/70"
      }`}
    >
      {label}
    </span>
  </div>
);