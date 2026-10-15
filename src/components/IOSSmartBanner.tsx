import React, { useState } from 'react';
import { Smartphone, Share, PlusSquare, X, ArrowUpRight } from 'lucide-react';

interface IOSSmartBannerProps {
  onOpenIOSModal: () => void;
  isIOS: boolean;
  isInstalled: boolean;
}

export const IOSSmartBanner: React.FC<IOSSmartBannerProps> = ({
  onOpenIOSModal,
  isIOS,
  isInstalled,
}) => {
  const [dismissed, setDismissed] = useState(false);

  // If already installed or dismissed, do not render banner
  if (isInstalled || dismissed) return null;

  return (
    <div className="relative z-30 w-full border-b border-indigo-200/60 bg-gradient-to-r from-indigo-50/90 via-violet-50/80 to-purple-50/90 px-3 py-2 text-neutral-800 dark:border-indigo-900/50 dark:bg-neutral-900/90 dark:text-neutral-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Smartphone className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate text-neutral-900 dark:text-white">
              {isIOS ? 'Launch BeamDrop as an iOS App' : 'Launch & Install on iOS (iPhone & iPad)'}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
              {isIOS ? 'Tap Share ⎋ then "Add to Home Screen" for native full-screen mode' : 'Available as an installable standalone Apple iOS application'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenIOSModal}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <span>{isIOS ? 'Install Guide' : 'Launch iOS'}</span>
            <ArrowUpRight className="h-3 w-3" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-200/60 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
