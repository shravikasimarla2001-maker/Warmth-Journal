export type MoodType =
  | "peaceful"
  | "grateful"
  | "reflective"
  | "hopeful"
  | "overwhelmed"
  | "inspired"
  | "content"
  | "curious"
  | "melancholic"
  | "determined";

export type ReflectionType =
  | "daily_reflection"
  | "gratitude"
  | "brainstorm"
  | "deep_dive"
  | "mindfulness"
  | "clarity_coaching";

export interface ChatMessage {
  id: string;
  sender: "user" | "gemini";
  text: string;
  timestamp: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  mood: MoodType;
  tags: string[];
  initialThought: string;
  summary: string;
  insights: string[];
  reflectionType: ReflectionType;
  messages: ChatMessage[];
  favorite?: boolean;
  wordCount: number;
  photoUrl?: string; // Daily photo moment (compressed base64 data URL)
  photoCaption?: string;
  hasVoiceNote?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailySpark {
  category: string;
  prompt: string;
  type: ReflectionType;
}

export interface ModelTelemetry {
  modelUsed: string;
  attemptedModels: string[];
  fallbackTriggered: boolean;
  timestamp: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  streakDays?: number;
  lastJournalDate?: string;
  themePreference?: "warm_amber" | "terracotta" | "linen_cream" | "dusk_copper";
  createdAt?: string;
  updatedAt?: string;
}
