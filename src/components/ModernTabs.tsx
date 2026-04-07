'use client'

import React, { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * DESIGN PHILOSOPHY: Premium SaaS Navigation
 * 
 * Inspired by: Vercel Dashboard, Linear.app, Notion
 * 
 * Key Principles:
 * 1. MINIMAL: Icons only on mobile, labels on desktop
 * 2. CLEAR ACTIVE STATE: Sliding indicator with smooth animation
 * 3. SMOOTH MOTION: All transitions use Framer Motion (200-300ms)
 * 4. PERFORMANCE: Lazy loading, no unnecessary re-renders
 * 5. MOBILE-FIRST: Horizontal scroll, thumb-friendly spacing
 */

export interface TabItem {
  id: string
  label: string
  icon: React.ReactNode
  description?: string
}

interface ModernTabsProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  variant?: 'default' | 'minimal' | 'pill'
}

const ModernTabs: React.FC<ModernTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default'
}) => {
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState<{
    width: number
    left: number
  } | null>(null)
  const [isScrollable, setIsScrollable] = useState(false)

  // Update indicator position when active tab changes
  useEffect(() => {
    const updateIndicator = () => {
      if (!tabsContainerRef.current) return

      const activeButton = tabsContainerRef.current.querySelector(
        `[data-tab-id="${activeTab}"]`
      ) as HTMLElement

      if (activeButton) {
        setIndicatorStyle({
          width: activeButton.offsetWidth,
          left: activeButton.offsetLeft
        })

        // Auto-scroll active tab into view
        activeButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        })
      }
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeTab])

  // Check if tabs are scrollable
  useEffect(() => {
    const checkScrollable = () => {
      if (tabsContainerRef.current) {
        setIsScrollable(
          tabsContainerRef.current.scrollWidth >
            tabsContainerRef.current.clientWidth
        )
      }
    }

    checkScrollable()
    window.addEventListener('resize', checkScrollable)
    return () => window.removeEventListener('resize', checkScrollable)
  }, [tabs])

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId)
  }

  const handleKeyDown = (
    e: React.KeyboardEvent,
    tabId: string,
    index: number
  ) => {
    if (e.key === 'ArrowRight' && index < tabs.length - 1) {
      e.preventDefault()
      onTabChange(tabs[index + 1].id)
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      onTabChange(tabs[index - 1].id)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onTabChange(tabId)
    }
  }

  return (
    <div className="w-full">
      {/* Tab Navigation Container */}
      <div
        className={`
          relative overflow-hidden
          ${variant === 'minimal'
            ? 'bg-transparent'
            : 'bg-white dark:bg-[#1e293b] rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800'
          }
          ${variant === 'pill'
            ? 'p-2'
            : 'p-1.5'
          }
        `}
      >
        {/* Scrollable Tabs Container */}
        <div
          ref={tabsContainerRef}
          className={`
            flex gap-1 overflow-x-auto
            ${isScrollable ? 'snap-x snap-mandatory' : ''}
            scroll-smooth
          `}
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Hide scrollbar */}
          <style>{`
            [data-tabs-container]::-webkit-scrollbar {
              display: none;
            }
            [data-tabs-container] {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>

          {/* Indicator Background (for non-minimal variant) */}
          {variant !== 'minimal' && indicatorStyle && (
            <motion.div
              className="absolute top-1.5 h-[calc(100%-12px)] bg-gradient-to-r from-[#1a3a5c] to-[#2d5986] dark:from-[#2d5986] dark:to-[#1a3a5c] rounded-xl pointer-events-none"
              initial={false}
              animate={{
                width: indicatorStyle.width,
                left: indicatorStyle.left + 6
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30
              }}
            />
          )}

          {/* Tab Buttons */}
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id

            return (
              <motion.button
                key={tab.id}
                data-tab-id={tab.id}
                onClick={() => handleTabClick(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, tab.id, index)}
                className={`
                  relative flex-shrink-0 snap-center
                  flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2
                  px-3 sm:px-4 py-2 sm:py-2.5
                  rounded-lg font-semibold
                  transition-all duration-200
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a3a5c]
                  cursor-pointer
                  whitespace-nowrap
                  group
                  ${variant === 'pill'
                    ? `
                      ${isActive
                        ? 'bg-[#1a3a5c] text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }
                    `
                    : variant === 'minimal'
                    ? `
                      ${isActive
                        ? 'text-[#1a3a5c] dark:text-[#f0c040]'
                        : 'text-gray-500 dark:text-gray-400'
                      }
                      hover:text-gray-700 dark:hover:text-gray-300
                    `
                    : `
                      ${isActive
                        ? 'text-white relative z-10'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }
                    `
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Icon */}
                <motion.span
                  className={`
                    text-lg sm:text-base leading-none
                    transition-all duration-200
                    ${isActive && variant !== 'minimal' ? 'scale-110' : 'group-hover:scale-105'}
                  `}
                  animate={isActive ? { y: 0 } : { y: 0 }}
                >
                  {tab.icon}
                </motion.span>

                {/* Label - Hidden on mobile for default variant */}
                <span
                  className={`
                    font-bold leading-tight text-center
                    ${variant === 'minimal'
                      ? 'hidden sm:inline text-xs sm:text-sm'
                      : 'hidden sm:inline text-xs sm:text-sm'
                    }
                  `}
                >
                  {tab.label}
                </span>

                {/* Underline indicator for minimal variant */}
                {variant === 'minimal' && isActive && (
                  <motion.div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1a3a5c] dark:bg-[#f0c040]"
                    layoutId="minimal-indicator"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Scroll Indicator (if needed) */}
      {isScrollable && (
        <div className="mt-2 text-center">
          <motion.div
            className="inline-block text-xs text-gray-400 dark:text-gray-500"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ← Scroll →
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default ModernTabs
