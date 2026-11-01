import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { EncryptedVaultPayload } from '../types';

// Initialize Firebase App instance singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory token cache (never stored in localStorage as per security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google OAuth provider.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const disconnectGoogleDrive = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export interface DriveBackupFile {
  id: string;
  name: string;
  size: number;
  createdTime: string;
  modifiedTime: string;
}

/**
 * Locate or create the dedicated 'ZEN_AI_Vault' folder in Google Drive
 */
export async function getOrCreateVaultFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent("name = 'ZEN_AI_Vault' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const errorData = await searchRes.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Google Drive query failed with status ${searchRes.status}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'ZEN_AI_Vault',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Encrypted backups for ZEN AI – Personal Intelligence System (DeveloperHut)',
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Failed to create ZEN_AI_Vault folder in Google Drive');
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * List existing encrypted backups in the ZEN_AI_Vault folder
 */
export async function listVaultBackups(accessToken: string): Promise<DriveBackupFile[]> {
  const folderId = await getOrCreateVaultFolder(accessToken);
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,size,createdTime,modifiedTime)&orderBy=modifiedTime desc`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to list backups: status ${res.status}`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    size: Number(f.size || 0),
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime,
  }));
}

/**
 * Upload AES-256 encrypted vault backup to Google Drive
 */
export async function uploadEncryptedBackup(
  accessToken: string,
  vaultPayload: EncryptedVaultPayload,
  fileName?: string
): Promise<{ fileId: string; fileName: string }> {
  const folderId = await getOrCreateVaultFolder(accessToken);
  const name = fileName || `zen_ai_vault_${new Date().toISOString().replace(/[:.]/g, '-')}.zenbak`;

  const metadata = {
    name,
    parents: [folderId],
    mimeType: 'application/json',
    description: `ZEN AI Encrypted Vault Backup. Cipher: AES-256-GCM. Checksum: ${vaultPayload.checksum}`,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const payloadString = JSON.stringify(vaultPayload, null, 2);

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    payloadString +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Failed to upload encrypted backup to Google Drive');
  }

  const data = await res.json();
  return { fileId: data.id, fileName: name };
}

/**
 * Download encrypted backup payload from Google Drive
 */
export async function downloadBackupPayload(
  accessToken: string,
  fileId: string
): Promise<EncryptedVaultPayload> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download backup file: ${res.status}`);
  }

  const json = await res.json();
  return json as EncryptedVaultPayload;
}

/**
 * Delete a backup file from Google Drive (Requires user confirmation prior to calling)
 */
export async function deleteDriveBackupFile(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete backup file: ${res.status}`);
  }
}
