import Benefits from "@/components/landing/benefits";
import FAQPage from "@/components/landing/faq";
import Footer from "@/components/landing/footer";
import HeroSection from "@/components/landing/hero";
import HowItWorks from "@/components/landing/how-it-works";
import Navbar from "@/components/landing/navbar";
import ProblemPage from "@/components/landing/problems-to-be-solved";
import CapabilitiesPage from "@/components/landing/what-it-can-do";
import Image from "next/image";


export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center text-secondary font-sans bg-white">
      <Navbar/>
      <HeroSection/>
      <HowItWorks/>
      <CapabilitiesPage/>
      <Benefits/>
      <FAQPage/>
      <Footer/>
    </div>
  );
}
