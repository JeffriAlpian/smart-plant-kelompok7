import { useEffect, useRef } from 'react';
import { CapacitorBarcodeScanner } from '@capacitor/barcode-scanner';

const QRScanner = ({ onClose, onScanSuccess }) => {
  // Gunakan useRef sebagai gembok agar kamera tidak dipanggil berkali-kali
  const isScanning = useRef(false);

  useEffect(() => {
    // Kalau sudah proses scan, hentikan eksekusi selanjutnya
    if (isScanning.current) return;
    isScanning.current = true;

    const startNativeScan = async () => {
      try {
        const result = await CapacitorBarcodeScanner.scanBarcode({
          hint: 17, 
          cameraDirection: 1, 
        });
        
        if (result && result.ScanResult) {
          onScanSuccess(result.ScanResult);
        } else {
          // Batal scan (user menekan tombol back/cancel)
          onClose();
        }
      } catch (error) {
        console.error("Scanner Error:", error);
        alert("Gagal membuka kamera. Pastikan izin diberikan.");
        onClose();
      }
    };

    startNativeScan();
    
    // PERHATIKAN: Array di bawah ini sekarang KOSONG []
  }, []); 

  return null; 
};

export default QRScanner;