import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StructuredNoteProps {
  note: Note;
}

export const StructuredNote: React.FC<StructuredNoteProps> = ({ note }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(0);

  const totalPoints = note.sections.reduce((acc, s) => acc + s.points.length, 0);
  const pointsBeforeCurrent = note.sections.slice(0, currentIndex).reduce((acc, s) => acc + s.points.length, 0);
  const progress = ((pointsBeforeCurrent + activeLineIndex + 1) / totalPoints) * 100;

  const nextSlide = () => {
    if (currentIndex < note.sections.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setActiveLineIndex(0);
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setActiveLineIndex(note.sections[prevIdx].points.length - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeLineIndex < note.sections[currentIndex].points.length - 1) {
          setActiveLineIndex(prev => prev + 1);
        } else if (currentIndex < note.sections.length - 1) {
          nextSlide();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeLineIndex > 0) {
          setActiveLineIndex(prev => prev - 1);
        } else if (currentIndex > 0) {
          prevSlide();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLineIndex, currentIndex, note.sections]);

  if (!note.sections.length) return null;

  const currentSection = note.sections[currentIndex];

  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="border-b border-zinc-900 pb-6">
        <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">
          <BookOpen size={14} />
          Source: {new URL(note.sourceUrl || '').hostname}
        </div>
        <h2 className="text-3xl font-bold text-white tracking-tight">{note.title}</h2>
      </div>

      <div className="relative flex-grow flex flex-col">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-zinc-900 rounded-full mb-8 overflow-hidden">
          <motion.div 
            className="h-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-zinc-950 flex items-center justify-center font-mono text-sm shadow-lg shadow-white/5">
              {String(currentIndex + 1).padStart(2, '0')}
            </div>
            <h3 className="text-xl font-bold text-white">
              {currentSection.topic}
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={prevSlide}
              disabled={currentIndex === 0}
              className="p-2 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs font-bold text-zinc-600 w-12 text-center">
              {currentIndex + 1} / {note.sections.length}
            </span>
            <button
              onClick={nextSlide}
              disabled={currentIndex === note.sections.length - 1}
              className="p-2 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="relative flex-grow min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-12 shadow-sm h-full overflow-y-auto"
            >
              <ul className="space-y-6">
                {currentSection.points.map((point, pIdx) => {
                  const isActive = pIdx === activeLineIndex;
                  const distance = Math.abs(pIdx - activeLineIndex);
                  const opacity = Math.max(0.1, 1 - distance * 0.3);
                  
                  return (
                    <motion.li 
                      key={pIdx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ 
                        opacity: opacity, 
                        x: 0,
                        scale: isActive ? 1.02 : 1,
                        filter: isActive ? 'blur(0px)' : `blur(${Math.min(2, distance * 0.5)}px)`
                      }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-start gap-5 p-4 rounded-2xl transition-all duration-300 ${
                        isActive 
                          ? 'bg-zinc-800/50 ring-1 ring-white/20 shadow-xl shadow-black/20' 
                          : ''
                      }`}
                    >
                      <div className={`mt-2.5 w-2 h-2 rounded-full transition-colors flex-shrink-0 ${
                        isActive ? 'bg-white' : 'bg-zinc-800'
                      }`} />
                      <p className={`text-lg leading-relaxed font-medium transition-all ${
                        isActive ? 'text-white' : 'text-zinc-500'
                      }`}>
                        {point}
                      </p>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
