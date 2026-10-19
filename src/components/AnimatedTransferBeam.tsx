import React from 'react';
import { motion } from 'motion/react';
import {
  Laptop,
  Smartphone,
  Shield,
  Zap,
  Volume2,
  VolumeX,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { TransferProgress, PeerDevice } from '../types';
import { formatSpeed, formatBytes } from '../utils/format';
import { soundFx } from '../utils/soundEffects';

interface AnimatedTransferBeamProps {
  progress?: TransferProgress | null;
  peers: PeerDevice[];
  myDeviceName: string;
  isP2PConnected: boolean;
  isStegoActive?: boolean;
}

export const AnimatedTransferBeam: React.FC<AnimatedTransferBeamProps> = ({
  progress,
  peers,
  myDeviceName,
  isP2PConnected,
  isStegoActive = false,
}) => {
  const [isMuted, setIsMuted] = React.useState(() => soundFx.getMuted());

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundFx.setMuted(next);
    if (!next) {
      soundFx.playSound('click');
    }
  };

  const isTransferring = progress && (progress.status === 'transferring' || progress.status === 'preparing');
  const isComplete = progress && progress.status === 'completed';
  const isSending = progress ? progress.direction === 'sending' : true;
  const peerName = peers[0]?.deviceName || progress?.peerDeviceName || 'Mobile Device';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 p-4 text-white shadow-xl dark:border-neutral-800">
      {/* Background Cyber Glow & Grid Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* Top Bar: Connection Mode & Audio Toggle */}
      <div className="relative z-10 flex flex-wrap sm:flex-nowrap items-center justify-between pb-3 border-b border-white/10 gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isTransferring ? 'bg-cyan-400 animate-ping' : isP2PConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                isTransferring ? 'bg-cyan-500' : isP2PConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="font-semibold text-white/90 text-xs sm:text-sm">
            {isTransferring
              ? isStegoActive
                ? '🕵️ Steganography Stream Active'
                : 'Direct P2P Data Transit'
              : isP2PConnected
              ? 'Paired & Synchronized'
              : 'Awaiting Peer Connection'}
          </span>
          <span className="text-white/40 hidden xs:inline">·</span>
          <span className="text-white/60 font-mono text-[10px] sm:text-[11px]">
            {isTransferring ? formatSpeed(progress.speedBps) : 'Zero-Cloud Relay'}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          {/* Steganography Active Indicator */}
          {isStegoActive && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300"
            >
              <Sparkles className="h-2.5 w-2.5 text-cyan-400" />
              <span>STEGO ENCODED</span>
            </motion.div>
          )}

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/20 active:scale-95 transition cursor-pointer"
            title={isMuted ? 'Unmute cyber audio effects' : 'Mute audio effects'}
          >
            {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3 text-cyan-400" />}
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound ON'}</span>
          </button>
        </div>
      </div>

      {/* Main Bridge: Device Left -> Energetic Beam -> Device Right */}
      <div className="relative z-10 my-4 flex items-center justify-between gap-2 sm:gap-6 px-1 sm:px-4">
        {/* Left Node: Desktop / Laptop Device */}
        <div className="flex flex-col items-center text-center shrink-0">
          <motion.div
            animate={isTransferring ? { scale: [1, 1.08, 1], rotate: [0, 1, -1, 0] } : {}}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className={`flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border transition-all ${
              isTransferring
                ? 'border-indigo-400 bg-indigo-500/20 shadow-[0_0_24px_rgba(99,102,241,0.6)] ring-2 ring-indigo-400/40'
                : 'border-white/20 bg-white/5 hover:border-white/40'
            }`}
          >
            <Laptop className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400" />
          </motion.div>
          <span className="mt-1.5 text-[10px] sm:text-[11px] font-bold text-white/90 max-w-[75px] sm:max-w-[120px] truncate">
            {myDeviceName || 'This Device'}
          </span>
          <span className="text-[9px] sm:text-[10px] font-mono text-white/50">Sender / Host</span>
        </div>

        {/* Central Energy Beam Channel */}
        <div className="relative flex-1 flex flex-col items-center px-1 sm:px-2 min-w-0">
          {/* Laser Tube */}
          <div className="relative h-2.5 sm:h-3.5 w-full rounded-full bg-white/10 overflow-hidden shadow-inner border border-white/20">
            {/* Active Transfer Progress Fill */}
            {progress && (
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
                transition={{ ease: 'easeOut', duration: 0.3 }}
                className={`h-full rounded-full ${
                  isStegoActive
                    ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-indigo-500 shadow-[0_0_14px_#06b6d4]'
                    : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 shadow-[0_0_14px_#6366f1]'
                }`}
              />
            )}

            {/* Continuous Pulsing Photons during Transfer */}
            {isTransferring && (
              <>
                <motion.div
                  initial={{ x: isSending ? '-20%' : '100%' }}
                  animate={{ x: isSending ? '120%' : '-40%' }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.1,
                    ease: 'linear',
                  }}
                  className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white to-transparent opacity-90 blur-[1px]"
                />
                <motion.div
                  initial={{ x: isSending ? '-30%' : '110%' }}
                  animate={{ x: isSending ? '130%' : '-50%' }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.75,
                    ease: 'linear',
                  }}
                  className="absolute top-0.5 bottom-0.5 w-8 rounded-full bg-white shadow-[0_0_10px_#ffffff] opacity-100"
                />
              </>
            )}

            {/* Idle Radar Scan Pulse when looking for peers */}
            {!isTransferring && peers.length === 0 && (
              <motion.div
                initial={{ x: '-30%' }}
                animate={{ x: '130%' }}
                transition={{
                  repeat: Infinity,
                  duration: 2.5,
                  ease: 'easeInOut',
                }}
                className="absolute top-0 bottom-0 w-16 bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent"
              />
            )}
          </div>

          {/* Center Info Tag */}
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] truncate w-full">
            {isTransferring ? (
              <div className="flex items-center gap-1 font-mono font-bold text-cyan-300 truncate">
                {isSending ? (
                  <ArrowRight className="h-3 w-3 shrink-0 animate-pulse text-indigo-400" />
                ) : (
                  <ArrowLeft className="h-3 w-3 shrink-0 animate-pulse text-cyan-400" />
                )}
                <span className="truncate">
                  {progress?.percent.toFixed(0)}% · {formatBytes(progress?.bytesTransferred || 0)}
                </span>
              </div>
            ) : isComplete ? (
              <span className="font-semibold text-emerald-400 animate-bounce">Transfer Completed Successfully</span>
            ) : (
              <span className="text-white/60 text-[10px] truncate text-center">
                {peers.length > 0 ? '⚡ Direct P2P Ready' : 'Scan QR or enter 6-digit code to pair'}
              </span>
            )}
          </div>
        </div>

        {/* Right Node: Smartphone Device */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            animate={isTransferring ? { scale: [1, 1.06, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
            className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border ${
              isTransferring
                ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
                : 'border-white/20 bg-white/5'
            }`}
          >
            <Smartphone className="h-6 w-6 text-cyan-400" />
          </motion.div>
          <span className="mt-1.5 text-[11px] font-bold text-white/90 max-w-[80px] sm:max-w-[120px] truncate">
            {peerName}
          </span>
          <span className="text-[10px] font-mono text-white/50">Mobile Receiver</span>
        </div>
      </div>
    </div>
  );
};
