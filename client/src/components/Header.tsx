'use client';

import React, { useState } from 'react';
import { Share2, Download, Trash2, Check, ArrowLeft, Copy, Users, X, KeyRound } from 'lucide-react';
import { UserPresence } from '../types/canvas';

interface HeaderProps {
  boardId?: string;
  title: string;
  onUpdateTitle: (title: string) => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  activeUsers: UserPresence[];
  onOpenExport: () => void;
  onClearBoard: () => void;
  onBack?: () => void;
  boardColor?: string;
}

export const Header: React.FC<HeaderProps> = ({
  boardId = 'default-room',
  title,
  onUpdateTitle,
  connectionStatus,
  activeUsers,
  onOpenExport,
  onClearBoard,
  onBack,
  boardColor,
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

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
      <header className="fixed top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Left: Back button + Sticky Badge + Board Title */}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-zinc-200">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#16322b] hover:bg-[#1f453c] text-emerald-200 shadow-sm transition-all mr-1 active:scale-95"
              title="Return to Green Chalkboard & Sticky Notes"
            >
              <ArrowLeft size={13} className="stroke-[2.5]" />
              <span>Green Board</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            {boardColor ? (
              <div
                className="w-5 h-5 rounded-md shadow-sm border border-black/10 flex items-center justify-center text-[10px]"
                style={{ backgroundColor: boardColor }}
              >
                📌
              </div>
            ) : (
              <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                E
              </div>
            )}

            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => onUpdateTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                autoFocus
                className="text-sm font-semibold bg-transparent border-b border-blue-500 outline-none text-zinc-900 max-w-[180px]"
              />
            ) : (
              <span
                onClick={() => setIsEditingTitle(true)}
                title="Click to rename"
                className="text-sm font-bold text-zinc-900 hover:text-blue-600 cursor-pointer max-w-[200px] truncate"
              >
                {title}
              </span>
            )}
          </div>

          {/* Realtime status badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 border border-zinc-200">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-zinc-600 capitalize text-[10px]">
              {connectionStatus}
            </span>
          </div>
        </div>

        {/* Right: Board Code Badge + Active Users + Share & Export */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-2xl shadow-xl border border-zinc-200">
          {/* Quick Code Badge */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-mono font-semibold transition-colors"
            title="Click to view & copy invite code"
          >
            <KeyRound size={13} className="text-blue-600" />
            <span>{boardId.slice(0, 8)}</span>
          </button>

          {/* Collaborators avatars */}
          {activeUsers.length > 0 && (
            <div className="flex items-center -space-x-1.5 mr-1 pl-1">
              {activeUsers.slice(0, 4).map((user) => (
                <div
                  key={user.userId}
                  title={user.userName}
                  className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: user.userColor }}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </div>
              ))}
              {activeUsers.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-zinc-200 border-2 border-white flex items-center justify-center text-[9px] font-semibold text-zinc-600">
                  +{activeUsers.length - 4}
                </div>
              )}
            </div>
          )}

          {/* Share Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-all"
          >
            <Share2 size={14} />
            <span>Collaborate</span>
          </button>

          {/* Export Button */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-all"
          >
            <Download size={14} />
            <span>Export</span>
          </button>

          {/* Clear Board */}
          <button
            onClick={onClearBoard}
            title="Clear Entire Canvas"
            className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {/* Share / Invite Teammates Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Users size={18} />
                </div>
                <h3 className="text-base font-bold text-zinc-900 font-sans">
                  Collaborate with Team
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
              Share this <b>Board Code</b> with your team members. When they open the site, they can click <b>"Join with Code"</b> to draw and work together live!
            </p>

            {/* Board Code Box */}
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

            {/* Direct Link Box */}
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                Direct Invite Link
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
                className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
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
