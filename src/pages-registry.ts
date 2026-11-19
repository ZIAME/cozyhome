import type { ComponentType } from "react";

/** Real diary pages, by section and tab. Tabs not listed here show their planned blocks. Filled in stage 2 and 3. */
export const PAGES: Record<string, Record<string, { left: ComponentType; right: ComponentType }>> = {};
