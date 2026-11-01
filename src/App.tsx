/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { ChatView } from './components/views/ChatView';
import { MemoryView } from './components/views/MemoryView';
import { KnowledgeView } from './components/views/KnowledgeView';
import { DocumentsView } from './components/views/DocumentsView';
import { DriveVaultView } from './components/views/DriveVaultView';
import { SecurityBackupView } from './components/views/SecurityBackupView';
import { SettingsView } from './components/views/SettingsView';
import { OnboardingModal } from './components/OnboardingModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AppSettings } from './types';
import { getSettings, saveSettings, initializeSeedDataIfFresh, DEFAULT_SETTINGS } from './storage/db';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('assistant');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    async function init() {
      await initializeSeedDataIfFresh();
      const currentSettings = await getSettings();
      setSettings(currentSettings);

      // Trigger onboarding if first-time user
      if (!currentSettings.onboardingCompleted) {
        setIsOnboardingOpen(true);
      }
    }
    init();
  }, []);

  const handleCompleteOnboarding = async () => {
    const updated = await saveSettings({ onboardingCompleted: true });
    setSettings(updated);
    setIsOnboardingOpen(false);
  };

  const handleSearchResultClick = (type: string, id: string) => {
    switch (type) {
      case 'memory':
        setActiveTab('memory');
        break;
      case 'knowledge':
        setActiveTab('knowledge');
        break;
      case 'conversation':
        setActiveTab('assistant');
        break;
      case 'document':
        setActiveTab('documents');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Top Application Shell Header */}
      <Header
        settings={settings}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Workspace with Collapsible Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {activeTab === 'assistant' && (
            <ChatView
              settings={settings}
              onOpenSettings={() => setActiveTab('settings')}
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
            />
          )}
          {activeTab === 'memory' && <MemoryView />}
          {activeTab === 'knowledge' && <KnowledgeView />}
          {activeTab === 'documents' && <DocumentsView />}
          {activeTab === 'drive' && <DriveVaultView />}
          {activeTab === 'security' && <SecurityBackupView />}
          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={setSettings}
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
            />
          )}
        </main>
      </div>

      {/* User Onboarding Guided Flow */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleCompleteOnboarding}
      />

      {/* Cmd+K Global Search Palette */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSearchResultClick}
      />

      {/* Non-intrusive Offline Banner */}
      <OfflineIndicator />
    </div>
  );
}
