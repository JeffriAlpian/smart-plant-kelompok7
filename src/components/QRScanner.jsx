// src/components/QRScanner.jsx
import React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, QrCode } from 'lucide-react';

const QRScanner = ({ onScanSuccess, onClose }) => {
  return (
    <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fadeIn">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden shadow-2xl relative flex flex-col border-4 border-[#81B95B]">
        
        {/* Header Scanner */}
        <div className="bg-[#81B95B] p-4 flex justify-between items-center text-white shadow-md z-10">
          <h3 className="font-black text-lg flex items-center gap-2">
            <QrCode size={20} /> Scan QR Pot
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 bg-white/20 rounded-full hover:bg-white/40 active:scale-95 transition-all"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Area Kamera */}
        <div className="p-4 bg-gray-50 flex flex-col items-center">
          <div className="w-full rounded-2xl overflow-hidden shadow-inner border-2 border-gray-200">
            <Scanner 
              // Ganti onResult menjadi onScan
              onScan={(result) => {
                // Ambil teks dari hasil scan (bentuknya sekarang array)
                if (result && result.length > 0) {
                  onScanSuccess(result[0].rawValue);
                }
              }} 
              onError={(error) => console.log("QR Error:", error?.message)}
              // Tambahan opsional: memunculkan garis kotak scan & tombol flash
              components={{
                finder: true,
                torch: true
              }}
            />
          </div>
          <p className="text-center text-sm text-gray-500 mt-4 font-bold">
            Arahkan kamera ke QR Code yang ada di pot tanaman Anda.
          </p>
        </div>
        
      </div>
    </div>
  );
};

export default QRScanner;