import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Edit2,
  ExternalLink,
  Tag,
  FileText,
  Calendar,
} from 'lucide-react';
import { KnowledgeEntry } from '../../types';
import { getAllKnowledge, saveKnowledge, deleteKnowledge } from '../../storage/db';

export const KnowledgeView: React.FC = () => {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('Architecture');
  const [formTags, setFormTags] = useState('');
  const [formSourceUrl, setFormSourceUrl] = useState('');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const list = await getAllKnowledge();
    setEntries(list);
  };

  const handleOpenAdd = () => {
    setEditingEntry(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('General');
    setFormTags('');
    setFormSourceUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: KnowledgeEntry) => {
    setEditingEntry(item);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormCategory(item.category);
    setFormTags((item.tags || []).join(', '));
    setFormSourceUrl(item.sourceUrl || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    const tags = formTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const entryToSave: KnowledgeEntry = {
      id: editingEntry ? editingEntry.id : `know_${Date.now()}`,
      title: formTitle.trim(),
      content: formContent.trim(),
      category: formCategory.trim() || 'General',
      tags,
      sourceUrl: formSourceUrl.trim() || undefined,
      createdAt: editingEntry ? editingEntry.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    await saveKnowledge(entryToSave);
    await loadEntries();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this knowledge article?')) {
      await deleteKnowledge(id);
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  const filteredEntries = entries.filter((e) => {
    const matchesCat = selectedCategory === 'all' || e.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQ =
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      (e.tags || []).some((t) => t.toLowerCase().includes(q));
    return matchesCat && matchesQ;
  });

  const categories = ['all', ...Array.from(new Set(entries.map((e) => e.category)))];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 text-slate-100 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Knowledge Center</h2>
            <p className="text-xs text-slate-400">
              Personal knowledge base, architectural notes, research, and project references
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors duration-150 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Article
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles by title, content, or tag..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === c
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {c === 'all' ? 'All Topics' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Entries List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEntries.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-500 space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-slate-600" />
            <p>No knowledge articles found. Add your first note or document insight above.</p>
          </div>
        ) : (
          filteredEntries.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl p-5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-mono">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-slate-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>

                <p className="text-xs text-slate-300 whitespace-pre-wrap line-clamp-4 leading-relaxed font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                  {item.content}
                </p>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {item.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/60 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.updatedAt).toLocaleDateString()}
                </span>
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-cyan-400 hover:underline"
                  >
                    Source <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <form
            onSubmit={handleSave}
            className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingEntry ? 'Edit Knowledge Article' : 'New Knowledge Article'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Title *</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Next.js Routing Architecture"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g. Architecture, Security, Notes"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Source URL (Optional)</label>
                <input
                  type="url"
                  value={formSourceUrl}
                  onChange={(e) => setFormSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Content (Markdown supported) *</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="# Summary\n\nKey takeaways..."
                rows={6}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="architecture, react, privacy"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors duration-150 cursor-pointer"
              >
                {editingEntry ? 'Update Article' : 'Save Article'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
