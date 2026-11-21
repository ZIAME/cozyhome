import type { ComponentType } from "react";
import * as D from "@/diary/deen";
import * as M from "@/diary/mind";
import * as W from "@/diary/work";
import * as L from "@/diary/life";
import * as SB from "@/diary/scrapbook";

type Spread = { left: ComponentType; right: ComponentType };
const s = (left: ComponentType, right: ComponentType): Spread => ({ left, right });

/** The real diary pages, by tracker and tab (ids from src/room/catalogue.ts). A tab missing here shows its planned blocks. */
export const PAGES: Record<string, Record<string, Spread>> = {
  deen: { salah: s(D.SalahLeft, D.SalahRight), quran: s(D.QuranLeft, D.QuranRight), reflections: s(D.ReflectionsLeft, D.ReflectionsRight), library: s(D.LibraryLeft, D.LibraryRight) },
  journal: { write: s(M.JournalWriteLeft, M.JournalWriteRight), calendar: s(M.JournalCalLeft, M.JournalCalRight), onthisday: s(M.OnThisDayLeft, M.OnThisDayRight) },
  mood: { checkin: s(M.MoodCheckLeft, M.MoodCheckRight), month: s(M.MoodMonthLeft, M.MoodMonthRight), patterns: s(M.MoodPatternsLeft, M.MoodPatternsRight) },
  gratitude: { today: s(M.GratitudeTodayLeft, M.GratitudeTodayRight), jar: s(M.GratitudeJarLeft, M.GratitudeJarRight) },
  work: { board: s(W.WorkBoardLeft, W.WorkBoardRight), clients: s(W.WorkClientsLeft, W.WorkClientsRight) },
  design: { board: s(W.DesignBoardLeft, W.DesignBoardRight), projects: s(W.DesignProjectsLeft, W.DesignProjectsRight), notebook: s(W.DesignNotebookLeft, W.DesignNotebookRight) },
  content: { ideas: s(W.ContentIdeasLeft, W.ContentIdeasRight), pipeline: s(W.ContentPipeLeft, W.ContentPipeRight), calendar: s(W.ContentCalLeft, W.ContentCalRight) },
  code: { projects: s(W.CodeProjectsLeft, W.CodeProjectsRight), learning: s(W.CodeLearnLeft, W.CodeLearnRight), log: s(W.CodeLogLeft, W.CodeLogRight) },
  writer: { drafts: s(W.WriterDraftsLeft, W.WriterDraftsRight), ideas: s(W.WriterIdeasLeft, W.WriterIdeasRight), words: s(W.WriterWordsLeft, W.WriterWordsRight) },
  study: { subjects: s(L.StudySubjectsLeft, L.StudySubjectsRight), assignments: s(L.StudyAssignLeft, L.StudyAssignRight), exams: s(L.StudyExamsLeft, L.StudyExamsRight), revision: s(L.StudyRevisionLeft, L.StudyRevisionRight) },
  planner: { today: s(L.PlannerTodayLeft, L.PlannerTodayRight), week: s(L.PlannerWeekLeft, L.PlannerWeekRight) },
  habits: { today: s(L.HabitsTodayLeft, L.HabitsTodayRight), streaks: s(L.HabitsStreaksLeft, L.HabitsStreaksRight) },
  reading: { shelf: s(L.ReadingShelfLeft, L.ReadingShelfRight), finished: s(L.ReadingDoneLeft, L.ReadingDoneRight) },
  fitness: { today: s(L.FitTodayLeft, L.FitTodayRight), log: s(L.FitLogLeft, L.FitLogRight) },
  hobbies: { hobbies: s(L.HobbiesLeft, L.HobbiesRight), ideas: s(L.HobbyJarLeft, L.HobbyJarRight), inspo: s(L.InspoLeft, L.InspoRight), scrapbook: s(SB.ScrapLeft, SB.ScrapRight), experiments: s(L.ExperimentsLeft, L.ExperimentsRight) },
  today: { streaks: s(L.TodayLeft, L.TodayRight) },
};
