import React, { useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import {
  Play,
  RotateCcw,
  Map,
  Droplet,
  Skull,
  Keyboard,
  Settings,
  X,
  Volume2,
  VolumeX,
  LogOut,
  Trophy,
} from "lucide-react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import * as THREE from "three";

const MAX_POOL = 30;

// =======================================================
// 1. AUDIO ENGINE
// =======================================================
const AudioEngine = {
  ctx: null,
  bgmInterval: null,
  bgmNoteIndex: 0,
  bgmNotes: [261.63, 329.63, 392.0, 523.25],

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },

  playWaterSound() {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.1);
  },

  playCrashSound() {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  },

  playBGM() {
    const ctx = this.init();
    this.stopBGM();

    this.bgmInterval = setInterval(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(this.bgmNotes[this.bgmNoteIndex], now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.start(now);
      osc.stop(now + 0.2);

      this.bgmNoteIndex = (this.bgmNoteIndex + 1) % this.bgmNotes.length;
    }, 250);
  },

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  },
};

// =======================================================
// 2. KOMPONEN 3D (Player, Tree)
// =======================================================
function Player({ lane }) {
  const groupRef = useRef();
  const targetX = (lane - 1) * 1.6;
  const scaleRef = useRef(1);

  useEffect(() => {
    const handleGulp = () => (scaleRef.current = 1.4);
    window.addEventListener("waterCollected", handleGulp);
    return () => window.removeEventListener("waterCollected", handleGulp);
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;

    groupRef.current.position.x +=
      (targetX - groupRef.current.position.x) * 0.15;
    groupRef.current.rotation.z =
      (targetX - groupRef.current.position.x) * -0.15;

    const time = state.clock.getElapsedTime();
    groupRef.current.position.y = 0.3 + Math.abs(Math.sin(time * 8)) * 0.1;

    scaleRef.current += (1 - scaleRef.current) * 0.1;
    groupRef.current.scale.set(
      scaleRef.current,
      scaleRef.current,
      scaleRef.current,
    );
  });

  return (
    <group ref={groupRef} position={[0, 0.3, 0]}>
      <mesh castShadow position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.5, 0.35, 0.6, 8]} />
        <meshStandardMaterial color="#c2410c" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.61, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.05, 8]} />
        <meshStandardMaterial color="#451a03" roughness={1} />
      </mesh>
      <mesh castShadow position={[0, 0.8, 0]} rotation={[0.2, 0, 0]}>
        <coneGeometry args={[0.2, 0.8, 4]} />
        <meshStandardMaterial color="#22c55e" flatShading />
      </mesh>
      <mesh castShadow position={[-0.2, 0.7, 0]} rotation={[-0.4, 0, 0.5]}>
        <coneGeometry args={[0.15, 0.6, 4]} />
        <meshStandardMaterial color="#16a34a" flatShading />
      </mesh>
      <mesh castShadow position={[0.2, 0.7, 0]} rotation={[-0.4, 0, -0.5]}>
        <coneGeometry args={[0.15, 0.6, 4]} />
        <meshStandardMaterial color="#15803d" flatShading />
      </mesh>
    </group>
  );
}

function Tree({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.2, 1, 5]} />
        <meshStandardMaterial color="#78350f" flatShading />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#22c55e" flatShading />
      </mesh>
    </group>
  );
}

// =======================================================
// 3. SCENE UTAMA
// =======================================================
function GameScene({
  isPlaying,
  gameOver,
  onGameOver,
  onScoreUpdate,
  onDistanceUpdate,
  playerLane,
  isPaused,
}) {
  const rocksRef = useRef([]);
  const watersRef = useRef([]);
  const linesGroupRef = useRef();

  const gameState = useRef({
    obstacles: [],
    waterDrops: [],
    frames: 0,
    distance: 0,
    waterScore: 0,
    speedMultiplier: 1,
    isAlive: false,
  });

  // SOLUSI BUG: Menghapus dependensi onDistanceUpdate dan onScoreUpdate
  // Agar tidak mereset scene saat pemain berpindah jalur
  useEffect(() => {
    if (isPlaying && !gameOver) {
      gameState.current = {
        obstacles: [],
        waterDrops: [],
        frames: 0,
        distance: 0,
        waterScore: 0,
        speedMultiplier: 1,
        isAlive: true,
      };
      onDistanceUpdate(0);
      onScoreUpdate(0);
      rocksRef.current.forEach((m) => m && (m.visible = false));
      watersRef.current.forEach((m) => m && (m.visible = false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameOver]);

  useFrame(() => {
    const state = gameState.current;
    if (!state.isAlive || !isPlaying || isPaused) return;

    state.frames++;
    state.speedMultiplier += 0.0003;
    state.distance += 0.05 * state.speedMultiplier;
    onDistanceUpdate(Math.floor(state.distance));

    if (linesGroupRef.current) {
      linesGroupRef.current.position.z += 0.2 * state.speedMultiplier;
      if (linesGroupRef.current.position.z > 20)
        linesGroupRef.current.position.z = 0;
    }

    const spawnRate = Math.max(25, 60 - Math.floor(state.frames / 100));
    if (state.frames % spawnRate === 0) {
      const spawnSpeed = 0.2 + state.speedMultiplier * 0.05;
      const patternType = Math.random();

      if (patternType < 0.4) {
        const safeLane = Math.floor(Math.random() * 3);
        for (let i = 0; i < 3; i++) {
          if (i === safeLane && state.waterDrops.length < MAX_POOL) {
            state.waterDrops.push({
              lane: i,
              z: -50,
              speed: spawnSpeed,
              active: true,
            });
          } else if (i !== safeLane && state.obstacles.length < MAX_POOL) {
            state.obstacles.push({
              lane: i,
              z: -50,
              speed: spawnSpeed,
              active: true,
            });
          }
        }
      } else if (patternType < 0.7) {
        const bonusLane = Math.floor(Math.random() * 3);
        for (let j = 0; j < 3; j++) {
          if (state.waterDrops.length < MAX_POOL) {
            state.waterDrops.push({
              lane: bonusLane,
              z: -50 - j * 2.5,
              speed: spawnSpeed,
              active: true,
            });
          }
        }
        const rockLane = (bonusLane + 1) % 3;
        if (state.obstacles.length < MAX_POOL) {
          state.obstacles.push({
            lane: rockLane,
            z: -50,
            speed: spawnSpeed,
            active: true,
          });
        }
      } else {
        const rockLane = Math.floor(Math.random() * 3);
        const waterLane = (rockLane + (Math.random() > 0.5 ? 1 : 2)) % 3;
        if (state.obstacles.length < MAX_POOL)
          state.obstacles.push({
            lane: rockLane,
            z: -50,
            speed: spawnSpeed,
            active: true,
          });
        if (state.waterDrops.length < MAX_POOL)
          state.waterDrops.push({
            lane: waterLane,
            z: -50,
            speed: spawnSpeed,
            active: true,
          });
      }
    }

    // Update Batu
    for (let i = 0; i < MAX_POOL; i++) {
      const obs = state.obstacles[i];
      const mesh = rocksRef.current[i];
      if (!mesh) continue;

      if (obs && obs.active) {
        obs.z += obs.speed;
        mesh.position.set((obs.lane - 1) * 1.6, 0.4, obs.z);
        mesh.rotation.x += 0.02;
        mesh.rotation.y += 0.01;
        mesh.visible = true;

        if (obs.lane === playerLane && Math.abs(obs.z - 0) < 1.0) {
          state.isAlive = false;
          AudioEngine.playCrashSound();
          onGameOver(Math.floor(state.distance), state.waterScore);
        }
        if (obs.z > 5) obs.active = false;
      } else {
        mesh.visible = false;
      }
    }
    state.obstacles = state.obstacles.filter((o) => o.active);

    // Update Air
    for (let i = 0; i < MAX_POOL; i++) {
      const drop = state.waterDrops[i];
      const mesh = watersRef.current[i];
      if (!mesh) continue;

      if (drop && drop.active) {
        drop.z += drop.speed;
        mesh.position.set(
          (drop.lane - 1) * 1.6,
          1.2 + Math.sin(state.frames * 0.1 + i) * 0.2,
          drop.z,
        );
        mesh.rotation.y += 0.05;
        mesh.visible = true;

        if (drop.lane === playerLane && Math.abs(drop.z - 0) < 1.0) {
          AudioEngine.playWaterSound();
          window.dispatchEvent(new Event("waterCollected"));
          drop.active = false;
          state.waterScore += 1;
          onScoreUpdate(state.waterScore);
        }
        if (drop.z > 5) drop.active = false;
      } else {
        mesh.visible = false;
      }
    }
    state.waterDrops = state.waterDrops.filter((w) => w.active);
  });

  return (
    <>
      <color attach="background" args={["#38bdf8"]} />
      <fog attach="fog" args={["#38bdf8", 40, 60]} />
      <Sky sunPosition={[10, 20, -50]} turbidity={0.1} rayleigh={0.5} />
      <ambientLight intensity={0.7} />
      <directionalLight
        castShadow
        position={[10, 20, 10]}
        intensity={1.5}
        color="#ffffff"
        shadow-mapSize={[1024, 1024]}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, -20]}
        receiveShadow
      >
        <planeGeometry args={[100, 120]} />
        <meshStandardMaterial color="#84cc16" roughness={1} />
      </mesh>

      <group ref={linesGroupRef} position={[0, 0.01, 0]}>
        {[-0.8, 0.8].map((x, i) => (
          <mesh
            key={i}
            position={[x, 0, -30]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[0.1, 100]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
      </group>

      <Tree position={[-4, 0, -10]} />
      <Tree position={[4, 0, -25]} />
      <Tree position={[-5, 0, -40]} />
      <Tree position={[5, 0, -15]} />

      <Player lane={playerLane} />

      {/* Rintangan dan Air diganti ke deklarasi Inline untuk keamanan Memori */}
      {[...Array(MAX_POOL)].map((_, i) => (
        <mesh
          key={`rock-${i}`}
          ref={(el) => (rocksRef.current[i] = el)}
          visible={false}
          castShadow
        >
          <dodecahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial
            color="#8b9bb4"
            roughness={0.9}
            flatShading={true}
          />
        </mesh>
      ))}

      {[...Array(MAX_POOL)].map((_, i) => (
        <mesh
          key={`water-${i}`}
          ref={(el) => (watersRef.current[i] = el)}
          visible={false}
          castShadow
        >
          <coneGeometry args={[0.4, 0.8, 8]} />
          <meshStandardMaterial
            color="#0ea5e9"
            roughness={0.1}
            metalness={0.1}
            flatShading={true}
          />
        </mesh>
      ))}
    </>
  );
}

// =======================================================
// 4. ROOT COMPONENT
// =======================================================
export default function RootGame({ setShowGame, username, userId }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState({ distance: 0, water: 0 });
  const [playerLane, setPlayerLane] = useState(1);
  const [showSetting, setShowSetting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const distanceRef = useRef(null);
  const waterRef = useRef(null);
  const touchStartX = useRef(0);

  // Fungsi untuk mengambil Leaderboard
  const fetchLeaderboard = async () => {
    try {
      const q = query(
        collection(db, "leaderboard"),
        orderBy("distance", "desc"),
        limit(5),
      );
      const querySnapshot = await getDocs(q);
      const scores = [];
      querySnapshot.forEach((doc) => {
        scores.push({ id: doc.id, ...doc.data() });
      });
      setLeaderboard(scores);
    } catch (error) {
      console.error("Gagal mengambil leaderboard:", error);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const handleToggleMusic = () => {
    setIsMuted((prev) => {
      const newState = !prev;
      if (newState) AudioEngine.stopBGM();
      else if (isPlaying && !gameOver) AudioEngine.playBGM();
      return newState;
    });
  };

  const handleQuitGame = () => {
    AudioEngine.stopBGM();
    setShowSetting(false);
    setIsPlaying(false);
    setGameOver(false);
    if (setShowGame) {
      setShowGame(false);
    }
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setFinalScore({ distance: 0, water: 0 });
    setPlayerLane(1);
    if (!isMuted) AudioEngine.playBGM();
  };

  const handleGameOver = async (distance, water) => {
    AudioEngine.stopBGM();
    setFinalScore({ distance, water });
    setGameOver(true);
    setIsPlaying(false);

    // Cek apakah skor lebih dari 0 dan userId tersedia
    if (distance > 0 && userId) {
      setIsSaving(true);
      try {
        // Buat referensi dokumen spesifik untuk user ini
        const scoreRef = doc(db, "leaderboard", userId);
        const scoreSnap = await getDoc(scoreRef);

        let shouldUpdate = false;

        if (!scoreSnap.exists()) {
          // Jika belum pernah main, langsung simpan
          shouldUpdate = true;
        } else {
          // Jika sudah ada data, bandingkan skornya
          const currentData = scoreSnap.data();
          if (distance > currentData.distance) {
            shouldUpdate = true;
          }
        }

        // Hanya update ke database JIKA mencetak rekor baru
        if (shouldUpdate) {
          await setDoc(
            scoreRef,
            {
              name: username,
              distance: distance,
              water: water,
              date: new Date().toISOString(),
            },
            { merge: true },
          ); // merge: true agar data lain tidak terhapus

          await fetchLeaderboard(); // Refresh tabel top 5
        }
      } catch (error) {
        console.error("Gagal menyimpan skor:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleScoreUpdate = useCallback((score) => {
    if (waterRef.current) waterRef.current.innerText = score;
  }, []);

  const handleDistanceUpdate = useCallback((distance) => {
    if (distanceRef.current) distanceRef.current.innerText = distance + "m";
  }, []);

  const handleMoveLeft = () => setPlayerLane((prev) => Math.max(0, prev - 1));
  const handleMoveRight = () => setPlayerLane((prev) => Math.min(2, prev + 1));

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlaying || gameOver) return;
      if (e.key === "ArrowLeft") handleMoveLeft();
      if (e.key === "ArrowRight") handleMoveRight();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, gameOver]);

  const handleTouchEndWrapper = (e) => {
    if (!isPlaying || gameOver) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX.current;
    if (Math.abs(diff) > 30) {
      diff > 0 ? handleMoveRight() : handleMoveLeft();
    } else {
      const tapX = touchEndX - e.target.getBoundingClientRect().left;
      tapX < window.innerWidth / 2 ? handleMoveLeft() : handleMoveRight();
    }
  };

  const handleClickWrapper = (e) => {
    if (!isPlaying || gameOver) return;
    const tapX = e.clientX - e.target.getBoundingClientRect().left;
    tapX < window.innerWidth / 2 ? handleMoveLeft() : handleMoveRight();
  };

  useEffect(() => {
    return () => AudioEngine.stopBGM();
  }, []);

  return (
    <div className="relative w-full h-dvh max-w-md mx-auto select-none overflow-hidden touch-none bg-[#84cc16]">
      {/* ========================================= */}
      {/* ⚙️ MODAL PENGATURAN */}
      {/* ========================================= */}
      {showSetting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-sky-900/40 backdrop-blur-sm p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800">PENGATURAN</h3>
              <button
                onClick={() => setShowSetting(false)}
                className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <button
                onClick={handleToggleMusic}
                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 active:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      isMuted ? "bg-slate-200" : "bg-blue-100"
                    }`}
                  >
                    {isMuted ? (
                      <VolumeX size={20} className="text-slate-500" />
                    ) : (
                      <Volume2 size={20} className="text-blue-500" />
                    )}
                  </div>
                  <span className="font-bold text-slate-700">Musik Latar</span>
                </div>
                <div
                  className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${
                    isMuted ? "bg-slate-300" : "bg-green-500"
                  }`}
                >
                  <div
                    className={`bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform duration-300 ${
                      isMuted ? "translate-x-0" : "translate-x-6"
                    }`}
                  />
                </div>
              </button>
              <button
                onClick={handleQuitGame}
                className="w-full flex items-center justify-center gap-2 p-4 mt-4 bg-rose-100 text-rose-600 font-bold rounded-2xl active:bg-rose-200 hover:bg-rose-200 transition-colors"
              >
                <LogOut size={20} />
                Keluar ke Menu Utama
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* 🏆 MODAL LEADERBOARD */}
      {/* ========================================= */}
      {showLeaderboard && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-sky-900/60 backdrop-blur-md p-6 animate-in fade-in duration-200">
          <div className="bg-white/10 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl border border-white/20 relative overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Efek Cahaya */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-400/20 blur-3xl rounded-full pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <h2 className="text-2xl font-black text-white flex items-center gap-2 drop-shadow-md">
                <Trophy className="text-yellow-400" size={28} /> TOP 5
              </h2>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors border border-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-3 relative z-10">
              {leaderboard.length === 0 ? (
                <div className="text-center text-white/60 py-6 font-medium bg-black/20 rounded-2xl border border-white/5">
                  Belum ada rekor. Jadilah yang pertama!
                </div>
              ) : (
                leaderboard.map((score, index) => (
                  <div
                    key={score.id || index}
                    className={`flex items-center justify-between p-3 rounded-2xl border ${
                      index === 0
                        ? "bg-gradient-to-r from-yellow-500/30 to-yellow-600/10 border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.2)]"
                        : index === 1
                        ? "bg-slate-300/20 border-slate-300/40"
                        : index === 2
                        ? "bg-amber-700/30 border-amber-600/40"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-black text-xl w-6 text-center drop-shadow-md ${
                          index === 0
                            ? "text-yellow-400"
                            : index === 1
                            ? "text-slate-200"
                            : index === 2
                            ? "text-amber-500"
                            : "text-white/40"
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <span className="font-extrabold text-white text-base capitalize tracking-wide truncate max-w-[100px]">
                        {score.name}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-black text-white text-lg drop-shadow-sm leading-tight">
                        {Math.floor(score.distance)}
                        <span className="text-[10px] text-white/60 ml-0.5">
                          m
                        </span>
                      </span>
                      <span className="text-[10px] font-bold text-blue-300 flex items-center gap-1 bg-blue-500/20 px-1.5 py-0.5 rounded mt-0.5">
                        <Droplet size={10} fill="currentColor" /> {score.water}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* 🎮 CANVAS 3D GAME */}
      {/* ========================================= */}
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 3, 7], fov: 60 }}
        onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
        onTouchEnd={handleTouchEndWrapper}
        onClick={handleClickWrapper}
        className="absolute inset-0 w-full h-full outline-none"
        dpr={[1, 1.5]}
      >
        <GameScene
          isPlaying={isPlaying}
          gameOver={gameOver}
          onGameOver={handleGameOver}
          onScoreUpdate={handleScoreUpdate}
          onDistanceUpdate={handleDistanceUpdate}
          playerLane={playerLane}
          isPaused={showSetting}
        />
      </Canvas>

      {/* ========================================= */}
      {/* 📊 HUD (Head-Up Display) ATAS */}
      {/* ========================================= */}
      <div className="absolute top-8 w-full flex z-40 justify-between items-start px-4 pointer-events-none">
        {/* Kiri: Tombol Pengaturan, Tombol Leaderboard (Tampil saat tidak main) */}
        <div className="flex gap-2.5 items-start pointer-events-auto">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowSetting(true)}
              className="bg-sky-200/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-transform"
            >
              <Settings size={24} className="text-amber-300 fill-yellow-100" />
            </button>

            {/* 👈 TOMBOL LEADERBOARD BARU (Hanya muncul jika game tidak sedang dimainkan) */}
            {!isPlaying && (
              <button
                onClick={() => setShowLeaderboard(true)}
                className="bg-yellow-400/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-transform"
              >
                <Trophy size={24} className="text-yellow-200 fill-yellow-400" />
              </button>
            )}
          </div>
        </div>

        {/* Tengah: Jarak */}
        <div className="flex flex-col items-center pointer-events-auto">
          <div className="bg-sky-200/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm flex items-center gap-3">
            <Map size={24} className="text-rose-500 fill-yellow-100" />
            <span
              ref={distanceRef}
              className="font-extrabold text-white text-xl drop-shadow-md"
            >
              0m
            </span>
          </div>
          <span className="text-white font-bold text-sm mt-1 drop-shadow-md">
            Distance
          </span>
        </div>

        {/* Kanan: Air */}
        <div className="flex flex-col items-center pointer-events-auto">
          <div className="bg-sky-200/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm flex items-center gap-3">
            <Droplet size={24} className="text-blue-500" fill="#38bdf8" />
            <span
              ref={waterRef}
              className="font-extrabold text-white text-xl drop-shadow-md"
            >
              0
            </span>
          </div>
          <span className="text-white font-bold text-sm mt-1 drop-shadow-md">
            Water
          </span>
        </div>
      </div>

      {/* ========================================= */}
      {/* 🏁 OVERLAY MENU (Belum Main & Game Over) */}
      {/* ========================================= */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-sky-900/40 backdrop-blur-sm flex flex-col items-center justify-center p-8 z-30 animate-in fade-in duration-500 text-center pointer-events-none">
          {/* Tambahkan pointer-events-auto pada kotak putih agar bisa diklik, sisa layar background tetap tembus */}
          {gameOver ? (
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center w-full animate-in zoom-in-95 duration-300 pointer-events-auto mt-20">
              <div className="w-20 h-20 bg-rose-100 rounded-3xl flex items-center justify-center mb-4">
                <Skull size={40} className="text-rose-500" />
              </div>
              <h3 className="text-3xl font-black text-slate-800 mb-6">
                GAME OVER
              </h3>
              <div className="flex justify-around w-full mb-8">
                <div className="flex flex-col items-center">
                  <span className="text-slate-400 text-xs font-bold uppercase mb-1">
                    Jarak
                  </span>
                  <span className="text-3xl font-black text-slate-800">
                    {finalScore.distance}
                    <span className="text-base text-slate-400">m</span>
                  </span>
                </div>
                <div className="w-px h-10 bg-slate-200 my-auto"></div>
                <div className="flex flex-col items-center">
                  <span className="text-slate-400 text-xs font-bold uppercase mb-1">
                    Air
                  </span>
                  <span className="text-3xl font-black text-blue-500">
                    {finalScore.water}
                  </span>
                </div>
              </div>

              {/* Pesan Loading/Saving */}
              {isSaving && (
                <div className="text-sm font-bold text-blue-500 animate-pulse mb-3">
                  Menyimpan skor ke Leaderboard...
                </div>
              )}

              <button
                onClick={startGame}
                disabled={isSaving}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-black py-4 px-8 rounded-2xl flex justify-center items-center gap-2 text-lg shadow-[0_8px_0_#1d4ed8] active:translate-y-2 active:shadow-none transition-all"
              >
                <RotateCcw size={22} /> MAIN LAGI
              </button>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center w-full animate-in zoom-in-95 duration-300 pointer-events-auto mt-20">
              <div className="w-24 h-24 bg-green-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                <Play
                  size={40}
                  className="text-green-500 ml-2"
                  fill="currentColor"
                />
              </div>
              <h3 className="text-3xl font-black text-slate-800 mb-2">
                PLANT RUN
              </h3>
              <div className="bg-slate-50 p-4 rounded-2xl mb-8 w-full text-slate-600 text-sm border border-slate-100">
                <div className="flex items-center justify-center gap-2 mb-2 text-slate-800 font-bold">
                  <Keyboard size={18} /> CARA MAIN
                </div>
                <p>
                  <strong>Mobile:</strong> Tap sisi layar.
                </p>
                <p>
                  <strong>PC:</strong> Gunakan Panah ◀ ▶.
                </p>
                <p className="mt-3 text-xs text-rose-500 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">
                  Hindari Batu, Kumpulkan Air Biru!
                </p>
              </div>
              <button
                onClick={startGame}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 px-8 rounded-2xl flex justify-center items-center gap-2 text-lg shadow-[0_8px_0_#15803d] active:translate-y-2 active:shadow-none transition-all"
              >
                <Play size={22} fill="currentColor" /> MULAI GAME
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
