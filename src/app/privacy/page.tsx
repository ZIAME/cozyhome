import type { Metadata } from "next";
import { Privacy } from "@/components/Legal";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy · Cozy Home" };
export default function Page() { return <LegalPage title="Privacy"><Privacy /></LegalPage>; }
