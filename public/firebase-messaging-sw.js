// Mengimpor script Firebase versi "compat" langsung dari CDN Google
// Karena file ini berjalan di latar belakang (terpisah dari React), kita pakai importScripts
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// ⚠️ PENTING: GANTI DENGAN CONFIG FIREBASE MILIKMU SENDIRI 
// (Sama persis dengan yang ada di file firebase.js kamu)
const firebaseConfig = {
  apiKey: "AIzaSyAG6AttOievBlA5m7Fxj4vQ-_VdUf6vgZ0",
  authDomain: "smart-vase-kelompok7.firebaseapp.com",
  projectId: "smart-vase-kelompok7",
  storageBucket: "smart-vase-kelompok7.firebasestorage.app",
  messagingSenderId: "534571289251",
  appId: "1:534571289251:web:418a22cb6ec6596f504d16",
  measurementId: "G-YTTW7F94E5"
};

// Inisialisasi Firebase di Background
firebase.initializeApp(firebaseConfig);

// Inisialisasi Firebase Cloud Messaging
const messaging = firebase.messaging();

// Menangkap pesan saat aplikasi ditutup/berjalan di latar belakang (Background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Pesan background diterima:', payload);
  
  // Mengambil judul dan isi dari notifikasi yang dikirim (misal dari Wemos/Server)
  const notificationTitle = payload.notification.title || "Peringatan Wemos";
  const notificationOptions = {
    body: payload.notification.body || "Ada pembaruan dari pot tanamanmu.",
    icon: '/favicon.ico', // Ganti dengan path logo aplikasimu jika ada (misal: '/logo.png')
    // Badge adalah icon kecil yang muncul di status bar HP Android
    badge: '/favicon.ico', 
  };

  // Menampilkan notifikasi ke layar HP/Browser
  self.registration.showNotification(notificationTitle, notificationOptions);
});