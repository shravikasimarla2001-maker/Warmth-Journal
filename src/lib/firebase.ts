import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocFromServer,
  Unsubscribe,
  updateDoc,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { JournalEntry, UserProfile } from "../types";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth & Firestore with dedicated Database ID
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Error handling contracts
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Zero-crash payload sanitizer (undefined-stripper)
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as unknown as T;
  }
  if (typeof obj === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Test initial connection
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore client is offline. Check Firebase configuration.");
      return false;
    }
    return true;
  }
}

// Sync user profile to /users/{uid}
export async function syncUserProfile(user: User): Promise<void> {
  const userRef = doc(db, "users", user.uid);
  const data = sanitizeForFirestore({
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    updatedAt: new Date().toISOString(),
  });

  try {
    const existing = await getDoc(userRef);
    if (!existing.exists()) {
      await setDoc(userRef, {
        ...data,
        createdAt: new Date().toISOString(),
        streakDays: 1,
        themePreference: "warm_amber",
      });
    } else {
      await setDoc(userRef, data, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

// Real-time listener for owner-bound journal entries (/users/{userId}/entries)
export function subscribeToUserEntries(
  userId: string,
  onData: (entries: JournalEntry[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = `users/${userId}/entries`;
  const q = query(
    collection(db, "users", userId, "entries"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as JournalEntry[];
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

// Save or Update Journal Entry
export async function saveJournalEntry(
  userId: string,
  entry: Partial<JournalEntry> & { id?: string; date: string }
): Promise<string> {
  const entryId = entry.id || "entry_" + Date.now();
  const path = `users/${userId}/entries/${entryId}`;
  const docRef = doc(db, "users", userId, "entries", entryId);

  const cleanData = sanitizeForFirestore({
    id: entryId,
    userId,
    title: entry.title || "Reflective Musings",
    date: entry.date,
    mood: entry.mood || "reflective",
    tags: entry.tags || ["reflection"],
    initialThought: entry.initialThought || "",
    summary: entry.summary || "",
    insights: entry.insights || [],
    reflectionType: entry.reflectionType || "daily_reflection",
    messages: entry.messages || [],
    favorite: entry.favorite ?? false,
    wordCount: entry.wordCount || 0,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(docRef, cleanData);
    return entryId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Toggle Favorite on entry
export async function toggleFavoriteEntry(
  userId: string,
  entryId: string,
  currentFavorite: boolean
): Promise<void> {
  const path = `users/${userId}/entries/${entryId}`;
  try {
    const docRef = doc(db, "users", userId, "entries", entryId);
    await updateDoc(docRef, {
      favorite: !currentFavorite,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Delete Journal Entry
export async function deleteJournalEntry(
  userId: string,
  entryId: string
): Promise<void> {
  const path = `users/${userId}/entries/${entryId}`;
  try {
    await deleteDoc(doc(db, "users", userId, "entries", entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
