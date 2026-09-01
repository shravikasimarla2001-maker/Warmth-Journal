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

export type HabitCategory = "mind" | "body" | "focus" | "creativity";

export interface HabitTemplate {
  id: string;
  userId: string;
  title: string;
  category: HabitCategory;
  icon: string; // e.g. "Sun", "Droplet", "Book", "Heart", "Footprints", "Sparkles", "Coffee", "Moon"
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface HabitCheckItem {
  templateId: string;
  title: string;
  category: HabitCategory;
  icon: string;
  completed: boolean;
  completedAt?: string;
}

export interface PriorityTask {
  id: string;
  text: string;
  completed: boolean;
  isPlannedFromYesterday?: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface DailyChecklist {
  date: string; // "YYYY-MM-DD"
  userId: string;
  habits: HabitCheckItem[];
  priorityTasks: PriorityTask[];
  totalCompleted: number;
  totalItems: number;
  updatedAt: string;
}

export interface PostcardData {
  date: string;
  photoUrl?: string;
  photoCaption?: string;
  mood?: MoodType;
  habitsCompleted: string[];
  tasksCompleted: string[];
  journalExcerpt?: string;
  reflectionTitle?: string;
}

export interface UserMilestone {
  id: string;
  userId: string;
  badgeKey: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  postcardData?: PostcardData;
}

export interface HabitMoodCorrelation {
  habitId: string;
  habitTitle: string;
  icon: string;
  category: HabitCategory;
  daysCompletedCount: number;
  avgMoodScoreWhenCompleted: number; // 1 to 5 scale
  avgMoodScoreWhenMissed: number;
  upliftPercentage: number;
}

