import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Shield,
  Brain,
  Cpu,
  Sparkles,
  HelpCircle,
  Database,
  Info,
  Check,
  RotateCcw,
} from 'lucide-react';
import { AppSettings } from '../../types';
import { saveSettings } from '../../storage/db';
import { AVAILABLE_MODELS } from '../../services/aiProvider';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onOpenOnboarding: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onOpenOnboarding,
}) => {
  const [theme, setTheme] = useState(settings.theme || 'dark');
  const [defaultModel, setDefaultModel] = useState(settings.defaultModel || 'gemini-3.8-flash');
  const [memoryRetrievalEnabled, setMemoryRetrievalEnabled] = useState(settings.memoryRetrievalEnabled);
  const [threshold, setThreshold] = useState(settings.memoryRelevanceThreshold || 0.15);
  const [autoExtraction, setAutoExtraction] = useState(settings.autoMemoryExtraction);
  const [userName, setUserName] = useState(settings.userName || 'Explorer');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await saveSettings({
      theme,
      defaultModel,
      memoryRetrievalEnabled,
      memoryRelevanceThreshold: threshold,
      autoMemoryExtraction: autoExtraction,
      userName: userName.trim() || 'Explorer',
    });
    onUpdateSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 text-slate-100 max-w-4xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-900 text-slate-300 border border-slate-800">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">System Settings</h2>
            <p className="text-xs text-slate-400">
              Configure personal intelligence thresholds, appearance, AI models, and privacy controls
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-medium animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400" /> Settings Saved
          </div>
        )}
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* User Identity & Experience */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Identity & Personalization</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Your Preferred Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Explorer"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {(['dark', 'light', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium capitalize border transition ${
                      theme === t
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Memory Engine Controls */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Personal Memory Engine</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Global Memory Retrieval
                </div>
                <div className="text-[11px] text-slate-400">
                  Allow ZEN AI to search and inject relevant personal memories into assistant prompts.
                </div>
              </div>
              <input
                type="checkbox"
                checked={memoryRetrievalEnabled}
                onChange={(e) => setMemoryRetrievalEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-200">
                  Memory Relevance Threshold
                </span>
                <span className="text-xs font-mono text-indigo-400">{(threshold * 100).toFixed(0)}%</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Memories scoring below this threshold will not be injected. Lower values retrieve broader context; higher values retrieve only strict matches.
              </p>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Auto Memory Candidate Suggestion
                </div>
                <div className="text-[11px] text-slate-400">
                  Highlight potential facts and preferences from conversations for one-click saving.
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoExtraction}
                onChange={(e) => setAutoExtraction(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* AI Model Architecture */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Default Intelligence Model</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {AVAILABLE_MODELS.map((m) => {
              const isSelected = defaultModel === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setDefaultModel(m.id)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-200">{m.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{m.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Replay Onboarding Guide */}
        <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">System Tour & Onboarding</h4>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Review how personal memories, document intelligence, and encrypted vault synchronization operate.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenOnboarding}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Replay Onboarding Guide
          </button>
        </div>

        {/* Save Changes Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition cursor-pointer"
          >
            Save System Settings
          </button>
        </div>
      </form>

      {/* Brand & Attribution Information */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2 text-xs text-slate-400">
        <div className="font-bold text-white text-sm">ZEN AI – Personal Intelligence System</div>
        <div>
          Official Product of <strong className="text-indigo-400">DeveloperHut</strong>
        </div>
        <div className="text-[11px] text-slate-500">
          In partnership with <strong className="text-slate-400">DeveloperHunt.in</strong>
        </div>
        <div className="text-[11px] text-slate-500 italic pt-1">
          "One personal intelligence system. One personal workspace. Your information under your control."
        </div>
      </div>
    </div>
  );
};
