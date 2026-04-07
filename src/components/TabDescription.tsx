'use client'

import React from 'react'
import { motion } from 'framer-motion'

/**
 * DESIGN: Premium Tab Description Header
 * 
 * Features:
 * - Gradient background with subtle effects
 * - Icon and title animation
 * - Description text with proper hierarchy
 * - Dark mode support
 */

interface TabDescriptionProps {
  icon: React.ReactNode
  title: string
  description: string
  accentColor?: string
}

const TabDescription: React.FC<TabDescriptionProps> = ({
  icon,
  title,
  description,
  accentColor = 'from-[#1a3a5c] to-[#2d5986]'
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className={`
        mb-8 p-6 sm:p-8
        bg-gradient-to-r ${accentColor}
        dark:from-[#1e293b] dark:to-[#0f172a]
        rounded-3xl text-white
        shadow-xl relative overflow-hidden
        border border-[#2d5986]/20 dark:border-gray-700/30
      `}
    >
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16 blur-3xl" />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon and Title */}
        <motion.div
          className="flex items-center gap-3 mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <motion.span
            className="text-4xl leading-none"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {icon}
          </motion.span>
          <h2 className="text-2xl sm:text-3xl font-black leading-tight">
            {title}
          </h2>
        </motion.div>

        {/* Description */}
        <motion.p
          className="text-blue-50 dark:text-gray-300 font-medium leading-relaxed max-w-2xl text-sm sm:text-base"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          {description}
        </motion.p>
      </div>
    </motion.div>
  )
}

export default TabDescription
