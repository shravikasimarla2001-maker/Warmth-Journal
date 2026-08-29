import React, { useState, useEffect } from "react";
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
} from "./lib/firebase";
import { JournalEntry, ModelTelemetry, ReflectionType } from "./types";
import { Navbar } from "./components/Navbar";
import { LandingHero } from "./components/LandingHero";
import { JournalEditor } from "./components/JournalEditor";
import { HistoryArchive } from "./components/HistoryArchive";
import { CalendarView } from "./components/CalendarView";
import { PromptSparksTab } from "./components/PromptSparksTab";
import { ShieldCheck, AlertTriangle, CheckCircle2, Feather, Heart } from "lucide-react";

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<"editor" | "history" | "calendar" | "sparks">("editor");

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

  // Current Entry in Editor
  const [currentEditingEntry, setCurrentEditingEntry] = useState<JournalEntry | null>(null);

  // Filter state for calendar jumps
  const [selectedFilterDate, setSelectedFilterDate] = useState<string | null>(null);

  // Feedback notifications
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showLandingModal, setShowLandingModal] = useState(false);

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
        const unsubEntries = subscribeToUserEntries(
          currentUser.uid,
          (cloudEntries) => {
            setEntries(cloudEntries);
          },
          (err) => {
            console.warn("Firestore snapshot error:", err);
          }
        );

        return () => {
          unsubEntries();
        };
      } else {
        // Load local guest entries
        try {
          const stored = localStorage.getItem("warmth_guest_entries");
          setEntries(stored ? JSON.parse(stored) : []);
        } catch {
          setEntries([]);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

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
      showToast("Signed out. Your entries remain safely protected in Firestore.");
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
      createdAt: entryData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (user) {
      try {
        const savedId = await saveJournalEntry(user.uid, newEntry);
        showToast("Reflection saved to your private Cloud Firestore!");
        return savedId;
      } catch (err: any) {
        console.error("Firestore save error:", err);
        // Fallback local update
        const updated = [newEntry, ...entries.filter((e) => e.id !== newEntry.id)];
        setEntries(updated);
        localStorage.setItem("warmth_guest_entries", JSON.stringify(updated));
        showToast("Saved locally (Firestore sync pending).");
      }
    } else {
      // Guest local storage
      const updated = [newEntry, ...entries.filter((e) => e.id !== newEntry.id)];
      setEntries(updated);
      localStorage.setItem("warmth_guest_entries", JSON.stringify(updated));
      showToast("Saved to local session. Sign in to sync across devices!");
    }
  };

  // Delete Entry
  const handleDeleteEntry = async (entryId: string) => {
    if (user) {
      try {
        await deleteJournalEntry(user.uid, entryId);
        showToast("Reflection removed from Firestore archive.");
      } catch (err) {
        console.error("Delete failed:", err);
        showToast("Failed to delete entry from database.", "error");
      }
    } else {
      const updated = entries.filter((e) => e.id !== entryId);
      setEntries(updated);
      localStorage.setItem("warmth_guest_entries", JSON.stringify(updated));
      showToast("Entry removed from local session.");
    }

    if (currentEditingEntry?.id === entryId) {
      setCurrentEditingEntry(null);
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

  // Start a fresh new entry
  const handleNewEntry = () => {
    setCurrentEditingEntry(null);
    setActiveTab("editor");
  };

  // Open existing entry in editor
  const handleSelectEntry = (entry: JournalEntry) => {
    setCurrentEditingEntry(entry);
    setActiveTab("editor");
  };

  // Triggered from Calendar: Write for a specific date
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
    setActiveTab("editor");
  };

  // Triggered from Calendar: Filter Archive for specific date
  const handleViewDateInHistory = (dateString: string) => {
    setSelectedFilterDate(dateString);
    setActiveTab("history");
  };

  // Triggered from Sparks Tab: Use a prompt in the editor
  const handleUsePrompt = (prompt: string, type: ReflectionType) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newEntryWithPrompt: JournalEntry = {
      id: "entry_" + Date.now(),
      userId: user ? user.uid : "guest_user",
      title: "",
      date: todayStr,
      mood: "inspired",
      tags: ["prompt-spark"],
      initialThought: `${prompt}\n\n`,
      summary: "",
      insights: [],
      reflectionType: type,
      messages: [],
      favorite: false,
      wordCount: prompt.split(/\s+/).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCurrentEditingEntry(newEntryWithPrompt);
    setActiveTab("editor");
    showToast("Prompt loaded into editor!");
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C241E] flex flex-col selection:bg-[#F3D5B5] selection:text-[#4A2E18]">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === "history") setSelectedFilterDate(null);
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
        {!user && entries.length === 0 && activeTab === "editor" && !currentEditingEntry ? (
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
            {activeTab === "editor" && (
              <JournalEditor
                user={user}
                currentEntry={currentEditingEntry}
                onSaveEntry={handleSaveEntry}
                onNewEntry={handleNewEntry}
                telemetry={telemetry}
              />
            )}

            {activeTab === "history" && (
              <HistoryArchive
                entries={entries}
                onSelectEntry={handleSelectEntry}
                onDeleteEntry={handleDeleteEntry}
                onToggleFavorite={handleToggleFavorite}
                selectedFilterDate={selectedFilterDate}
                onClearDateFilter={() => setSelectedFilterDate(null)}
                onNewEntry={handleNewEntry}
              />
            )}

            {activeTab === "calendar" && (
              <CalendarView
                entries={entries}
                onSelectEntry={handleSelectEntry}
                onWriteForDate={handleWriteForDate}
                onViewDateInHistory={handleViewDateInHistory}
              />
            )}

            {activeTab === "sparks" && (
              <PromptSparksTab onUsePrompt={handleUsePrompt} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8DFC8] py-6 bg-[#FAF7F2] text-xs text-[#7E6E5F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <Feather className="w-4 h-4 text-[#BA4A00]" />
            <span className="font-display font-semibold text-[#2C241E]">
              Warmth AI Journal
            </span>
            <span>·</span>
            <span>Private User-Isolated Sanctuary</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span className="flex items-center space-x-1 text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cloud Firestore Hardened Security</span>
            </span>
            <span>·</span>
            <span>Gemini AI Fallback Ladder Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
