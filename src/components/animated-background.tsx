"use client"

import { motion } from "framer-motion"

export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="subtle-grid-pattern absolute inset-0" />

      <motion.div
        className="animate-float-slow absolute -left-24 top-[-8%] h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
      <motion.div
        className="animate-float-medium absolute right-[-10%] top-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-500/16 blur-3xl"
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, delay: 0.08, ease: "easeOut" }}
      />
      <motion.div
        className="animate-float-slow absolute bottom-[-20%] left-1/3 h-[24rem] w-[24rem] rounded-full bg-cyan-400/10 blur-3xl"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.15, delay: 0.16, ease: "easeOut" }}
      />
    </div>
  )
}
