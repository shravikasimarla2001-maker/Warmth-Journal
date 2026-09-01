import React from "react";
import {
  Sparkles,
  BookOpen,
  Award,
  LogIn,
  LogOut,
  Feather,
  CheckCircle2,
  Settings,
  Cloud,
} from "lucide-react";
import { User } from "firebase/auth";
import { ModelTelemetry } from "../types";

interface NavbarProps {
  activeTab: "today" | "memories" | "insights";
  setActiveTab: (tab: "today" | "memories" | "insights") => void;
  user: User | null;
  isAuthLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  firestoreConnected: boolean;
  serverStatus: "online" | "connecting" | "offline";
  telemetry: ModelTelemetry | null;
  entriesCount: number;
  onOpenHabits?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  isAuthLoading,
  onSignIn,
  onSignOut,
  firestoreConnected,
  serverStatus,
  telemetry,
  entriesCount,
  onOpenHabits,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E8DFC8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setActiveTab("today")}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E67E22] via-[#D35400] to-[#A04000] p-0.5 shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center text-white">
              <Feather className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-semibold text-lg text-[#2C241E] tracking-tight">
                  Warmth
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#F5EBE1] text-[#935116] border border-[#E8DFC8]">
                  AI Journal
                </span>
              </div>
              <p className="text-[11px] text-[#7E6E5F] hidden sm:block">
                A gentle lens for your thoughts & routines
              </p>
            </div>
          </div>

          {/* Nav Tabs (Streamlined 3 Core Spaces) */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-[#F4EDE2] p-1.5 rounded-2xl border border-[#E5DAC6]">
            <button
              onClick={() => setActiveTab("today")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "today"
                  ? "bg-white text-[#2C241E] shadow-xs scale-102"
                  : "text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2]/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E67E22]" />
              <span>Today</span>
            </button>

            <button
              onClick={() => setActiveTab("memories")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "memories"
                  ? "bg-white text-[#2C241E] shadow-xs scale-102"
                  : "text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2]/60"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#BA4A00]" />
              <span>Memories</span>
              {entriesCount > 0 && (
                <span className="text-[10px] bg-[#F5EBE1] text-[#935116] px-1.5 py-0.2 rounded-full font-bold">
                  {entriesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("insights")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "insights"
                  ? "bg-white text-[#2C241E] shadow-xs scale-102"
                  : "text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2]/60"
              }`}
            >
              <Award className="w-3.5 h-3.5 text-[#BA4A00]" />
              <span>Insights & Growth</span>
            </button>
          </nav>

          {/* Right Status & Quick Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Habits Customizer Button */}
            {onOpenHabits && (
              <button
                onClick={onOpenHabits}
                className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white border border-[#E8DFC8] text-xs font-semibold text-[#4A3B32] hover:bg-[#F5EBE1] transition-all shadow-2xs cursor-pointer"
                title="Configure daily habit routines"
              >
                <Settings className="w-3.5 h-3.5 text-[#BA4A00]" />
                <span>Habits</span>
              </button>
            )}

            {/* Cloud Sync Status Pill */}
            <div
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#F5EBE1] border border-[#E8DFC8] text-[11px] text-[#4A3B32]"
              title={firestoreConnected ? "Syncing to Cloud Firestore" : "Connecting to database..."}
            >
              <Cloud
                className={`w-3.5 h-3.5 ${
                  firestoreConnected ? "text-emerald-600" : "text-amber-500 animate-pulse"
                }`}
              />
              <span className="font-medium">
                {firestoreConnected ? "Synced" : "Connecting"}
              </span>
            </div>

            {/* Auth Button / Profile */}
            {isAuthLoading ? (
              <div className="px-3 py-1.5 rounded-xl bg-[#F4EDE2] text-[#7E6E5F] text-xs animate-pulse">
                Loading...
              </div>
            ) : user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-[#E8DFC8]">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-8 h-8 rounded-full border-2 border-[#E8DFC8] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#935116] text-white flex items-center justify-center text-xs font-bold font-display">
                    {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-semibold text-[#2C241E] leading-tight truncate max-w-[110px]">
                    {user.displayName || user.email?.split("@")[0]}
                  </div>
                  <div className="text-[10px] text-emerald-700 flex items-center">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 inline" />
                    Cloud Active
                  </div>
                </div>
                <button
                  onClick={onSignOut}
                  title="Sign Out"
                  className="p-1.5 text-[#7E6E5F] hover:text-[#922B21] hover:bg-[#FADBD8]/40 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="px-3.5 py-1.5 bg-[#2C241E] hover:bg-[#4A3B32] text-[#FAF7F2] text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all hover:scale-102 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#F39C12]" />
                <span>Google Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-[#E8DFC8] text-xs">
          <button
            onClick={() => setActiveTab("today")}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
              activeTab === "today"
                ? "text-[#E67E22] font-semibold"
                : "text-[#7E6E5F]"
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5" />
            <span>Today</span>
          </button>
          <button
            onClick={() => setActiveTab("memories")}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
              activeTab === "memories"
                ? "text-[#E67E22] font-semibold"
                : "text-[#7E6E5F]"
            }`}
          >
            <BookOpen className="w-4 h-4 mb-0.5" />
            <span>Memories</span>
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
              activeTab === "insights"
                ? "text-[#E67E22] font-semibold"
                : "text-[#7E6E5F]"
            }`}
          >
            <Award className="w-4 h-4 mb-0.5" />
            <span>Insights</span>
          </button>
        </div>
      </div>
    </header>
  );
};

