import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  getDoc
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
  Droplet,
  QrCode,
} from "lucide-react";

function App() {
  const { currentUser, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [devices, setDevices] = useState([]);
  const [deviceData, setDeviceData] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState("");
  const [activeTab, setActiveTab] = useState("Home");
  const [showScanner, setShowScanner] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const userPreferencesRef = collection(
      db,
      "users",
      currentUser.uid,
      "preferences",
    );
    const unsubUserDevices = onSnapshot(userPreferencesRef, (snapshot) => {
      const myDeviceIds = [];
      snapshot.forEach((doc) => {
        myDeviceIds.push(doc.id);
      });
      setDevices(myDeviceIds);
    });

    const globalDevicesRef = collection(db, "devices");
    const unsubGlobalDevices = onSnapshot(globalDevicesRef, (snapshot) => {
      const dataMap = {};
      snapshot.forEach((doc) => {
        dataMap[doc.id] = doc.data().moisture || 0;
      });
      setDeviceData(dataMap);
    });

    return () => {
      unsubUserDevices();
      unsubGlobalDevices();
    };
  }, [currentUser]);

  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceId.trim()) return;
    try {
      const deviceRef = doc(db, "devices", newDeviceId);
      const deviceSnap = await getDoc(deviceRef);
      if (!deviceSnap.exists()) {
        await setDoc(deviceRef, { moisture: 0, lastUpdate: new Date() });
      }
      const prefRef = doc(
        db,
        "users",
        currentUser.uid,
        "preferences",
        newDeviceId,
      );
      await setDoc(
        prefRef,
        { autoMode: false, lastWaterTime: 0 },
        { merge: true },
      );
      setNewDeviceId("");
      setShowAddForm(false);
    } catch (error) {
      alert("Gagal: " + error.message);
    }
  };

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

  const renderTabContent = () => {
    switch (activeTab) {
      case "History":
        return <HistoryTab devices={devices} />;

      case "Alarm":
        return (
          <div className="flex-1 min-h-0 w-full px-6 pt-4 pb-24 overflow-y-auto animate-fadeIn no-scrollbar">
            <h2 className="text-2xl font-black text-white mb-6 drop-shadow-md flex items-center gap-2">
              <AlarmClock className="text-white/80" /> Pengingat Rawat
            </h2>
            <div className="bg-white/20 backdrop-blur-md rounded-3xl p-6 border border-white/30 shadow-sm mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-white font-bold text-lg">
                  Notifikasi Kering
                </h3>
                <input
                  type="checkbox"
                  className="toggle-checkbox"
                  defaultChecked
                />
              </div>
              <p className="text-white/70 text-xs font-medium">
                Kirim peringatan ke HP jika kelembaban di bawah 30%.
              </p>
            </div>
          </div>
        );
      case "Profile":
        return (
          <div className="flex-1 min-h-0 w-full px-6 pt-8 pb-24 overflow-y-auto animate-fadeIn flex flex-col items-center no-scrollbar">
            <div className="w-24 h-24 bg-white/30 rounded-full flex items-center justify-center mb-4 border-4 border-white/50 shadow-lg text-white">
              <User size={48} />
            </div>
            <h2 className="text-2xl font-black text-white drop-shadow-md">
              {currentUser.email.split("@")[0]}
            </h2>
            <p className="text-white/70 text-sm font-bold uppercase tracking-widest mb-8">
              Pecinta Tanaman
            </p>

            <div className="w-full bg-white/20 backdrop-blur-md rounded-3xl p-6 border border-white/30 shadow-sm mb-6 flex justify-around text-center">
              <div>
                <span className="block text-3xl font-black text-white">
                  {devices.length}
                </span>
                <span className="text-xs text-white/70 font-bold uppercase">
                  Total Pot
                </span>
              </div>
              <div>
                <span className="block text-3xl font-black text-white">
                  Lvl 5
                </span>
                <span className="text-xs text-white/70 font-bold uppercase">
                  Gardener
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full bg-red-400/90 backdrop-blur-md text-white font-black py-4 rounded-full shadow-lg hover:bg-red-500 transition-colors flex justify-center items-center gap-2"
            >
              <LogOut size={20} /> KELUAR AKUN
            </button>
          </div>
        );
      default: // 'Home' Tab
        return (
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden no-scrollbar relative z-10 pt-2 flex snap-x snap-mandatory">
            {devices.length === 0 ? (
              <div className="min-w-full snap-center flex flex-col items-center justify-center p-8">
                <div className="bg-white/20 backdrop-blur-md rounded-[3rem] p-10 text-center border border-white/30 shadow-xl w-full flex flex-col items-center">
                  <Sprout
                    size={80}
                    className="mb-4 text-white drop-shadow-lg"
                  />
                  <h2 className="text-2xl font-black mb-2 text-white">
                    Tamanmu Kosong
                  </h2>
                  <p className="text-white/80 text-sm font-medium mb-8">
                    Tambahkan pot pertamamu untuk mulai merawat pet virtualmu!
                  </p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full bg-white text-[#81B95B] font-black py-4 rounded-full shadow-[0_6px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all flex justify-center items-center gap-2"
                  >
                    <Plus size={20} strokeWidth={3} /> TAMBAH POT MANUAL
                  </button>
                </div>
              </div>
            ) : (
              devices.map((deviceId) => (
                <div
                  key={deviceId}
                  className="min-w-full snap-center relative h-full px-6 pb-28 overflow-y-auto no-scrollbar"
                >
                  <VaseCard
                    deviceId={deviceId}
                    moisture={deviceData[deviceId]}
                    userId={currentUser.uid}
                    // PERBAIKAN: Beritahu App.js untuk langsung menghapus div pembungkus dari layar!
                    onDeleteSuccess={(deletedId) => {
                      setDevices(prev => prev.filter(id => id !== deletedId));
                    }}
                  />
                </div>
              ))
            )}
          </div>
        );
    }
  };

  return (
    <div className="h-screen font-sans flex justify-center text-white sm:py-6 selection:bg-green-300">
      <div className="w-full bg-linear-to-b from-[#6EB5FF] via-[#85C4FF] to-[#A3D180] relative overflow-hidden sm:rounded-[3rem] sm:border-8 sm:border-black/10 sm:shadow-2xl flex flex-col h-dvh sm:h-212.5 shadow-none">
        <Cloud
          size={100}
          className="absolute top-16 left-2 text-white/20 pointer-events-none"
          fill="currentColor"
          strokeWidth={0}
        />
        <Cloud
          size={140}
          className="absolute top-40 -right-10 text-white/20 pointer-events-none"
          fill="currentColor"
          strokeWidth={0}
        />

        <div className="pt-12 pb-2 px-6 relative z-10 flex flex-col items-center shrink-0">
          <div className="w-full flex justify-between items-center mb-4">
            <span className="bg-black/10 px-4 py-1.5 rounded-full border border-white/20 text-xs font-black tracking-widest text-white/90 uppercase flex gap-2 items-center">
              <Sprout size={14} className="text-green-200" /> Virtual Pet
            </span>
          </div>

          <div className="flex items-end justify-center drop-shadow-md">
            <h1 className="text-6xl font-black tracking-tighter text-white">
              {time.hours}:{time.minutes}
            </h1>
            <span className="text-xl font-bold mb-2 ml-1 text-white/90">
              {time.ampm}
            </span>
          </div>
        </div>

        {renderTabContent()}

        <div className="absolute bottom-6 left-6 right-6 bg-white/30 backdrop-blur-xl px-4 py-4 rounded-4xl flex justify-between items-center border border-white/40 shadow-[0_10px_40px_rgba(0,0,0,0.2)] z-50">
          <NavIcon
            Icon={Home}
            label="Home"
            active={activeTab === "Home"}
            onClick={() => setActiveTab("Home")}
          />
          <NavIcon
            Icon={History}
            label="Logs"
            active={activeTab === "History"}
            onClick={() => setActiveTab("History")}
          />

          <div
            onClick={() => setShowAddForm(true)}
            className="relative -top-8 bg-linear-to-b from-green-300 to-green-500 w-16 h-16 rounded-full flex items-center justify-center shadow-[0_10px_20px_rgba(74,222,128,0.4)] border-4 border-[#A3D180] cursor-pointer transform hover:scale-110 active:scale-95 transition-all text-white"
          >
            <Plus size={32} strokeWidth={3} className="drop-shadow-md" />
          </div>

          <NavIcon
            Icon={AlarmClock}
            label="Alarm"
            active={activeTab === "Alarm"}
            onClick={() => setActiveTab("Alarm")}
          />
          <NavIcon
            Icon={User}
            label="Profile"
            active={activeTab === "Profile"}
            onClick={() => setActiveTab("Profile")}
          />
        </div>

        {showAddForm && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] p-8 w-full text-gray-800 shadow-2xl relative">
              <h3 className="font-black text-2xl mb-2 text-[#81B95B] text-center flex justify-center items-center gap-2">
                <Sprout size={28} /> Tambah Pot
              </h3>
              <p className="text-center text-sm text-gray-500 mb-6 font-medium">
                Masukkan ID Pot Peliharaanmu atau Scan QR Code.
              </p>

              <form onSubmit={handleAddDevice}>
                <div className="relative mb-6">
                  <input
                    type="text"
                    value={newDeviceId}
                    onChange={(e) => setNewDeviceId(e.target.value)}
                    placeholder="Contoh: POT-01"
                    className="w-full bg-gray-100 py-4 pl-4 pr-16 rounded-2xl text-center font-bold tracking-wider outline-none focus:ring-4 focus:ring-green-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2.5 bg-white rounded-xl shadow-sm text-[#81B95B] hover:bg-[#81B95B] hover:text-white transition-colors border border-gray-200"
                    title="Scan QR Code"
                  >
                    <QrCode size={22} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black active:scale-95 transition-transform"
                  >
                    BATAL
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-[#81B95B] text-white rounded-2xl font-black shadow-[0_6px_0_rgba(95,147,61,1)] active:translate-y-1 active:shadow-none transition-all"
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

const NavIcon = ({ Icon, label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${active ? "opacity-100 transform -translate-y-1 scale-110" : "opacity-50 hover:opacity-80"}`}
  >
    <div
      className={`mb-1 transition-all ${active ? " bg-emerald-500 rounded-xl p-1.5 shadow-sm" : "p-1.5"}`}
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 2}
        className="filter drop-shadow-sm"
      />
    </div>
    <span className="text-[9px] font-extrabold uppercase tracking-wider">
      {label}
    </span>
  </div>
);

export default App;