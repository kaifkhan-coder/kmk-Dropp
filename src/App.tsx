import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  Upload,
  Camera,
  Download,
  Eye,
  ArrowRight,
  Share2,
  MessageSquare,
  Hash,
  Shield,
  Stamp,
  Lock,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { Header } from './components/Header';
import { QRCodeDisplay } from './components/QRCodeDisplay';
import { QRScannerModal } from './components/QRScannerModal';
import { FileDropZone } from './components/FileDropZone';
import { TransferProgressView } from './components/TransferProgressView';
import { FilePreviewModal } from './components/FilePreviewModal';
import { TransferHistoryView } from './components/TransferHistoryView';
import { AuthModal } from './components/AuthModal';
import { FeedbackSection } from './components/FeedbackSection';
import { TextMessageSection } from './components/TextMessageSection';
import { ActiveUsersModal } from './components/ActiveUsersModal';
import { MobileConnectionSteps } from './components/MobileConnectionSteps';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { ForcedFeedbackModal } from './components/ForcedFeedbackModal';
import { UniversalWatermarkModal } from './components/UniversalWatermarkModal';
import { DocumentConverterModal } from './components/DocumentConverterModal';
import { EncryptionChoiceModal } from './components/EncryptionChoiceModal';
import { PaymentModal } from './components/PaymentModal';
import { DeviceNameModal } from './components/DeviceNameModal';
import { BeamDropAIChatbot } from './components/BeamDropAIChatbot';
import { AIFileAnalyzerModal } from './components/AIFileAnalyzerModal';
import { useTransferEngine } from './hooks/useTransferEngine';
import { ThemeMode, UserSession, ReceivedFileItem, AdminSession, ScannedQRConnection } from './types';
import { formatBytes } from './utils/format';
import { safeLocalStorage } from './utils/storage';

export default function App() {
  // Theme state: light, dark, oled
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (safeLocalStorage.getItem('beamdrop_theme') as ThemeMode) || 'dark';
  });

  // Current active navigation tab
  const [currentTab, setCurrentTab] = useState<'send' | 'receive' | 'messages' | 'users' | 'history'>('send');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  // const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isForcedFeedbackOpen, setIsForcedFeedbackOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<ReceivedFileItem | null>(null);
  const [isDeviceNameModalOpen, setIsDeviceNameModalOpen] = useState(false);

  // Universal Watermarking Modal State (All Files: PDFs, Images, Docs, Text)
  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false);
  const [watermarkTargetFile, setWatermarkTargetFile] = useState<File | null>(null);

  // Document Converter Modal State (PDF ⇄ Word, Text, Image)
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [converterTargetFile, setConverterTargetFile] = useState<File | null>(null);

  // BeamDrop AI Assistant & File Intelligence Suite
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isAIAnalyzerOpen, setIsAIAnalyzerOpen] = useState(false);
  const [aiAnalyzerTargetFile, setAIAnalyzerTargetFile] = useState<File | null>(null);

  // Paid Feature State: Encrypted & Decrypted Transfer (Admin Configured Price)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEncryptionChoiceOpen, setIsEncryptionChoiceOpen] = useState(false);
  const [e2eePrice, setE2eePrice] = useState<number>(199);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [paidEmail, setPaidEmail] = useState<string>('');

  // Administrator Session state (Kaif Khan - khankaifcom551@gmail.com)
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => {
    try {
      const saved = safeLocalStorage.getItem('beamdrop_admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Authenticated User Session
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const saved = safeLocalStorage.getItem('beamdrop_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Selected files queue for sending
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [autoDownload, setAutoDownload] = useState(true);

  // Frequent Devices & Scanned QR Connection URLs (Last 5)
  const [recentConnections, setRecentConnections] = useState<ScannedQRConnection[]>(() => {
    try {
      const saved = safeLocalStorage.getItem('beamdrop_recent_qr_connections');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveRecentConnection = (targetUrl: string, targetRoomId: string) => {
    if (!targetUrl && !targetRoomId) return;
    const cleanRoomId = String(targetRoomId || '').toUpperCase().trim();
    const cleanUrl = targetUrl || `${window.location.origin}/?room=${cleanRoomId}`;

    setRecentConnections((prev) => {
      const filtered = prev.filter((c) => c.roomId !== cleanRoomId && c.url !== cleanUrl);
      const newEntry: ScannedQRConnection = {
        id: `conn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        url: cleanUrl,
        roomId: cleanRoomId,
        scannedAt: Date.now(),
        label: `Room ${cleanRoomId}`,
      };
      const updated = [newEntry, ...filtered].slice(0, 5);
      safeLocalStorage.setItem('beamdrop_recent_qr_connections', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveConnection = (id: string) => {
    setRecentConnections((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      safeLocalStorage.setItem('beamdrop_recent_qr_connections', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearConnections = () => {
    setRecentConnections([]);
    safeLocalStorage.removeItem('beamdrop_recent_qr_connections');
  };

  const handleReconnect = (conn: ScannedQRConnection) => {
    if (conn.roomId) {
      setRoomId(conn.roomId);
      setCurrentTab('send');
    }
  };

  // Transfer Engine Hook
  const {
    roomId,
    setRoomId,
    keyBase64,
    peers,
    myDevice,
    updateMyDeviceName,
    isWsConnected,
    isP2PConnected,
    transportMode,
    isOfflineMode,
    localBattery,
    currentTransfer,
    receivedFiles,
    history,
    isPaused,
    transferFile,
    togglePause,
    cancelTransfer,
    resetTransferState,
    getPairingUrl,
    textMessages,
    sendTextMessage,
    clearTextMessages,
    activeUsersStats,
    fetchActiveUsers,
    sendUserIdentification,
  } = useTransferEngine();

  // Apply Theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'oled');
    if (theme === 'oled') {
      root.classList.add('dark', 'oled');
    } else {
      root.classList.add(theme);
    }
    safeLocalStorage.setItem('beamdrop_theme', theme);
  }, [theme]);

  // Check Paid Status for currently logged in Gmail or last remembered Gmail
  const checkPaidStatus = async (emailToCheck: string) => {
    if (!emailToCheck) return;
    try {
      const res = await fetch(`/api/payment/status?email=${encodeURIComponent(emailToCheck)}`);
      const data = await res.json();
      if (data.isPaid && data.status === 'approved') {
        setIsPaid(true);
        setPaidEmail(emailToCheck);
        safeLocalStorage.setItem('beamdrop_paid_email', emailToCheck);
        safeLocalStorage.setItem(`beamdrop_paid_${emailToCheck}`, 'true');
      } else {
        setIsPaid(false);
        safeLocalStorage.removeItem('beamdrop_paid_email');
        safeLocalStorage.removeItem(`beamdrop_paid_${emailToCheck}`);
      }
      if (data.requiredAmount) {
        setE2eePrice(Number(data.requiredAmount));
      }
    } catch (e) {
      console.error('Failed to check payment status:', e);
    }
  };

  useEffect(() => {
    fetch('/api/payment/details')
      .then((res) => res.json())
      .then((data) => {
        if (data.amount) setE2eePrice(Number(data.amount));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.email) {
      checkPaidStatus(user.email);
    } else {
      const saved = safeLocalStorage.getItem('beamdrop_paid_email');
      if (saved) checkPaidStatus(saved);
    }
  }, [user]);

  // Push user identity to signaling server
  useEffect(() => {
    if (user && isWsConnected) {
      sendUserIdentification(user);
    }
  }, [user, isWsConnected, sendUserIdentification]);

  // Mandatory feedback prompt after completing 2 file transfers
  useEffect(() => {
    const completedCount = history.filter((h) => h.status === 'completed').length;
    const hasGivenFeedback =
      safeLocalStorage.getItem('beamdrop_feedback_submitted') === 'true' ||
      safeLocalStorage.getItem('beamdrop_feedback_given') === 'true';
    if (completedCount >= 2 && !hasGivenFeedback && !isForcedFeedbackOpen) {
      setIsForcedFeedbackOpen(true);
    }
  }, [history, isForcedFeedbackOpen]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : prev === 'light' ? 'oled' : 'dark'));
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearFiles = () => {
    setSelectedFiles([]);
  };

  // Called when user clicks "Transfer Files Now"
  // Asks user before sharing if they want encrypted or standard
  const handleStartTransfer = async () => {
    if (selectedFiles.length === 0) return;
    setIsEncryptionChoiceOpen(true);
  };

  // Executes the transfer after user selects encryption choice
  const handleExecuteTransfer = async (encrypt: boolean) => {
    const fileToTransfer = selectedFiles[0];
    if (!fileToTransfer) return;
    await transferFile(fileToTransfer);
    setSelectedFiles((prev) => prev.slice(1));
  };

  const handleOpenWatermarkModal = (file?: File) => {
    setWatermarkTargetFile(file || null);
    setIsWatermarkModalOpen(true);
  };

  const handleLogout = () => {
    setUser(null);
    safeLocalStorage.removeItem('beamdrop_user');
  };

  const handleAuthSuccess = (authenticatedUser: UserSession) => {
    setUser(authenticatedUser);
    safeLocalStorage.setItem('beamdrop_user', JSON.stringify(authenticatedUser));
    checkPaidStatus(authenticatedUser.email);
  };

  const handleScanSuccess = (scannedUrl: string, deviceName?: string) => {
    try {
      if (deviceName && deviceName.trim()) {
        updateMyDeviceName(deviceName.trim());
      }
      let targetRoom = '';
      if (scannedUrl.includes('room=')) {
        const urlObj = new URL(scannedUrl.startsWith('http') ? scannedUrl : `https://dummy.local/${scannedUrl}`);
        targetRoom = urlObj.searchParams.get('room') || '';
      } else {
        const trimmed = scannedUrl.trim();
        if (trimmed.length >= 4 && trimmed.length <= 12 && !trimmed.includes('/')) {
          targetRoom = trimmed.toUpperCase();
        }
      }

      if (targetRoom) {
        const cleanRoom = targetRoom.trim().toUpperCase();
        saveRecentConnection(scannedUrl, cleanRoom);
        setRoomId(cleanRoom);
        setIsScannerOpen(false);
        setCurrentTab('send');
      } else {
        saveRecentConnection(scannedUrl, 'PEER');
        setIsScannerOpen(false);
      }
    } catch {
      setIsScannerOpen(false);
    }
  };

  const handleJoinRoom = (newRoomId: string) => {
    const clean = newRoomId.trim().toUpperCase();
    setRoomId(clean);
    saveRecentConnection(`${window.location.origin}/?room=${clean}`, clean);
  };

  const handleOpenAdmin = () => {
    if (adminSession?.token) {
      setIsAdminPanelOpen(true);
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleAdminLoginSuccess = (session: AdminSession) => {
    setAdminSession(session);
    safeLocalStorage.setItem('beamdrop_admin_session', JSON.stringify(session));
    setIsAdminPanelOpen(true);
  };

  const handleAdminLogout = async () => {
    try {
      if (adminSession?.token) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.token}`,
          },
        });
      }
    } catch {
      // ignore
    }
    setAdminSession(null);
    safeLocalStorage.removeItem('beamdrop_admin_session');
    safeLocalStorage.removeItem('beamdrop_admin_token');
    setIsAdminPanelOpen(false);
  };

  const pairingUrl = getPairingUrl();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 transition-colors dark:bg-[#0a0a0a] dark:text-neutral-100 flex flex-col justify-between selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-950 font-sans">
      {/* Top Header */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        peersCount={peers.length}
        peers={peers}
        myDeviceName={myDevice.name}
        onOpenDeviceNameModal={() => setIsDeviceNameModalOpen(true)}
        activeUsersCount={activeUsersStats?.totalOnlineUsers || 1}
        currentTab={currentTab}
        onSelectTab={(tab: any) => setCurrentTab(tab)}
        unreadMessagesCount={textMessages.filter((m) => m.direction === 'received').length}
        onOpenActiveUsers={() => setIsUsersModalOpen(true)}
        onOpenChatbot={() => setIsChatbotOpen(true)}
        currentRoomId={roomId}
        onOpenAdmin={handleOpenAdmin}
        isAdminAuthenticated={Boolean(adminSession?.token)}
        onAdminLogout={handleAdminLogout}
        onOpenPayment={() => setIsPaymentModalOpen(true)}
        isPaid={isPaid}
        onOpenConverter={() => {
          setConverterTargetFile(null);
          setIsConverterOpen(true);
        }}
        e2eePrice={e2eePrice}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 w-full flex-1 space-y-10">
        {/* TAB 1: SEND FILES */}
        {currentTab === 'send' && (
          <div className="space-y-8 animate-fade-in">
            {/* Local Network Discovery & Offline Transfer Fallback Banner */}
            {(isOfflineMode || transportMode === 'local-lan' || !isWsConnected) && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white font-bold shadow-sm">
                    <Wifi className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <span>Offline Local Network P2P Discovery Active</span>
                      <span className="rounded-md bg-amber-200/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                        Zero Internet Required
                      </span>
                    </h4>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                      Internet access is unavailable or offline. BeamDrop's local network discovery mesh is active. Devices on this Wi-Fi, hotspot, or local network discover each other and transfer files directly peer-to-peer!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick 3-Step Setup Guidance for Mobile Phone Users */}
            {peers.length === 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm">
                    1-2-3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                      Want to connect your mobile phone or another laptop?
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Scan the QR code to pair your mobile camera or view the 3-step setup guide.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentTab('receive')}
                  className="flex items-center gap-1.5 shrink-0 rounded-xl bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition whitespace-nowrap"
                >
                  <span>Connect Mobile (3 Steps)</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Hero Banner with Generated Asset */}
            <div className="relative overflow-hidden rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60 sm:p-10">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex-1 space-y-4 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Peer-to-Peer Transit · Zero Server Storage · Universal Watermarking</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-[1.15]">
                    Transfer files directly between Mobile & PC
                  </h1>

                  <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xl leading-relaxed">
                    Select your files to generate an instant pairing QR code. Scan from any smartphone or laptop
                    to stream files directly device-to-device.
                  </p>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                    <button
                      onClick={() => {
                        if (!user) {
                          setIsAuthOpen(true);
                          return;
                        }
                        const el = document.getElementById('file-drop-area');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition"
                    >
                      <Upload className="h-4 w-4" />
                      <span>{user ? 'Select Files to Send' : 'Sign In to Select Files'}</span>
                    </button>

                    <button
                      onClick={() => setIsScannerOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 transition"
                    >
                      <Camera className="h-4 w-4 text-neutral-500" />
                      <span>Scan QR Code</span>
                    </button>

                    <button
                      onClick={() => setIsChatbotOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 transition"
                    >
                      <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Ask AI Assistant</span>
                    </button>

                    <button
                      onClick={() => setCurrentTab('messages')}
                      className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 transition"
                    >
                      <MessageSquare className="h-4 w-4 text-neutral-500" />
                      <span>Send Text / Clipboard</span>
                    </button>

                    <button
                      onClick={() => setIsDeviceNameModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 transition"
                      title="Set device name (Redmi, Vivo, iPhone, etc.)"
                    >
                      <Smartphone className="h-4 w-4 text-indigo-500" />
                      <span>Device: <strong>{myDevice.name}</strong></span>
                    </button>

                    <button
                      onClick={() => handleOpenWatermarkModal()}
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 transition"
                    >
                      <Stamp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Watermark Any File</span>
                    </button>

                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                        isPaid
                          ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                      }`}
                    >
                      <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{isPaid ? 'E2EE Lifetime Active' : 'Unlock E2EE (₹199 QR)'}</span>
                    </button>
                  </div>
                </div>

                {/* Hero Graphic Asset */}
                <div className="w-full lg:w-96 shrink-0 overflow-hidden rounded-2xl border border-neutral-200 shadow-lg dark:border-neutral-800">
                  <img
                    src="/src/assets/images/hero_device_sync_1790529157660.jpg"
                    alt="Peer to peer device transfer illustration"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Active Transfer Progress View */}
            {currentTransfer && (
              <TransferProgressView
                progress={currentTransfer}
                isPaused={isPaused}
                onTogglePause={togglePause}
                onCancel={cancelTransfer}
                onReset={resetTransferState}
              />
            )}

            {/* Main Interactive Grid: Drop Zone + QR Code Pairing Bridge */}
            <div id="file-drop-area" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: File Drop & Selection (8 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <FileDropZone
                  selectedFiles={selectedFiles}
                  onFilesSelected={handleFilesSelected}
                  onRemoveFile={handleRemoveFile}
                  onClearFiles={handleClearFiles}
                  onStartTransfer={handleStartTransfer}
                  isPeerConnected={peers.length > 0}
                  peers={peers}
                  onOpenQR={() => {
                    const qrEl = document.getElementById('qr-code-section');
                    qrEl?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  isSignedIn={Boolean(user)}
                  onRequireAuth={() => setIsAuthOpen(true)}
                  isPaid={isPaid}
                  onOpenWatermark={handleOpenWatermarkModal}
                  onOpenConverter={() => {
                    setConverterTargetFile(null);
                    setIsConverterOpen(true);
                  }}
                  onOpenAIAnalyze={(file) => {
                    setAIAnalyzerTargetFile(file || selectedFiles[0] || null);
                    setIsAIAnalyzerOpen(true);
                  }}
                  history={history}
                  currentTransfer={currentTransfer}
                />

                {/* Recently Received in this Session */}
                {receivedFiles.length > 0 && (
                  <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <Download className="h-4 w-4 text-emerald-500" />
                        <span>Received Files in this Session ({receivedFiles.length})</span>
                      </h4>
                    </div>

                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80 max-h-60 overflow-y-auto">
                      {receivedFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between py-2.5">
                          <div className="truncate pr-3">
                            <p className="truncate text-xs font-medium text-neutral-900 dark:text-white font-mono">
                              {file.name}
                            </p>
                            <p className="text-[11px] font-mono text-neutral-500">
                              {formatBytes(file.size)} · SHA-256 verified
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="flex items-center gap-1 rounded-lg border border-neutral-200 py-1 px-2.5 text-xs text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Preview</span>
                            </button>
                            <button
                              onClick={() => {
                                if (!user) {
                                  setIsAuthOpen(true);
                                  return;
                                }
                                const a = document.createElement('a');
                                a.href = file.url;
                                a.download = file.name;
                                a.click();
                              }}
                              className="flex items-center gap-1 rounded-lg bg-neutral-900 py-1 px-2.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100"
                            >
                              <Download className="h-3 w-3" />
                              <span>{user ? 'Save' : 'Sign In to Save'}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: QR Code + Room Connection (5 cols) */}
              <div id="qr-code-section" className="lg:col-span-5">
                <QRCodeDisplay
                  url={pairingUrl}
                  roomId={roomId}
                  peersCount={peers.length}
                  peers={peers}
                  isSignedIn={Boolean(user)}
                  onRequireAuth={() => setIsAuthOpen(true)}
                  onRegenerateRoom={() => {
                    if (!user) {
                      setIsAuthOpen(true);
                      return;
                    }
                    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
                    setRoomId(newId);
                  }}
                  // onJoinRoom={handleJoinRoom}
                  onOpenQRScanner={() => setIsScannerOpen(true)}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RECEIVE / PAIR */}
        {currentTab === 'receive' && (
          <div className="space-y-8 animate-fade-in">
            {/* Step-by-step connection guide */}
            <MobileConnectionSteps
              roomId={roomId}
              pairingUrl={pairingUrl}
              peersCount={peers.length}
              onOpenQRScanner={() => setIsScannerOpen(true)}
              onOpenMessages={() => setCurrentTab('messages')}
              // onOpenJoinModal={() => setIsJoinRoomOpen(true)}
              // onJoinRoom={handleJoinRoom}
            />

            {/* Quick Action banner to switch to Text / Clipboard */}
            <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                    Need to send text, notes, or links instead of files?
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    BeamDrop includes real-time synchronized peer clipboard & text messaging.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCurrentTab('messages')}
                className="flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition whitespace-nowrap"
              >
                <span>Open Text Messaging</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Active Transfer Progress View */}
            {currentTransfer && (
              <TransferProgressView
                progress={currentTransfer}
                isPaused={isPaused}
                onTogglePause={togglePause}
                onCancel={cancelTransfer}
                onReset={resetTransferState}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start max-w-4xl mx-auto">
              {/* QR Code & Code Pairing (Both Methods) */}
              <QRCodeDisplay
                url={pairingUrl}
                roomId={roomId}
                peersCount={peers.length}
                onRegenerateRoom={() => {
                  const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
                  setRoomId(newId);
                }}
                isSignedIn={Boolean(user)}
                onRequireAuth={() => setIsAuthOpen(true)}
                // onJoinRoom={handleJoinRoom}
                onOpenQRScanner={() => setIsScannerOpen(true)}
              />

              {/* Receiving Controls & Files Table */}
              <div className="space-y-4">
                <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
                  <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                        Automatic Downloads
                      </h3>
                      <p className="text-[11px] text-neutral-500">
                        Save files immediately when transfer finishes
                      </p>
                    </div>

                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={autoDownload}
                        onChange={(e) => setAutoDownload(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-neutral-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-neutral-900 peer-checked:after:translate-x-full peer-focus:outline-none dark:bg-neutral-700 dark:peer-checked:bg-white dark:peer-checked:after:bg-neutral-950" />
                    </label>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Status:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {peers.length > 0 ? `${peers.length} device(s) paired` : 'Listening for peer'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Signaling:</span>
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">
                      {isWsConnected ? 'Connected (WSS)' : 'Connecting...'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">P2P Channel:</span>
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">
                      {isP2PConnected ? 'RTCDataChannel Open' : 'Waiting for connection'}
                    </span>
                  </div>
                </div>

                {/* Received Files Box */}
                <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white mb-3">
                    Received Files ({receivedFiles.length})
                  </h4>

                  {receivedFiles.length === 0 ? (
                    <div className="py-8 text-center text-xs text-neutral-400">
                      Files sent from paired devices will appear here automatically.
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-72 overflow-y-auto">
                      {receivedFiles.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2.5">
                          <div className="truncate pr-3">
                            <p className="truncate text-xs font-medium text-neutral-900 dark:text-white font-mono">
                              {item.name}
                            </p>
                            <p className="text-[11px] font-mono text-neutral-500">
                              {formatBytes(item.size)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => setPreviewFile(item)}
                              className="rounded-lg border border-neutral-200 py-1 px-2 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300"
                            >
                              <Eye className="h-3 w-3" />
                            </button>
                            <a
                              href={item.url}
                              download={item.name}
                              className="rounded-lg bg-neutral-900 py-1 px-2.5 text-xs text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950"
                            >
                              <Download className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TEXT MESSAGING & CLIPBOARD */}
        {currentTab === 'messages' && (
          <TextMessageSection
            messages={textMessages}
            peers={peers}
            onSendMessage={sendTextMessage}
            onClearMessages={clearTextMessages}
            isSignedIn={Boolean(user)}
            onRequireAuth={() => setIsAuthOpen(true)}
            onOpenQR={() => {
              setCurrentTab('send');
              setTimeout(() => {
                document.getElementById('qr-code-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
          />
        )}

        {/* TAB 4: TRANSFER HISTORY (Strictly available to logged-in users) */}
        {currentTab === 'history' && (
          <TransferHistoryView
            history={history}
            onClearHistory={() => {
              safeLocalStorage.removeItem('beamdrop_history');
              window.location.reload();
            }}
            isSignedIn={Boolean(user)}
            onRequireAuth={() => setIsAuthOpen(true)}
            userEmail={user?.email}
            recentConnections={recentConnections}
            onReconnect={handleReconnect}
            onRemoveConnection={handleRemoveConnection}
            onClearConnections={handleClearConnections}
          />
        )}

        {/* SYSTEM EVALUATION & FEEDBACK SECTION */}
        <FeedbackSection
          user={user}
          onOpenAuth={() => setIsAuthOpen(true)}
          transferStats={{
            totalSent: history.filter((h) => h.direction === 'sent').length,
            totalReceived: history.filter((h) => h.direction === 'received').length,
          }}
        />
      </main>

      {/* MODALS */}
      {/* 1. Auth Modal (Magic Link & Google Sign-In) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* 2. QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        currentDeviceName={myDevice.name}
        onUpdateDeviceName={updateMyDeviceName}
      />

      {/* 3. In-Browser File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        isSignedIn={Boolean(user)}
        onRequireAuth={() => setIsAuthOpen(true)}
      />

      {/* 4. Active Users & Multi-Device Modal */}
      <ActiveUsersModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        stats={activeUsersStats}
        onRefresh={fetchActiveUsers}
        currentRoomId={roomId}
        onSelectRoom={handleJoinRoom}
        onOpenMessages={() => {
          setIsUsersModalOpen(false);
          setCurrentTab('messages');
        }}
        peers={peers}
        myDeviceName={myDevice.name}
      />

      {/* 6. Admin Security Login Modal (Kaif Khan - khankaifcom551@gmail.com) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />

      {/* 7. Admin Panel Management Modal */}
      {adminSession && (
        <AdminPanelModal
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          session={adminSession}
          onLogout={handleAdminLogout}
        />
      )}

      {/* 8. Mandatory 2nd-Usage Feedback Modal */}
      <ForcedFeedbackModal
        isOpen={isForcedFeedbackOpen}
        user={user}
        onCompleted={() => setIsForcedFeedbackOpen(false)}
      />

      {/* 9. Universal File Watermark Modal (Applies to EVERY file type) */}
      <UniversalWatermarkModal
        isOpen={isWatermarkModalOpen}
        onClose={() => setIsWatermarkModalOpen(false)}
        initialFile={watermarkTargetFile}
        clientDevice="mobile"
      />

      {/* 9.5 Universal Document Converter (PDF ⇄ Word, Text, Image) */}
      <DocumentConverterModal
        isOpen={isConverterOpen}
        onClose={() => setIsConverterOpen(false)}
        initialFile={converterTargetFile}
      />

      {/* 10. Pre-Transfer Encryption Decision Modal */}
      <EncryptionChoiceModal
        isOpen={isEncryptionChoiceOpen}
        onClose={() => setIsEncryptionChoiceOpen(false)}
        user={user}
        isPaid={isPaid}
        userPaidEmail={paidEmail}
        onSelectStandard={() => handleExecuteTransfer(false)}
        onSelectEncrypted={() => handleExecuteTransfer(true)}
        onOpenPayment={() => setIsPaymentModalOpen(true)}
      />

      {/* 11. Kaif Khan UPI QR Code Payment Modal (₹199 Lifetime Access) */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        user={user}
        onPaymentSuccess={(email) => {
          setIsPaid(true);
          setPaidEmail(email);
          if (selectedFiles.length > 0) {
            handleExecuteTransfer(true);
          }
        }}
      />

      {/* 12. Device Customization & Persistent Brand Name (Redmi, Vivo, iPhone, etc.) */}
      <DeviceNameModal
        isOpen={isDeviceNameModalOpen}
        onClose={() => setIsDeviceNameModalOpen(false)}
        currentDeviceName={myDevice.name}
        onDeviceNameUpdated={updateMyDeviceName}
      />

      {/* 13. BeamDrop AI Assistant Chatbot (Website Exclusivity Protected) */}
      <BeamDropAIChatbot
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        onOpenConverter={() => {
          setConverterTargetFile(null);
          setIsConverterOpen(true);
        }}
        onOpenWatermark={() => handleOpenWatermarkModal()}
        onOpenPayment={() => setIsPaymentModalOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* 14. AI File Intelligence & Summarizer Modal */}
      <AIFileAnalyzerModal
        isOpen={isAIAnalyzerOpen}
        onClose={() => setIsAIAnalyzerOpen(false)}
        file={aiAnalyzerTargetFile || selectedFiles[0] || null}
        onApplyRenamedFile={(renamed) => {
          setSelectedFiles((prev) => [renamed, ...prev.slice(1)]);
        }}
      />

      {/* Floating AI Assistant Trigger Button (Bottom Right) */}
      {!isChatbotOpen && (
        <button
          onClick={() => setIsChatbotOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 px-4 py-3 text-xs font-bold text-white shadow-xl hover:from-indigo-500 hover:to-purple-500 hover:shadow-2xl transition active:scale-95 group"
          title="Open BeamDrop AI Assistant"
        >
          <div className="relative">
            <Sparkles className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <span>BeamDrop AI Help</span>
        </button>
      )}

      {/* Minimal Footer */}
      <footer className="mt-16 border-t border-neutral-200/80 py-8 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 BeamDrop. Peer-to-peer file transfer engine with universal watermarking.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>RFC WebRTC RTCDataChannel</span>
            <span>·</span>
            <span>Web Crypto AES-256-GCM</span>
            <span>·</span>
            <span>SHA-256 Digest Validation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}