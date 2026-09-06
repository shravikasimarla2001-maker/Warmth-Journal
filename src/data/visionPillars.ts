import { VisionPillar } from "../types";

export interface PillarMeta {
  key: VisionPillar;
  label: string;
  iconName: string;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  colorBadge: string;
  tagline: string;
  example: string;
}

export const PILLARS_CONFIG: Record<VisionPillar, PillarMeta> = {
  health: {
    key: "health",
    label: "Health",
    iconName: "Activity",
    colorBg: "bg-emerald-50/80",
    colorBorder: "border-emerald-200",
    colorText: "text-emerald-800",
    colorBadge: "bg-emerald-100 text-emerald-900 border-emerald-300",
    tagline: "Vitality, sleep, clean nourishment & movement",
    example: "Run 10k by the ocean at sunrise and build deep physical endurance",
  },
  career: {
    key: "career",
    label: "Career",
    iconName: "Briefcase",
    colorBg: "bg-amber-50/80",
    colorBorder: "border-amber-200",
    colorText: "text-amber-800",
    colorBadge: "bg-amber-100 text-amber-900 border-amber-300",
    tagline: "Craftsmanship, deep work & meaningful projects",
    example: "Lead a high-leverage product launch with autonomy and pride",
  },
  spirituality: {
    key: "spirituality",
    label: "Spirituality",
    iconName: "Compass",
    colorBg: "bg-purple-50/80",
    colorBorder: "border-purple-200",
    colorText: "text-purple-800",
    colorBadge: "bg-purple-100 text-purple-900 border-purple-300",
    tagline: "Inner stillness, wisdom study & presence",
    example: "20 minutes of daily silent contemplation & studying timeless texts",
  },
  finances: {
    key: "finances",
    label: "Finances",
    iconName: "Coins",
    colorBg: "bg-teal-50/80",
    colorBorder: "border-teal-200",
    colorText: "text-teal-800",
    colorBadge: "bg-teal-100 text-teal-900 border-teal-300",
    tagline: "Financial peace, debt freedom & abundance",
    example: "Complete 12-month emergency peace fund and mindful investing",
  },
  partner: {
    key: "partner",
    label: "Partner",
    iconName: "Heart",
    colorBg: "bg-rose-50/80",
    colorBorder: "border-rose-200",
    colorText: "text-rose-800",
    colorBadge: "bg-rose-100 text-rose-900 border-rose-300",
    tagline: "Soulful romance, trust & conscious love",
    example: "Sacred weekly date nights and honest, vulnerable communication",
  },
  family: {
    key: "family",
    label: "Family",
    iconName: "Home",
    colorBg: "bg-orange-50/80",
    colorBorder: "border-orange-200",
    colorText: "text-orange-800",
    colorBadge: "bg-orange-100 text-orange-900 border-orange-300",
    tagline: "Parents, siblings, children & home harmony",
    example: "Warm home-cooked Sunday family meals filled with laughter and stories",
  },
  friends: {
    key: "friends",
    label: "Friends",
    iconName: "Users",
    colorBg: "bg-sky-50/80",
    colorBorder: "border-sky-200",
    colorText: "text-sky-800",
    colorBadge: "bg-sky-100 text-sky-900 border-sky-300",
    tagline: "Soul camaraderie, laughter & deep trust",
    example: "Firepit gatherings and soul-enriching conversations with lifelong friends",
  },
  fun: {
    key: "fun",
    label: "Fun",
    iconName: "Sparkles",
    colorBg: "bg-yellow-50/80",
    colorBorder: "border-yellow-200",
    colorText: "text-yellow-800",
    colorBadge: "bg-yellow-100 text-yellow-900 border-yellow-300",
    tagline: "Play, hobbies, music, road trips & joy",
    example: "Playful road trips to mountain lakes and learning acoustic songs",
  },
  community: {
    key: "community",
    label: "Community",
    iconName: "Globe",
    colorBg: "bg-stone-100/80",
    colorBorder: "border-stone-300",
    colorText: "text-stone-800",
    colorBadge: "bg-stone-200 text-stone-900 border-stone-300",
    tagline: "Giving back, seva, mentoring & impact",
    example: "Mentor young leaders and organize a neighborhood community garden",
  },
};

export const PILLAR_ORDER: VisionPillar[] = [
  "health",
  "career",
  "spirituality",
  "finances",
  "partner",
  "family",
  "friends",
  "fun",
  "community",
];
