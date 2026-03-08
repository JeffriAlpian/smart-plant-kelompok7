// src/components/HistoryTab.jsx
import React, { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";
// Import ikon Lucide
import {
  History,
  Droplet,
  Sprout,
  ThermometerSun,
  Loader2,
  RefreshCw,
} from "lucide-react";

const HistoryTab = ({ devices }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    let allLogs = [];

    try {
      // Looping untuk mengambil 5 riwayat terakhir dari SETIAP pot yang dimiliki user
      for (const deviceId of devices) {
        const q = query(
          collection(db, "devices", deviceId, "readings"),
          orderBy("timestamp", "desc"),
          limit(5),
        );
        const snapshot = await getDocs(q);

        snapshot.forEach((doc) => {
          const data = doc.data();
          allLogs.push({
            id: doc.id,
            deviceId: deviceId,
            moisture: data.moisture,
            timestamp: data.timestamp?.toDate() || new Date(),
            // Logika sederhana: Jika kelembaban >= 80, berarti baru disiram. Jika < 30, berarti peringatan kering.
            status:
              data.moisture >= 80
                ? "watered"
                : data.moisture < 30
                  ? "thirsty"
                  : "normal",
          });
        });
      }

      // Urutkan semua log berdasarkan waktu terbaru
      allLogs.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(allLogs);
    } catch (error) {
      console.error("Gagal mengambil riwayat:", error);
    } finally {
      setLoading(false);
    }
  };

  const devicesString = devices ? devices.join(",") : "";

  // Ambil data saat tab pertama kali dibuka
  useEffect(() => {
    if (devices && devices.length > 0) {
      fetchLogs();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devicesString]);

  // Fungsi format waktu (Contoh: "Hari ini, 08:30 AM" atau "12 Okt, 14:00 PM")
  const formatTime = (date) => {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    const timeString = `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;

    if (isToday) return `Hari ini, ${timeString}`;

    const options = { day: "numeric", month: "short" };
    return `${date.toLocaleDateString("id-ID", options)}, ${timeString}`;
  };

  return (
    <div className="flex-1 min-h-0 w-full px-6 pt-4 overflow-y-auto animate-fadeIn no-scrollbar relative z-10">
      {/* Header Tab */}
      <div className="flex justify-between items-center mb-6 drop-shadow-md">
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <History className="text-white/80" /> Riwayat
        </h2>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="bg-white/20 p-2 rounded-full backdrop-blur-md active:scale-95 transition-all text-white border border-white/30 hover:bg-white/30"
          title="Segarkan data"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        // Tampilan Loading
        <div className="flex flex-col items-center justify-center h-40 text-white/80 gap-3">
          <Loader2 size={32} className="animate-spin" />
          <p className="font-bold text-sm tracking-wider uppercase">
            Memuat Catatan...
          </p>
        </div>
      ) : logs.length === 0 ? (
        // Tampilan Kosong
        <div className="bg-white/20 backdrop-blur-md rounded-[2rem] p-8 text-center border border-white/30 shadow-sm flex flex-col items-center">
          <Sprout size={48} className="text-white/50 mb-4" />
          <h3 className="text-white font-bold text-lg mb-1">
            Belum Ada Aktivitas
          </h3>
          <p className="text-white/70 text-xs font-medium">
            Siram pot Anda untuk melihat riwayatnya di sini.
          </p>
        </div>
      ) : (
        // Tampilan Timeline (Garis Waktu)
        <div className="relative border-l-2 border-white/30 ml-4 pl-6 space-y-6">
          {logs.map((log, idx) => (
            <div key={log.id + idx} className="relative">
              {/* Titik Indikator di Garis Waktu */}
              <div
                className={`absolute -left-[35px] top-2 w-4 h-4 rounded-full border-4 border-[#85C4FF] shadow-sm
                ${log.status === "watered" ? "bg-blue-400" : log.status === "thirsty" ? "bg-red-400" : "bg-green-400"}
              `}
              ></div>

              {/* Kartu Riwayat */}
              <div className="bg-white/20 backdrop-blur-md rounded-3xl p-4 flex items-center gap-4 border border-white/30 shadow-sm hover:bg-white/30 transition-colors">
                {/* Ikon Dinamis Berdasarkan Status */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-inner
                  ${
                    log.status === "watered"
                      ? "bg-blue-100 text-blue-500"
                      : log.status === "thirsty"
                        ? "bg-red-100 text-red-500"
                        : "bg-green-100 text-green-500"
                  }
                `}
                >
                  {log.status === "watered" ? (
                    <Droplet size={24} fill="currentColor" />
                  ) : log.status === "thirsty" ? (
                    <ThermometerSun size={24} />
                  ) : (
                    <Sprout size={24} />
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-white font-black text-lg leading-tight">
                    {log.status === "watered"
                      ? "Disiram"
                      : log.status === "thirsty"
                        ? "Terlalu Kering"
                        : "Kondisi Aman"}
                  </h3>
                  <p className="text-white/80 text-xs font-bold mt-1 bg-black/10 inline-block px-2 py-0.5 rounded-md">
                    {log.deviceId}
                  </p>
                  <p className="text-white/70 text-xs font-medium mt-1">
                    {formatTime(log.timestamp)} • {log.moisture}% Air
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
