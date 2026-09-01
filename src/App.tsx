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
} from "./lib/firebase";
import {
  JournalEntry,
  ModelTelemetry,
  ReflectionType,
  HabitTemplate,
  DailyChecklist,
  UserMilestone,
} from "./types";
import { Navbar } from "./components/Navbar";
import { LandingHero } from "./components/LandingHero";
import { JournalEditor } from "./components/JournalEditor";
import { MemoriesView } from "./components/MemoriesView";
import { HabitManagerModal } from "./components/HabitManagerModal";
import { InsightsMilestonesTab, BADGE_DEFINITIONS } from "./components/InsightsMilestonesTab";
import { MilestoneCelebrationModal } from "./components/MilestoneCelebrationModal";
import { ShieldCheck, AlertTriangle, CheckCircle2, Feather } from "lucide-react";

export default function App() {
  // Navigation State: 3 Streamlined Core Tabs
  const [activeTab, setActiveTab] = useState<"today" | "memories" | "insights">("today");

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
        } catch {
          setEntries([]);
          setHabitTemplates(DEFAULT_HABIT_TEMPLATES);
          setDailyChecklists({});
          setMilestones([]);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      unsubEntries();
      unsubHabits();
      unsubChecklists();
      unsubMilestones();
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
            mood: allEntries[0]?.mood || "peaceful",
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

  // Save Entry (isolated to user in Firestore, fallback to local storage)
  const handleSaveEntry = async (entryData: Partial<JournalEntry>): Promise<string | void> => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newEntry: JournalEntry = {
      id: entryData.id || "entry_" + Date.now(),
      userId: user ? user.uid : "guest_user",
      title: entryData.title || "Reflective Musings",
      date: entryData.date || todayStr,
      mood: entryData.mood || "peaceful",
      tags: entryData.tags || ["reflection"],
      initialThought: entryData.initialThought || "",
      summary: entryData.summary || "",
      insights: entryData.insights || [],
      reflectionType: entryData.reflectionType || "daily_reflection",
      messages: entryData.messages || [],
      favorite: entryData.favorite || false,
      wordCount: entryData.wordCount || 0,
      photoUrl: entryData.photoUrl || undefined,
      photoCaption: entryData.photoCaption || undefined,
      hasVoiceNote: entryData.hasVoiceNote || false,
      createdAt: entryData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...entries.filter((e) => e.id !== newEntry.id)];
    setEntries(updated);

    if (user) {
      try {
        const savedId = await saveJournalEntry(user.uid, newEntry);
        showToast("Reflection saved to your private Cloud Firestore!");
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
      showToast("Saved to local session. Sign in to sync across devices!");
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

  // Start a fresh new entry
  const handleNewEntry = () => {
    setCurrentEditingEntry(null);
    setActiveTab("today");
  };

  // Open existing entry in editor
  const handleSelectEntry = (entry: JournalEntry) => {
    setCurrentEditingEntry(entry);
    setActiveTab("today");
  };

  // Triggered from Calendar / Memories: Write for a specific date
  const handleWriteForDate = (dateString: string) => {
    const freshEntryForDate: JournalEntry = {
      id: "entry_" + Date.now(),
      userId: user ? user.uid : "guest_user",
      title: "",
      date: dateString,
      mood: "peaceful",
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
    setActiveTab("today");
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C241E] flex flex-col selection:bg-[#F3D5B5] selection:text-[#4A2E18]">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === "memories") setSelectedFilterDate(null);
          setActiveTab(tab);
        }}
        user={user}
        isAuthLoading={isAuthLoading}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        firestoreConnected={firestoreConnected}
        serverStatus={serverStatus}
        telemetry={telemetry}
        entriesCount={entries.length}
        onOpenHabits={() => setIsHabitManagerOpen(true)}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-slide-up">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center space-x-2 ${
              notification.type === "success"
                ? "bg-white text-[#2C241E] border-[#E8DFC8] border-l-4 border-l-[#E67E22]"
                : "bg-red-50 text-red-900 border-red-200 border-l-4 border-l-red-600"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#E67E22] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
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
                mood: "peaceful",
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
                dailyChecklist={currentChecklist}
                tomorrowChecklist={tomorrowChecklist}
                habitTemplates={habitTemplates}
                onUpdateChecklist={handleUpdateDailyChecklist}
                onUpdateTomorrowChecklist={handleUpdateDailyChecklist}
                onOpenHabitManager={() => setIsHabitManagerOpen(true)}
                streakDays={streakDays}
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
              />
            )}

            {activeTab === "insights" && (
              <InsightsMilestonesTab
                entries={entries}
                habitTemplates={habitTemplates}
                dailyChecklists={dailyChecklists}
                milestones={milestones}
                onSelectEntryByDate={(dateStr) => handleWriteForDate(dateStr)}
                onOpenHabitManager={() => setIsHabitManagerOpen(true)}
              />
            )}
          </>
        )}
      </main>

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

      {/* Footer */}
      <footer className="border-t border-[#E8DFC8] py-6 bg-[#FAF7F2] text-xs text-[#7E6E5F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <Feather className="w-4 h-4 text-[#BA4A00]" />
            <span className="font-display font-semibold text-[#2C241E]">
              Warmth AI Journal
            </span>
            <span>·</span>
            <span>A gentle lens for your thoughts & days</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span className="flex items-center space-x-1 text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cloud Firestore Hardened Security</span>
            </span>
            <span>·</span>
            <span>Habit & Intention Sanctuary Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
