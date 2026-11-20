import type { Metadata } from "next";
import { Credits } from "@/components/Legal";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Credits · Cozy Home" };
export default function Page() { return <LegalPage title="Credits"><Credits /></LegalPage>; }
