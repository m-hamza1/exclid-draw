'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, Check, Cloud, Sparkles } from 'lucide-react';
import '@excalidraw/excalidraw/index.css';

// Dynamic import with SSR disabled for Excalidraw
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-white text-zinc-600 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-base font-semibold text-zinc-700">Loading Pure Excalidraw Engine...</p>
        </div>
      </div>
    ),
  }
);

interface OfficialExcalidrawProps {
  boardId: string;
  initialTitle?: string;
  boardColor?: string;
  onBack: () => void;
}

export const OfficialExcalidraw: React.FC<OfficialExcalidrawProps> = ({
  boardId,
  initialTitle = 'Untitled Whiteboard',
  boardColor = '#fef08a',
  onBack,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [initialData, setInitialData] = useState<{ elements: any[]; appState: any } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const excalidrawApiRef = useRef<any>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

  // Load initial board elements from MySQL / server
  useEffect(() => {
    let isMounted = true;
    fetch(`${apiUrl}/boards/${boardId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          if (data.title) setTitle(data.title);
          setInitialData({
            elements: Array.isArray(data.elements) ? data.elements : [],
            appState: {
              viewBackgroundColor: '#ffffff',
              currentItemFontFamily: 1, // Virgil handwriting font
              ...(data.appState || {}),
            },
          });
        } else {
          setInitialData({
            elements: [],
            appState: {
              viewBackgroundColor: '#ffffff',
              currentItemFontFamily: 1,
            },
          });
        }
        setIsLoaded(true);
      })
      .catch((err) => {
        console.warn('Error fetching board, starting clean canvas:', err);
        if (isMounted) {
          setInitialData({
            elements: [],
            appState: { viewBackgroundColor: '#ffffff', currentItemFontFamily: 1 },
          });
          setIsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [boardId, apiUrl]);

  // Handle Excalidraw change and debounced auto-save to MySQL
  const handleChange = useCallback(
    (elements: readonly any[], appState: any) => {
      // Ignore initial render or empty state changes
      if (!isLoaded) return;

      setSaveStatus('saving');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`${apiUrl}/boards/${boardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              elements: Array.from(elements),
              appState: {
                viewBackgroundColor: appState.viewBackgroundColor,
                zoom: appState.zoom,
                scrollX: appState.scrollX,
                scrollY: appState.scrollY,
              },
            }),
          });
          setSaveStatus('saved');
        } catch (err) {
          console.error('Failed to auto-save to server:', err);
          setSaveStatus('saved');
        }
      }, 1500); // Debounce saves by 1.5s
    },
    [boardId, title, apiUrl, isLoaded]
  );

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    fetch(`${apiUrl}/boards/${boardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).catch(console.error);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white">
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-4 z-50 flex items-center gap-2 pointer-events-auto">
        {/* Back to Green Chalkboard */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#16322b] hover:bg-[#1f453c] text-emerald-200 shadow-lg border border-white/10 transition-all hover:scale-105 active:scale-95"
          title="Return to Green Chalkboard & Sticky Notes"
        >
          <ArrowLeft size={14} className="stroke-[2.5]" />
          <span>Green Board</span>
        </button>

        {/* Sticky Note Badge & Title */}
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-zinc-200">
          <div
            className="w-4 h-4 rounded shadow-sm border border-black/10 flex items-center justify-center text-[9px]"
            style={{ backgroundColor: boardColor }}
          >
            📌
          </div>

          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
              className="text-xs font-bold text-zinc-900 border-b border-indigo-500 outline-none max-w-[160px]"
            />
          ) : (
            <span
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename"
              className="text-xs font-bold text-zinc-800 hover:text-indigo-600 cursor-pointer max-w-[180px] truncate"
            >
              {title}
            </span>
          )}

          {/* Auto-save status indicator */}
          <div className="flex items-center gap-1 text-[10px] text-zinc-400 pl-1 border-l border-zinc-200">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-amber-500">
                <Cloud size={11} className="animate-pulse" />
                <span>Saving...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600">
                <Check size={11} />
                <span>Saved</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pure Official Excalidraw Component */}
      {isLoaded && initialData && (
        <div className="w-full h-full">
          <Excalidraw
            excalidrawAPI={(api) => {
              excalidrawApiRef.current = api;
            }}
            initialData={{
              elements: initialData.elements,
              appState: {
                ...initialData.appState,
                viewBackgroundColor: '#ffffff',
                theme: 'light',
              },
            }}
            onChange={handleChange}
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: true,
                clearCanvas: true,
                export: { saveFileToDisk: true },
                loadScene: true,
                saveToActiveFile: true,
                toggleTheme: true,
              },
            }}
          />
        </div>
      )}
    </div>
  );
};
