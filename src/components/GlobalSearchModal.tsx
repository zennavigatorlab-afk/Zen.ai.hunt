import React, { useState, useEffect } from 'react';
import { Search, Brain, BookOpen, MessageSquare, FileText, ArrowRight, X } from 'lucide-react';
import { SearchResultItem } from '../types';
import { getAllMemories, getAllConversations, getAllKnowledge, getAllDocuments } from '../storage/db';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (type: 'memory' | 'knowledge' | 'conversation' | 'document', id: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchTimer = setTimeout(async () => {
      try {
        const [memories, convs, knowledge, docs] = await Promise.all([
          getAllMemories(),
          getAllConversations(),
          getAllKnowledge(),
          getAllDocuments(),
        ]);

        const matches: SearchResultItem[] = [];

        // Search memories
        for (const m of memories) {
          if (m.content.toLowerCase().includes(q) || m.tags.some((t) => t.toLowerCase().includes(q))) {
            matches.push({
              id: m.id,
              type: 'memory',
              title: `Memory (${m.category})`,
              snippet: m.content,
              score: 3,
              category: m.category,
              date: m.updatedAt,
            });
          }
        }

        // Search knowledge
        for (const k of knowledge) {
          if (k.title.toLowerCase().includes(q) || k.content.toLowerCase().includes(q)) {
            matches.push({
              id: k.id,
              type: 'knowledge',
              title: k.title,
              snippet: k.content.substring(0, 150),
              score: 2,
              category: k.category,
              date: k.updatedAt,
            });
          }
        }

        // Search conversations
        for (const c of convs) {
          if (c.title.toLowerCase().includes(q)) {
            matches.push({
              id: c.id,
              type: 'conversation',
              title: c.title,
              snippet: `Model: ${c.model}`,
              score: 1,
              date: c.updatedAt,
            });
          }
        }

        // Search documents
        for (const d of docs) {
          if (d.fileName.toLowerCase().includes(q) || d.extractedText.toLowerCase().includes(q)) {
            matches.push({
              id: d.id,
              type: 'document',
              title: d.fileName,
              snippet: `${d.fileType} • ${(d.fileSize / 1024).toFixed(1)} KB`,
              score: 1,
              date: d.createdAt,
            });
          }
        }

        setResults(matches.slice(0, 12));
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(searchTimer);
  }, [query]);

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'memory':
        return <Brain className="w-4 h-4 text-amber-400" />;
      case 'knowledge':
        return <BookOpen className="w-4 h-4 text-cyan-400" />;
      case 'conversation':
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'document':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-900/60">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search personal memories, knowledge, conversations, and documents..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase font-mono bg-slate-800 border border-slate-700 rounded text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto p-3 divide-y divide-slate-850">
          {query.trim().length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Type keywords to search across your local intelligence vault.
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No matching records found for "{query}".
            </div>
          ) : (
            <div className="space-y-1.5">
              {results.map((item) => (
                <div
                  key={`${item.type}_${item.id}`}
                  onClick={() => {
                    onSelectResult(item.type, item.id);
                    onClose();
                  }}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 cursor-pointer transition group"
                >
                  <div className="flex items-start gap-3 min-w-0 pr-3">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {item.snippet}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 shrink-0 transition" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
