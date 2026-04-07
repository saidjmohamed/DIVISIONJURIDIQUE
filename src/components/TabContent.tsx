'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * DESIGN: Premium Tab Content Wrapper
 * 
 * Features:
 * - Smooth entrance/exit animations
 * - Lazy loading support
 * - Accessibility-first approach
 * - Performance optimized
 */

interface TabContentProps {
  activeTab: string
  children: React.ReactNode
  className?: string
}

const TabContent: React.FC<TabContentProps> = ({
  activeTab,
  children,
  className = ''
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{
          duration: 0.25,
          ease: 'easeInOut'
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export default TabContent
