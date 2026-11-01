import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Cloud,
  Lock,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  Calendar,
  Key,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  signInWithGoogle,
  disconnectGoogleDrive,
  getAccessToken,
  initDriveAuth,
  listVaultBackups,
  uploadEncryptedBackup,
  downloadBackupPayload,
  deleteDriveBackupFile,
  DriveBackupFile,
} from '../../services/driveVault';
import { exportAllData, restoreAllData, addBackupHistoryItem } from '../../storage/db';
import { encryptVault, decryptVault } from '../../security/crypto';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const DriveVaultView: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [backups, setBackups] = useState<DriveBackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modals
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<DriveBackupFile | null>(null);
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<DriveBackupFile | null>(null);

  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (authUser, authToken) => {
        setUser(authUser);
        setToken(authToken);
        loadDriveBackups(authToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setBackups([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadDriveBackups = async (authToken: string) => {
    setIsLoading(true);
    try {
      const list = await listVaultBackups(authToken);
      setBackups(list);
    } catch (err: any) {
      console.error('Error loading backups:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to list Google Drive backups' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const result = await signInWithGoogle();
      setUser(result.user);
      setToken(result.accessToken);
      await loadDriveBackups(result.accessToken);
      setStatusMessage({ type: 'success', text: 'Successfully authenticated with Google Drive Vault!' });
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Google Sign-in was cancelled or failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Disconnect Google Drive Vault? Your local data will remain intact.')) {
      await disconnectGoogleDrive();
      setUser(null);
      setToken(null);
      setBackups([]);
      setStatusMessage({ type: 'info', text: 'Google Drive disconnected.' });
    }
  };

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (backupPassphrase.length < 6) {
      alert('Passphrase must be at least 6 characters for AES-256-GCM encryption.');
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      // 1. Export all local IndexedDB data
      const dump = await exportAllData();

      // 2. Client-side encrypt with AES-256-GCM
      const encryptedPayload = await encryptVault(dump, backupPassphrase);

      // 3. Upload encrypted snapshot to Google Drive 'ZEN_AI_Vault' folder
      const result = await uploadEncryptedBackup(token, encryptedPayload);

      // Record backup history
      await addBackupHistoryItem({
        id: `hist_${Date.now()}`,
        timestamp: Date.now(),
        type: 'drive',
        itemCount: {
          memories: dump.data.memories.length,
          conversations: dump.data.conversations.length,
          messages: dump.data.messages.length,
          knowledge: dump.data.knowledge.length,
          documents: dump.data.documents.length,
        },
        checksum: encryptedPayload.checksum,
        status: 'success',
        driveFileId: result.fileId,
      });

      setBackupPassphrase('');
      setIsBackupModalOpen(false);
      await loadDriveBackups(token);
      setStatusMessage({
        type: 'success',
        text: `Encrypted backup snapshot "${result.fileName}" saved to your Google Drive vault.`,
      });
    } catch (err: any) {
      console.error('Backup creation failed:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create backup.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedBackupForRestore) return;

    setIsLoading(true);
    setStatusMessage(null);

    try {
      // 1. Download encrypted payload
      const encryptedPayload = await downloadBackupPayload(token, selectedBackupForRestore.id);

      // 2. Client-side decrypt with user passphrase & verify checksum
      const decryptedDump = await decryptVault(encryptedPayload, restorePassphrase);

      // 3. Restore all records into IndexedDB
      await restoreAllData(decryptedDump);

      setIsRestoreModalOpen(false);
      setRestorePassphrase('');
      setSelectedBackupForRestore(null);
      setStatusMessage({
        type: 'success',
        text: 'Encrypted backup restored and local database updated successfully!',
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error('Restore failed:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to restore backup.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!token || !deleteConfirmFile) return;
    setIsLoading(true);
    try {
      await deleteDriveBackupFile(token, deleteConfirmFile.id);
      setDeleteConfirmFile(null);
      await loadDriveBackups(token);
      setStatusMessage({ type: 'info', text: 'Backup file permanently deleted from Google Drive.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to delete file from Google Drive.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 text-slate-100 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Google Drive Vault</h2>
            <p className="text-xs text-slate-400">
              Zero-knowledge encrypted cloud backups stored in your private Google Drive folder
            </p>
          </div>
        </div>

        {user && token && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadDriveBackups(token)}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Refresh Drive Backups"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Create Cloud Backup
            </button>
          </div>
        )}
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-red-950/40 border-red-500/30 text-red-300'
              : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-xs opacity-75 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Connection State Card */}
      {!user || !token ? (
        <div className="rounded-2xl p-6 sm:p-8 bg-slate-900/60 border border-slate-800 text-center max-w-lg mx-auto space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
            <Cloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Google Drive Vault Not Connected</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Connect your Google account to back up encrypted personal intelligence snapshots. ZEN AI encrypts all memories, documents, and chats on your device before upload.
            </p>
          </div>

          <div className="pt-2">
            {/* Official Google Sign In Button */}
            <button
              onClick={handleConnect}
              disabled={isLoading || !isOnline}
              className="inline-flex items-center gap-3 px-6 py-2.5 rounded-xl bg-white text-gray-800 hover:bg-gray-100 font-medium text-xs shadow-lg transition cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isLoading ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Scope restricted to dedicated app folder (drive.file)</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Connected Profile Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border border-slate-700" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{user.displayName || 'Google Account'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 font-medium">
                    Connected
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">{user.email}</div>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Disconnect
            </button>
          </div>

          {/* Backup List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Google Drive Encrypted Backups ({backups.length})
              </h3>
              <span className="text-xs text-slate-500">Location: /ZEN_AI_Vault</span>
            </div>

            {backups.length === 0 ? (
              <div className="rounded-2xl p-8 bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500 space-y-2">
                <Cloud className="w-8 h-8 mx-auto text-slate-600" />
                <p>No backups found in your Google Drive vault folder.</p>
                <button
                  onClick={() => setIsBackupModalOpen(true)}
                  className="text-indigo-400 hover:underline"
                >
                  Create your first encrypted backup now
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">{b.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{(b.size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>{new Date(b.modifiedTime).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedBackupForRestore(b);
                          setIsRestoreModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-xs font-semibold text-white transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Restore
                      </button>
                      <button
                        onClick={() => setDeleteConfirmFile(b)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                        title="Delete backup"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Backup Modal */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <form
            onSubmit={handleCreateBackup}
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Create Encrypted Backup</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Provide an encryption passphrase. Your data will be transformed via AES-256-GCM before upload. You must remember this passphrase to restore.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Passphrase *</label>
              <input
                type="password"
                value={backupPassphrase}
                onChange={(e) => setBackupPassphrase(e.target.value)}
                placeholder="At least 6 characters..."
                required
                minLength={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Encrypting & Uploading...' : 'Encrypt & Upload'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Restore Backup Modal */}
      {isRestoreModalOpen && selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <form
            onSubmit={handleRestoreBackup}
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Restore Encrypted Backup</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong>Warning:</strong> Restoring will replace existing local records with the contents of{' '}
                <span className="font-mono text-white">{selectedBackupForRestore.name}</span>.
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Enter Decryption Passphrase *
              </label>
              <input
                type="password"
                value={restorePassphrase}
                onChange={(e) => setRestorePassphrase(e.target.value)}
                placeholder="Passphrase used when creating backup..."
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Decrypting & Restoring...' : 'Confirm & Restore'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal (Mandatory User Confirmation for destructive Workspace operations) */}
      {deleteConfirmFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Delete Drive Backup?</h3>
            </div>
            <p className="text-xs text-slate-400">
              Are you sure you want to delete <span className="font-mono text-white">{deleteConfirmFile.name}</span> from your Google Drive vault? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmFile(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBackup}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md transition"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
