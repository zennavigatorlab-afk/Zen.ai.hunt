import React, { useState } from 'react';
import {
  Brain,
  MessageSquare,
  BookOpen,
  ShieldCheck,
  HardDrive,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
  Layers,
  Lock,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Welcome to ZEN AI',
      subtitle: 'Your Personal Intelligence System',
      badge: 'A DeveloperHut Product',
      icon: Brain,
      iconColor: 'text-indigo-400',
      bgColor: 'bg-indigo-950/40 border-indigo-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            ZEN AI is an operating-system-grade personal cognitive platform built in partnership with{' '}
            <strong className="text-white font-medium">DeveloperHunt.in</strong>. Unlike typical cloud chatbots, ZEN AI is architected from the ground up as a{' '}
            <span className="text-indigo-300 font-medium">local-first, privacy-focused system</span>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
                <Layers className="w-4 h-4" /> Local Storage First
              </div>
              <p className="text-xs text-slate-400">
                All memories, conversations, and documents live right in your browser's IndexedDB.
              </p>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
                <Lock className="w-4 h-4" /> Zero-Knowledge Vault
              </div>
              <p className="text-xs text-slate-400">
                Client-side AES-256-GCM encryption ensures your information stays under your control.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 italic">
            "One personal intelligence system. One personal workspace. Your information under your control."
          </p>
        </div>
      ),
    },
    {
      title: 'Persistent Personal Memory',
      subtitle: 'Teach ZEN AI what matters to you',
      badge: 'Core Engine',
      icon: Sparkles,
      iconColor: 'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            Instead of repeating your context in every prompt, ZEN AI maintains a persistent memory engine. Memories are categorized and given importance ratings.
          </p>
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Example Active Memories</div>
            <div className="flex items-center gap-2 text-xs bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-300 font-medium">[Preference]</span>
              <span>"Prefers concise TypeScript code responses with architectural explanations."</span>
            </div>
            <div className="flex items-center gap-2 text-xs bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-cyan-300 font-medium">[Work]</span>
              <span>"Developing a local-first PWA with Google Drive encrypted vault sync."</span>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            <strong>Retrieval Pipeline:</strong> When you message the assistant, relevant memories are evaluated against a relevance threshold and injected into context with full user approval.
          </div>
        </div>
      ),
    },
    {
      title: 'AI Assistant & Model Selection',
      subtitle: 'Transparent cognitive interaction',
      badge: 'Intelligence Layer',
      icon: MessageSquare,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            Communicate naturally with the AI Assistant. Every response displays the exact memories and documents consulted.
          </p>
          <div className="space-y-2.5">
            <div className="flex items-start gap-3 rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 text-xs font-bold">
                M
              </div>
              <div className="text-xs">
                <div className="font-semibold text-slate-200">Model Selection</div>
                <div className="text-slate-400">
                  Switch dynamically between <strong>Gemini 3.8 Flash</strong> (default for speed & reasoning), <strong>Flash-Lite</strong>, or <strong>Gemini 4 Argon</strong>.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">
                ⚡
              </div>
              <div className="text-xs">
                <div className="font-semibold text-slate-200">Offline Resilience</div>
                <div className="text-slate-400">
                  When disconnected, the local assistant retrieves your stored knowledge and memories without hallucinating remote models.
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Knowledge Center & Documents',
      subtitle: 'Your personal library & text intelligence',
      badge: 'Knowledge Engine',
      icon: BookOpen,
      iconColor: 'text-cyan-400',
      bgColor: 'bg-cyan-950/40 border-cyan-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            Import project briefs, notes, code snippets, and documentation. ZEN AI slices long texts into smart indexed chunks with overlapping context.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <div className="font-medium text-white text-xs mb-1">Supported Formats</div>
              <p className="text-xs text-slate-400">
                Markdown (.md), Text (.txt), JSON, CSV, HTML, and code files (.ts, .js, .py).
              </p>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <div className="font-medium text-white text-xs mb-1">Turn Text into Memory</div>
              <p className="text-xs text-slate-400">
                Highlight any chunk or article and promote it to an active personal memory in one click.
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            Search across your entire library anytime with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Ctrl+K</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Cmd+K</kbd>.
          </div>
        </div>
      ),
    },
    {
      title: 'Google Drive Vault & Encryption',
      subtitle: 'Seamless cloud backup with zero leaks',
      badge: 'Security Vault',
      icon: HardDrive,
      iconColor: 'text-violet-400',
      bgColor: 'bg-violet-950/40 border-violet-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            Back up your entire intelligence workspace to Google Drive without ever exposing unencrypted personal notes.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><strong>Client-Side Encryption:</strong> Data is encrypted with AES-256-GCM before leaving your device.</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><strong>Dedicated App Folder:</strong> Backups are placed inside your private <code>ZEN_AI_Vault</code> folder.</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><strong>Offline Exports:</strong> Download encrypted <code>.zenbak</code> archives locally anytime.</span>
            </div>
          </div>
          <div className="rounded-lg bg-indigo-950/30 border border-indigo-500/20 p-3 text-xs text-indigo-300">
            Tip: You can re-trigger this guide anytime from <strong>Settings &gt; Replay Onboarding Guide</strong>.
          </div>
        </div>
      ),
    },
  ];

  const step = steps[currentStep];
  const StepIcon = step.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-950 border border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${step.bgColor} ${step.iconColor}`}>
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  {step.badge}
                </span>
                <span className="text-[10px] text-slate-500">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <h2 className="text-base font-bold text-white">{step.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-150"
            title="Skip Onboarding"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress indicators */}
        <div className="w-full bg-slate-900 h-1">
          <div
            className="bg-indigo-500 h-1 transition-[width] duration-150"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-3">
          <div className="text-xs font-medium text-slate-400">{step.subtitle}</div>
          {step.content}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-900/60 mt-auto">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors duration-150 px-2 py-1"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors duration-150"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors duration-150"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Get Started
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
