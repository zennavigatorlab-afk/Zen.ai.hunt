import React from 'react';
import {
  Brain,
  Search,
  Settings,
  HelpCircle,
  Menu,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { AppSettings } from '../types';

interface HeaderProps {
  settings: AppSettings;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenOnboarding: () => void;
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSearch,
  onOpenSettings,
  onOpenOnboarding,
  onToggleMobileMenu,
}) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="h-16 px-4 sm:px-6 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between shrink-0 z-30 sticky top-0">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          {/* Clean, minimalist brand mark */}
          <div className="relative w-8 h-8 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center">
            <span className="font-extrabold text-indigo-400 text-xs tracking-wider">
              ZEN
            </span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 border border-slate-950" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">ZEN AI</h1>
              <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300 font-mono">
                System
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium hidden sm:flex items-center gap-1.5">
              <span>DeveloperHut</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500">In partnership with DeveloperHunt.in</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center / Action Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-sm mx-6">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors duration-150 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            <span>Search intelligence vault...</span>
          </div>
          <kbd className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Search Icon */}
        <button
          onClick={onOpenSearch}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white transition-colors duration-150"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Network status badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium border ${
            isOnline
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
          }`}
          title={isOnline ? 'Online: AI Models and Drive Sync Active' : 'Offline: Local IndexedDB Active'}
        >
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* System Tour / Onboarding */}
        <button
          onClick={onOpenOnboarding}
          className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-700 transition-colors duration-150"
          title="Product Tour & Features"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-700 transition-colors duration-150"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
