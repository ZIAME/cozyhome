/** Diary sections and their tabs. Each tab's real pages are built in later stages; until then it shows its planned blocks. */
export type Tab = { id: string; label: string; desc: string; blocks: [string, string?][] };
export type Section = { title: string; sub: string; sticker: "moon" | "pen" | "flower" | "star" | "cal"; tabs: Tab[] };

export const SECTIONS: Record<string, Section> = {
  deen: { title: "Deen", sub: "my little prayer diary", sticker: "moon", tabs: [
    { id: "salah", label: "Salah", desc: "The day’s five prayers, on time, late, qada or missed, with witr, tahajjud and sunnah.", blocks: [["Today’s five prayers"], ["Monthly heatmap & streak"], ["Extra prayers"]] },
    { id: "quran", label: "Quran", desc: "Ayah of the day, your reflections, and every surah in a tracker.", blocks: [["Ayah of the day"], ["My reflections"], ["Surah tracker & progress"]] },
    { id: "reflections", label: "Reflections", desc: "Every reflection you’ve written, by day, searchable by surah.", blocks: [["All reflections"], ["Search by surah"]] },
    { id: "library", label: "Library", desc: "Give me a topic, and everything you’ve researched.", blocks: [["Topic generator"], ["My research"]] },
    { id: "fiqh", label: "Fiqh Q&A", desc: "Questions you want answered properly, parked until you research them.", blocks: [["Parked questions"], ["Answer + source"]] },
  ] },
  journal: { title: "Journal", sub: "thoughts & tiny moments", sticker: "pen", tabs: [
    { id: "write", label: "Write", desc: "Prompts, and today’s entry with mood, tags and a photo.", blocks: [["Prompt generator"], ["Today’s entry"]] },
    { id: "calendar", label: "Calendar", desc: "The days you wrote, coloured by mood.", blocks: [["Month view"], ["Entry"]] },
    { id: "onthisday", label: "On this day", desc: "What you wrote a month and a year ago.", blocks: [["A month ago"], ["A year ago"]] },
  ] },
  hobbies: { title: "Hobbies", sub: "& creative stuff", sticker: "flower", tabs: [
    { id: "hobbies", label: "My hobbies", desc: "A card for every hobby, with its own log.", blocks: [["Hobby cards"], ["Log"]] },
    { id: "ideas", label: "Idea jar", desc: "Drop ideas in, pull one out when you’re bored.", blocks: [["The jar"], ["All ideas"]] },
    { id: "inspo", label: "Inspiration", desc: "A board of images you save.", blocks: [["Add images"], ["Board"]] },
    { id: "experiments", label: "Experiments", desc: "What you tried, what worked, what didn’t.", blocks: [["New experiment"], ["Log"]] },
  ] },
  design: { title: "Design Studio", sub: "work & design thinking", sticker: "star", tabs: [
    { id: "board", label: "Work board", desc: "To do, ongoing and done, by client.", blocks: [["To do"], ["Ongoing"], ["Done"]] },
    { id: "projects", label: "Projects", desc: "One page per project.", blocks: [["Projects"], ["Project page"]] },
    { id: "notebook", label: "Notebook", desc: "Your content pillars, ready to turn into posts.", blocks: [["Notes"], ["Turn into LinkedIn post →"]] },
  ] },
  linkedin: { title: "LinkedIn Studio", sub: "ideas → drafts → posted", sticker: "pen", tabs: [
    { id: "ideas", label: "Ideas & drafts", desc: "The idea bank and the draft editor.", blocks: [["Idea bank"], ["Draft"]] },
    { id: "pipeline", label: "Pipeline", desc: "Idea → Drafting → Ready → Posted.", blocks: [["Pipeline"]] },
    { id: "calendar", label: "Calendar", desc: "When you plan to post what.", blocks: [["Calendar"], ["Not scheduled yet"]] },
  ] },
  planner: { title: "Planner", sub: "days planned around salah", sticker: "cal", tabs: [
    { id: "today", label: "Today", desc: "A day anchored on the five prayers.", blocks: [["Timeline"], ["Tasks"], ["Habits"]] },
    { id: "week", label: "This week", desc: "The week at a glance.", blocks: [["Week"]] },
  ] },
  today: { title: "Today", sub: "streaks & stats", sticker: "star", tabs: [
    { id: "streaks", label: "Streaks", desc: "Prayer, Quran, journal and focus streaks.", blocks: [["All streaks"], ["Best ever"]] },
  ] },
};

/** Which diary (and tab) each object in the room opens. */
export const ROOM_TO_SECTION: Record<string, [string, string?]> = {
  "deen-salah": ["deen", "salah"], "deen-quran": ["deen", "quran"], "deen-library": ["deen", "library"],
  journal: ["journal"], hobbies: ["hobbies"], planner: ["planner"], design: ["design"], linkedin: ["linkedin"], today: ["today"],
};
export const ROOM_TITLES: Record<string, string> = {
  "deen-salah": "Salah tracker", "deen-quran": "Quran", "deen-library": "Islamic library", journal: "Journal", hobbies: "Hobbies & creative",
  planner: "Planner", surprise: "Surprise me", design: "Design Studio", linkedin: "LinkedIn Studio", today: "Today", focus: "Focus timer",
};
export const SURPRISES = [
  "Honey never spoils: edible honey has been found in ancient Egyptian tombs.",
  "Research topic: how did Al-Khwarizmi shape the word “algorithm”?",
  "Creative challenge: redesign a cereal box in 30 minutes.",
  "Sunnah to try today: smile at someone, it counts as charity.",
  "Journal prompt: what tiny thing made today better?",
  "Research topic: the House of Wisdom in Baghdad.",
  "A group of flamingos is called a flamboyance.",
];
