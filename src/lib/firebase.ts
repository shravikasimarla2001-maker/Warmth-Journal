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
import {
  JournalEntry,
  UserProfile,
  HabitTemplate,
  DailyChecklist,
  UserMilestone,
} from "../types";

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
    photoUrl: entry.photoUrl !== undefined ? entry.photoUrl : null,
    photoCaption: entry.photoCaption !== undefined ? entry.photoCaption : null,
    hasVoiceNote: entry.hasVoiceNote ?? false,
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

// =====================================================
// HABIT TEMPLATES CRUD & REALTIME LISTENER
// =====================================================

export const DEFAULT_HABIT_TEMPLATES: HabitTemplate[] = [
  {
    id: "habit_preset_1",
    userId: "default",
    title: "Morning Sunlight & Hydration",
    category: "body",
    icon: "Sun",
    isActive: true,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "habit_preset_2",
    userId: "default",
    title: "15-min Mindful Reading",
    category: "mind",
    icon: "Book",
    isActive: true,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "habit_preset_3",
    userId: "default",
    title: "Gentle Movement / Walk",
    category: "body",
    icon: "Footprints",
    isActive: true,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "habit_preset_4",
    userId: "default",
    title: "Gratitude & Stillness",
    category: "mind",
    icon: "Heart",
    isActive: true,
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "habit_preset_5",
    userId: "default",
    title: "Uninterrupted Deep Work Block",
    category: "focus",
    icon: "Sparkles",
    isActive: true,
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "habit_preset_6",
    userId: "default",
    title: "Screen-Free Evening Wind Down",
    category: "mind",
    icon: "Moon",
    isActive: true,
    order: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function subscribeToHabitTemplates(
  userId: string,
  onData: (templates: HabitTemplate[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = `users/${userId}/habitTemplates`;
  const q = query(
    collection(db, "users", userId, "habitTemplates"),
    orderBy("order", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as HabitTemplate[];
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

export async function saveHabitTemplate(
  userId: string,
  template: Partial<HabitTemplate> & { title: string }
): Promise<string> {
  const templateId = template.id || "habit_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
  const path = `users/${userId}/habitTemplates/${templateId}`;
  const docRef = doc(db, "users", userId, "habitTemplates", templateId);

  const cleanData = sanitizeForFirestore({
    id: templateId,
    userId,
    title: template.title.trim(),
    category: template.category || "mind",
    icon: template.icon || "Sparkles",
    isActive: template.isActive ?? true,
    order: template.order ?? Date.now(),
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(docRef, cleanData);
    return templateId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteHabitTemplate(
  userId: string,
  templateId: string
): Promise<void> {
  const path = `users/${userId}/habitTemplates/${templateId}`;
  try {
    await deleteDoc(doc(db, "users", userId, "habitTemplates", templateId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// =====================================================
// DAILY CHECKLISTS CRUD & REALTIME LISTENER
// =====================================================

export function subscribeToDailyChecklists(
  userId: string,
  onData: (checklists: Record<string, DailyChecklist>) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = `users/${userId}/dailyChecklists`;
  const q = collection(db, "users", userId, "dailyChecklists");

  return onSnapshot(
    q,
    (snapshot) => {
      const map: Record<string, DailyChecklist> = {};
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as DailyChecklist;
        map[docSnap.id] = {
          date: docSnap.id,
          ...data,
        };
      });
      onData(map);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

export async function saveDailyChecklist(
  userId: string,
  checklist: DailyChecklist
): Promise<void> {
  const path = `users/${userId}/dailyChecklists/${checklist.date}`;
  const docRef = doc(db, "users", userId, "dailyChecklists", checklist.date);

  const cleanData = sanitizeForFirestore({
    date: checklist.date,
    userId,
    habits: checklist.habits || [],
    priorityTasks: checklist.priorityTasks || [],
    totalCompleted: checklist.totalCompleted ?? 0,
    totalItems: checklist.totalItems ?? 0,
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(docRef, cleanData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// =====================================================
// MILESTONES & MEMORY POSTCARDS CRUD
// =====================================================

export function subscribeToMilestones(
  userId: string,
  onData: (milestones: UserMilestone[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = `users/${userId}/milestones`;
  const q = query(
    collection(db, "users", userId, "milestones"),
    orderBy("unlockedAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as UserMilestone[];
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

export async function saveMilestone(
  userId: string,
  milestone: UserMilestone
): Promise<void> {
  const path = `users/${userId}/milestones/${milestone.id}`;
  const docRef = doc(db, "users", userId, "milestones", milestone.id);

  const cleanData = sanitizeForFirestore({
    id: milestone.id,
    userId,
    badgeKey: milestone.badgeKey,
    title: milestone.title,
    description: milestone.description,
    icon: milestone.icon,
    unlockedAt: milestone.unlockedAt || new Date().toISOString(),
    postcardData: milestone.postcardData ? {
      date: milestone.postcardData.date,
      photoUrl: milestone.postcardData.photoUrl || null,
      photoCaption: milestone.postcardData.photoCaption || null,
      mood: milestone.postcardData.mood || "peaceful",
      habitsCompleted: milestone.postcardData.habitsCompleted || [],
      tasksCompleted: milestone.postcardData.tasksCompleted || [],
      journalExcerpt: milestone.postcardData.journalExcerpt || "",
      reflectionTitle: milestone.postcardData.reflectionTitle || "",
    } : null,
  });

  try {
    await setDoc(docRef, cleanData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

