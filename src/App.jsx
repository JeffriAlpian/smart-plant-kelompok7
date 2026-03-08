import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import Signup from "./components/Signup";
import VaseCard from "./VaseCard";
import QRScanner from "./components/QRScanner";
import HistoryTab from "./components/HistoryTab";
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
} from "lucide-react";

function App() {
  const { currentUser, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(true);

  // Sekarang 'devices' berisi ARRAY OF OBJECTS (Data lengkap dari Firebase)
  const [devices, setDevices] = useState([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState("");
  const [activeTab, setActiveTab] = useState("Home");
  const [showScanner, setShowScanner] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Update jam setiap detik
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();
  const isNight = currentHour >= 18 || currentHour < 6;

  // --- 1. PUSAT BACA DATA FIREBASE ---
  useEffect(() => {
    if (!currentUser) return;

    const devicesRef = collection(db, "devices");
    const q = query(devicesRef, where("ownerId", "==", currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Mengambil seluruh isi dokumen, bukan hanya ID-nya
      const potList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDevices(potList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    // Tunjuk ke dokumen profil user yang sedang login
    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        // Ambil data dari database jika ada
        setNotificationsEnabled(docSnap.data().notificationsEnabled ?? true);
      } else {
        // Buat data default jika user baru pertama kali masuk
        setDoc(userRef, { notificationsEnabled: true }, { merge: true });
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // --- 2. PUSAT TAMBAH DATA ---
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
          moisture: 0, // Default awal
        },
        { merge: true },
      );
      setNewDeviceId("");
      setShowAddForm(false);
    } catch (error) {
      alert("Gagal menambahkan pot: " + error.message);
    }
  };

  // --- 3. PUSAT HAPUS DATA ---
  const handleDeleteDevice = async (deviceId) => {
    try {
      await deleteDoc(doc(db, "devices", deviceId));
      console.log(`Pot ${deviceId} berhasil dihapus dari database.`);
    } catch (error) {
      console.error("Gagal menghapus:", error);
      alert("Gagal menghapus pot. Coba periksa koneksi internet.");
    }
  };

  // --- 4. PUSAT SIRAM DATA ---
  const handleWaterDevice = async (deviceId) => {
    try {
      const now = Date.now();
      // Update data di master devices
      await setDoc(
        doc(db, "devices", deviceId),
        {
          moisture: 100,
          lastWaterTime: now,
        },
        { merge: true },
      );

      // Catat log untuk History (Opsional)
      const readingsRef = collection(db, "devices", deviceId, "readings");
      await setDoc(doc(readingsRef), { moisture: 100, timestamp: new Date() });
    } catch (error) {
      console.error("Gagal menyiram:", error);
    }
  };

  // --- 5. PUSAT TOGGLE AUTO MODE ---
  const handleToggleAuto = async (deviceId, currentMode) => {
    try {
      await setDoc(
        doc(db, "devices", deviceId),
        {
          autoMode: !currentMode,
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Gagal toggle auto mode:", error);
    }
  };

  // 6. PUSAT UPDATE ALARM/NOTIFIKASI
  const handleToggleNotification = async () => {
    if (!currentUser) return;

    // Optimistic UI update (ubah di layar dulu agar responsif)
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);

    try {
      // Simpan perubahan ke database
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          notificationsEnabled: newValue,
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Gagal mengupdate pengaturan notifikasi:", error);
      // Rollback jika gagal
      setNotificationsEnabled(!newValue);
    }
  };

  // =================================================================

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return { hours: hours.toString().padStart(2, "0"), minutes, ampm };
  };

  const time = formatTime(currentTime);

  if (!currentUser) {
    return showLogin ? (
      <Login onToggleForm={() => setShowLogin(false)} />
    ) : (
      <Signup onToggleForm={() => setShowLogin(true)} />
    );
  }

  const bgGradient = isNight
    ? "from-[#0B1026] via-[#1B2755] to-[#2B1B54]"
    : "from-[#6EB5FF] via-[#85C4FF] to-[#A3D180]";

  const renderTabContent = () => {
    switch (activeTab) {
      case "History":
        // Mengirimkan array ID saja ke HistoryTab (sesuai kode lama Anda)
        return <HistoryTab devices={devices.map((d) => d.id)} />;
      case "Alarm":
        return (
          <div className="flex-1 min-h-0 w-full px-6 pt-4 pb-24 overflow-y-auto animate-fadeIn no-scrollbar z-10">
            <h2 className="text-2xl font-black text-white mb-6 drop-shadow-md flex items-center gap-2">
              <AlarmClock className="text-white/80" /> Pengingat Rawat
            </h2>
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl mb-4 transition-all duration-300">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-bold text-lg">
                  Notifikasi Kering
                </h3>

                {/* Custom Toggle Switch Animasi */}
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
                className={`text-xs font-medium transition-colors duration-300 ${notificationsEnabled ? "text-white/80" : "text-white/50"}`}
              >
                Kirim peringatan ke HP jika kelembaban di bawah 30%.
              </p>
            </div>
          </div>
        );
      case "Profile":
        return (
          <div className="flex-1 min-h-0 w-full px-6 pt-8 pb-24 overflow-y-auto animate-fadeIn flex flex-col items-center no-scrollbar z-10">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border-4 border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.3)] text-white">
              <User size={48} />
            </div>
            <h2 className="text-3xl font-black text-white drop-shadow-lg">
              {currentUser.email.split("@")[0]}
            </h2>
            <p className="text-white/80 text-sm font-bold uppercase tracking-widest mb-8 bg-black/20 px-4 py-1 rounded-full">
              Pecinta Tanaman
            </p>
            <div className="w-full bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl mb-6 flex justify-around text-center">
              <div>
                <span className="block text-4xl font-black text-white">
                  {devices.length}
                </span>
                <span className="text-xs text-white/70 font-bold uppercase">
                  Total Pot
                </span>
              </div>
              <div>
                <span className="block text-4xl font-black text-[#A3D180] drop-shadow-[0_0_10px_rgba(163,209,128,0.5)]">
                  Lvl 5
                </span>
                <span className="text-xs text-white/70 font-bold uppercase">
                  Gardener
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full bg-red-400/80 backdrop-blur-md text-white font-black py-4 rounded-full shadow-lg hover:bg-red-500 transition-colors flex justify-center items-center gap-2 border border-red-300/50"
            >
              <LogOut size={20} /> KELUAR AKUN
            </button>
          </div>
        );
      default: // 'Home' Tab
        return (
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden no-scrollbar relative z-10 pt-2 flex snap-x snap-mandatory">
            {devices.length === 0 ? (
              <div className="min-w-full snap-center flex flex-col items-center p-8">
                <div className="bg-white/10 backdrop-blur-xl rounded-[3rem] p-10 text-center border border-white/20 shadow-2xl w-full flex flex-col items-center transform hover:scale-105 transition-transform duration-500">
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
              devices.map((device) => (
                <div
                  key={device.id}
                  className="min-w-full snap-center relative h-full px-6 pb-28 overflow-y-auto no-scrollbar"
                >
                  <VaseCard
                    device={device} // Kirim 1 objek utuh ke anak
                    onWater={() => handleWaterDevice(device.id)} // Lempar perintah siram
                    onDelete={() => handleDeleteDevice(device.id)} // Lempar perintah hapus
                    onToggleAuto={() =>
                      handleToggleAuto(device.id, device.autoMode)
                    } // Lempar perintah toggle
                  />
                </div>
              ))
            )}
          </div>
        );
    }
  };

  return (
    <div
      className={`h-screen font-sans flex justify-center text-white sm:py-6 selection:bg-green-300 bg-gray-900 transition-colors duration-1000 pb-40`}
    >
      <div
        className={`w-full bg-linear-to-b ${bgGradient} relative overflow-hidden sm:rounded-[3rem] sm:border-8 sm:border-black/20 sm:shadow-2xl flex flex-col h-dvh sm:h-212.5 transition-all duration-1000 ease-in-out`}
      >
        {/* === DEKORASI LANGIT ANIMASI === */}
        {isNight ? (
          <>
            <Moon
              size={120}
              className="absolute -top-4 -right-4 text-yellow-100/30 drop-shadow-[0_0_40px_rgba(255,255,255,0.6)] animate-pulse"
              fill="currentColor"
              strokeWidth={0}
            />
            <Star
              size={20}
              className="absolute top-12 left-10 text-yellow-200/80 animate-ping"
              fill="currentColor"
            />
            <Star
              size={14}
              className="absolute top-32 left-32 text-white/50 animate-pulse"
              fill="currentColor"
            />
            <Star
              size={24}
              className="absolute top-20 right-28 text-yellow-100/60 animate-pulse"
              fill="currentColor"
            />
            <Star
              size={10}
              className="absolute top-48 left-16 text-white/40 animate-ping"
              fill="currentColor"
            />
            <Cloud
              size={140}
              className="absolute top-40 -left-10 text-indigo-300/10 pointer-events-none"
              fill="currentColor"
              strokeWidth={0}
            />
          </>
        ) : (
          <>
            <Sun
              size={150}
              className="absolute -top-10 -right-10 text-yellow-300/40 drop-shadow-[0_0_50px_rgba(255,235,59,0.8)] animate-spin-slow"
              fill="currentColor"
              strokeWidth={0}
            />
            <Cloud
              size={100}
              className="absolute top-16 left-2 text-white/30 pointer-events-none animate-bounce"
              fill="currentColor"
              strokeWidth={0}
            />
            <Cloud
              size={140}
              className="absolute top-40 -right-10 text-white/20 pointer-events-none"
              fill="currentColor"
              strokeWidth={0}
            />
          </>
        )}

        <div className="pt-12 pb-2 px-6 relative z-10 flex flex-col items-center shrink-0">
          <div className="w-full flex justify-between items-center mb-4">
            <span className="bg-black/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/20 text-xs font-black tracking-widest text-white/90 uppercase flex gap-2 items-center shadow-lg">
              <Sprout
                size={14}
                className={isNight ? "text-indigo-300" : "text-green-200"}
              />
              Virtual Pet
            </span>
          </div>
          <div className="flex items-end justify-center drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
            <h1 className="text-7xl font-black tracking-tighter text-white">
              {time.hours}:{time.minutes}
            </h1>
            <span className="text-2xl font-bold mb-2 ml-1 text-white/80">
              {time.ampm}
            </span>
          </div>
        </div>

        {renderTabContent()}

        {/* BOTTOM NAVIGATION (Gaya Glassmorphism) */}
        <div className="absolute bottom-4 left-6 right-6 bg-white/10 backdrop-blur-xl px-4 py-3 rounded-[2rem] flex justify-between items-center border border-white/20 shadow-[0_15px_30px_rgba(0,0,0,0.3)] z-50">
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

          {/* Tombol Plus Diperkecil */}
          <div
            onClick={() => setShowAddForm(true)}
            className={`relative -top-6 ${
              isNight
                ? "bg-linear-to-b from-indigo-400 to-purple-500 shadow-[0_8px_20px_rgba(99,102,241,0.5)] border-indigo-300"
                : "bg-linear-to-b from-green-300 to-green-500 shadow-[0_8px_20px_rgba(74,222,128,0.5)] border-[#A3D180]"
            } w-14 h-14 rounded-full flex items-center justify-center border-[3px] cursor-pointer transform hover:scale-110 active:scale-95 transition-all text-white`}
          >
            <Plus size={28} strokeWidth={3} className="drop-shadow-lg" />
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
        </div>

        {/* MODAL TAMBAH POT */}
        {showAddForm && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
            <div
              className={`bg-gradient-to-b ${isNight ? "from-slate-800 to-slate-900" : "from-white to-gray-50"} rounded-[2.5rem] p-8 w-full ${isNight ? "text-white" : "text-gray-800"} shadow-2xl relative border ${isNight ? "border-white/10" : "border-white"}`}
            >
              <h3
                className={`font-black text-3xl mb-2 ${isNight ? "text-indigo-400" : "text-[#81B95B]"} text-center flex justify-center items-center gap-2`}
              >
                <Sprout size={32} /> Tambah Pot
              </h3>
              <p
                className={`text-center text-sm ${isNight ? "text-gray-400" : "text-gray-500"} mb-6 font-medium`}
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
                    className={`w-full ${isNight ? "bg-slate-700 text-white placeholder-gray-400" : "bg-gray-100 text-gray-800"} py-4 pl-4 pr-16 rounded-2xl text-center font-bold tracking-wider outline-none focus:ring-4 ${isNight ? "focus:ring-indigo-500/50" : "focus:ring-green-300/50"} transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2.5 ${isNight ? "bg-slate-600 text-indigo-300 hover:bg-indigo-500 hover:text-white border-slate-500" : "bg-white text-[#81B95B] hover:bg-[#81B95B] hover:text-white border-gray-200"} rounded-xl shadow-sm transition-colors border`}
                    title="Scan QR Code"
                  >
                    <QrCode size={22} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className={`flex-1 py-4 ${isNight ? "bg-slate-700 text-gray-300" : "bg-gray-200 text-gray-600"} rounded-2xl font-black active:scale-95 transition-transform`}
                  >
                    BATAL
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 py-4 ${isNight ? "bg-indigo-500 shadow-[0_6px_0_rgba(67,56,202,1)]" : "bg-[#81B95B] shadow-[0_6px_0_rgba(95,147,61,1)]"} text-white rounded-2xl font-black active:translate-y-1 active:shadow-none transition-all`}
                  >
                    SIMPAN
                  </button>
                </div>
              </form>
            </div>
          </div>
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

const NavIcon = ({ Icon, label, active, onClick, isNight }) => (
  <div
    onClick={onClick}
    className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${active ? "opacity-100 transform -translate-y-2 scale-110" : "opacity-50 hover:opacity-100"}`}
  >
    <div
      className={`mb-1 transition-all ${active ? (isNight ? "bg-indigo-500 text-white" : "bg-emerald-400 text-white") + " rounded-2xl p-2 shadow-lg" : "p-2"}`}
    >
      <Icon
        size={24}
        strokeWidth={active ? 2.5 : 2}
        className="filter drop-shadow-sm"
      />
    </div>
    <span
      className={`text-[10px] font-extrabold uppercase tracking-widest ${active ? "text-white" : "text-white/70"}`}
    >
      {label}
    </span>
  </div>
);

export default App;
