// components/layout/Navbar.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, Spade, X, Moon, Sun } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'

const navLinks = [
  { name: 'Use Cases', href: '/use-cases' },
  { name: 'Privacy', href: '/privacy' },

]

export default function Navbar() {


  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter();
  const pathname = usePathname();


   // PREVENT BODY SCROLL
   useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobileMenuOpen]);




  return (
    <>
      <motion.nav
        className={`fixed  top-6 left-6 right-6 z-50  max-w-3xl mx-auto rounded-full md:py-4 py-3 shadow-2xl dark:shadow-xs border border-neutral-200 bg-white
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between">
          <Link href={"/"} className="flex items-center gap-1 ">

                    <span className="text-[16px] font-extrabold text-primary ">SCRAPIFY</span>
         </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2" >
              {navLinks.map((link) => {
                const active = pathname === link.href;

                return(
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 text-black  ${
                    active
                      ? " text-[#fef29e]"
                      : " "
                  }`}
          
                >
                  {link.name}
                </Link>
                );
})}
            </div>

            <div className='md:flex hidden items-center gap-2'>
              <button 
               onClick={()=>{router.push("/dashboard/home")}}
               className="px-5 py-2 hidden md:flex rounded-full bg-primary dark:text-white text-white text-sm transition-all duration-300 shadow-lg dark:shadow-xs  cursor-pointer font-bold">
                Get Started
              </button>

            </div>


            {/* Mobile Menu Button */}
            <div className='flex items-center gap-2 md:hidden '>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className=" p-2 rounded-lg cursor-pointer text-primary "
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            </div>

          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 top-[90px] h-full z-100 bg-white md:hidden"
          >
            <div className="flex flex-col justify-center items-center p-6 gap-4 mt-6">
              {navLinks.map((link) => {
                  const active = pathname === link.href;
return(
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full rounded-md px-6 py-3 text-sm transition-all text-black ${
                    active
                      ? "text-[#fef29e] font-bold "
                      : "hover:text-neutral-600 font-semibold"
                  }`}
                >
                  {link.name}
                </Link>
);
})}
              <button onClick={()=>{router.push("/dashboard/home")}} className="mt-2 px-5 py-3 rounded-full bg-primary text-white font-semibold w-full cursor-pointer text-sm">
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}