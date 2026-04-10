'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowRight,
  Camera,
  Download,
  GripVertical,
  Share2,
  Trash2,
  FileDown,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScannedPage } from './types';

interface PageManagerProps {
  pages: ScannedPage[];
  onReorder: (pages: ScannedPage[]) => void;
  onDeletePage: (id: string) => void;
  onAddPage: () => void;
  onExport: () => void;
  onShare: () => void;
  onBack: () => void;
}

function SortablePage({
  page,
  index,
  onDelete,
  isSelected,
  onSelect,
}: {
  page: ScannedPage;
  index: number;
  onDelete: () => void;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'relative rounded-xl overflow-hidden aspect-[3/4] bg-gray-100 dark:bg-gray-900 border-2 transition-all group',
        isDragging
          ? 'border-emerald-400 shadow-xl shadow-emerald-500/20 scale-105'
          : isSelected
            ? 'border-blue-500'
            : 'border-gray-200 dark:border-gray-700'
      )}
    >
      <img
        src={page.processedImage}
        alt={`صفحة ${index + 1}`}
        className="w-full h-full object-cover"
        onClick={onSelect}
      />

      {/* Page number */}
      <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white text-[11px] font-bold flex items-center justify-center backdrop-blur-sm">
        {index + 1}
      </div>

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center backdrop-blur-sm cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-red-500/80 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
      >
        <Trash2 className="size-3" />
      </button>
    </motion.div>
  );
}

export default function PageManager({
  pages,
  onReorder,
  onDeletePage,
  onAddPage,
  onExport,
  onShare,
  onBack,
}: PageManagerProps) {
  const [selectedPage, setSelectedPage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);
      onReorder(arrayMove(pages, oldIndex, newIndex));
    },
    [pages, onReorder]
  );

  return (
    <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowRight className="size-5" />
        </button>
        <div className="flex-1">
          <h3 className="text-base font-bold text-gray-800 dark:text-white">
            الصفحات ({pages.length})
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            اسحب لإعادة الترتيب
          </p>
        </div>
      </div>

      {/* Pages grid with DnD */}
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-3">
              <AnimatePresence mode="popLayout">
                {pages.map((page, i) => (
                  <SortablePage
                    key={page.id}
                    page={page}
                    index={i}
                    onDelete={() => onDeletePage(page.id)}
                    isSelected={selectedPage === page.id}
                    onSelect={() =>
                      setSelectedPage(selectedPage === page.id ? null : page.id)
                    }
                  />
                ))}
              </AnimatePresence>

              {/* Add page button */}
              <motion.button
                layout
                onClick={onAddPage}
                className="rounded-xl aspect-[3/4] border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors"
              >
                <Plus className="size-6" />
                <span className="text-[10px] font-medium">إضافة</span>
              </motion.button>
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Selected page preview */}
      <AnimatePresence>
        {selectedPage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <img
                src={pages.find((p) => p.id === selectedPage)?.processedImage}
                alt="معاينة"
                className="w-full rounded-xl object-contain max-h-[50vh]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onAddPage}
          className="py-3 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-blue-700 transition-colors"
        >
          <Camera className="size-4" />
          إضافة صفحة
        </button>
        <button
          onClick={onExport}
          className="py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-emerald-700 transition-colors"
        >
          <FileDown className="size-4" />
          تصدير PDF
        </button>
        <button
          onClick={onShare}
          className="py-3 bg-purple-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-purple-700 transition-colors"
        >
          <Share2 className="size-4" />
          مشاركة
        </button>
        <button
          onClick={() => {
            // Download all pages as images
            pages.forEach((page, i) => {
              const a = document.createElement('a');
              a.href = page.processedImage;
              a.download = `page_${i + 1}.jpg`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            });
          }}
          className="py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
        >
          <Download className="size-4" />
          تحميل صور
        </button>
      </div>
    </div>
  );
}
