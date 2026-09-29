// components/home/HeroSection.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Workflow } from 'lucide-react'
import { PiArrowUpRightBold } from 'react-icons/pi'
import Link from 'next/link'

/* ---------------------------------------------
   Floating particles — tiny #fef29e dots drifting
   in the hero background
--------------------------------------------- */
type Particle = {
  id: number
  size: number
  left: number
  top: number
  duration: number
  delay: number
  driftX: number
}

function ParticleField({ count = 28 }: { count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([])

  // generate on mount only — keeps SSR/client markup identical, avoids hydration mismatch
  useEffect(() => {
    const generated = Array.from({ length: count }, (_, i) => ({
      id: i,
      size: Math.random() * 3 + 6, // 2px - 5px
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 6 + 6, // 6s - 12s
      delay: Math.random() * 10,
      driftX: Math.random() * 40 - 20, // -20px to 20px horizontal drift
    }))
    setParticles(generated)
  }, [count])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            backgroundColor: '#b70569',
          }}
          initial={{ opacity: 0, y: 0, x: 0 }}
          animate={{
            opacity: [0, 0.9, 0.9, 0],
            y: [-10, -60],
            x: [0, p.driftX],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
function ScrambleWord({ word = 'Scrapify' }: { word?: string }) {
  const [cycle, setCycle] = useState(0)

  // replay the assemble animation every 6s
  useEffect(() => {
    const interval = setInterval(() => setCycle((c) => c + 1), 6000)
    return () => clearInterval(interval)
  }, [])

  const letters = word.split('')

  const positions = [
    { x: -25, y: 11, rotate: -20 },
    { x: 29, y: -9, rotate: 15 },
    { x: -13, y: 12, rotate: 38 },
    { x: 24, y: 11, rotate: -25 },
    { x: -16, y: -19, rotate: -10 },
    { x: 30, y: 16, rotate: 20 },
    { x: 23, y: 9, rotate: -8 },
    { x: 23, y: 15, rotate: -20 },
  ]

  return (
    <span className="inline-flex text-gradient" aria-label={word}>
      {letters.map((letter, i) => {
        const position = positions[i % positions.length]

        return (
          <motion.span
            key={`${cycle}-${i}`}
            initial={{
              opacity: 0,
              x: position.x,
              y: position.y,
              rotate: position.rotate,
            }}
            animate={{
              opacity: 1,
              x: 0,
              y: 0,
              rotate: 0,
            }}
            transition={{
              delay: i * 0.045,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="inline-block"
          >
            {letter}
          </motion.span>
        )
      })}
    </span>
  )
}

export default function HeroSection() {
  return (
    <section className="relative max-w-7xl mx-auto flex items-center justify-center overflow-hidden lg:pt-28 pt-25 mt-10">
      {/* Background Glow */}
      <div className="absolute inset-0 hero-glow pointer-events-none" />

      {/* Particles */}
      <ParticleField count={28} />

      <div className="px-4 md:px-6 lg:px-4 py-20 relative z-10">
        <div>
          <div className="flex flex-col justify-center items-center w-full">

            <motion.h1
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: 4 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="text-2xl lg:text-3xl md:text-2xl text-center font-semibold tracking-tight mb-6 text-neutral-900 "
            >
              Tell <ScrambleWord word="Scrapify" /> What to Do.
              <br className="" />{' '}
              <span className="text-gradient">
                It Handles the Web.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="md:text-[16px] text-[14px] text-neutral-600  mb-8 max-w-xl text-center "
            >
              Turn simple instructions into browser automations. Scrapify
              navigates websites, performs tasks, extracts information, and
              turns successful runs into reusable workflows.
            </motion.p>

            <div className="w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="flex flex-col sm:flex-row justify-center gap-4 mt-2"
              >
                <button className="group px-8 py-4 rounded-full cursor-pointer bg-primary text-white font-semibold  text-sm transition-all duration-300 shadow-lg dark:shadow-xs shadow-purple-500/25 flex items-center justify-center gap-2">
                 <Link href="/dashboard/home" >Start Automation</Link> 
                  <PiArrowUpRightBold className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button className="px-10 py-4 rounded-full cursor-pointer dark:text-primary text-white font-semibold  text-sm shadow-xs border border-neutral-200 transition-all duration-300 flex items-center justify-center gap-2">
                  <Workflow className="w-4 h-4" />
                  <Link href="/use-cases" >See Use Cases</Link>
                  
                </button>
              </motion.div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}