'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  ExternalLink,
  Move,
  Search,
  Sparkles,
  Layers,
  Palette,
  Calendar,
  KeyRound,
} from 'lucide-react';
import { CanvasElement } from '../types/canvas';

export interface StickyBoard {
  id: string;
  title: string;
  updatedAt: string;
  elementCount: number;
  elementsPreview?: CanvasElement[];
  appState?: {
    color?: string;
    posX?: number;
    posY?: number;
    rotation?: number;
  };
}

const STICKY_PALETTE = [
  { name: 'Canary Yellow', bg: '#fef08a', text: '#713f12', border: '#fde047', pin: '#ef4444' },
  { name: 'Sky Blue', bg: '#bae6fd', text: '#0c4a6e', border: '#7dd3fc', pin: '#3b82f6' },
  { name: 'Mint Green', bg: '#bbf7d0', text: '#14532d', border: '#86efac', pin: '#10b981' },
  { name: 'Coral Pink', bg: '#fbcfe8', text: '#831843', border: '#f472b6', pin: '#ec4899' },
  { name: 'Soft Purple', bg: '#e9d5ff', text: '#581c87', border: '#c084fc', pin: '#8b5cf6' },
  { name: 'Peach', bg: '#fed7aa', text: '#7c2d12', border: '#fdba74', pin: '#f97316' },
];

interface GreenBoardProps {
  onOpenBoard: (boardId: string, title: string, color?: string) => void;
}

export const GreenBoard: React.FC<GreenBoardProps> = ({ onOpenBoard }) => {
  const [boards, setBoards] = useState<StickyBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState(STICKY_PALETTE[0].bg);
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // Dragging Sticky Note state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const boardAreaRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

  // Fetch all boards
  const loadBoards = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/boards`);
      let list: StickyBoard[] = [];
      if (res.ok) {
        const data = await res.json();
        list = data.boards || [];
      }

      // Check localStorage for boards joined or created
      let localSaved: string[] = [];
      try {
        localSaved = JSON.parse(localStorage.getItem('exclid_saved_boards') || '[]');
      } catch (e) {}

      // For any saved IDs missing from server list, fetch from server
      for (const id of localSaved) {
        if (!list.some((b) => b.id === id)) {
          try {
            const bRes = await fetch(`${apiUrl}/boards/${id}`);
            if (bRes.ok) {
              const bData = await bRes.json();
              list.unshift({
                id: bData.id || id,
                title: bData.title || 'Shared Whiteboard',
                updatedAt: new Date().toISOString(),
                elementCount: Array.isArray(bData.elements) ? bData.elements.length : 0,
                elementsPreview: Array.isArray(bData.elements) ? bData.elements.slice(0, 10) : [],
                appState: bData.appState || {
                  color: '#fef08a',
                  posX: 120 + Math.floor(Math.random() * 250),
                  posY: 120 + Math.floor(Math.random() * 250),
                  rotation: 1.5,
                },
              });
            }
          } catch (e) {
            console.warn('Could not fetch saved board:', id);
          }
        }
      }

      if (list.length === 0) {
        await seedInitialStickyNotes();
      } else {
        setBoards(list);
      }
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setLoading(false);
    }
  };

  const seedInitialStickyNotes = async () => {
    const samples = [
      {
        title: 'Project Architecture',
        color: '#fef08a',
        posX: 120,
        posY: 130,
        rotation: -2.5,
      },
      {
        title: 'Sprint Goals & Tasks',
        color: '#bae6fd',
        posX: 460,
        posY: 110,
        rotation: 3,
      },
      {
        title: 'Wireframes & UI Flow',
        color: '#bbf7d0',
        posX: 280,
        posY: 430,
        rotation: 1.5,
      },
    ];

    const created: StickyBoard[] = [];
    for (const sample of samples) {
      try {
        const res = await fetch(`${apiUrl}/boards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sample),
        });
        if (res.ok) {
          const item = await res.json();
          created.push({
            id: item.id,
            title: item.title,
            updatedAt: new Date().toISOString(),
            elementCount: 0,
            appState: item.appState,
          });
        }
      } catch (e) {
        console.error('Failed to seed note:', e);
      }
    }
    setBoards(created);
  };

  useEffect(() => {
    loadBoards();
  }, []);

  // Create new sticky note
  const handleCreateNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newTitle.trim() || 'New Note';

    // Randomize initial placement
    const randomOffset = Math.floor(Math.random() * 80);
    const posX = 150 + randomOffset;
    const posY = 150 + randomOffset;
    const rotation = Number((Math.random() * 6 - 3).toFixed(1));

    try {
      const res = await fetch(`${apiUrl}/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          color: newColor,
          posX,
          posY,
          rotation,
        }),
      });

      if (res.ok) {
        const item = await res.json();
        setBoards((prev) => [
          {
            id: item.id,
            title: item.title,
            updatedAt: new Date().toISOString(),
            elementCount: 0,
            appState: item.appState,
          },
          ...prev,
        ]);
        setNewTitle('');
        setIsCreating(false);
      }
    } catch (err) {
      console.error('Error creating sticky note:', err);
    }
  };

  // Delete sticky note
  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this sticky note?')) return;

    try {
      await fetch(`${apiUrl}/boards/${id}`, { method: 'DELETE' });
      setBoards((prev) => prev.filter((b) => b.id !== id));
      try {
        const localSaved: string[] = JSON.parse(localStorage.getItem('exclid_saved_boards') || '[]');
        localStorage.setItem(
          'exclid_saved_boards',
          JSON.stringify(localSaved.filter((item) => item !== id))
        );
      } catch (err) {}
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Change color of existing sticky note
  const handleChangeColor = async (id: string, color: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBoards((prev) =>
      prev.map((b) => (b.id === id ? { ...b, appState: { ...b.appState, color } } : b))
    );

    try {
      await fetch(`${apiUrl}/boards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appState: { color } }),
      });
    } catch (err) {
      console.error('Failed to update color:', err);
    }
  };

  const handleJoinWithCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;

    try {
      // 1. Fetch board details (server will auto-register if new)
      const res = await fetch(`${apiUrl}/boards/${code}`);
      let boardTitle = 'Collaborative Board';
      let boardColor = '#fef08a';

      if (res.ok) {
        const data = await res.json();
        boardTitle = data.title || 'Collaborative Board';
        boardColor = data.appState?.color || '#fef08a';

        // Add to local sticky notes immediately
        setBoards((prev) => {
          if (prev.some((b) => b.id === code)) return prev;
          return [
            {
              id: code,
              title: boardTitle,
              updatedAt: new Date().toISOString(),
              elementCount: Array.isArray(data.elements) ? data.elements.length : 0,
              elementsPreview: Array.isArray(data.elements) ? data.elements.slice(0, 10) : [],
              appState: data.appState || {
                color: boardColor,
                posX: 160 + Math.floor(Math.random() * 200),
                posY: 160 + Math.floor(Math.random() * 200),
                rotation: 2,
              },
            },
            ...prev,
          ];
        });
      }

      // 2. Persist code in localStorage so it stays permanently on GreenBoard for 2nd user
      try {
        const localSaved: string[] = JSON.parse(localStorage.getItem('exclid_saved_boards') || '[]');
        if (!localSaved.includes(code)) {
          localSaved.unshift(code);
          localStorage.setItem('exclid_saved_boards', JSON.stringify(localSaved));
        }
      } catch (err) {}

      setIsJoining(false);
      setJoinCode('');
      onOpenBoard(code, boardTitle, boardColor);
    } catch (err) {
      console.error('Failed to join board:', err);
      setIsJoining(false);
      onOpenBoard(code, 'Collaborative Board');
    }
  };

  // Dragging handlers for sticky notes on the green board
  const handlePointerDown = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag with left mouse
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    const board = boards.find((b) => b.id === id);
    if (!board) return;

    setDraggingId(id);
    const posX = board.appState?.posX ?? 100;
    const posY = board.appState?.posY ?? 100;

    dragOffsetRef.current = {
      x: e.clientX - posX,
      y: e.clientY - posY,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId) return;

    const newX = Math.max(20, e.clientX - dragOffsetRef.current.x);
    const newY = Math.max(80, e.clientY - dragOffsetRef.current.y);

    setBoards((prev) =>
      prev.map((b) =>
        b.id === draggingId
          ? { ...b, appState: { ...b.appState, posX: newX, posY: newY } }
          : b
      )
    );
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const id = draggingId;
    setDraggingId(null);

    const board = boards.find((b) => b.id === id);
    if (board && board.appState) {
      try {
        await fetch(`${apiUrl}/boards/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appState: board.appState }),
        });
      } catch (err) {
        console.error('Failed to persist position:', err);
      }
    }
  };

  const filteredBoards = boards.filter((b) =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      ref={boardAreaRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative w-screen h-screen overflow-hidden select-none bg-[#1d3d33]"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05) 0%, transparent 60%),
          repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.03) 0px, rgba(0, 0, 0, 0.03) 2px, transparent 2px, transparent 4px)
        `,
      }}
    >
      {/* Wooden Frame Top Trim */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#854d0e] to-[#713f12] shadow-md z-30 border-b border-[#a16207]/30" />

      {/* Wooden Chalkboard Bottom Tray */}
      <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-[#713f12] to-[#854d0e] shadow-lg z-30 border-t border-[#a16207]/40 flex items-center px-12 gap-3">
        {/* Decorative Chalk pieces */}
        <div className="w-10 h-2 bg-white/90 rounded-sm shadow-sm transform -rotate-1" />
        <div className="w-8 h-2 bg-yellow-100/90 rounded-sm shadow-sm transform rotate-2" />
        <div className="w-6 h-2 bg-sky-100/90 rounded-sm shadow-sm" />
        <div className="ml-auto w-16 h-3 bg-zinc-800 rounded-sm border border-zinc-700 shadow-inner flex items-center justify-center">
          <span className="text-[7px] text-zinc-400 font-mono tracking-widest">ERASER</span>
        </div>
      </div>

      {/* Top Header Bar */}
      <header className="relative z-40 flex items-center justify-between px-8 py-5 pointer-events-none">
        {/* Left: Chalk Title */}
        <div className="pointer-events-auto flex items-center gap-3 bg-[#16322b]/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg text-white">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-base shadow-sm">
            📌
          </div>
          <div>
            <h1 className="text-xl font-bold font-handwriting tracking-wide text-emerald-100 drop-shadow-sm">
              Chalkboard & Sticky Notes
            </h1>
            <p className="text-[11px] text-emerald-300/70 font-sans">
              Each sticky note holds an infinite Excalidraw whiteboard
            </p>
          </div>
        </div>

        {/* Right: Actions & Add Note Button */}
        <div className="pointer-events-auto flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#16322b]/80 border border-white/10 text-white placeholder-white/40 text-xs rounded-xl pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/50 w-44 backdrop-blur-md transition-all"
            />
          </div>

          {/* Join Board with Code Button */}
          <button
            onClick={() => setIsJoining(true)}
            className="flex items-center gap-1.5 bg-[#16322b] hover:bg-[#21493f] text-emerald-300 font-bold text-xs px-3.5 py-2 rounded-xl shadow-md border border-emerald-500/30 active:scale-95 transition-all"
            title="Join an existing board using a share code"
          >
            <KeyRound size={14} />
            <span>Join with Code</span>
          </button>

          {/* Add Sticky Note Button */}
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-amber-950 font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-black/20 transform active:scale-95 transition-all"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>Pin New Note</span>
          </button>
        </div>
      </header>

      {/* Modal for Joining Board via Code */}
      {isJoining && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <KeyRound size={18} className="text-blue-600" />
              <span>Join a Board</span>
            </h3>

            <p className="text-xs text-zinc-600">
              Enter the Board Code shared by your team member to collaborate and draw with them live!
            </p>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">
                Enter Code
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. 123e4rt or board code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinWithCode()}
                className="w-full font-mono font-bold text-sm px-3.5 py-2 rounded-xl border border-zinc-300 bg-zinc-50 outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsJoining(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleJoinWithCode()}
                disabled={!joinCode.trim()}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl shadow-md transition-all"
              >
                Join Live Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Creating New Sticky Note */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>📌</span> Pin a New Sticky Note
            </h3>

            <div>
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                Note Title / Topic
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. System Design, Brainstorming..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNote()}
                className="w-full text-sm font-handwriting text-lg px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-2">
                Choose Color
              </label>
              <div className="flex gap-2">
                {STICKY_PALETTE.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setNewColor(p.bg)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      newColor === p.bg ? 'scale-110 ring-2 ring-black dark:ring-white' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: p.bg, borderColor: p.border }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCreateNote()}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md"
              >
                Pin to Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chalkboard Canvas Area with Pinned Sticky Notes */}
      <div className="relative w-full h-[calc(100vh-80px)]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-white/60 font-handwriting text-xl">
            Dusting chalkboard and pinning notes...
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/60 font-handwriting text-2xl gap-2">
            <span>The board is clean!</span>
            <button
              onClick={() => setIsCreating(true)}
              className="text-yellow-300 underline text-lg font-sans font-medium hover:text-yellow-200"
            >
              + Pin your first sticky note
            </button>
          </div>
        ) : (
          filteredBoards.map((board) => {
            const posX = board.appState?.posX ?? 100;
            const posY = board.appState?.posY ?? 120;
            const rotation = board.appState?.rotation ?? 0;
            const bgColor = board.appState?.color || '#fef08a';
            const paletteMatch =
              STICKY_PALETTE.find((p) => p.bg === bgColor) || STICKY_PALETTE[0];

            return (
              <div
                key={board.id}
                onPointerDown={(e) => handlePointerDown(board.id, e)}
                style={{
                  transform: `translate3d(${posX}px, ${posY}px, 0) rotate(${rotation}deg)`,
                  backgroundColor: bgColor,
                  color: paletteMatch.text,
                }}
                className={`absolute w-64 h-64 p-5 rounded-sm cursor-grab active:cursor-grabbing transition-shadow duration-150 group select-none ${
                  draggingId === board.id ? 'z-50 shadow-2xl scale-105' : 'z-20 hover:z-30 hover:shadow-xl'
                }`}
              >
                {/* 3D Pushpin (Metallic / Acrylic Pin with Shadow) */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 pointer-events-none z-10 flex flex-col items-center">
                  <div
                    className="w-4 h-4 rounded-full shadow-md border border-white/60"
                    style={{
                      backgroundColor: paletteMatch.pin,
                      backgroundImage: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.8), transparent 60%)',
                    }}
                  />
                  <div className="w-1.5 h-1.5 bg-black/30 rounded-full blur-[1px] mt-0.5" />
                </div>

                {/* Sticky Note Content Container */}
                <div className="flex flex-col h-full justify-between">
                  {/* Note Header & Title */}
                  <div>
                    <h2
                      onClick={() => onOpenBoard(board.id, board.title, bgColor)}
                      className="text-2xl font-bold font-handwriting leading-tight hover:underline cursor-pointer tracking-wide"
                      title="Click to open full drawing canvas"
                    >
                      {board.title}
                    </h2>
                    <div className="text-[11px] font-sans opacity-70 mt-1 flex items-center gap-1.5">
                      <Layers size={11} />
                      <span>{board.elementCount} drawing elements</span>
                    </div>
                  </div>

                  {/* Thumbnail / Mini Preview Area */}
                  <div
                    onClick={() => onOpenBoard(board.id, board.title, bgColor)}
                    className="my-auto h-20 rounded border border-black/10 bg-black/5 flex items-center justify-center cursor-pointer hover:bg-black/10 transition-colors p-2 text-center"
                  >
                    {board.elementCount > 0 ? (
                      <span className="text-xs font-handwriting text-black/70">
                        🎨 Active Whiteboard Canvas
                        <br />
                        <span className="text-[10px] font-sans opacity-60">Click to open & edit</span>
                      </span>
                    ) : (
                      <span className="text-xs font-handwriting opacity-50">
                        Blank whiteboard. Click to sketch!
                      </span>
                    )}
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-black/10 text-xs font-sans">
                    {/* Color Swatch Options on Hover */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {STICKY_PALETTE.slice(0, 4).map((p) => (
                        <button
                          key={p.name}
                          onClick={(e) => handleChangeColor(board.id, p.bg, e)}
                          className="w-3.5 h-3.5 rounded-full border border-black/20 hover:scale-125 transition-transform"
                          style={{ backgroundColor: p.bg }}
                          title={p.name}
                        />
                      ))}
                    </div>

                    {/* Open Button & Delete Button */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleDeleteNote(board.id, e)}
                        className="p-1 rounded hover:bg-black/10 text-black/40 hover:text-rose-600 transition-colors"
                        title="Delete Sticky Note"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        onClick={() => onOpenBoard(board.id, board.title, bgColor)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/10 hover:bg-black/20 font-semibold text-[11px] transition-colors"
                      >
                        <span>Open</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Realistic Dog-ear Fold at Bottom Right */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.15) 50%)',
                  }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
