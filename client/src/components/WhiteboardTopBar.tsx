'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  MousePointer,
  Hand,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Minus,
  Pencil,
  Type,
  Eraser,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Share2,
  Download,
  Trash2,
  KeyRound,
  Check,
  Copy,
  Users,
  X,
} from 'lucide-react';
import { ToolType, UserPresence } from '../types/canvas';

interface WhiteboardTopBarProps {
  boardId: string;
  title: string;
  onUpdateTitle: (title: string) => void;
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  activeUsers: UserPresence[];
  onOpenExport: () => void;
  onClearBoard: () => void;
  onBack?: () => void;
  boardColor?: string;
}

const TOOLS: { type: ToolType; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { type: 'select', label: 'Select (V)', icon: MousePointer },
  { type: 'hand', label: 'Hand / Pan (H)', icon: Hand },
  { type: 'rectangle', label: 'Rectangle (R)', icon: Square },
  { type: 'diamond', label: 'Diamond (D)', icon: Diamond },
  { type: 'ellipse', label: 'Ellipse (O)', icon: Circle },
  { type: 'arrow', label: 'Arrow (A)', icon: ArrowRight },
  { type: 'line', label: 'Line (L)', icon: Minus },
  { type: 'draw', label: 'Pencil (P)', icon: Pencil },
  { type: 'text', label: 'Text (T)', icon: Type },
  { type: 'eraser', label: 'Eraser (E)', icon: Eraser },
];

export const WhiteboardTopBar: React.FC<WhiteboardTopBarProps> = ({
  boardId,
  title,
  onUpdateTitle,
  activeTool,
  onSelectTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  activeUsers,
  onOpenExport,
  onClearBoard,
  onBack,
  boardColor,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(boardId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}/?board=${boardId}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <>
      {/* Aluminum Top Whiteboard Frame Bar */}
      <div className="w-full h-full bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] flex items-center justify-between px-3 select-none">
        {/* Left: Clean Back Button + Board Title Only */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200/80 transition-all border border-zinc-300 shadow-xs active:scale-95 bg-white/70"
            title="Back to Green Board"
          >
            <ArrowLeft size={14} className="stroke-[2.5]" />
            <span>Back</span>
          </button>

          <div className="h-5 w-px bg-zinc-300" />

          {/* Sticky Color Pill */}
          {boardColor && (
            <div
              className="w-3.5 h-3.5 rounded shadow-xs border border-black/10"
              style={{ backgroundColor: boardColor }}
            />
          )}

          {/* Board Name Only (No connected icon, no green pill) */}
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => onUpdateTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              autoFocus
              className="text-sm font-bold bg-white px-2 py-0.5 rounded border border-blue-500 outline-none text-zinc-900 max-w-[200px]"
            />
          ) : (
            <span
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename board"
              className="text-sm font-bold text-zinc-800 hover:text-blue-600 cursor-pointer max-w-[220px] truncate tracking-tight font-sans"
            >
              {title}
            </span>
          )}
        </div>

        {/* Center: Drawing Tools directly integrated into the Top Frame */}
        <div className="flex items-center gap-1 bg-white/90 px-2 py-1 rounded-xl border border-zinc-300 shadow-xs">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.type;
            return (
              <button
                key={tool.type}
                onClick={() => onSelectTool(tool.type)}
                title={tool.label}
                className={`p-1.5 rounded-lg transition-all duration-150 flex items-center justify-center ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs scale-105'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <Icon size={16} />
              </button>
            );
          })}

          <div className="h-4 w-px bg-zinc-200 mx-1" />

          {/* Undo / Redo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-lg text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Redo2 size={15} />
          </button>

          <div className="h-4 w-px bg-zinc-200 mx-1" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 text-xs text-zinc-600">
            <button
              onClick={onZoomOut}
              title="Zoom Out"
              className="p-1 rounded hover:bg-zinc-100 transition-colors"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={onResetZoom}
              title="Reset Zoom to 100%"
              className="px-1.5 py-0.5 rounded hover:bg-zinc-100 transition-colors font-mono text-[11px] min-w-[38px] text-center"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={onZoomIn}
              title="Zoom In"
              className="p-1 rounded hover:bg-zinc-100 transition-colors"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </div>

        {/* Right: Code, Share/Collaborate, Export, Clear */}
        <div className="flex items-center gap-2">
          {/* Board Code Badge */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-zinc-700 text-xs font-mono font-bold border border-zinc-300 shadow-xs transition-colors"
            title="Click to view & share Board Code"
          >
            <KeyRound size={13} className="text-blue-600" />
            <span>{boardId.slice(0, 8)}</span>
          </button>

          {/* Active Collaborator Avatars */}
          {activeUsers.length > 0 && (
            <div className="flex items-center -space-x-1.5 mr-0.5">
              {activeUsers.slice(0, 3).map((user) => (
                <div
                  key={user.userId}
                  title={user.userName}
                  className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-[9px] font-bold text-white shadow-xs"
                  style={{ backgroundColor: user.userColor }}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </div>
              ))}
              {activeUsers.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-zinc-200 border border-white flex items-center justify-center text-[8px] font-bold text-zinc-600">
                  +{activeUsers.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Collaborate Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-all active:scale-95"
          >
            <Share2 size={13} />
            <span>Share</span>
          </button>

          {/* Export Button */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/80 hover:bg-white text-zinc-700 border border-zinc-300 shadow-xs transition-colors"
          >
            <Download size={13} />
            <span>Export</span>
          </button>

          {/* Clear Board */}
          <button
            onClick={onClearBoard}
            title="Clear Entire Whiteboard"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Share / Invite Collaborators Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Users size={18} />
                </div>
                <h3 className="text-base font-bold text-zinc-900 font-sans">
                  Collaborate on Whiteboard
                </h3>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-zinc-600">
              Share this <b>Board Code</b> with your teammate. When they enter the code once, this sticky note will <b>automatically be added to their Green Board</b> so they can collaborate with you anytime!
            </p>

            {/* Board Code */}
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                Board Code
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={boardId}
                  className="w-full font-mono font-bold text-base bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-zinc-900 outline-none select-all"
                />
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md whitespace-nowrap"
                >
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Direct Link */}
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                Invite Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/?board=${boardId}` : ''}
                  className="w-full text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-zinc-600 outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border border-zinc-200"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
