import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Sparkles,
  User as UserIcon,
  LogOut,
  Smartphone,
  Users,
  Hash,
  Shield,
  Menu,
  X,
  Send,
  Download,
  MessageSquare,
  History,
  ShieldCheck,
  Lock,
  FileText,
} from 'lucide-react';
import { ThemeMode, UserSession } from '../types';

interface HeaderProps {
  currentTab: 'send' | 'receive' | 'messages' | 'users' | 'history' | 'security';
  onSelectTab: (tab: 'send' | 'receive' | 'messages' | 'users' | 'history' | 'security') => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  user: UserSession | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  peersCount: number;
  peers?: { id: string; deviceName: string; deviceType: string }[];
  myDeviceName?: string;
  onOpenDeviceNameModal?: () => void;
  unreadMessagesCount?: number;
  activeUsersCount?: number;
  onOpenActiveUsers?: () => void;
  onOpenChatbot?: () => void;
  currentRoomId?: string;
  onOpenAdmin?: () => void;
  isAdminAuthenticated?: boolean;
  onAdminLogout?: () => void;
  onOpenPayment?: () => void;
  isPaid?: boolean;
  onOpenConverter?: () => void;
  e2eePrice?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  theme,
  onToggleTheme,
  user,
  onOpenAuth,
  onLogout,
  peersCount,
  peers = [],
  myDeviceName,
  onOpenDeviceNameModal,
  unreadMessagesCount = 0,
  activeUsersCount = 1,
  onOpenActiveUsers,
  onOpenChatbot,
  currentRoomId,
  onOpenAdmin,
  isAdminAuthenticated = false,
  onAdminLogout,
  onOpenPayment,
  isPaid = false,
  onOpenConverter,
  e2eePrice = 199,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTabClick = (tab: 'send' | 'receive' | 'messages' | 'users' | 'history' | 'security') => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 bg-white/95 backdrop-blur-md transition-colors dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3 sm:px-6">
        {/* Left Section: Brand & Quick Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => handleTabClick('send')}
            className="flex items-center gap-2 text-left text-base sm:text-lg font-bold tracking-tight text-neutral-900 transition-opacity hover:opacity-85 dark:text-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-950">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="hidden xs:inline sm:inline">BeamDrop</span>
          </button>

          {/* Active Users Badge Button */}
          <button
            onClick={onOpenActiveUsers || (() => handleTabClick('users'))}
            title="Click to view live active peer users and rooms"
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-100/90 px-2 py-1 text-[11px] sm:text-xs font-semibold text-neutral-800 hover:border-neutral-400 hover:bg-neutral-200/70 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-700 transition"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-500" />
            <span className="tabular-nums font-mono">{activeUsersCount}</span>
            <span className="hidden sm:inline">Online</span>
          </button>

          {/* User's Own Device Name Badge (Customizable / Persistent: Redmi, Vivo, iPhone, etc.) */}
          {myDeviceName && (
            <button
              onClick={onOpenDeviceNameModal}
              title="Click to rename your device (e.g. Redmi, Vivo, iPhone, etc.)"
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-100/90 px-2 sm:px-2.5 py-1 text-[11px] font-semibold text-neutral-800 hover:border-indigo-400 hover:bg-indigo-50/70 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-indigo-800 transition"
            >
              <Smartphone className="h-3 w-3 text-indigo-500 shrink-0" />
              <span className="max-w-[85px] sm:max-w-[120px] truncate">{myDeviceName}</span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">✎</span>
            </button>
          )}

          {/* Multi-Device Connected Peers Status */}
          {peersCount > 0 ? (
            <div
              title={peers && peers.length > 0 ? `Connected Devices: ${peers.map((p) => p.deviceName).join(', ')}` : `${peersCount} Device(s) Connected`}
              className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 animate-fade-in"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Smartphone className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span>{peersCount === 1 ? '1 Device' : `${peersCount} Devices`}</span>
            </div>
          ) : null}

          {/* Admin Portal Quick Button (Kaif Khan) */}
          {onOpenAdmin && (
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenAdmin}
                title="Admin Security Portal (Khankaifcom551@gmail.com)"
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border transition ${
                  isAdminAuthenticated
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-400 hover:bg-amber-400/20'
                }`}
              >
                <Shield className="h-3 w-3 shrink-0" />
                <span className="hidden md:inline">{isAdminAuthenticated ? 'Admin Active' : 'Admin'}</span>
              </button>

              {isAdminAuthenticated && onAdminLogout && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdminLogout();
                  }}
                  title="Logout Administrator Session"
                  className="flex items-center justify-center h-6 w-6 rounded-full border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300 transition cursor-pointer"
                >
                  <LogOut className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Middle Section: Desktop Nav Tabs (Hidden on small screens) */}
        <nav className="hidden lg:flex items-center gap-1">
          <button
            onClick={() => handleTabClick('send')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'send'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/60'
            }`}
          >
            Send Files
          </button>
          <button
            onClick={() => handleTabClick('receive')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'receive'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/60'
            }`}
          >
            Receive / Pair
          </button>
          <button
            onClick={() => handleTabClick('messages')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'messages'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/60'
            }`}
          >
            <span>Text</span>
            {unreadMessagesCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {unreadMessagesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabClick('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'history'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/60'
            }`}
          >
            <span>History</span>
            {!user && <Lock className="h-3 w-3 text-neutral-400" />}
          </button>
          {onOpenConverter && (
            <button
              onClick={onOpenConverter}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800/60 transition whitespace-nowrap"
              title="Convert between PDF and Word, Text, Image"
            >
              <FileText className="h-3.5 w-3.5 text-indigo-500" />
              <span>Converter</span>
            </button>
          )}
          {onOpenPayment && (
            <button
              onClick={onOpenPayment}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                isPaid
                  ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              <Lock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{isPaid ? 'E2EE Active' : `Unlock E2EE (₹${e2eePrice})`}</span>
            </button>
          )}
        </nav>

        {/* Right Section: Actions & Mobile Hamburger */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* BeamDrop AI Assistant Chatbot Button */}
          {onOpenChatbot && (
            <button
              onClick={onOpenChatbot}
              title="Ask BeamDrop AI Assistant"
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">AI Help</span>
            </button>
          )}

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
            title={`Theme: ${theme}`}
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : theme === 'dark' ? (
              <Sparkles className="h-4 w-4 text-amber-400" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>

          {/* User Sign In / Profile */}
          {user ? (
            <div className="flex items-center gap-1">
              <div
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-2 sm:px-2.5 py-1 text-xs dark:border-neutral-800 dark:bg-neutral-900"
                title={`Signed in as ${user.email}`}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white dark:bg-white dark:text-neutral-950">
                  {user.initials}
                </div>
                <span className="hidden md:inline font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[100px]">
                  {user.name}
                </span>
              </div>
              <button
                onClick={onLogout}
                aria-label="Log out"
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 hover:text-rose-600 transition dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-rose-400"
                title="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 rounded-xl bg-neutral-900 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 whitespace-nowrap"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Sign In</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex lg:hidden h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu (Visible when hamburger opened on mobile/tablet) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-neutral-200 bg-white/95 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/95 backdrop-blur-md animate-fade-in shadow-xl">
          <div className="grid grid-cols-2 gap-2 pb-2">
            <button
              onClick={() => handleTabClick('send')}
              className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold transition ${
                currentTab === 'send'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                  : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send Files</span>
            </button>

            <button
              onClick={() => handleTabClick('receive')}
              className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold transition ${
                currentTab === 'receive'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                  : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Receive / Pair</span>
            </button>

            <button
              onClick={() => handleTabClick('messages')}
              className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold transition ${
                currentTab === 'messages'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                  : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Text / Clipboard</span>
              {unreadMessagesCount > 0 && (
                <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] font-bold text-white">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabClick('history')}
              className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold transition ${
                currentTab === 'history'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                  : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>History</span>
              {!user && <Lock className="ml-auto h-3 w-3 text-amber-500" />}
            </button>

            {onOpenConverter && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenConverter();
                }}
                className="flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                <FileText className="h-3.5 w-3.5 text-indigo-500" />
                <span>Document Converter (PDF ⇄ Word, Text, Image)</span>
              </button>
            )}

            {onOpenChatbot && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenChatbot();
                }}
                className="flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>BeamDrop AI Assistant (Q&A)</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-neutral-100 pt-2.5 dark:border-neutral-800">
            {onOpenPayment ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenPayment();
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
              >
                <Lock className="h-3.5 w-3.5 text-indigo-500" />
                <span>{isPaid ? 'E2EE Active' : `Unlock E2EE (₹${e2eePrice})`}</span>
              </button>
            ) : <div />}

            {onOpenAdmin && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAdmin();
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>{isAdminAuthenticated ? 'Admin Panel' : 'Admin Console'}</span>
                </button>

                {isAdminAuthenticated && onAdminLogout && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMobileMenuOpen(false);
                      onAdminLogout();
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 dark:bg-rose-950/60 dark:border-rose-900/60"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
