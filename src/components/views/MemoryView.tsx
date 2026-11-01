import React, { useState, useEffect } from 'react';
import {
  Brain,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  Download,
  Check,
  Tag,
  Star,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { PersonalMemory, MemoryCategory } from '../../types';
import { getAllMemories, saveMemory, deleteMemory } from '../../storage/db';

export const MemoryView: React.FC = () => {
  const [memories, setMemories] = useState<PersonalMemory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<PersonalMemory | null>(null);

  // Form states
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<MemoryCategory>('personal');
  const [formTags, setFormTags] = useState('');
  const [formImportance, setFormImportance] = useState(3);
  const [formEnabled, setFormEnabled] = useState(true);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    const list = await getAllMemories();
    setMemories(list.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const handleOpenAddModal = () => {
    setEditingMemory(null);
    setFormContent('');
    setFormCategory('personal');
    setFormTags('');
    setFormImportance(3);
    setFormEnabled(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (m: PersonalMemory) => {
    setEditingMemory(m);
    setFormContent(m.content);
    setFormCategory(m.category);
    setFormTags((m.tags || []).join(', '));
    setFormImportance(m.importance);
    setFormEnabled(m.enabled);
    setIsModalOpen(true);
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) return;

    const tags = formTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const memoryToSave: PersonalMemory = {
      id: editingMemory ? editingMemory.id : `mem_${Date.now()}`,
      content: formContent.trim(),
      category: formCategory,
      tags,
      importance: formImportance,
      enabled: formEnabled,
      createdAt: editingMemory ? editingMemory.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    await saveMemory(memoryToSave);
    await loadMemories();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this memory permanently from your cognitive vault?')) {
      await deleteMemory(id);
      setMemories(memories.filter((m) => m.id !== id));
    }
  };

  const handleToggleEnabled = async (m: PersonalMemory) => {
    const updated = { ...m, enabled: !m.enabled, updatedAt: Date.now() };
    await saveMemory(updated);
    setMemories(memories.map((item) => (item.id === m.id ? updated : item)));
  };

  const handleExportMemories = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(memories, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `zen_ai_memories_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
  };

  const filteredMemories = memories.filter((m) => {
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      m.content.toLowerCase().includes(q) ||
      m.tags.some((t) => t.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  const categories: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Categories' },
    { id: 'preference', label: 'Preferences' },
    { id: 'work', label: 'Work & Projects' },
    { id: 'personal', label: 'Personal' },
    { id: 'goal', label: 'Goals' },
    { id: 'knowledge', label: 'Insights' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 text-slate-100 max-w-6xl mx-auto w-full space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Personal Memory Engine</h2>
              <p className="text-xs text-slate-400">
                Persistent facts, preferences, and context securely injected during assistant reasoning
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMemories}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs font-medium text-slate-300 hover:bg-slate-800 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Memory
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Total Memories</div>
          <div className="text-xl font-bold text-white mt-1">{memories.length}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Active in Retrieval</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {memories.filter((m) => m.enabled).length}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Preferences</div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {memories.filter((m) => m.category === 'preference').length}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">High Importance (4-5★)</div>
          <div className="text-xl font-bold text-indigo-400 mt-1">
            {memories.filter((m) => m.importance >= 4).length}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories or tags..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredMemories.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-500 space-y-3">
            <Brain className="w-8 h-8 mx-auto text-slate-600" />
            <p>No memories match your filter criteria.</p>
          </div>
        ) : (
          filteredMemories.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl p-4 border transition flex flex-col justify-between ${
                m.enabled
                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/60 border-slate-800/40 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg bg-indigo-950 border border-indigo-500/30 text-indigo-300 font-mono">
                      {m.category}
                    </span>
                    <div className="flex items-center text-amber-400 text-xs">
                      {Array.from({ length: m.importance }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400" />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleEnabled(m)}
                    className="text-xs flex items-center gap-1 cursor-pointer"
                    title={m.enabled ? 'Enabled in retrieval' : 'Muted (Won’t be used)'}
                  >
                    {m.enabled ? (
                      <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                        Active <ToggleRight className="w-5 h-5 text-emerald-400" />
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px] flex items-center gap-1">
                        Muted <ToggleLeft className="w-5 h-5 text-slate-600" />
                      </span>
                    )}
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                  {m.content}
                </p>

                {m.tags && m.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {m.tags.map((t, idx) => (
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
                <span>Updated: {new Date(m.updatedAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(m)}
                    className="p-1 text-slate-400 hover:text-white transition"
                    title="Edit Memory"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1 text-slate-400 hover:text-red-400 transition"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <form
            onSubmit={handleSaveMemory}
            className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingMemory ? 'Edit Memory' : 'Create Personal Memory'}
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
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Memory Content *
              </label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="e.g. Always format database models with snake_case fields..."
                rows={3}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="personal">Personal</option>
                  <option value="preference">Preference</option>
                  <option value="work">Work & Projects</option>
                  <option value="goal">Goal</option>
                  <option value="knowledge">Knowledge / Insight</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Importance (1-5★)
                </label>
                <select
                  value={formImportance}
                  onChange={(e) => setFormImportance(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>1 - Low Priority</option>
                  <option value={2}>2 - Contextual</option>
                  <option value={3}>3 - Normal</option>
                  <option value={4}>4 - High Importance</option>
                  <option value={5}>5 - Critical Guideline</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="coding, typescript, preferences"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="formEnabled"
                checked={formEnabled}
                onChange={(e) => setFormEnabled(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="formEnabled" className="text-xs text-slate-300 cursor-pointer">
                Enable this memory for automatic AI context retrieval
              </label>
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
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition cursor-pointer"
              >
                {editingMemory ? 'Update Memory' : 'Save Memory'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
