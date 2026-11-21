import type { IconId } from "./icons";
import type { SpotKind } from "./theme";

/**
 * The tracker catalogue. A tracker is one part of life with its own diary (tabs) and, in the room, its own object.
 * Diary tabs list their planned blocks until the real pages are built (see src/pages-registry.ts).
 */
export type Tab = { id: string; label: string; desc: string; blocks: [string, string?][] };
export type GroupId = "faith" | "mind" | "work" | "study" | "life" | "always";
export type Sticker = "moon" | "pen" | "flower" | "star" | "cal";
export type Tracker = {
  id: string;
  title: string;
  /** Diary subtitle, also the default line under the hover label. */
  sub: string;
  group: GroupId;
  icon: IconId;
  /** Main colour of its objects in the room, plus a deeper shade for sides and text. */
  colour: string;
  deep: string;
  sticker: Sticker;
  tabs: Tab[];
  /** The kinds of spot this tracker's object suits best, in order (used when the room is set up for you). */
  home: SpotKind[];
  /** Always in the room on a fixed object (focus timer, surprise). Not placed, not counted, no diary. */
  always?: boolean;
};

export const GROUPS: { id: GroupId; label: string }[] = [
  { id: "faith", label: "Faith" }, { id: "mind", label: "Mind" }, { id: "work", label: "Work" },
  { id: "study", label: "Study" }, { id: "life", label: "Life" }, { id: "always", label: "Always on" },
];

const P = {
  ember: ["#D2692A", "#8A3E16"], honey: ["#E9A23B", "#8A5A12"], butter: ["#F2D27A", "#8A6A1E"], caramel: ["#C98E4E", "#6E4422"],
  blush: ["#E8A091", "#8E4637"], peach: ["#E6CBB3", "#7A5236"], olive: ["#B7BE76", "#5A6122"], brown: ["#8A5A3A", "#3A2316"],
} as const;
const c = (k: keyof typeof P) => ({ colour: P[k][0], deep: P[k][1] });

export const TRACKERS: Tracker[] = [
  // ---- Faith ----
  { id: "deen", title: "Deen", sub: "my little prayer diary", group: "faith", home: ["floor", "shelf"], icon: "moon", ...c("honey"), sticker: "moon", tabs: [
    { id: "salah", label: "Salah", desc: "The day’s five prayers, on time, late, qada or missed, with witr, tahajjud and sunnah.", blocks: [["Today’s five prayers"], ["Monthly heatmap & streak"], ["Extra prayers"]] },
    { id: "quran", label: "Quran", desc: "Ayah of the day, your reflections, and every surah in a tracker.", blocks: [["Ayah of the day"], ["My reflections"], ["Surah tracker & progress"]] },
    { id: "reflections", label: "Reflections", desc: "Every reflection you’ve written, by day, searchable by surah.", blocks: [["All reflections"], ["Search by surah"]] },
    { id: "library", label: "Library", desc: "Give me a topic, and everything you’ve researched.", blocks: [["Topic generator"], ["My research"]] },
  ] },
  // ---- Mind ----
  { id: "journal", title: "Journal", sub: "thoughts & tiny moments", group: "mind", home: ["surface", "wall"], icon: "pen", ...c("blush"), sticker: "pen", tabs: [
    { id: "write", label: "Write", desc: "Prompts, and today’s entry with mood, tags and a photo.", blocks: [["Prompt generator"], ["Today’s entry"]] },
    { id: "calendar", label: "Calendar", desc: "The days you wrote, coloured by mood.", blocks: [["Month view"], ["Entry"]] },
    { id: "onthisday", label: "On this day", desc: "What you wrote a month and a year ago.", blocks: [["A month ago"], ["A year ago"]] },
  ] },
  { id: "mood", title: "Mood", sub: "how the days feel", group: "mind", home: ["wall", "surface"], icon: "smile", ...c("butter"), sticker: "star", tabs: [
    { id: "checkin", label: "Check in", desc: "How are you, right now?", blocks: [["Mood scale"], ["A line about why"]] },
    { id: "month", label: "Month", desc: "Every day of the month, coloured by mood.", blocks: [["Mood calendar"]] },
    { id: "patterns", label: "Patterns", desc: "What lifts you and what weighs on you.", blocks: [["What lifts you"], ["What weighs"]] },
  ] },
  { id: "gratitude", title: "Gratitude", sub: "three good things", group: "mind", home: ["wall", "surface"], icon: "heart", ...c("blush"), sticker: "flower", tabs: [
    { id: "today", label: "Today", desc: "Three good things from today.", blocks: [["Three good things"]] },
    { id: "jar", label: "The jar", desc: "Everything you’ve been grateful for, and one pulled out at random.", blocks: [["Pull one out"], ["All of them"]] },
  ] },
  // ---- Work ----
  { id: "work", title: "Work board", sub: "clients, tasks & deadlines", group: "work", home: ["screen", "wall"], icon: "board", ...c("caramel"), sticker: "star", tabs: [
    { id: "board", label: "Board", desc: "To do, doing and done, for any kind of freelance work.", blocks: [["To do"], ["Doing"], ["Done"]] },
    { id: "clients", label: "Clients", desc: "Who you work with, and what’s due.", blocks: [["Clients"], ["Deadlines & invoices"]] },
  ] },
  { id: "design", title: "Design Studio", sub: "work & design thinking", group: "work", home: ["screen"], icon: "nib", ...c("ember"), sticker: "star", tabs: [
    { id: "board", label: "Work board", desc: "To do, ongoing and done, by client.", blocks: [["To do"], ["Ongoing"], ["Done"]] },
    { id: "projects", label: "Projects", desc: "One page per project.", blocks: [["Projects"], ["Project page"]] },
    { id: "notebook", label: "Notebook", desc: "Your content pillars, ready to turn into posts.", blocks: [["Notes"], ["Turn into a post →"]] },
  ] },
  { id: "content", title: "Content Studio", sub: "LinkedIn · Instagram · YouTube", group: "work", home: ["screen"], icon: "play", ...c("honey"), sticker: "pen", tabs: [
    { id: "ideas", label: "Ideas & drafts", desc: "The idea bank and the draft editor, for any platform.", blocks: [["Idea bank"], ["Draft", "character count and a Copy button"]] },
    { id: "pipeline", label: "Pipeline", desc: "Idea → Drafting → Ready → Posted.", blocks: [["Pipeline"]] },
    { id: "calendar", label: "Calendar", desc: "When you plan to post what, and where.", blocks: [["Calendar"], ["Not scheduled yet"]] },
  ] },
  { id: "code", title: "Code corner", sub: "projects & learning", group: "work", home: ["screen"], icon: "code", ...c("olive"), sticker: "star", tabs: [
    { id: "projects", label: "Projects", desc: "Side projects and what’s next on each.", blocks: [["Projects"], ["Next steps"]] },
    { id: "learning", label: "Learning", desc: "Courses, docs and snippets worth keeping.", blocks: [["Learning list"], ["Snippets"]] },
    { id: "log", label: "Ship log", desc: "What you built, day by day.", blocks: [["Ship log"]] },
  ] },
  { id: "writer", title: "Writer’s nook", sub: "drafts & word counts", group: "work", home: ["screen", "surface"], icon: "feather", ...c("peach"), sticker: "pen", tabs: [
    { id: "drafts", label: "Drafts", desc: "Every piece you’re writing.", blocks: [["Pieces"], ["Editor"]] },
    { id: "ideas", label: "Ideas", desc: "Lines, titles and what-ifs.", blocks: [["Idea bank"]] },
    { id: "words", label: "Word count", desc: "Words written each day.", blocks: [["Daily words"], ["Streak"]] },
  ] },
  // ---- Study ----
  { id: "study", title: "Study desk", sub: "subjects, exams & revision", group: "study", home: ["screen", "surface"], icon: "cap", ...c("caramel"), sticker: "cal", tabs: [
    { id: "subjects", label: "Subjects", desc: "Your subjects and their notes.", blocks: [["Subjects"], ["Notes"]] },
    { id: "assignments", label: "Assignments", desc: "What’s due and what’s done.", blocks: [["Due soon"], ["Done"]] },
    { id: "exams", label: "Exams", desc: "A countdown to every exam.", blocks: [["Countdown"]] },
    { id: "revision", label: "Revision", desc: "A plan, and what to review today.", blocks: [["Revision plan"], ["Review today"]] },
  ] },
  // ---- Life ----
  { id: "planner", title: "Planner", sub: "days planned around salah", group: "life", home: ["wall"], icon: "calendar", ...c("ember"), sticker: "cal", tabs: [
    { id: "today", label: "Today", desc: "A day anchored on the five prayers.", blocks: [["Timeline"], ["Tasks"], ["Habits"]] },
    { id: "week", label: "This week", desc: "The week at a glance.", blocks: [["Week"]] },
  ] },
  { id: "habits", title: "Habits", sub: "small things, every day", group: "life", home: ["wall"], icon: "check", ...c("olive"), sticker: "star", tabs: [
    { id: "today", label: "Today", desc: "Tick off today’s habits.", blocks: [["Today’s habits"]] },
    { id: "streaks", label: "Streaks", desc: "A 7-day strip for every habit, and your best runs.", blocks: [["7-day strips"], ["Best streaks"]] },
  ] },
  { id: "reading", title: "Reading list", sub: "books & quotes", group: "life", home: ["shelf", "surface"], icon: "book", ...c("brown"), sticker: "pen", tabs: [
    { id: "shelf", label: "Shelf", desc: "What you’re reading and what’s next.", blocks: [["Reading now"], ["Want to read"]] },
    { id: "finished", label: "Finished", desc: "Books you’ve finished, with notes and quotes.", blocks: [["Finished"], ["Notes & quotes"]] },
  ] },
  { id: "fitness", title: "Fitness & water", sub: "move a little, drink a lot", group: "life", home: ["floor"], icon: "drop", ...c("butter"), sticker: "star", tabs: [
    { id: "today", label: "Today", desc: "Glasses of water and how you moved.", blocks: [["Water"], ["Movement"]] },
    { id: "log", label: "Log", desc: "Workouts and the week in numbers.", blocks: [["Workouts"], ["This week"]] },
  ] },
  { id: "hobbies", title: "Hobbies", sub: "& creative stuff", group: "life", home: ["shelf"], icon: "flower", ...c("blush"), sticker: "flower", tabs: [
    { id: "hobbies", label: "My hobbies", desc: "A card for every hobby, with its own log.", blocks: [["Hobby cards"], ["Log"]] },
    { id: "ideas", label: "Idea jar", desc: "Drop ideas in, pull one out when you’re bored.", blocks: [["The jar"], ["All ideas"]] },
    { id: "inspo", label: "Inspiration", desc: "A board of images you save.", blocks: [["Add images"], ["Board"]] },
    { id: "scrapbook", label: "Scrapbook", desc: "A free spread to decorate with your images, words, sticky notes and washi tape.", blocks: [["Canvas"]] },
    { id: "experiments", label: "Experiments", desc: "What you tried, what worked, what didn’t.", blocks: [["New experiment"], ["Log"]] },
  ] },
  { id: "today", title: "Today", sub: "streaks & stats", group: "life", home: ["screen"], icon: "sparkle", ...c("brown"), sticker: "star", tabs: [
    { id: "streaks", label: "Streaks", desc: "Prayer, Quran, journal and focus streaks.", blocks: [["All streaks"], ["Best ever"]] },
  ] },
  // ---- Always on ----
  { id: "focus", title: "Focus timer", sub: "Click to start a focus session", group: "always", home: [], icon: "clock", ...c("honey"), sticker: "star", tabs: [], always: true },
  { id: "surprise", title: "Surprise me", sub: "Open the gift", group: "always", home: [], icon: "gift", ...c("blush"), sticker: "star", tabs: [], always: true },
];

export const TRACKER: Record<string, Tracker> = Object.fromEntries(TRACKERS.map(t => [t.id, t]));
export const isTracker = (id: unknown): id is string => typeof id === "string" && id in TRACKER;

/** Ready-made picks for onboarding. Order matters: the first ones get into the room first. */
export const STARTER_SETS: { id: string; label: string; trackers: string[] }[] = [
  { id: "muslim-creative", label: "Muslim creative", trackers: ["deen", "journal", "design", "content", "planner", "hobbies", "today"] },
  { id: "designer", label: "Designer", trackers: ["design", "content", "work", "planner", "journal", "reading"] },
  { id: "student", label: "Student", trackers: ["study", "planner", "habits", "journal", "reading", "fitness"] },
  { id: "developer", label: "Developer", trackers: ["code", "work", "planner", "habits", "reading", "fitness"] },
  { id: "writer", label: "Writer", trackers: ["writer", "journal", "reading", "gratitude", "planner", "habits"] },
  { id: "wellbeing", label: "Gentle days", trackers: ["mood", "gratitude", "journal", "habits", "fitness"] },
];

export const SURPRISES = [
  "Honey never spoils: edible honey has been found in ancient Egyptian tombs.",
  "Research topic: how did Al-Khwarizmi shape the word “algorithm”?",
  "Creative challenge: redesign a cereal box in 30 minutes.",
  "Sunnah to try today: smile at someone, it counts as charity.",
  "Journal prompt: what tiny thing made today better?",
  "Research topic: the House of Wisdom in Baghdad.",
  "A group of flamingos is called a flamboyance.",
];
