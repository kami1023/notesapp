import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StructuredNoteProps {
  note: Note;
  mode?: 'slides' | 'list';
}

export const StructuredNote: React.FC<StructuredNoteProps> = ({ note, mode = 'slides' }) => {
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
    if (mode === 'list') return;
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
  }, [activeLineIndex, currentIndex, note.sections, mode]);

  if (!note.sections.length) return null;

  if (mode === 'list') {
    return (
      <div className="flex gap-12 h-full overflow-hidden">
        {/* Sticky Table of Contents */}
        <div className="hidden xl:block w-64 flex-shrink-0 sticky top-0 h-fit max-h-full overflow-y-auto pr-4 border-r border-zinc-900">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6">Contents</h4>
          <nav className="space-y-2">
            {note.sections.map((section, idx) => (
              <a 
                key={idx}
                href={`#section-${idx}`}
                className="block text-xs text-zinc-500 hover:text-white transition-colors line-clamp-1 py-1"
              >
                {String(idx + 1).padStart(2, '0')}. {section.topic}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex-grow flex flex-col gap-8 overflow-y-auto pr-4 scroll-smooth">
          <div className="border-b border-zinc-900 pb-6">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">
              <BookOpen size={14} />
              Source: {new URL(note.sourceUrl || '').hostname}
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">{note.title}</h2>
          </div>
          <div className="space-y-12 pb-20">
            {note.sections.map((section, sIdx) => (
              <div key={sIdx} id={`section-${sIdx}`} className="space-y-4 scroll-mt-8">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <span className="text-zinc-500 font-mono text-sm">{String(sIdx + 1).padStart(2, '0')}</span>
                  {section.topic}
                </h3>
                <ul className="space-y-3 pl-8">
                  {section.points.map((point, pIdx) => (
                    <li key={pIdx} className="text-zinc-400 leading-relaxed flex items-start gap-3">
                      <div className="mt-2 w-1.5 h-1.5 rounded-full bg-zinc-700 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
              initial={{ opacity: 0, x: 20, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
              transition={{ 
                duration: 0.4, 
                ease: [0.23, 1, 0.32, 1] // Custom cubic-bezier for smoother motion
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-12 shadow-2xl shadow-black/40 h-full overflow-y-auto cursor-default"
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
