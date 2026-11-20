import type { Theme } from "../theme";
import { CABIN } from "./cabin";

/** Every room theme. New themes add art + spot positions for the same spot ids. */
export const THEMES: Record<string, Theme> = { [CABIN.id]: CABIN };
export const DEFAULT_THEME = CABIN.id;
