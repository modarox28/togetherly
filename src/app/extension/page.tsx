import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { ExtensionGuide } from "@/components/extension/ExtensionGuide";

export const metadata: Metadata = {
  title: "Instalar Togetherly Sync — Togetherly",
  description:
    "Descarga la extensión gratis y sincroniza Netflix, Prime Video, HBO Max y Disney+ en Chrome, Edge, Brave, Opera o Firefox.",
};

export default function ExtensionPage() {
  return (
    <main>
      <Navbar />
      <ExtensionGuide />
      <Footer />
    </main>
  );
}
