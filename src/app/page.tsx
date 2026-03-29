'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TopNav from '@/components/TopNav';
import BottomNav, { type TabId } from '@/components/BottomNav';
import HomePage from '@/components/HomePage';
import Library from '@/components/Library';
import PdfTools from '@/components/PdfTools';
import SearchPage from '@/components/SearchPage';
import AiAssistant from '@/components/AiAssistant';
import GeminiQuiz from '@/components/GeminiQuiz';
import AppGuideBot from '@/components/AppGuideBot';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.25,
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('home');

  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage onNavigate={setActiveTab} />;
      case 'library':
        return <Library />;
      case 'tools':
        return <PdfTools />;
      case 'search':
        return <SearchPage />;
      case 'ai':
        return <AiAssistant />;
      case 'quiz':
        return <GeminiQuiz />;
      default:
        return <HomePage onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />

      <main className="flex-1 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <AppGuideBot />
    </div>
  );
}
