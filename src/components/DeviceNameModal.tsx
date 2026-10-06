import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  Check,
  X,
  Edit3,
  Sparkles,
  Save,
  Radio,
  Tablet,
} from 'lucide-react';
import { setSavedDeviceName } from '../utils/format';

interface DeviceNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDeviceName: string;
  onDeviceNameUpdated: (newName: string) => void;
}

const PRESET_MODELS = [
  { name: 'Redmi Note 13', category: 'Android' },
  { name: 'Redmi 12 5G', category: 'Android' },
  { name: 'Vivo V29 5G', category: 'Android' },
  { name: 'Vivo Y200', category: 'Android' },
  { name: 'Oppo Reno 11', category: 'Android' },
  { name: 'Realme 12 Pro', category: 'Android' },
  { name: 'Samsung Galaxy S24', category: 'Android' },
  { name: 'Apple iPhone 15', category: 'iOS' },
  { name: 'Apple iPad Pro', category: 'iOS' },
  { name: 'Windows 11 PC', category: 'Desktop' },
  { name: 'Apple MacBook', category: 'Desktop' },
];

export const DeviceNameModal: React.FC<DeviceNameModalProps> = ({
  isOpen,
  onClose,
  currentDeviceName,
  onDeviceNameUpdated,
}) => {
  const [nameInput, setNameInput] = useState(currentDeviceName);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = nameInput.trim();
    if (!clean) return;

    setSavedDeviceName(clean);
    onDeviceNameUpdated(clean);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleSelectPreset = (presetName: string) => {
    setNameInput(presetName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950 sm:p-7">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Device Name & Identification
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Customize how your device appears to peers in rooms (Redmi, Vivo, iPhone, etc.)
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Your Device Name:
            </label>
            <div className="relative">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Redmi Note 12, Vivo V29, iPhone 15"
                maxLength={32}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                autoFocus
              />
              <Edit3 className="absolute right-3.5 top-3 h-4 w-4 text-neutral-400 pointer-events-none" />
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Saved permanently in your browser and broadcast to all connected devices.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Quick Popular Models:
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {PRESET_MODELS.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  onClick={() => handleSelectPreset(preset.name)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition ${
                    nameInput === preset.name
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Device Name</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
