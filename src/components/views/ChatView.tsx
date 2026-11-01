import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  Brain,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Pin,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Conversation, ChatMessage, AppSettings, PersonalMemory } from '../../types';
import {
  getAllConversations,
  saveConversation,
  deleteConversation,
  getMessagesByConversation,
  saveMessage,
  updateMessageContent,
  saveMemory,
} from '../../storage/db';
import { retrieveRelevantMemories, formatMemoriesForContext } from '../../intelligence/memoryEngine';
import { sendChatMessage, AVAILABLE_MODELS, extractMemoriesFromText } from '../../services/aiProvider';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface ChatViewProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenOnboarding: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  settings,
  onOpenSettings,
  onOpenOnboarding,
}) => {
  const isOnline = useOnlineStatus();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(settings.defaultModel || 'gemini-3.8-flash');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMemoryContext, setSelectedMemoryContext] = useState<any[] | null>(null);
  const [suggestedMemory, setSuggestedMemory] = useState<any | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const list = await getAllConversations();
    setConversations(list);
    if (list.length > 0 && !activeConvId) {
      setActiveConvId(list[0].id);
    }
  };

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConvId) {
      getMessagesByConversation(activeConvId).then((msgs) => {
        setMessages(msgs);
        scrollToBottom();
      });
      const conv = conversations.find((c) => c.id === activeConvId);
      if (conv?.model) {
        setSelectedModel(conv.model);
      }
    }
  }, [activeConvId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleCreateNewConversation = async () => {
    const newId = `conv_${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
      model: selectedModel,
    };
    await saveConversation(newConv);
    setConversations([newConv, ...conversations]);
    setActiveConvId(newId);
    setMessages([]);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation and all its messages?')) {
      await deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConvId === id) {
        setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  const handleTogglePin = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...conv, pinned: !conv.pinned, updatedAt: Date.now() };
    await saveConversation(updated);
    await loadConversations();
  };

  const handleRenameConversation = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTitle = window.prompt('Rename conversation:', conv.title);
    if (newTitle && newTitle.trim()) {
      const updated = { ...conv, title: newTitle.trim(), updatedAt: Date.now() };
      await saveConversation(updated);
      setConversations(conversations.map((c) => (c.id === conv.id ? updated : c)));
    }
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    let convId = activeConvId;
    if (!convId) {
      convId = `conv_${Date.now()}`;
      const newConv: Conversation = {
        id: convId,
        title: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pinned: false,
        model: selectedModel,
      };
      await saveConversation(newConv);
      setConversations([newConv, ...conversations]);
      setActiveConvId(convId);
    }

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId: convId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'sent',
    };

    setInputText('');
    setMessages((prev) => [...prev, userMsg]);
    await saveMessage(userMsg);
    setIsLoading(true);
    scrollToBottom();

    try {
      // Step 1: Modular Memory Retrieval Pipeline
      const scoredMemories = await retrieveRelevantMemories(text, settings);
      const memoryContext = formatMemoriesForContext(scoredMemories);

      // Step 2: AI Provider Request
      const response = await sendChatMessage({
        messages,
        userInput: text,
        model: selectedModel,
        contextMemories: scoredMemories,
      });

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_resp`,
        conversationId: convId,
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        usedMemories: memoryContext,
        model: response.model,
        status: 'sent',
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await saveMessage(assistantMsg);

      // Update conversation title if default
      const currentConv = conversations.find((c) => c.id === convId);
      if (currentConv && currentConv.title === 'New Conversation') {
        const titleUpdate = {
          ...currentConv,
          title: text.length > 35 ? text.substring(0, 35) + '...' : text,
          updatedAt: Date.now(),
        };
        await saveConversation(titleUpdate);
        setConversations((prev) => prev.map((c) => (c.id === convId ? titleUpdate : c)));
      }

      // Optional auto memory extraction
      if (settings.autoMemoryExtraction && isOnline) {
        extractMemoriesFromText(`User: ${text}\nAssistant: ${response.text}`).then((extracted) => {
          if (extracted && extracted.length > 0) {
            setSuggestedMemory(extracted[0]);
          }
        });
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        conversationId: convId,
        role: 'assistant',
        content: `Error: ${err.message || 'Unable to connect to AI engine.'}`,
        timestamp: Date.now(),
        status: 'error',
      };
      setMessages((prev) => [...prev, errorMsg]);
      await saveMessage(errorMsg);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveSuggestedMemory = async () => {
    if (!suggestedMemory) return;
    const newMem: PersonalMemory = {
      id: `mem_${Date.now()}`,
      content: suggestedMemory.content,
      category: suggestedMemory.category || 'personal',
      tags: suggestedMemory.tags || ['extracted'],
      importance: suggestedMemory.importance || 4,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveMemory(newMem);
    setSuggestedMemory(null);
  };

  return (
    <div className="flex h-[calc(100vh-4.5rem)] overflow-hidden bg-slate-950 text-slate-100">
      {/* Conversations Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64 sm:w-72' : 'w-0'
        } transition-[width] duration-150 ease-out border-r border-slate-800/80 bg-slate-900/40 flex flex-col shrink-0 overflow-hidden relative z-10`}
      >
        <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
          <button
            onClick={handleCreateNewConversation}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors duration-150"
          >
            <Plus className="w-4 h-4" /> New Conversation
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No conversations yet. Start one above!
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition ${
                    isActive
                      ? 'bg-indigo-950/60 text-white border border-indigo-500/30'
                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="truncate">{conv.title}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      onClick={(e) => handleTogglePin(conv, e)}
                      title={conv.pinned ? 'Unpin' : 'Pin'}
                      className={`p-1 rounded hover:bg-slate-800 ${conv.pinned ? 'text-amber-400' : 'text-slate-400'}`}
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleRenameConversation(conv, e)}
                      title="Rename"
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      title="Delete"
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {/* Chat Header Bar */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
              title="Toggle Conversations Sidebar"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                {conversations.find((c) => c.id === activeConvId)?.title || 'ZEN AI Intelligence'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
          </div>

          {/* Model Selector & Memory status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Brain className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-slate-400">Memory:</span>
              <span className="font-medium text-emerald-400">
                {settings.memoryRetrievalEnabled ? 'Active' : 'Muted'}
              </span>
            </div>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 rounded-xl px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.isPaid ? '★' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Suggested Memory Banner if detected */}
        {suggestedMemory && (
          <div className="px-4 py-2 bg-indigo-950/40 border-b border-indigo-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-300">
                Detected new memory candidate: <strong className="text-white">"{suggestedMemory.content}"</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveSuggestedMemory}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors duration-150 cursor-pointer"
              >
                Save to Memory
              </button>
              <button
                onClick={() => setSuggestedMemory(null)}
                className="px-2 py-1 text-slate-400 hover:text-slate-200 transition-colors duration-150"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Brain className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ZEN AI Intelligence</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Ask questions, summarize documents, manage personal memories, or explore ideas. Your conversation context is maintained locally with zero tracking.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
                {[
                  'What memories do you have saved about me?',
                  'How does ZEN AI keep my data secure?',
                  'Draft a project roadmap for our PWA launch',
                  'Summarize our privacy and architecture principles',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(prompt);
                      textareaRef.current?.focus();
                    }}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs text-slate-300 hover:border-indigo-500/50 hover:bg-slate-850 transition-colors duration-150 cursor-pointer"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'} space-y-1.5`}
                >
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1">
                    <span className="font-medium text-slate-400">
                      {isAssistant ? 'ZEN AI' : 'You'}
                    </span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.model && isAssistant && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono text-[9px]">
                        {msg.model}
                      </span>
                    )}
                  </div>

                  <div
                    className={`relative max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isAssistant
                        ? 'bg-slate-900/90 border border-slate-800 text-slate-200'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {/* Message content */}
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Used Memories Indicator */}
                    {isAssistant && msg.usedMemories && msg.usedMemories.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <button
                          onClick={() => setSelectedMemoryContext(msg.usedMemories || [])}
                          className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors duration-150 font-medium cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{msg.usedMemories.length} relevant memories utilized</span>
                        </button>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity duration-150">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 rounded bg-slate-800/80 text-slate-400 hover:text-white"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex items-start gap-2">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>ZEN AI is formulating response & synthesizing memory context...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Memory Inspection Modal */}
        {selectedMemoryContext && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white">Active Memory Context</h4>
                </div>
                <button
                  onClick={() => setSelectedMemoryContext(null)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Close
                </button>
              </div>
              <p className="text-xs text-slate-400">
                These memories were retrieved using modular relevance scoring for this turn:
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedMemoryContext.map((m, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/60 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="uppercase font-semibold text-indigo-400">{m.category}</span>
                      {m.score !== undefined && <span>Relevance: {(m.score * 100).toFixed(0)}%</span>}
                    </div>
                    <div className="text-slate-200">{m.snippet}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-900/60">
          <div className="max-w-4xl mx-auto flex items-end gap-2 rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-indigo-500/80 p-2 transition">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={isOnline ? 'Message ZEN AI... (Shift+Enter for newline)' : 'Operating offline (Local memories searchable)...'}
              rows={1}
              className="flex-1 bg-transparent text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-none px-2 py-1 max-h-32"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className={`p-2.5 rounded-xl transition-colors duration-150 shrink-0 ${
                inputText.trim() && !isLoading
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between max-w-4xl mx-auto mt-2 text-[10px] text-slate-500 px-1">
            <span>ZEN AI – A DeveloperHut Product in partnership with DeveloperHunt.in</span>
            <button onClick={onOpenOnboarding} className="hover:text-indigo-400 transition-colors duration-150 flex items-center gap-1 cursor-pointer">
              <HelpCircle className="w-3 h-3" /> System Tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
