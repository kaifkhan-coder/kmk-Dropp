import React, { useState, useEffect } from 'react';
import {
  Users,
  Smartphone,
  Monitor,
  Tablet,
  Laptop,
  Radio,
  RefreshCw,
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  MessageSquare,
  KeyRound,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { ActiveUsersStats, ActivePeerUser, PeerDevice } from '../types';

interface ActiveUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ActiveUsersStats | null;
  onRefresh: () => void;
  currentRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onOpenMessages: () => void;
  peers?: PeerDevice[];
  myDeviceName?: string;
}

export const ActiveUsersModal: React.FC<ActiveUsersModalProps> = ({
  isOpen,
  onClose,
  stats,
  onRefresh,
  currentRoomId,
  onSelectRoom,
  onOpenMessages,
  peers = [],
  myDeviceName,
}) => {
  const [batteryState, setBatteryState] = useState<{
    level: number;
    charging: boolean;
    supported: boolean;
  }>({ level: 100, charging: false, supported: false });

  // Web Battery API Monitoring for connected device power management
  useEffect(() => {
    if (!isOpen) return;

    let batteryManager: any = null;

    const handleBatteryUpdate = (b: any) => {
      setBatteryState({
        level: Math.round(b.level * 100),
        charging: Boolean(b.charging),
        supported: true,
      });
    };

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          batteryManager = battery;
          handleBatteryUpdate(battery);
          battery.addEventListener('levelchange', () => handleBatteryUpdate(battery));
          battery.addEventListener('chargingchange', () => handleBatteryUpdate(battery));
        })
        .catch(() => {
          // Battery API not permitted or unsupported on browser
        });
    }

    return () => {
      if (batteryManager) {
        batteryManager.removeEventListener('levelchange', () => {});
        batteryManager.removeEventListener('chargingchange', () => {});
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Build unified user list: stats.users + connected peers + self
  const baseUsers: ActivePeerUser[] = stats?.users ? [...stats.users] : [];

  // Ensure self device is present
  if (!baseUsers.some((u) => u.isSelf)) {
    baseUsers.unshift({
      id: 'self',
      name: myDeviceName || 'This Device',
      deviceType: 'desktop',
      deviceName: myDeviceName || 'This Device',
      roomId: currentRoomId,
      joinedAt: Date.now(),
      lastActive: Date.now(),
      status: 'active',
      isSelf: true,
      batteryLevel: batteryState.supported ? batteryState.level : undefined,
      batteryCharging: batteryState.charging,
    });
  }

  // Merge any live room peers from useTransferEngine
  for (const p of peers) {
    const existingIdx = baseUsers.findIndex((u) => u.id === p.id);
    if (existingIdx >= 0) {
      baseUsers[existingIdx] = {
        ...baseUsers[existingIdx],
        batteryLevel: p.batteryLevel ?? baseUsers[existingIdx].batteryLevel,
        batteryCharging: p.batteryCharging ?? baseUsers[existingIdx].batteryCharging,
      };
    } else {
      baseUsers.push({
        id: p.id,
        name: p.deviceName,
        deviceType: p.deviceType,
        deviceName: p.deviceName,
        roomId: currentRoomId,
        joinedAt: Date.now() - 45000,
        lastActive: Date.now(),
        status: 'active',
        isSelf: false,
        batteryLevel: p.batteryLevel,
        batteryCharging: p.batteryCharging,
      });
    }
  }

  const users = baseUsers;
  const totalCount = Math.max(stats?.totalOnlineUsers || 0, users.length);
  const totalRooms = stats?.totalRooms || new Set(users.map((u) => u.roomId)).size || 1;

  // Detect any paired devices low on battery (<= 20% and not charging)
  const lowBatteryPairedDevices = users.filter(
    (u) => !u.isSelf && typeof u.batteryLevel === 'number' && u.batteryLevel <= 20 && !u.batteryCharging
  );

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4 text-emerald-500" />;
      case 'tablet':
        return <Tablet className="h-4 w-4 text-purple-500" />;
      case 'desktop':
      default:
        return <Monitor className="h-4 w-4 text-indigo-500" />;
    }
  };

  const formatJoinedTime = (joinedAt: number) => {
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - joinedAt) / 1000));
    if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;
    const mins = Math.floor(elapsedSeconds / 60);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-neutral-200 bg-white shadow-2xl transition-all dark:border-neutral-800 dark:bg-neutral-950">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 p-6 dark:border-neutral-800">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100/80 px-3 py-1 text-xs font-semibold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live System Presence</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              <span>Active Users & Connected Devices</span>
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Real-time directory of all active peers and registered users currently connected across the transfer network.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              title="Refresh users directory"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white transition"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-3 border-b border-neutral-100 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div className="flex flex-col rounded-xl border border-neutral-200/60 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Total Online Users
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-neutral-900 dark:text-white">
                {totalCount}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                ● Live Now
              </span>
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-neutral-200/60 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Active Transfer Rooms
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-neutral-900 dark:text-white">
                {totalRooms}
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                Encrypted
              </span>
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-neutral-200/60 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Current Room
            </span>
            <div className="mt-1 flex items-baseline gap-1 truncate">
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate">
                {currentRoomId}
              </span>
            </div>
          </div>
        </div>

        {/* Top Warning Banner for Any Paired Device Low on Power */}
        {lowBatteryPairedDevices.length > 0 && (
          <div className="mx-4 sm:mx-6 mt-4 flex items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50/90 p-3.5 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200 animate-pulse">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-bold">
                Paired Device Low Power Warning
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                {lowBatteryPairedDevices.map((p) => p.name || p.deviceName).join(', ')} is low on power ({lowBatteryPairedDevices.map((p) => `${p.batteryLevel}%`).join(', ')}). Please connect a charger to prevent transfer interruptions!
              </p>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 max-h-[440px]">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center text-neutral-400">
              <Users className="h-10 w-10 text-neutral-300 dark:text-neutral-700 mb-2" />
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Network Privacy & Protection Enabled
              </p>
              <p className="mt-1 text-[11px] text-neutral-500 max-w-sm">
                Detailed peer identities are hidden in the public dashboard. Full user records, history, and real-time active device tracking are restricted solely to the System Administrator (<span className="font-mono text-indigo-600 dark:text-indigo-400">khankaifcom551@gmail.com</span>).
              </p>
            </div>
          ) : (
            users.map((peer) => {
              const inSameRoom = peer.roomId === currentRoomId;
              const isSelf = Boolean(peer.isSelf);
              const batteryLevel = isSelf && batteryState.supported ? batteryState.level : peer.batteryLevel;
              const isCharging = isSelf && batteryState.supported ? batteryState.charging : Boolean(peer.batteryCharging);
              const hasBattery = typeof batteryLevel === 'number';
              const isLowPower = hasBattery && batteryLevel <= 20 && !isCharging;

              return (
                <div
                  key={peer.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition ${
                    isLowPower
                      ? 'border-rose-300 bg-rose-50/40 dark:border-rose-900/60 dark:bg-rose-950/20'
                      : peer.isSelf
                      ? 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/60 dark:bg-indigo-950/20'
                      : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700'
                  }`}
                >
                  {/* Left: Device & User info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                      {getDeviceIcon(peer.deviceType)}
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-neutral-900" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {peer.name || peer.deviceName || 'Connected Peer'}
                        </span>
                        {peer.isSelf && (
                          <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            You
                          </span>
                        )}
                        {inSameRoom && !peer.isSelf && (
                          <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            Paired with You
                          </span>
                        )}

                        {/* Battery Monitoring Indicator for Connected Device */}
                        {hasBattery && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border transition ${
                              isCharging
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/60'
                                : isLowPower
                                ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900 animate-pulse'
                                : batteryLevel <= 50
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60'
                                : 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700'
                            }`}
                            title={
                              isCharging
                                ? `${isSelf ? 'Your device' : peer.name} is charging (${batteryLevel}%)`
                                : isLowPower
                                ? `Low battery warning (${batteryLevel}%): connect charger`
                                : `Device power: ${batteryLevel}%`
                            }
                          >
                            {isCharging ? (
                              <BatteryCharging className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            ) : isLowPower ? (
                              <BatteryWarning className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                            ) : (
                              <Battery className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
                            )}
                            <span>{batteryLevel}%</span>
                            {isCharging && <span className="text-[9px]">⚡</span>}
                          </span>
                        )}
                      </div>

                      {/* Low Power Alert Banner */}
                      {isLowPower && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>
                            {isSelf
                              ? 'Low Power Alert: Connect charger to avoid transfer interruption!'
                              : `Low Battery Warning: Paired device (${peer.name || peer.deviceName}) has ${batteryLevel}% battery remaining!`}
                          </span>
                        </div>
                      )}

                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                        {peer.email ? (
                          <span className="font-mono text-neutral-700 dark:text-neutral-300 font-medium">
                            {peer.email}
                          </span>
                        ) : (
                          <span className="italic">Guest Peer ({peer.deviceName})</span>
                        )}
                        <span>·</span>
                        <span>Room: <code className="font-mono text-[10px]">{peer.roomId.slice(0, 10)}...</code></span>
                        <span>·</span>
                        <span>Joined {formatJoinedTime(peer.joinedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {inSameRoom ? (
                      <button
                        onClick={() => {
                          onOpenMessages();
                          onClose();
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Send Text</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onSelectRoom(peer.roomId);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 transition"
                      >
                        <span>Join Room</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-neutral-100 p-4 text-[11px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>End-to-End Encrypted (AES-GCM-256) · Zero Server Storage</span>
          </div>
          <span>Refreshes automatically every 5s</span>
        </div>
      </div>
    </div>
  );
};
