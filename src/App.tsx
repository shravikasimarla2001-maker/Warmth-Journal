import React, { useState, useEffect, useMemo } from "react";
import { User, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  auth,
  googleProvider,
  testFirestoreConnection,
  syncUserProfile,
  subscribeToUserEntries,
  saveJournalEntry,
  deleteJournalEntry,
  toggleFavoriteEntry,
  subscribeToHabitTemplates,
  saveHabitTemplate,
  deleteHabitTemplate,
  subscribeToDailyChecklists,
  saveDailyChecklist,
  subscribeToMilestones,
  saveMilestone,
  DEFAULT_HABIT_TEMPLATES,
  subscribeToVisionGoals,
  saveVisionGoal,
  deleteVisionGoal,
  subscribeToVisionSettings,
  saveVisionSettings,
  DEFAULT_VISION_GOALS,
} from "./lib/firebase";
import {
  JournalEntry,
  ModelTelemetry,
  ReflectionType,
  HabitTemplate,
  DailyChecklist,
  UserMilestone,
  AppSettings,
  AppTheme,
  WisdomStream,
  DailyWisdomItem,
  VisionGoal,
  VisionBoardSettings,
} from "./types";
import { Navbar } from "./components/Navbar";
import { LandingHero } from "./components/LandingHero";
import { JournalEditor } from "./components/JournalEditor";
import { MemoriesView } from "./components/MemoriesView";
import { HabitManagerModal } from "./components/HabitManagerModal";
import { InsightsMilestonesTab, BADGE_DEFINITIONS } from "./components/InsightsMilestonesTab";
import { MilestoneCelebrationModal } from "./components/MilestoneCelebrationModal";
import { SettingsModal } from "./components/SettingsModal";
import { VisionBoardView } from "./components/VisionBoardView";
import { ShieldCheck, AlertTriangle, CheckCircle2, Feather } from "lucide-react";

export default function App() {
  // Navigation State: Today, Memories, Vision Board, Insights
  const [activeTab, setActiveTab] = useState<"today" | "memories" | "insights" | "vision">("today");

  // App Settings State (Theme, Wisdom lens, Hardware, Habits)
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("warmth_app_settings");
      const savedStream = localStorage.getItem("warmth_wisdom_stream") as WisdomStream;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (savedStream) {
          parsed.wisdomStream = savedStream;
        }
        return parsed;
      }
      if (savedStream) {
        return {
          theme: "system",
          wisdomStream: savedStream,
          enableCamera: true,
          enableMicrophone: true,
          autoPlayWisdomAudio: true,
        };
      }
    } catch {
      // ignore
    }
    return {
      theme: "system",
      wisdomStream: (localStorage.getItem("warmth_wisdom_stream") as WisdomStream) || "all",
      enableCamera: true,
      enableMicrophone: true,
      autoPlayWisdomAudio: true,
    };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<
    "habits" | "wisdom" | "hardware"
  >("habits");

  const openSettings = (
    section: "habits" | "wisdom" | "hardware" = "habits"
  ) => {
    setSettingsInitialSection(section);
    setIsSettingsOpen(true);
  };

  // Update App Settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem("warmth_app_settings", JSON.stringify(updated));
        if (newSettings.wisdomStream) {
          localStorage.setItem("warmth_wisdom_stream", newSettings.wisdomStream);
        }
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Ensure standard light appearance
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // Firebase Auth & Database Connection State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<"online" | "connecting" | "offline">("connecting");
  const [telemetry, setTelemetry] = useState<ModelTelemetry | null>(null);

  // Entries List (User isolated)
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try {
      const local = localStorage.getItem("warmth_guest_entries");
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });

  // Habit Templates State
  const [habitTemplates, setHabitTemplates] = useState<HabitTemplate[]>(() => {
    try {
      const local = localStorage.getItem("warmth_guest_habits");
      return local ? JSON.parse(local) : DEFAULT_HABIT_TEMPLATES;
    } catch {
      return DEFAULT_HABIT_TEMPLATES;
    }
  });

  // Daily Checklists Map (Keyed by "YYYY-MM-DD")
  const [dailyChecklists, setDailyChecklists] = useState<Record<string, DailyChecklist>>(() => {
    try {
      const local = localStorage.getItem("warmth_guest_checklists");
      return local ? JSON.parse(local) : {};
    } catch {
      return {};
    }
  });

  // Milestones State
  const [milestones, setMilestones] = useState<UserMilestone[]>(() => {
    try {
      const local = localStorage.getItem("warmth_guest_milestones");
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });

  // Vision Goals State (9 Life Pillars) - starts empty until user adds their intentions
  const [visionGoals, setVisionGoals] = useState<VisionGoal[]>(() => {
    try {
      const local = localStorage.getItem("warmth_guest_vision_goals");
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          // If stored data only contains the old dummy auto-generated seeds with no user-added goals, start clean
          const isOldDummySeed =
            parsed.length > 0 &&
            parsed.every((g: any) => g.id && g.id.startsWith("v-") && !g.imageUrl);
          if (!isOldDummySeed) {
            return parsed;
          }
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Vision Board Settings (Theme, Centerpiece Portrait, Manifesto)
  const [visionSettings, setVisionSettings] = useState<VisionBoardSettings | null>(() => {
    try {
      const local = localStorage.getItem("warmth_guest_vision_settings");
      return local ? JSON.parse(local) : null;
    } catch {
      return null;
    }
  });

  // Wisdom Bookmarks State
  const [bookmarkedWisdomIds, setBookmarkedWisdomIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("warmth_wisdom_bookmarks");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleToggleWisdomBookmark = (item: any) => {
    setBookmarkedWisdomIds((prev) => {
      const isSaved = prev.includes(item.id);
      const updated = isSaved ? prev.filter((id) => id !== item.id) : [...prev, item.id];
      try {
        localStorage.setItem("warmth_wisdom_bookmarks", JSON.stringify(updated));
      } catch {
        // ignore
      }
      showToast(
        isSaved
          ? "Removed from Saved Wisdom."
          : `Saved "${item.source}" to your Wisdom Treasury! 🪔`
      );
      return updated;
    });
  };

  // Anchor Today's Journal reflection with a selected Wisdom verse
  const handleReflectWithWisdom = (item: DailyWisdomItem) => {
    setActiveTab("today");
    const wisdomText = `"${item.translation}" — ${item.source}\n\n`;
    setCurrentEditingEntry((prev) => {
      if (!prev) {
        const todayStr = new Date().toISOString().split("T")[0];
        return {
          id: "entry_" + Date.now(),
          userId: user ? user.uid : "guest_user",
          title: `Reflection on ${item.theme}`,
          date: todayStr,
          mood: "calm",
          tags: ["reflection", item.theme.toLowerCase().replace(/\s+/g, "_")],
          initialThought: wisdomText,
          summary: "",
          insights: [],
          reflectionType: "daily_reflection",
          messages: [],
          favorite: false,
          wordCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return {
        ...prev,
        initialThought: prev.initialThought
          ? `${prev.initialThought}\n\n${wisdomText}`
          : wisdomText,
      };
    });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    showToast(`Anchored journal with ${item.source} ✍️`);
  };

  // Modals & UI States
  const [isHabitManagerOpen, setIsHabitManagerOpen] = useState(false);
  const [celebrationMilestone, setCelebrationMilestone] = useState<UserMilestone | null>(null);

  // Current Entry in Editor
  const [currentEditingEntry, setCurrentEditingEntry] = useState<JournalEntry | null>(null);

  // Filter state for calendar jumps
  const [selectedFilterDate, setSelectedFilterDate] = useState<string | null>(null);

  // Feedback notifications
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // 1. Check Server Health & Firestore Connectivity on Mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          setServerStatus("online");
        } else {
          setServerStatus("offline");
        }
      } catch {
        setServerStatus("offline");
      }
    };

    checkServer();
    testFirestoreConnection().then((connected) => {
      setFirestoreConnected(connected);
    });
  }, []);

  // 2. Firebase Auth & Realtime Firestore Synchronization
  useEffect(() => {
    let unsubEntries: () => void = () => {};
    let unsubHabits: () => void = () => {};
    let unsubChecklists: () => void = () => {};
    let unsubMilestones: () => void = () => {};
    let unsubVisionGoals: () => void = () => {};
    let unsubVisionSettings: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);

      if (currentUser) {
        // Sync profile to /users/{uid}
        try {
          await syncUserProfile(currentUser);
        } catch (err) {
          console.warn("Could not sync user profile:", err);
        }

        // Attach Realtime Listener to owner-bound Firestore subcollection: /users/{uid}/entries
        unsubEntries = subscribeToUserEntries(
          currentUser.uid,
          (cloudEntries) => {
            setEntries(cloudEntries);
            setCurrentEditingEntry((prev) => {
              const todayStr = new Date().toISOString().split("T")[0];
              const activeDate = prev?.date || todayStr;
              const matchingCloud = cloudEntries.find((e) => e.date === activeDate);
              if (matchingCloud) {
                if (!prev || prev.id === matchingCloud.id || (!prev.initialThought && !prev.title)) {
                  return matchingCloud;
                }
              }
              return prev;
            });
          },
          (err) => {
            console.warn("Firestore entries snapshot error:", err);
          }
        );

        // Attach Realtime Listener to /users/{uid}/habitTemplates
        unsubHabits = subscribeToHabitTemplates(
          currentUser.uid,
          (cloudHabits) => {
            if (cloudHabits.length > 0) {
              setHabitTemplates(cloudHabits);
            } else {
              setHabitTemplates(DEFAULT_HABIT_TEMPLATES);
            }
          },
          (err) => {
            console.warn("Firestore habits snapshot error:", err);
          }
        );

        // Attach Realtime Listener to /users/{uid}/dailyChecklists
        unsubChecklists = subscribeToDailyChecklists(
          currentUser.uid,
          (cloudChecklists) => {
            setDailyChecklists(cloudChecklists);
          },
          (err) => {
            console.warn("Firestore checklists snapshot error:", err);
          }
        );

        // Attach Realtime Listener to /users/{uid}/milestones
        unsubMilestones = subscribeToMilestones(
          currentUser.uid,
          (cloudMilestones) => {
            setMilestones(cloudMilestones);
          },
          (err) => {
            console.warn("Firestore milestones snapshot error:", err);
          }
        );

        // Attach Realtime Listener to /users/{uid}/visionGoals
        unsubVisionGoals = subscribeToVisionGoals(
          currentUser.uid,
          (cloudGoals) => {
            if (cloudGoals.length > 0) {
              setVisionGoals(cloudGoals);
            } else {
              setVisionGoals(DEFAULT_VISION_GOALS);
            }
          },
          (err) => {
            console.warn("Firestore vision goals snapshot error:", err);
          }
        );

        // Attach Realtime Listener to /users/{uid}/visionSettings
        unsubVisionSettings = subscribeToVisionSettings(
          currentUser.uid,
          (cloudSettings) => {
            setVisionSettings(cloudSettings);
          },
          (err) => {
            console.warn("Firestore vision settings snapshot error:", err);
          }
        );
      } else {
        // Logged out - reset editor and load guest state
        setCurrentEditingEntry(null);
        setActiveTab("today");
        setSelectedFilterDate(null);
        try {
          const storedEntries = localStorage.getItem("warmth_guest_entries");
          setEntries(storedEntries ? JSON.parse(storedEntries) : []);

          const storedHabits = localStorage.getItem("warmth_guest_habits");
          setHabitTemplates(storedHabits ? JSON.parse(storedHabits) : DEFAULT_HABIT_TEMPLATES);

          const storedChecklists = localStorage.getItem("warmth_guest_checklists");
          setDailyChecklists(storedChecklists ? JSON.parse(storedChecklists) : {});

          const storedMilestones = localStorage.getItem("warmth_guest_milestones");
          setMilestones(storedMilestones ? JSON.parse(storedMilestones) : []);

          const storedVision = localStorage.getItem("warmth_guest_vision_goals");
          if (storedVision) {
            const parsed = JSON.parse(storedVision);
            const sanitized = Array.isArray(parsed)
              ? parsed.map((g: any) =>
                  g.imageSource === "curated"
                    ? { ...g, imageUrl: undefined, imageSource: undefined, imagePrompt: undefined }
                    : g
                )
              : DEFAULT_VISION_GOALS;
            setVisionGoals(sanitized);
          } else {
            setVisionGoals(DEFAULT_VISION_GOALS);
          }

          const storedSettings = localStorage.getItem("warmth_guest_vision_settings");
          setVisionSettings(storedSettings ? JSON.parse(storedSettings) : null);
        } catch {
          setEntries([]);
          setHabitTemplates(DEFAULT_HABIT_TEMPLATES);
          setDailyChecklists({});
          setMilestones([]);
          setVisionGoals(DEFAULT_VISION_GOALS);
          setVisionSettings(null);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      unsubEntries();
      unsubHabits();
      unsubChecklists();
      unsubMilestones();
      unsubVisionGoals();
      unsubVisionSettings();
    };
  }, []);

  // Compute Active Date Keys
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const activeEditorDate = currentEditingEntry?.date || todayDateStr;

  const tomorrowDateObj = new Date(activeEditorDate + "T12:00:00Z");
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
  const tomorrowDateStr = tomorrowDateObj.toISOString().split("T")[0];

  const currentChecklist = dailyChecklists[activeEditorDate] || null;
  const tomorrowChecklist = dailyChecklists[tomorrowDateStr] || null;

  // Compute Current Streak Days
  const streakDays = useMemo(() => {
    const today = new Date();
    let count = 0;
    let checkDate = new Date(today);

    for (let i = 0; i < 60; i++) {
      const dateStr = checkDate.toISOString().split("T")[0];
      const cl = dailyChecklists[dateStr];
      const hasCompleted = cl && (cl.totalCompleted > 0 || cl.habits?.some((h) => h.completed));

      if (hasCompleted) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [dailyChecklists]);

  // Milestone Checker Engine
  const evaluateAndAwardMilestones = async (
    checklistsMap: Record<string, DailyChecklist>,
    allEntries: JournalEntry[]
  ) => {
    let totalHabitsCompleted = 0;
    let totalTasksCompleted = 0;
    Object.values(checklistsMap).forEach((cl) => {
      totalHabitsCompleted += cl.habits?.filter((h) => h.completed).length || 0;
      totalTasksCompleted += cl.priorityTasks?.filter((t) => t.completed).length || 0;
    });

    const photosCount = allEntries.filter((e) => !!e.photoUrl).length;
    const existingBadgeKeys = new Set(milestones.map((m) => m.badgeKey));

    for (const badge of BADGE_DEFINITIONS) {
      if (existingBadgeKeys.has(badge.key)) continue;

      let achieved = false;
      if (badge.type === "streak" && streakDays >= badge.requirement) achieved = true;
      else if (badge.type === "total_habits" && totalHabitsCompleted >= badge.requirement) achieved = true;
      else if (badge.type === "focus_tasks" && totalTasksCompleted >= badge.requirement) achieved = true;
      else if (badge.type === "photos" && photosCount >= badge.requirement) achieved = true;
      else if (badge.type === "entries" && allEntries.length >= badge.requirement) achieved = true;
      else if (
        badge.type === "tasks_or_habits" &&
        totalHabitsCompleted + totalTasksCompleted >= badge.requirement
      ) {
        achieved = true;
      }

      if (achieved) {
        const todayCl = checklistsMap[todayDateStr];
        const newMilestone: UserMilestone = {
          id: "milestone_" + badge.key,
          userId: user ? user.uid : "guest_user",
          badgeKey: badge.key,
          title: badge.title,
          description: badge.description,
          icon: badge.icon,
          unlockedAt: new Date().toISOString(),
          postcardData: {
            date: todayDateStr,
            photoUrl: allEntries[0]?.photoUrl,
            photoCaption: allEntries[0]?.photoCaption,
            mood: allEntries[0]?.mood || "calm",
            journalExcerpt: allEntries[0]?.summary || allEntries[0]?.initialThought.slice(0, 100) || "Consistent practice",
            habitsCompleted: todayCl?.habits?.filter((h) => h.completed).map((h) => h.title) || [],
            tasksCompleted: todayCl?.priorityTasks?.filter((t) => t.completed).map((t) => t.text) || [],
          },
        };

        // Save milestone
        if (user) {
          await saveMilestone(user.uid, newMilestone);
        } else {
          const updated = [...milestones, newMilestone];
          setMilestones(updated);
          localStorage.setItem("warmth_guest_milestones", JSON.stringify(updated));
        }

        // Trigger celebratory popup!
        setCelebrationMilestone(newMilestone);
        break;
      }
    }
  };

  // Sign In with Google popup
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast("Signed in securely. Your private sanctuary is ready!");
    } catch (err: any) {
      console.error("Sign in failed:", err);
      showToast(`Sign in error: ${err.message || "Failed to authenticate"}`, "error");
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setEntries([]);
      setDailyChecklists({});
      setMilestones([]);
      setCurrentEditingEntry(null);
      setSelectedFilterDate(null);
      setActiveTab("today");
      localStorage.removeItem("warmth_guest_entries");
      localStorage.removeItem("warmth_guest_habits");
      localStorage.removeItem("warmth_guest_checklists");
      localStorage.removeItem("warmth_guest_milestones");
      showToast("Signed out. Your entries and habits remain safely protected in Firestore.");
    } catch (err: any) {
      showToast(`Sign out error: ${err.message}`, "error");
    }
  };

  // Save Entry (strictly ONE entry per day, isolated to user in Firestore)
  const handleSaveEntry = async (entryData: Partial<JournalEntry>): Promise<string | void> => {
    const todayStr = new Date().toISOString().split("T")[0];
    const targetDate = entryData.date || todayStr;

    // Enforce one reflection entry per calendar day
    const existingEntryByDate = entries.find((e) => e.date === targetDate);
    const existingEntryById = entryData.id ? entries.find((e) => e.id === entryData.id) : undefined;
    const existingEntry = existingEntryByDate || existingEntryById;

    const entryId = existingEntry ? existingEntry.id : (entryData.id || "entry_" + Date.now());
    const createdAt = existingEntry?.createdAt || entryData.createdAt || new Date().toISOString();

    const newEntry: JournalEntry = {
      id: entryId,
      userId: user ? user.uid : "guest_user",
      title: entryData.title || "Reflective Musings",
      date: targetDate,
      mood: entryData.mood || "calm",
      customFeelings: entryData.customFeelings || existingEntry?.customFeelings || [],
      tags: entryData.tags || existingEntry?.tags || ["reflection"],
      initialThought: entryData.initialThought || "",
      summary: entryData.summary || "",
      insights: entryData.insights || [],
      reflectionType: entryData.reflectionType || "daily_reflection",
      messages: entryData.messages || [],
      favorite: entryData.favorite ?? existingEntry?.favorite ?? false,
      wordCount: entryData.wordCount || 0,
      photoUrl: entryData.photoUrl !== undefined ? entryData.photoUrl : existingEntry?.photoUrl,
      photoCaption: entryData.photoCaption !== undefined ? entryData.photoCaption : existingEntry?.photoCaption,
      hasVoiceNote: entryData.hasVoiceNote || false,
      wisdom: entryData.wisdom || existingEntry?.wisdom,
      createdAt: createdAt,
      updatedAt: new Date().toISOString(),
    };

    // Strictly one entry per day in memory
    const updated = [
      newEntry,
      ...entries.filter((e) => e.date !== targetDate && e.id !== entryId),
    ];
    setEntries(updated);
    setCurrentEditingEntry(newEntry);

    if (user) {
      try {
        const savedId = await saveJournalEntry(user.uid, newEntry);
        showToast(`Journaling & AI reflections saved for ${targetDate}!`);
        evaluateAndAwardMilestones(dailyChecklists, updated);
        return savedId;
      } catch (err: any) {
        console.error("Firestore save error:", err);
        localStorage.setItem("warmth_guest_entries", JSON.stringify(updated));
        showToast("Saved locally (Firestore sync pending).");
      }
    } else {
      localStorage.setItem("warmth_guest_entries", JSON.stringify(updated));
      evaluateAndAwardMilestones(dailyChecklists, updated);
      showToast(`Journaling & AI reflections saved for ${targetDate}!`);
    }
  };

  // Delete Entry
  const handleDeleteEntry = async (entryId: string) => {
    const updated = entries.filter((e) => e.id !== entryId);
    setEntries(updated);
    localStorage.setItem("warmth_guest_entries", JSON.stringify(updated));

    if (currentEditingEntry?.id === entryId) {
      setCurrentEditingEntry(null);
    }

    if (user) {
      try {
        await deleteJournalEntry(user.uid, entryId);
        showToast("Reflection removed from Firestore archive.");
      } catch (err) {
        console.error("Delete failed:", err);
        showToast("Failed to delete entry from database.", "error");
      }
    } else {
      showToast("Entry removed from local session.");
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (entryId: string, currentFav: boolean) => {
    if (user) {
      try {
        await toggleFavoriteEntry(user.uid, entryId, currentFav);
      } catch (err) {
        console.error("Toggle favorite failed:", err);
      }
    } else {
      const updated = entries.map((e) =>
        e.id === entryId ? { ...e, favorite: !currentFav } : e
      );
      setEntries(updated);
      localStorage.setItem("warmth_guest_entries", JSON.stringify(updated));
    }
  };

  // Update Daily Checklist (Habits & Priority Tasks - US-2, US-3, US-4)
  const handleUpdateDailyChecklist = async (checklistData: DailyChecklist) => {
    const updatedChecklists = {
      ...dailyChecklists,
      [checklistData.date]: checklistData,
    };
    setDailyChecklists(updatedChecklists);

    if (user) {
      try {
        await saveDailyChecklist(user.uid, checklistData);
      } catch (err) {
        console.error("Failed to save checklist to Firestore:", err);
        localStorage.setItem("warmth_guest_checklists", JSON.stringify(updatedChecklists));
      }
    } else {
      localStorage.setItem("warmth_guest_checklists", JSON.stringify(updatedChecklists));
    }

    evaluateAndAwardMilestones(updatedChecklists, entries);
  };

  // Save Habit Template (US-1)
  const handleSaveHabitTemplate = async (template: Partial<HabitTemplate> & { title: string }) => {
    const templateId = template.id || "habit_" + Date.now();
    const fullTemplate: HabitTemplate = {
      id: templateId,
      userId: user ? user.uid : "guest_user",
      title: template.title,
      category: template.category || "mind",
      icon: template.icon || "Sun",
      isActive: template.isActive !== undefined ? template.isActive : true,
      order: template.order !== undefined ? template.order : habitTemplates.length,
      createdAt: template.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [
      ...habitTemplates.filter((t) => t.id !== templateId),
      fullTemplate,
    ].sort((a, b) => a.order - b.order);

    setHabitTemplates(updated);

    if (user) {
      try {
        await saveHabitTemplate(user.uid, fullTemplate);
        showToast("Habit configuration updated!");
      } catch (err) {
        console.error("Failed to save habit template:", err);
      }
    } else {
      localStorage.setItem("warmth_guest_habits", JSON.stringify(updated));
      showToast("Habit configuration saved locally!");
    }
  };

  // Delete Habit Template (US-1)
  const handleDeleteHabitTemplate = async (templateId: string) => {
    const updated = habitTemplates.filter((t) => t.id !== templateId);
    setHabitTemplates(updated);

    if (user) {
      try {
        await deleteHabitTemplate(user.uid, templateId);
        showToast("Habit removed.");
      } catch (err) {
        console.error("Failed to delete habit template:", err);
      }
    } else {
      localStorage.setItem("warmth_guest_habits", JSON.stringify(updated));
      showToast("Habit removed locally.");
    }
  };

  // Reset Habits to Defaults (US-1)
  const handleResetHabitDefaults = async () => {
    setHabitTemplates(DEFAULT_HABIT_TEMPLATES);
    if (user) {
      for (const t of DEFAULT_HABIT_TEMPLATES) {
        await saveHabitTemplate(user.uid, t);
      }
    } else {
      localStorage.setItem("warmth_guest_habits", JSON.stringify(DEFAULT_HABIT_TEMPLATES));
    }
    showToast("Habits reset to 6 mindful presets.");
  };

  // Navigate to Today page with today's date (used when switching to Today from another tab or clicking New Entry from other views)
  const handleNavigateToToday = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const existingTodayEntry = entries.find((e) => e.date === todayStr);
    if (existingTodayEntry) {
      setCurrentEditingEntry(existingTodayEntry);
    } else {
      const freshTodayEntry: JournalEntry = {
        id: "entry_" + Date.now(),
        userId: user ? user.uid : "guest_user",
        title: "",
        date: todayStr,
        mood: "calm",
        tags: ["reflection"],
        initialThought: "",
        summary: "",
        insights: [],
        reflectionType: "daily_reflection",
        messages: [],
        favorite: false,
        wordCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentEditingEntry(freshTodayEntry);
    }
    setActiveTab("today");
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  };

  // Start a fresh new entry from other pages
  const handleNewEntry = () => {
    handleNavigateToToday();
  };

  // Open existing entry in editor
  const handleSelectEntry = (entry: JournalEntry) => {
    setCurrentEditingEntry(entry);
    setActiveTab("today");
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  };

  // Triggered from Calendar / Memories / Editor date change: Select or write for a specific date
  const handleWriteForDate = (dateString: string) => {
    const existingEntry = entries.find((e) => e.date === dateString);
    if (existingEntry) {
      setCurrentEditingEntry(existingEntry);
    } else {
      const freshEntryForDate: JournalEntry = {
        id: "entry_" + Date.now(),
        userId: user ? user.uid : "guest_user",
        title: "",
        date: dateString,
        mood: "calm",
        tags: ["reflection"],
        initialThought: "",
        summary: "",
        insights: [],
        reflectionType: "daily_reflection",
        messages: [],
        favorite: false,
        wordCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentEditingEntry(freshEntryForDate);
    }
    setActiveTab("today");
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  };

  // Unsaved changes tracking when navigating away from today tab
  const [hasUnsavedJournalChanges, setHasUnsavedJournalChanges] = useState(false);
  const [pendingTabSwitch, setPendingTabSwitch] = useState<"today" | "memories" | "insights" | "vision" | null>(null);
  const [isUnsavedTabModalOpen, setIsUnsavedTabModalOpen] = useState(false);

  // Vision Board Handlers
  const handleSaveVisionGoal = async (goalData: Partial<VisionGoal>) => {
    const goalId = goalData.id || "vg_" + Date.now();
    const existingGoal = visionGoals.find((g) => g.id === goalId);
    const now = new Date().toISOString();

    const newGoal: VisionGoal = {
      id: goalId,
      userId: user?.uid || "guest",
      title: goalData.title || "My Intention",
      explanation: goalData.explanation || "",
      pillar: goalData.pillar || "health",
      imageUrl: goalData.imageUrl !== undefined ? goalData.imageUrl : existingGoal?.imageUrl,
      imageSource: goalData.imageUrl
        ? goalData.imageSource === "user_upload"
          ? "user_upload"
          : "ai_generated"
        : existingGoal?.imageSource,
      imagePrompt: goalData.imageUrl ? goalData.imagePrompt : existingGoal?.imagePrompt,
      targetTimeframe: goalData.targetTimeframe || "2026",
      status: goalData.status || existingGoal?.status || "in_motion",
      order: Number.isFinite(goalData.order)
        ? (goalData.order as number)
        : existingGoal?.order ?? visionGoals.length,
      widthSpan: goalData.widthSpan ?? existingGoal?.widthSpan ?? 1,
      customHeight: goalData.customHeight ?? existingGoal?.customHeight ?? 320,
      customWidth: goalData.customWidth ?? existingGoal?.customWidth,
      isTextOnly: goalData.isTextOnly !== undefined ? goalData.isTextOnly : (existingGoal?.isTextOnly ?? false),
      hideBackground: goalData.hideBackground !== undefined ? goalData.hideBackground : (existingGoal?.hideBackground ?? false),
      textBgColor: goalData.textBgColor !== undefined ? goalData.textBgColor : existingGoal?.textBgColor,
      textBgImage: goalData.textBgImage !== undefined ? goalData.textBgImage : existingGoal?.textBgImage,
      textFontStyle: goalData.textFontStyle ?? existingGoal?.textFontStyle ?? "serif",
      // 🔥 ADD ROTATION SUPPORT
      rotation: goalData.rotation ?? existingGoal?.rotation ?? 0,
      createdAt: existingGoal?.createdAt || now,
      updatedAt: now,
    };

    const updatedGoals = existingGoal
      ? visionGoals.map((g) => (g.id === goalId ? newGoal : g))
      : [...visionGoals, newGoal];

    setVisionGoals(updatedGoals);
    localStorage.setItem("warmth_guest_vision_goals", JSON.stringify(updatedGoals));

    if (user) {
      try {
        await saveVisionGoal(user.uid, newGoal);
      } catch (err) {
        console.warn("Firestore vision save error:", err);
      }
    }
    showToast(existingGoal ? "Life goal updated." : "Life goal anchored to vision board!");
  };

  const handleDeleteVisionGoal = async (goalId: string) => {
    const updated = visionGoals.filter((g) => g.id !== goalId);
    setVisionGoals(updated);
    localStorage.setItem("warmth_guest_vision_goals", JSON.stringify(updated));

    if (user) {
      try {
        await deleteVisionGoal(user.uid, goalId);
      } catch (err) {
        console.warn("Firestore vision delete error:", err);
      }
    }
    showToast("Goal removed from vision board.");
  };

  const handleReorderVisionGoals = async (reorderedGoals: VisionGoal[]) => {
    setVisionGoals(reorderedGoals);
    localStorage.setItem("warmth_guest_vision_goals", JSON.stringify(reorderedGoals));

    if (user) {
      try {
        for (const g of reorderedGoals) {
          await saveVisionGoal(user.uid, g);
        }
      } catch (err) {
        console.warn("Firestore vision reorder error:", err);
      }
    }
  };

  const handleSaveVisionSettings = async (settingsData: Partial<VisionBoardSettings>) => {
    const updated: VisionBoardSettings = {
      userId: user?.uid || "guest",
      annualTheme: settingsData.annualTheme ?? visionSettings?.annualTheme,
      userPhotoUrl:
        settingsData.userPhotoUrl !== undefined
          ? settingsData.userPhotoUrl
          : visionSettings?.userPhotoUrl,
      userNameOrMantra:
        settingsData.userNameOrMantra ?? visionSettings?.userNameOrMantra,
      manifesto: settingsData.manifesto ?? visionSettings?.manifesto,
      updatedAt: new Date().toISOString(),
    };

    setVisionSettings(updated);
    localStorage.setItem("warmth_guest_vision_settings", JSON.stringify(updated));

    if (user) {
      try {
        await saveVisionSettings(user.uid, updated);
      } catch (err) {
        console.warn("Firestore vision settings save error:", err);
      }
    }
    showToast("Vision Board centerpiece updated! ✨");
  };

  const handleSeedDefaultVisionGoals = async () => {
    setVisionGoals(DEFAULT_VISION_GOALS);
    localStorage.setItem("warmth_guest_vision_goals", JSON.stringify(DEFAULT_VISION_GOALS));
    if (user) {
      for (const g of DEFAULT_VISION_GOALS) {
        await saveVisionGoal(user.uid, { ...g, userId: user.uid });
      }
    }
    showToast("Seeded 9 Pillars Starter Tapestry! 🌟");
  };

  const handleTabChange = (targetTab: "today" | "memories" | "insights" | "vision") => {
    if (activeTab === "today" && hasUnsavedJournalChanges && targetTab !== "today") {
      setPendingTabSwitch(targetTab);
      setIsUnsavedTabModalOpen(true);
      return;
    }
    executeTabSwitch(targetTab);
  };

  const executeTabSwitch = (targetTab: "today" | "memories" | "insights" | "vision") => {
    if (targetTab === "memories") setSelectedFilterDate(null);
    if (targetTab === "today") {
      if (activeTab !== "today") {
        handleNavigateToToday();
        return;
      }
    }
    setActiveTab(targetTab);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  };

  return (
    // Updated main container with dark theme support
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#120F0D] text-[#2C241E] dark:text-[#F5EBE1] flex flex-col selection:bg-[#F3D5B5] selection:text-[#4A2E18] transition-colors duration-300">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        user={user}
        isAuthLoading={isAuthLoading}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        firestoreConnected={firestoreConnected}
        serverStatus={serverStatus}
        telemetry={telemetry}
        entriesCount={entries.length}
        visionGoalsCount={visionGoals.length}
        onOpenHabits={() => openSettings("habits")}
        onOpenSettings={() => openSettings("habits")}
      />

      {/* Notification Toast - Updated with dark theme support */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-slide-up">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center space-x-2 transition-colors duration-300 ${
              notification.type === "success"
                ? "bg-white dark:bg-[#2C241E] text-[#2C241E] dark:text-[#F5EBE1] border-[#E8DFC8] dark:border-[#3E342B] border-l-4 border-l-[#E67E22]"
                : "bg-red-50 dark:bg-red-950/80 text-red-900 dark:text-red-200 border-red-200 dark:border-red-800 border-l-4 border-l-red-600"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#E67E22] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 pb-16">
        {/* If guest and no entries yet, show warm landing hero */}
        {!user && entries.length === 0 && activeTab === "today" && !currentEditingEntry ? (
          <LandingHero
            onSignIn={handleSignIn}
            onContinueAsGuest={() => {
              setCurrentEditingEntry({
                id: "entry_" + Date.now(),
                userId: "guest",
                title: "My First Warmth Reflection",
                date: new Date().toISOString().split("T")[0],
                mood: "calm",
                tags: ["first-reflection"],
                initialThought: "I am taking a moment to pause and listen to my own thoughts today...",
                summary: "",
                insights: [],
                reflectionType: "daily_reflection",
                messages: [],
                favorite: false,
                wordCount: 14,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }}
          />
        ) : (
          <>
            {activeTab === "today" && (
              <JournalEditor
                user={user}
                currentEntry={currentEditingEntry}
                onSaveEntry={handleSaveEntry}
                onNewEntry={handleNewEntry}
                onDeleteEntry={handleDeleteEntry}
                telemetry={telemetry}
                entries={entries}
                onChangeDate={handleWriteForDate}
                dailyChecklist={currentChecklist}
                tomorrowChecklist={tomorrowChecklist}
                dailyChecklists={dailyChecklists}
                habitTemplates={habitTemplates}
                onUpdateChecklist={handleUpdateDailyChecklist}
                onUpdateTomorrowChecklist={handleUpdateDailyChecklist}
                onOpenHabitManager={() => openSettings("habits")}
                streakDays={streakDays}
                bookmarkedWisdomIds={bookmarkedWisdomIds}
                onToggleWisdomBookmark={handleToggleWisdomBookmark}
                defaultWisdomStream={settings.wisdomStream}
                onChangeWisdomStream={(stream) => handleUpdateSettings({ wisdomStream: stream })}
                enableCamera={settings.enableCamera}
                enableMicrophone={settings.enableMicrophone}
                onSaveEnabledChange={setHasUnsavedJournalChanges}
              />
            )}

            {activeTab === "memories" && (
              <MemoriesView
                entries={entries}
                onSelectEntry={handleSelectEntry}
                onWriteForDate={handleWriteForDate}
                onDeleteEntry={handleDeleteEntry}
                onToggleFavorite={handleToggleFavorite}
                onNewEntry={handleNewEntry}
                dailyChecklists={dailyChecklists}
                onUpdateDailyChecklist={handleUpdateDailyChecklist}
                userId={user?.uid}
                bookmarkedWisdomIds={bookmarkedWisdomIds}
                onToggleWisdomBookmark={handleToggleWisdomBookmark}
                onReflectWithWisdom={handleReflectWithWisdom}
              />
            )}

            {activeTab === "vision" && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <VisionBoardView
                  goals={visionGoals}
                  settings={visionSettings}
                  onSaveGoal={handleSaveVisionGoal}
                  onDeleteGoal={handleDeleteVisionGoal}
                  onReorderGoals={handleReorderVisionGoals}
                  onSaveSettings={handleSaveVisionSettings}
                  onSeedDefaults={handleSeedDefaultVisionGoals}
                />
              </div>
            )}

            {activeTab === "insights" && (
              <InsightsMilestonesTab
                entries={entries}
                habitTemplates={habitTemplates}
                dailyChecklists={dailyChecklists}
                milestones={milestones}
                onSelectEntryByDate={(dateStr) => handleWriteForDate(dateStr)}
                onOpenHabitManager={() => openSettings("habits")}
                onOpenSettings={() => openSettings("habits")}
              />
            )}
          </>
        )}
      </main>

      {/* Sanctuary Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        user={user}
        habitTemplates={habitTemplates}
        onSaveHabitTemplate={handleSaveHabitTemplate}
        onDeleteHabitTemplate={handleDeleteHabitTemplate}
        onResetHabitDefaults={handleResetHabitDefaults}
        initialSection={settingsInitialSection}
      />

      {/* Global Habit Manager Modal */}
      <HabitManagerModal
        isOpen={isHabitManagerOpen}
        onClose={() => setIsHabitManagerOpen(false)}
        templates={habitTemplates}
        onSaveTemplate={handleSaveHabitTemplate}
        onDeleteTemplate={handleDeleteHabitTemplate}
        onResetToDefaults={handleResetHabitDefaults}
      />

      {/* Milestone Celebration Modal */}
      <MilestoneCelebrationModal
        milestone={celebrationMilestone}
        onClose={() => setCelebrationMilestone(null)}
        onViewInsights={() => {
          setCelebrationMilestone(null);
          setActiveTab("insights");
        }}
      />

      {/* Unsaved Tab Switch Warning Dialog */}
      {isUnsavedTabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#2C241E] rounded-2xl p-6 max-w-md w-full border border-[#E8DFC8] dark:border-[#4A3B32] shadow-xl space-y-4 animate-scale-in">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-[#BA4A00] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-[#2C241E] dark:text-[#FAF7F2]">
                  Unsaved Changes
                </h3>
                <p className="text-xs text-[#7E6E5F] dark:text-[#A8988A]">
                  You have unsaved writing or AI reflections on today's entry.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#5A4B3E] dark:text-[#D5C7B7] leading-relaxed">
              Leaving will discard your recent edits. Would you like to stay to save your entry, or discard and continue?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E8DFC8] dark:border-[#4A3B32]">
              <button
                type="button"
                onClick={() => {
                  setIsUnsavedTabModalOpen(false);
                  setPendingTabSwitch(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#FAF7F2] dark:bg-[#3A2F25] text-[#2C241E] dark:text-[#FAF7F2] border border-[#E8DFC8] dark:border-[#4A3B32] hover:bg-[#F5EBE1] cursor-pointer"
              >
                Stay on Journal
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsUnsavedTabModalOpen(false);
                  setHasUnsavedJournalChanges(false);
                  if (pendingTabSwitch) {
                    executeTabSwitch(pendingTabSwitch);
                    setPendingTabSwitch(null);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs"
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer - Updated with dark theme support */}
      <footer className="border-t border-[#E8DFC8] dark:border-[#3E342B] py-6 bg-[#FAF7F2] dark:bg-[#181412] text-xs text-[#7E6E5F] dark:text-[#A89887] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <Feather className="w-4 h-4 text-[#BA4A00] dark:text-[#F39C12]" />
            <span className="font-display font-semibold text-[#2C241E] dark:text-[#F5EBE1]">
              Warmth AI Journal
            </span>
            <span className="text-[#7E6E5F] dark:text-[#A89887]">·</span>
            <span className="text-[#7E6E5F] dark:text-[#A89887]">A gentle lens for your thoughts & days</span>
          </div>
        </div>
      </footer>
    </div>
  );
}