import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  Eye,
  Layers,
  Sparkles,
  BookOpen,
  CheckCircle,
  AlertCircle,
  FileCode,
  FileJson,
  FileCheck,
} from 'lucide-react';
import { UserDocument, DocumentChunk, PersonalMemory, KnowledgeEntry } from '../../types';
import { getAllDocuments, saveDocument, deleteDocument, saveMemory, saveKnowledge } from '../../storage/db';
import { parseUploadedFile, chunkDocumentText } from '../../intelligence/documentProcessor';

export const DocumentsView: React.FC = () => {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<UserDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [promotedChunkId, setPromotedChunkId] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const docs = await getAllDocuments();
    setDocuments(docs);
    if (docs.length > 0 && !selectedDoc) {
      setSelectedDoc(docs[0]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setStatusMessage(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const parsed = await parseUploadedFile(file);

        // Chunk text
        const chunks = chunkDocumentText(parsed.extractedText);

        const newDoc: UserDocument = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          fileName: parsed.fileName,
          fileType: parsed.fileType,
          fileSize: parsed.fileSize,
          extractedText: parsed.extractedText,
          chunks,
          createdAt: Date.now(),
          status: 'ready',
        };

        await saveDocument(newDoc);
      }

      await loadDocuments();
      setStatusMessage('Documents successfully imported, parsed, and indexed into local vault.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Error importing file:', err);
      setStatusMessage(`Error importing file: ${err.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this indexed document and its chunks?')) {
      await deleteDocument(id);
      const remaining = documents.filter((d) => d.id !== id);
      setDocuments(remaining);
      if (selectedDoc?.id === id) {
        setSelectedDoc(remaining.length > 0 ? remaining[0] : null);
      }
    }
  };

  const handlePromoteChunkToMemory = async (chunk: DocumentChunk, docName: string) => {
    const memory: PersonalMemory = {
      id: `mem_doc_${Date.now()}`,
      content: chunk.text.length > 300 ? chunk.text.substring(0, 300) + '...' : chunk.text,
      category: 'work',
      tags: ['document-excerpt', docName.replace(/[^\w]/g, '').toLowerCase().slice(0, 10)],
      importance: 4,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveMemory(memory);
    setPromotedChunkId(chunk.id);
    setTimeout(() => setPromotedChunkId(null), 2500);
  };

  const handlePromoteChunkToKnowledge = async (chunk: DocumentChunk, docName: string) => {
    const entry: KnowledgeEntry = {
      id: `know_doc_${Date.now()}`,
      title: `${docName} – Excerpt ${chunk.index + 1}`,
      content: chunk.text,
      category: 'Documentation',
      tags: ['doc-chunk', docName.toLowerCase()],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveKnowledge(entry);
    setPromotedChunkId(chunk.id);
    setTimeout(() => setPromotedChunkId(null), 2500);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('json')) return <FileJson className="w-5 h-5 text-amber-400" />;
    if (type.includes('js') || type.includes('ts') || type.includes('py')) return <FileCode className="w-5 h-5 text-emerald-400" />;
    return <FileText className="w-5 h-5 text-indigo-400" />;
  };

  return (
    <div className="flex h-[calc(100vh-4.5rem)] overflow-hidden bg-slate-950 text-slate-100">
      {/* Document Explorer List */}
      <div className="w-72 sm:w-80 border-r border-slate-800/80 bg-slate-900/40 flex flex-col shrink-0 overflow-hidden">
        {/* Upload Button Header */}
        <div className="p-4 border-b border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Document Vault</h3>
              <p className="text-[11px] text-slate-400">Local-first chunking & indexing</p>
            </div>
          </div>

          <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors duration-150 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Parsing & Indexing...' : 'Import Documents'}</span>
            <input
              type="file"
              multiple
              accept=".txt,.md,.markdown,.json,.csv,.html,.js,.ts,.tsx,.py"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Status message */}
        {statusMessage && (
          <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* List of files */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {documents.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 px-4 space-y-2">
              <Upload className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
              <p>No documents imported yet.</p>
              <p className="text-[10px] text-slate-600">
                Upload .md, .txt, .json, or code files to index them for personal AI reasoning.
              </p>
            </div>
          ) : (
            documents.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`group flex items-center justify-between p-3 rounded-xl text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-950/60 border border-indigo-500/30 text-white'
                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {getFileIcon(doc.fileType)}
                    <div className="min-w-0">
                      <div className="font-medium text-slate-200 truncate">{doc.fileName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>{doc.chunks?.length || 0} chunks</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Document Detail & Chunk Viewer */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
        {selectedDoc ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Document Header Card */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {selectedDoc.fileType}
                  </span>
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Indexed in Vault
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{selectedDoc.fileName}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Imported on {new Date(selectedDoc.createdAt).toLocaleString()} • Total words: ~
                  {selectedDoc.extractedText.split(/\s+/).length} • {selectedDoc.chunks.length} smart chunks
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                  Size: {(selectedDoc.fileSize / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>

            {/* Chunks Inspector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">
                    Indexed Text Chunks ({selectedDoc.chunks.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  Overlapping context windows (~350 words)
                </span>
              </div>

              <div className="space-y-3">
                {selectedDoc.chunks.map((chunk) => {
                  const isPromoted = promotedChunkId === chunk.id;
                  return (
                    <div
                      key={chunk.id}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded text-indigo-300">
                          Chunk #{chunk.index + 1}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePromoteChunkToMemory(chunk, selectedDoc.fileName)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-[11px] font-medium transition cursor-pointer"
                            title="Turn this chunk into an active Personal Memory"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{isPromoted ? 'Promoted!' : 'Make Memory'}</span>
                          </button>

                          <button
                            onClick={() => handlePromoteChunkToKnowledge(chunk, selectedDoc.fileName)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-[11px] font-medium transition cursor-pointer"
                            title="Turn this chunk into a Knowledge Library article"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Add to Knowledge</span>
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap bg-slate-950/80 p-3 rounded-xl border border-slate-850">
                        {chunk.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-500">
            <FileText className="w-12 h-12 text-slate-700 mb-2" />
            <p>Select a document from the sidebar to inspect chunks or upload new files.</p>
          </div>
        )}
      </div>
    </div>
  );
};
