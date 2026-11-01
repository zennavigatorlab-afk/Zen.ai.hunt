import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Download,
  Upload,
  Key,
  Trash2,
  AlertTriangle,
  CheckCircle,
  FileCheck,
  HardDrive,
  History,
} from 'lucide-react';
import {
  exportAllData,
  restoreAllData,
  clearAllLocalData,
  getBackupHistory,
  addBackupHistoryItem,
  getAllMemories,
  getAllConversations,
  getAllKnowledge,
  getAllDocuments,
} from '../../storage/db';
import { encryptVault, decryptVault, computeSha256 } from '../../security/crypto';
import { BackupHistoryItem, EncryptedVaultPayload } from '../../types';

export const SecurityBackupView: React.FC = () => {
  const [passphrase, setPassphrase] = useState('');
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [stats, setStats] = useState({
    memories: 0,
    conversations: 0,
    knowledge: 0,
    documents: 0,
  });

  useEffect(() => {
    loadStatsAndHistory();
  }, []);

  const loadStatsAndHistory = async () => {
    const [m, c, k, d, hist] = await Promise.all([
      getAllMemories(),
      getAllConversations(),
      getAllKnowledge(),
      getAllDocuments(),
      getBackupHistory(),
    ]);
    setStats({
      memories: m.length,
      conversations: c.length,
      knowledge: k.length,
      documents: d.length,
    });
    setHistory(hist);
  };

  const handleExportEncryptedBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.length < 6) {
      alert('Passphrase must be at least 6 characters.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const dump = await exportAllData();
      const encryptedPayload = await encryptVault(dump, passphrase);

      const jsonStr = JSON.stringify(encryptedPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zen_ai_vault_${new Date().toISOString().slice(0, 10)}.zenbak`;
      a.click();
      URL.revokeObjectURL(url);

      await addBackupHistoryItem({
        id: `local_hist_${Date.now()}`,
        timestamp: Date.now(),
        type: 'local',
        itemCount: {
          memories: dump.data.memories.length,
          conversations: dump.data.conversations.length,
          messages: dump.data.messages.length,
          knowledge: dump.data.knowledge.length,
          documents: dump.data.documents.length,
        },
        checksum: encryptedPayload.checksum,
        status: 'success',
      });

      setPassphrase('');
      await loadStatsAndHistory();
      setStatusMessage({
        type: 'success',
        text: 'Encrypted backup downloaded. Keep your passphrase safe; it is required for restoration.',
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Export failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreFromFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile || !restorePassphrase) return;

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const fileText = await restoreFile.text();
      let payload: EncryptedVaultPayload;
      try {
        payload = JSON.parse(fileText);
      } catch {
        throw new Error('Selected file is not a valid ZEN AI JSON/zenbak vault archive');
      }

      const decryptedDump = await decryptVault(payload, restorePassphrase);
      await restoreAllData(decryptedDump);

      setRestoreFile(null);
      setRestorePassphrase('');
      setStatusMessage({
        type: 'success',
        text: 'Backup restored successfully! Local workspace refreshed.',
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Restore failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWipeDatabase = async () => {
    if (
      window.confirm(
        'DANGER: Are you absolutely sure you want to wipe all local data? This deletes all memories, conversations, knowledge, and documents permanently.'
      )
    ) {
      const secondCheck = window.prompt('Type "DELETE" to confirm complete workspace purge:');
      if (secondCheck === 'DELETE') {
        await clearAllLocalData();
        alert('All local workspace data has been cleared.');
        window.location.reload();
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 text-slate-100 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Security & Backup Engine</h2>
            <p className="text-xs text-slate-400">
              AES-256-GCM zero-knowledge encryption, PBKDF2 key derivation, and local archive management
            </p>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/40 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-xs opacity-75 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Security Architecture Specifications Card */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium mb-1">
            <Lock className="w-3.5 h-3.5 text-indigo-400" /> Cipher Algorithm
          </div>
          <div className="text-sm font-bold text-white">AES-256-GCM</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Authenticated 128-bit tag</div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium mb-1">
            <Key className="w-3.5 h-3.5 text-cyan-400" /> Key Derivation
          </div>
          <div className="text-sm font-bold text-white">PBKDF2-SHA-256</div>
          <div className="text-[10px] text-slate-500 mt-0.5">100,000 iterations + 16B salt</div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium mb-1">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" /> Integrity Verification
          </div>
          <div className="text-sm font-bold text-white">SHA-256 Digest</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Tamper-evident checksums</div>
        </div>
      </div>

      {/* Export & Import Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Local Encrypted Backup */}
        <form
          onSubmit={handleExportEncryptedBackup}
          className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Download className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Create Encrypted Backup (.zenbak)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Packages all {stats.memories} memories, {stats.conversations} conversations, {stats.knowledge} articles, and documents into an AES-256 encrypted file.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Enter Backup Passphrase *
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Passphrase (min 6 characters)..."
                required
                minLength={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors duration-150 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? 'Encrypting Archive...' : 'Download Encrypted Vault'}
          </button>
        </form>

        {/* Restore From File */}
        <form
          onSubmit={handleRestoreFromFile}
          className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Upload className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Restore Vault Archive</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Select a previously exported <code>.zenbak</code> or JSON vault payload to decrypt and restore into local IndexedDB.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Select Archive *</label>
                <input
                  type="file"
                  accept=".zenbak,.json"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Decryption Passphrase *
                </label>
                <input
                  type="password"
                  value={restorePassphrase}
                  onChange={(e) => setRestorePassphrase(e.target.value)}
                  placeholder="Enter archive passphrase..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing || !restoreFile}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors duration-150 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? 'Verifying & Restoring...' : 'Verify & Restore Vault'}
          </button>
        </form>
      </div>

      {/* Backup History */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-white">Backup Activity History</h3>
        </div>

        {history.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
            No backup history logged yet.
          </div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <div>
                    <span className="font-semibold text-white capitalize">{item.type} Backup</span>
                    <span className="text-slate-500 text-[10px] ml-2 font-mono">
                      {item.checksum.slice(0, 12)}...
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400">
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="p-5 rounded-2xl bg-red-950/20 border border-red-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-red-300">Danger Zone: Purge Workspace</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Permanently clear all memories, conversations, documents, and settings from this browser's IndexedDB.
          </p>
        </div>
        <button
          onClick={handleWipeDatabase}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/50 text-xs font-semibold transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4" /> Clear All Local Data
        </button>
      </div>
    </div>
  );
};
