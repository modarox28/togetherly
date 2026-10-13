import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Platforms } from "@/components/landing/Platforms";
import { Features } from "@/components/landing/Features";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <HowItWorks />
      <Platforms />
      <Features />
      <CTASection />
      <Footer />
    </main>
  );
}
