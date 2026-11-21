// Builds supabase/functions/daily-topic/index.ts: one self-contained file you can paste into the Supabase editor.
// It embeds the shared topic logic (src/lib/daily-topic.ts) and the topic list (src/data/library-topics.json),
// so the server always picks the same topic as the app. Run: node scripts/build-push-function.mjs
import { readFileSync, writeFileSync } from "node:fs";
const root = new URL("../", import.meta.url);
const shared = readFileSync(new URL("src/lib/daily-topic.ts", root), "utf8").replace(/^export /gm, "");
const topics = readFileSync(new URL("src/data/library-topics.json", root), "utf8").trim();
const out = readFileSync(new URL("scripts/function-template.deno.txt", root), "utf8").replace("/*__SHARED__*/", shared.trim()).replace("/*__TOPICS__*/", topics);
writeFileSync(new URL("supabase/functions/daily-topic/index.ts", root), out);
console.log("wrote supabase/functions/daily-topic/index.ts", out.length, "chars");
