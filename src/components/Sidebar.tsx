import React from 'react';
import {
  MessageSquare,
  Brain,
  BookOpen,
  FileText,
  HardDrive,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type NavTab = 'assistant' | 'memory' | 'knowledge' | 'documents' | 'drive' | 'security' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: any;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems: NavItem[] = [
    { id: 'assistant', label: 'AI Assistant', icon: MessageSquare, badge: 'Chat' },
    { id: 'memory', label: 'Memory Engine', icon: Brain, badge: 'Active' },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'documents', label: 'Document Vault', icon: FileText },
    { id: 'drive', label: 'Google Drive', icon: HardDrive },
    { id: 'security', label: 'Security & Backup', icon: ShieldCheck },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  const content = (
    <div className="h-full flex flex-col justify-between p-3 bg-slate-950 border-r border-slate-800/80 select-none">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              title={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {!isCollapsed && item.badge && (
                <span
                  className={`ml-auto text-[9px] uppercase font-mono px-1.5 py-0.2 rounded ${
                    isActive ? 'bg-indigo-900/80 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse button for desktop */}
      <div className="pt-3 border-t border-slate-800/80 hidden md:block">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block transition-all duration-300 shrink-0 ${
          isCollapsed ? 'w-16' : 'w-56'
        }`}
      >
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative w-64 h-full bg-slate-950 z-50 animate-slide-right">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};
