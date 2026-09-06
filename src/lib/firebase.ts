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
  VisionGoal,
  VisionBoardSettings,
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

// =====================================================
// VISION BOARD CRUD & DEFAULT BLUEPRINTS (9 PILLARS)
// =====================================================

export const DEFAULT_VISION_GOALS: VisionGoal[] = [];

export const SAMPLE_STARTER_GOALS: VisionGoal[] = [
  {
    id: "sample-health",
    userId: "guest",
    title: "Radiant Vitality & Morning Ocean Runs",
    explanation: "Wake up with sustained energy, nourish my body with wholesome food, and build joyful endurance.",
    pillar: "health",
    targetTimeframe: "2026",
    status: "in_motion",
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sample-career",
    userId: "guest",
    title: "Lead Meaningful Work That Elevates People",
    explanation: "Work on high-leverage creative challenges with deep focus, autonomy, and genuine pride in craftsmanship.",
    pillar: "career",
    targetTimeframe: "2026",
    status: "in_motion",
    order: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sample-spirituality",
    userId: "guest",
    title: "Daily Meditation & Inner Tranquility",
    explanation: "Carve out 20 quiet minutes of silent presence every dawn; cultivate equanimity in the storms of life.",
    pillar: "spirituality",
    targetTimeframe: "Daily Ritual",
    status: "in_motion",
    order: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sample-finances",
    userId: "guest",
    title: "Financial Peace & Intentional Abundance",
    explanation: "Full debt freedom, a robust 12-month peace fund, and conscious investments supporting freedom.",
    pillar: "finances",
    targetTimeframe: "2026",
    status: "in_motion",
    order: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sample-partner",
    userId: "guest",
    title: "Deep Soulful Partnership & Sunset Walks",
    explanation: "Cultivate deep mutual trust, authentic communication, affectionate laughter, and weekly sacred date nights.",
    pillar: "partner",
    targetTimeframe: "Lifelong",
    status: "in_motion",
    order: 4,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sample-family",
    userId: "guest",
    title: "Warm Sunday Family Gatherings",
    explanation: "Create an inviting home filled with homemade food, unconditional warmth, and stories across generations.",
    pillar: "family",
    targetTimeframe: "Ongoing",
    status: "in_motion",
    order: 5,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sample-friends",
    userId: "guest",
    title: "Firepit Conversations with Soul Friends",
    explanation: "Stay deeply connected with people who elevate my soul; share raw honesty, support, and unfiltered joy.",
    pillar: "friends",
    targetTimeframe: "Year-round",
    status: "in_motion",
    order: 6,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sample-fun",
    userId: "guest",
    title: "Mountain Road Trips & Acoustic Music",
    explanation: "Embrace playful curiosity without productivity guilt; learn songs on guitar and camp under starlit skies.",
    pillar: "fun",
    targetTimeframe: "Summer 2026",
    status: "in_motion",
    order: 7,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sample-community",
    userId: "guest",
    title: "Mentoring & Mindful Seva",
    explanation: "Give back my time and resources to lift others up; plant trees, mentor aspiring learners, and build community.",
    pillar: "community",
    targetTimeframe: "Ongoing",
    status: "in_motion",
    order: 8,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export function subscribeToVisionGoals(
  userId: string,
  onData: (goals: VisionGoal[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = `users/${userId}/visionGoals`;
  const q = query(
    collection(db, "users", userId, "visionGoals"),
    orderBy("order", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as VisionGoal[];
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

export async function saveVisionGoal(
  userId: string,
  goal: VisionGoal
): Promise<void> {
  const path = `users/${userId}/visionGoals/${goal.id}`;
  const docRef = doc(db, "users", userId, "visionGoals", goal.id);

  const cleanData = sanitizeForFirestore({
    id: goal.id,
    userId,
    title: goal.title,
    explanation: goal.explanation || "",
    pillar: goal.pillar,
    imageUrl: goal.imageUrl || null,
    imagePrompt: goal.imagePrompt || null,
    imageSource: goal.imageSource || "curated",
    targetTimeframe: goal.targetTimeframe || "",
    status: goal.status || "in_motion",
    order: Number.isFinite(goal.order) ? goal.order : 0,
    widthSpan: goal.widthSpan || 1,
    customHeight: goal.customHeight || 320,
    customWidth: goal.customWidth || null,
    isTextOnly: goal.isTextOnly ?? false,
    hideBackground: goal.hideBackground ?? false,
    textBgColor: goal.textBgColor || null,
    textBgImage: goal.textBgImage || null,
    textFontStyle: goal.textFontStyle || "serif",
    createdAt: goal.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(docRef, cleanData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteVisionGoal(
  userId: string,
  goalId: string
): Promise<void> {
  const path = `users/${userId}/visionGoals/${goalId}`;
  const docRef = doc(db, "users", userId, "visionGoals", goalId);

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToVisionSettings(
  userId: string,
  onData: (settings: VisionBoardSettings | null) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = `users/${userId}/visionSettings/current`;
  const docRef = doc(db, "users", userId, "visionSettings", "current");

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data() as VisionBoardSettings);
      } else {
        onData(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
}

export async function saveVisionSettings(
  userId: string,
  settings: Partial<VisionBoardSettings>
): Promise<void> {
  const path = `users/${userId}/visionSettings/current`;
  const docRef = doc(db, "users", userId, "visionSettings", "current");

  const cleanData = sanitizeForFirestore({
    userId,
    annualTheme: settings.annualTheme || "",
    userPhotoUrl: settings.userPhotoUrl || null,
    userNameOrMantra: settings.userNameOrMantra || "",
    manifesto: settings.manifesto || "",
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}


