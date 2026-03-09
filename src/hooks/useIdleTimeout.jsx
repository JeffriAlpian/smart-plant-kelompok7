import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function useIdleTimeout(timeoutMinutes = 30) {
  const { currentUser, logout } = useAuth();
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Jika user belum login, matikan "CCTV" ini
    if (!currentUser) return;

    // Fungsi untuk mereset timer setiap kali ada pergerakan
    const resetTimer = () => {
      // Hapus timer yang lama
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      // Buat timer baru
      timeoutRef.current = setTimeout(() => {
        logout();
        alert("Sesi Anda telah berakhir karena tidak ada aktivitas.");
      }, timeoutMinutes * 60 * 1000); // Rumus: Menit x Detik x Milidetik
    };

    // Daftar aktivitas yang dianggap "User sedang aktif"
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    // Pasang alat pendeteksi ke layar untuk setiap aktivitas di atas
    events.forEach((event) => window.addEventListener(event, resetTimer));

    // Mulai hitung mundur saat user baru login
    resetTimer();

    // BERSIH-BERSIH: Cabut alat pendeteksi saat user logout (Mencegah error Memory Leak)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [currentUser, logout, timeoutMinutes]); // Efek ini di-refresh jika status login berubah
}