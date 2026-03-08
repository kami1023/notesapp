import React, { useState, useEffect } from 'react';
import { Note, ViewMode } from './types';
import { StructuredNote } from './components/StructuredNote';
import { extractNotesFromUrl, refineNotes } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { PenLine, LayoutDashboard, Sparkles, Link as LinkIcon, Loader2, ArrowRight, Trash2, PanelLeftClose, PanelLeftOpen, X, Wand2 } from 'lucide-react';

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('zenn-notes-v1');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error('Failed to parse notes', e);
      }
    }
  }, []);

  // Save notes to localStorage on change
  useEffect(() => {
    localStorage.setItem('zenn-notes-v1', JSON.stringify(notes));
  }, [notes]);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    try {
      const extracted = await extractNotesFromUrl(url);
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: extracted.title || 'Extracted Notes',
        sourceUrl: url,
        sections: extracted.sections || [],
        createdAt: Date.now(),
        color: 'bg-zinc-900',
      };
      setNotes([newNote, ...notes]);
      setUrl('');
      setSelectedNoteId(newNote.id);
      setViewMode('display');
    } catch (error) {
      console.error('Extraction failed', error);
      alert('Failed to extract notes. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNote = (id: string) => {
    if (selectedNoteId === id) setSelectedNoteId(null);
    setNotes(notes.filter((n) => n.id !== id));
  };

  const handleRefine = async (instruction: string) => {
    const noteToRefine = notes.find(n => n.id === selectedNoteId);
    if (!noteToRefine) return;

    setIsRefining(true);
    try {
      const refined = await refineNotes(noteToRefine, instruction);
      setNotes(notes.map(n => n.id === selectedNoteId ? { ...n, ...refined } : n));
      setShowRefineModal(false);
      setCustomInstruction('');
    } catch (error) {
      console.error('Refinement failed', error);
      alert('Failed to refine notes. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-950 shadow-lg shadow-white/5 overflow-hidden">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 5h14L5 19h14" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Zenn</h1>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                viewMode === 'editor' 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <PenLine size={16} />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={() => setViewMode('display')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                viewMode === 'display' 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Library</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {viewMode === 'editor' ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto pt-20 px-4 text-center"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white text-zinc-950 rounded-3xl mb-8 shadow-2xl shadow-white/10">
                <LinkIcon size={32} />
              </div>
              <h2 className="text-5xl font-bold text-white mb-6 tracking-tight">Turn any link into notes</h2>
              <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-12 leading-relaxed">
                Paste a link to a lecture, article, or educational site. Zenn will extract the core concepts and organize them topic-wise for you.
              </p>

              <form onSubmit={handleExtract} className="max-w-2xl mx-auto relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-zinc-800 to-zinc-900 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-sm">
                  <div className="pl-4 text-zinc-500">
                    <LinkIcon size={20} />
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="Paste your notes link here (e.g. College Wallah, Medium, etc.)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-grow px-4 py-3 bg-transparent focus:outline-none text-white placeholder:text-zinc-700"
                  />
                  <button
                    disabled={isLoading}
                    type="submit"
                    className="bg-white text-zinc-950 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        Get Notes
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Recent Activity */}
              {notes.length > 0 && (
                <div className="mt-24 text-left">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6">Recently Extracted</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {notes.slice(0, 3).map(note => (
                      <button
                        key={note.id}
                        onClick={() => {
                          setSelectedNoteId(note.id);
                          setViewMode('display');
                        }}
                        className="group p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-left hover:border-white transition-all shadow-sm cursor-pointer"
                      >
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                          <LinkIcon size={12} />
                          {new URL(note.sourceUrl || '').hostname}
                        </div>
                        <h4 className="font-bold text-white group-hover:text-white transition-colors line-clamp-2 mb-2">{note.title}</h4>
                        <div className="text-xs text-zinc-500">{note.sections.length} Topics extracted</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="display"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-[calc(100vh-73px)] w-full overflow-hidden"
            >
              {/* Sidebar */}
              <AnimatePresence initial={false}>
                {isSidebarOpen && (
                  <motion.aside
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="border-r border-zinc-800 bg-zinc-950 overflow-y-auto hidden lg:block flex-shrink-0"
                  >
                    <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Library</h3>
                      <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-500 transition-colors cursor-pointer"
                      >
                        <PanelLeftClose size={18} />
                      </button>
                    </div>
                    <div className="divide-y divide-zinc-900">
                      {notes.map(note => (
                        <button
                          key={note.id}
                          onClick={() => setSelectedNoteId(note.id)}
                          className={`w-full p-6 text-left transition-all hover:bg-zinc-900 cursor-pointer ${selectedNoteId === note.id ? 'bg-zinc-900 border-l-4 border-white' : ''}`}
                        >
                          <h4 className={`font-bold text-sm mb-1 line-clamp-1 ${selectedNoteId === note.id ? 'text-white' : 'text-zinc-500'}`}>
                            {note.title}
                          </h4>
                          <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </p>
                        </button>
                      ))}
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>

              {/* Content Area */}
              <div className="flex-grow overflow-y-auto bg-zinc-950 lg:bg-transparent relative">
                {!isSidebarOpen && (
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="absolute top-6 left-6 z-10 p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white shadow-sm transition-all cursor-pointer"
                    title="Open Library"
                  >
                    <PanelLeftOpen size={20} />
                  </button>
                )}
                
                <div className="max-w-5xl mx-auto px-6 py-12 h-full">
                  {selectedNote ? (
                    <div className="relative h-full flex flex-col">
                      <div className="absolute -top-4 -right-4 flex items-center gap-2 z-10">
                        <button 
                          onClick={() => setShowRefineModal(true)}
                          className="p-3 text-zinc-400 hover:text-white transition-colors cursor-pointer bg-zinc-900/50 backdrop-blur-sm rounded-full border border-zinc-800"
                          title="AI Refine Notes"
                        >
                          <Wand2 size={20} />
                        </button>
                        <button 
                          onClick={() => deleteNote(selectedNote.id)}
                          className="p-3 text-zinc-600 hover:text-rose-500 transition-colors cursor-pointer bg-zinc-900/50 backdrop-blur-sm rounded-full border border-zinc-800"
                          title="Delete this note"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                      <StructuredNote note={selectedNote} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                      <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                        <LayoutDashboard size={40} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Select a note</h3>
                      <p>Pick a note from your library to view the structured topics.</p>
                      <button 
                        onClick={() => setViewMode('editor')}
                        className="mt-6 text-white font-bold underline cursor-pointer"
                      >
                        Or import a new one
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-[#09090b] border-t border-zinc-900 py-6 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-600">
            &copy; {new Date().getFullYear()} Zenn Notes. Built with precision.
          </p>
          <div className="flex items-center gap-6 text-sm font-medium text-zinc-600">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>

      {/* Refinement Modal */}
      <AnimatePresence>
        {showRefineModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isRefining && setShowRefineModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white text-zinc-950 rounded-xl flex items-center justify-center">
                    <Wand2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">AI Refine</h3>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Enhance your notes</p>
                  </div>
                </div>
                <button 
                  disabled={isRefining}
                  onClick={() => setShowRefineModal(false)}
                  className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 block">Quick Actions</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Make it Longer', icon: '📝', instruction: 'Make the notes more detailed and comprehensive, adding more depth to each point.' },
                      { label: 'Make it Shorter', icon: '✂️', instruction: 'Condense the notes by rephrasing each sentence to be as concise as possible. Ensure ALL factual information and content is retained; do not summarize or omit details. The goal is to reduce reading time while keeping 100% of the information.' },
                      { label: 'Rephrase Longer', icon: '🔄', instruction: 'Rephrase the notes to be more professional and detailed.' },
                      { label: 'Rephrase Shorter', icon: '⚡', instruction: 'Rephrase each sentence to be sharp, punchy, and as short as possible without losing any information. Cover 100% of the original content.' },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        disabled={isRefining}
                        onClick={() => handleRefine(opt.instruction)}
                        className="flex items-center gap-3 p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl text-left hover:bg-zinc-800 hover:border-zinc-600 transition-all group disabled:opacity-50 cursor-pointer"
                      >
                        <span className="text-xl">{opt.icon}</span>
                        <span className="text-sm font-bold text-zinc-300 group-hover:text-white">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 block">Custom Instruction</label>
                  <div className="relative">
                    <textarea
                      disabled={isRefining}
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      placeholder="e.g. 'Explain this like I'm five' or 'Focus more on technical implementation'..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-white transition-colors min-h-[100px] resize-none"
                    />
                  </div>
                </div>

                <button
                  disabled={isRefining || !customInstruction.trim()}
                  onClick={() => handleRefine(customInstruction)}
                  className="w-full bg-white text-zinc-950 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isRefining ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Refining Notes...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Apply Custom Refinement
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
