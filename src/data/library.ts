/**
 * Topics for the Deen library's "give me a topic". Titles only, no explanations: the person reads about it from a
 * trusted teacher or book. This list should be reviewed by a knowledgeable person before launch.
 */
import groups from "./library-topics.json";
import { flatten, pickTopic, type Topic } from "@/lib/daily-topic";

export type LibraryTopic = Topic;
/** The topic list lives in library-topics.json, so the Supabase notification function sends from the same list. */
export const LIBRARY: { id: string; topics: string[] }[] = groups;
const ALL: LibraryTopic[] = flatten(LIBRARY);

/** The topic the app picks for a day: random, but the same all day and on every device. */
export const topicFor = (day: string): LibraryTopic => pickTopic(ALL, day);
/** Another random topic (optionally from one category), never the one shown now. */
export function anotherTopic(cat: string, not?: string): LibraryTopic {
  const pool = ALL.filter(t => (!cat || t.cat === cat) && t.title !== not);
  return pool[Math.floor(Math.random() * pool.length)];
}
