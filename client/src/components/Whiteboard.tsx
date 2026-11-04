'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ToolType,
  CanvasElement,
  ViewportState,
  ElementStyleProps,
  UserPresence,
  Point,
} from '../types/canvas';
import { Canvas } from './Canvas';
import { WhiteboardTopBar } from './WhiteboardTopBar';
import { PropertiesDock } from './PropertiesDock';
import { PresenceCursors } from './PresenceCursors';
import { ExportModal } from './ExportModal';
import { WhiteboardWSClient } from '../lib/websocket';
import { Menu } from 'lucide-react';

interface WhiteboardProps {
  boardId?: string;
  initialTitle?: string;
  boardColor?: string;
  onBack?: () => void;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({
  boardId = 'default-room',
  initialTitle = 'My Whiteboard',
  boardColor,
  onBack,
}) => {
  // 1. Core States
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [boardTitle, setBoardTitle] = useState(initialTitle);
  const [viewport, setViewport] = useState<ViewportState>({
    panX: 0,
    panY: 0,
    zoom: 1,
  });

  // 2. Element Style Properties
  const [styleProps, setStyleProps] = useState<ElementStyleProps>({
    strokeColor: '#1e293b',
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 2,
    roughness: 1.2,
    opacity: 1,
    fontFamily: "'Newsreader', Georgia, serif",
    fontSize: 24,
  });

  // 3. Realtime Collab States
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isPropertiesDockOpen, setIsPropertiesDockOpen] = useState(false);
  const wsClientRef = useRef<WhiteboardWSClient | null>(null);

  // 4. Undo / Redo History Stack
  const historyRef = useRef<CanvasElement[][]>([[]]);
  const historyIndexRef = useRef<number>(0);

  // 5. Modals & Refs
  const [isExportOpen, setIsExportOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

  // Push snapshot to history
  const pushHistory = useCallback((newElements: CanvasElement[]) => {
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(JSON.parse(JSON.stringify(newElements)));
    if (nextHistory.length > 50) nextHistory.shift();
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prev = historyRef.current[historyIndexRef.current];
      setElements(prev);
      wsClientRef.current?.sendElementsUpdate(prev);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const next = historyRef.current[historyIndexRef.current];
      setElements(next);
      wsClientRef.current?.sendElementsUpdate(next);
    }
  }, []);

  // Update element styles
  const handleStyleChange = (partial: Partial<ElementStyleProps>) => {
    setStyleProps((prev) => ({ ...prev, ...partial }));

    if (selectedIds.length > 0) {
      const updated = elements.map((el) => {
        if (selectedIds.includes(el.id)) {
          return { ...el, ...partial, version: el.version + 1 };
        }
        return el;
      });
      setElements(updated);
      pushHistory(updated);
      wsClientRef.current?.sendElementsUpdate(
        updated.filter((el) => selectedIds.includes(el.id))
      );
    }
  };

  // Canvas element change handler
  const handleElementsChange = (newElements: CanvasElement[], isCommitted = false) => {
    setElements(newElements);
    if (isCommitted) {
      pushHistory(newElements);
      wsClientRef.current?.sendElementsUpdate(newElements);

      // Debounced HTTP backup save
      fetch(`${apiUrl}/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: boardTitle,
          elements: newElements,
        }),
      }).catch((e) => console.error('Failed to sync board HTTP backup:', e));
    }
  };

  // Update board title
  const handleUpdateTitle = (newTitle: string) => {
    setBoardTitle(newTitle);
    fetch(`${apiUrl}/boards/${boardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    }).catch((e) => console.error('Failed to rename board:', e));
  };

  // Initialize Room & WebSocket Connection
  useEffect(() => {
    const userName = `Guest-${Math.floor(Math.random() * 900 + 100)}`;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5001/ws';

    // 1. Initial REST fetch
    fetch(`${apiUrl}/boards/${boardId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.title) setBoardTitle(data.title);
          if (data.elements && data.elements.length > 0) {
            setElements(data.elements);
            historyRef.current = [JSON.parse(JSON.stringify(data.elements))];
            historyIndexRef.current = 0;
          }
        }
      })
      .catch((err) => console.warn('Could not prefetch board HTTP details:', err));

    // 2. WebSocket Connection
    const client = new WhiteboardWSClient(wsUrl, boardId, userName, {
      onStatusChange: setConnectionStatus,
      onRoomState: (state) => {
        if (state.elements && state.elements.length > 0) {
          setElements(state.elements);
          historyRef.current = [JSON.parse(JSON.stringify(state.elements))];
          historyIndexRef.current = 0;
        }
        setActiveUsers(state.users);
      },
      onUserJoined: (user) => {
        setActiveUsers((prev) => [...prev.filter((u) => u.userId !== user.userId), user]);
      },
      onUserLeft: (userId) => {
        setActiveUsers((prev) => prev.filter((u) => u.userId !== userId));
      },
      onCursorUpdate: (userId, cursor) => {
        setActiveUsers((prev) =>
          prev.map((u) => (u.userId === userId ? { ...u, cursor } : u))
        );
      },
      onElementsUpdated: (updatedElements) => {
        setElements((prev) => {
          const map = new Map(prev.map((el) => [el.id, el]));
          for (const el of updatedElements) {
            map.set(el.id, el);
          }
          return Array.from(map.values());
        });
      },
      onElementsDeleted: (deletedIds) => {
        setElements((prev) => prev.filter((el) => !deletedIds.includes(el.id)));
      },
      onSelectionUpdated: (userId, ids) => {
        setActiveUsers((prev) =>
          prev.map((u) => (u.userId === userId ? { ...u, selectedElementIds: ids } : u))
        );
      },
    });

    wsClientRef.current = client;

    return () => {
      client.destroy();
    };
  }, [boardId, apiUrl]);

  // Broadcast cursor movements
  const handleCursorMove = useCallback((pt: Point | null) => {
    wsClientRef.current?.sendCursorMove(pt);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedIds(elements.filter((el) => !el.isDeleted).map((el) => el.id));
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const next = elements.map((el) =>
            selectedIds.includes(el.id) ? { ...el, isDeleted: true } : el
          );
          setElements(next);
          pushHistory(next);
          wsClientRef.current?.sendElementsDelete(selectedIds);
          setSelectedIds([]);
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
        case '1':
          setActiveTool('select');
          break;
        case 'h':
          setActiveTool('hand');
          break;
        case 'r':
        case '2':
          setActiveTool('rectangle');
          break;
        case 'd':
        case '3':
          setActiveTool('diamond');
          break;
        case 'o':
        case '4':
          setActiveTool('ellipse');
          break;
        case 'a':
        case '5':
          setActiveTool('arrow');
          break;
        case 'l':
        case '6':
          setActiveTool('line');
          break;
        case 'p':
        case '7':
          setActiveTool('draw');
          break;
        case 't':
        case '8':
          setActiveTool('text');
          break;
        case 'e':
        case '0':
          setActiveTool('eraser');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [elements, selectedIds, handleUndo, handleRedo, pushHistory]);

  const handleClearBoard = () => {
    if (elements.length === 0) return;
    if (confirm('Are you sure you want to clear the entire whiteboard?')) {
      const activeIds = elements.map((e) => e.id);
      setElements([]);
      setSelectedIds([]);
      pushHistory([]);
      wsClientRef.current?.sendElementsDelete(activeIds);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-slate-100 select-none">
      {/* 1. TOP WHITEBOARD BORDER FRAME (h-14) */}
      <div className="h-14 shrink-0 relative z-30 bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] border-b-2 border-[#cbd5e1] shadow-xs">
        <WhiteboardTopBar
          boardId={boardId}
          title={boardTitle}
          onUpdateTitle={handleUpdateTitle}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          canUndo={historyIndexRef.current > 0}
          canRedo={historyIndexRef.current < historyRef.current.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          zoom={viewport.zoom}
          onZoomIn={() =>
            setViewport((v) => ({ ...v, zoom: Math.min(4.0, v.zoom * 1.15) }))
          }
          onZoomOut={() =>
            setViewport((v) => ({ ...v, zoom: Math.max(0.15, v.zoom * 0.85) }))
          }
          onResetZoom={() => setViewport((v) => ({ ...v, zoom: 1 }))}
          activeUsers={activeUsers}
          onOpenExport={() => setIsExportOpen(true)}
          onClearBoard={handleClearBoard}
          onBack={onBack}
          boardColor={boardColor}
        />
      </div>

      {/* 2. MIDDLE SECTION: LEFT BORDER + CANVAS + RIGHT BORDER */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* LEFT WHITEBOARD BORDER FRAME (w-12) */}
        <div className="w-12 shrink-0 bg-gradient-to-r from-[#e2e8f0] via-[#f8fafc] to-[#cbd5e1] border-r-2 border-[#cbd5e1] flex flex-col items-center pt-3 gap-3 z-30 shadow-xs select-none">
          {/* Integrated Hamburger Button */}
          <button
            onClick={() => setIsPropertiesDockOpen(!isPropertiesDockOpen)}
            title={isPropertiesDockOpen ? 'Close Style Menu' : 'Open Style Menu (☰)'}
            className={`p-2 rounded-xl transition-all duration-150 flex items-center justify-center ${
              isPropertiesDockOpen
                ? 'bg-blue-600 text-white shadow-md scale-105'
                : 'bg-white/90 hover:bg-white text-zinc-700 hover:text-blue-600 border border-zinc-300 shadow-xs hover:scale-105 active:scale-95'
            }`}
          >
            <Menu size={18} />
          </button>

          {/* Whiteboard Corner / Mounting Rivet detail */}
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 border border-zinc-400 shadow-inner mt-2 opacity-60" />
          <div className="flex-1" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 border border-zinc-400 shadow-inner mb-3 opacity-60" />
        </div>

        {/* STYLE PROPERTIES DRAWER (slides open next to left frame) */}
        {isPropertiesDockOpen && (
          <PropertiesDock
            styles={styleProps}
            onChangeStyle={handleStyleChange}
            hasSelectedElements={selectedIds.length > 0}
            onClose={() => setIsPropertiesDockOpen(false)}
          />
        )}

        {/* CANVAS WORKSPACE (Pure Whiteboard surface framed inside) */}
        <div className="flex-1 relative h-full bg-white overflow-hidden">
          {/* Remote presence cursors */}
          <PresenceCursors
            users={activeUsers}
            viewport={viewport}
            currentUserId={currentUserId}
          />

          {/* Interactive dual-canvas viewport */}
          <Canvas
            tool={activeTool}
            styleProps={styleProps}
            elements={elements}
            selectedIds={selectedIds}
            viewport={viewport}
            onElementsChange={handleElementsChange}
            onSelectElements={setSelectedIds}
            onViewportChange={setViewport}
            onCursorMove={handleCursorMove}
            canvasRef={canvasRef}
          />
        </div>

        {/* RIGHT WHITEBOARD BORDER FRAME (w-3) */}
        <div className="w-3 shrink-0 bg-gradient-to-r from-[#cbd5e1] via-[#f1f5f9] to-[#94a3b8] border-l-2 border-[#cbd5e1] z-20 shadow-xs flex flex-col justify-between py-3 items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-400/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-400/60" />
        </div>
      </div>

      {/* 3. BOTTOM WHITEBOARD BORDER FRAME WITH DRY-ERASE MARKER & FELT ERASER TRAY (h-6) */}
      <div className="h-6 shrink-0 bg-gradient-to-b from-[#e2e8f0] via-[#cbd5e1] to-[#94a3b8] border-t-2 border-[#cbd5e1] shadow-inner relative flex items-center justify-center z-30 select-none">
        {/* Physical Marker & Eraser Tray */}
        <div className="flex items-center gap-3 px-5 py-0.5 bg-gradient-to-b from-[#f1f5f9] to-[#cbd5e1] rounded-t-lg border-t border-x border-[#94a3b8] shadow-sm">
          {/* Marker pens */}
          <div className="flex items-center gap-1.5" title="Dry-Erase Markers">
            <div className="w-9 h-2 rounded-full bg-zinc-900 border border-zinc-700 shadow-xs" title="Black Marker" />
            <div className="w-9 h-2 rounded-full bg-blue-600 border border-blue-800 shadow-xs" title="Blue Marker" />
            <div className="w-9 h-2 rounded-full bg-red-600 border border-red-800 shadow-xs" title="Red Marker" />
            <div className="w-9 h-2 rounded-full bg-emerald-600 border border-emerald-800 shadow-xs" title="Green Marker" />
          </div>
          <div className="h-2.5 w-px bg-zinc-400" />
          {/* Felt Eraser */}
          <div className="w-8 h-2.5 rounded bg-zinc-700 border border-zinc-900 flex items-center justify-center text-[7px] text-zinc-200 font-bold tracking-widest shadow-xs" title="Felt Dry-Erase Eraser">
            FELT
          </div>
        </div>
      </div>

      {/* Export modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        canvasRef={canvasRef}
        elements={elements}
        title={boardTitle}
      />
    </div>
  );
};
