'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { GreenBoard } from '@/components/GreenBoard';

const Whiteboard = dynamic(
  () => import('@/components/Whiteboard').then((mod) => mod.Whiteboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-white text-zinc-600 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-semibold text-zinc-700">Opening Canvas...</p>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  const [activeBoard, setActiveBoard] = useState<{
    id: string;
    title: string;
    color?: string;
  } | null>(null);

  // Check URL query param ?board=xyz on mount
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    const params = new URLSearchParams(window.location.search);
    const boardParam = params.get('board');
    if (boardParam) {
      // Auto-save to local sticky notes for 2nd user
      try {
        const localSaved: string[] = JSON.parse(localStorage.getItem('exclid_saved_boards') || '[]');
        if (!localSaved.includes(boardParam)) {
          localSaved.unshift(boardParam);
          localStorage.setItem('exclid_saved_boards', JSON.stringify(localSaved));
        }
      } catch (e) {}

      fetch(`${apiUrl}/boards/${boardParam}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setActiveBoard({
              id: boardParam,
              title: data.title || 'Shared Whiteboard',
              color: data.appState?.color || '#fef08a',
            });
          } else {
            setActiveBoard({
              id: boardParam,
              title: 'Collaborative Board',
            });
          }
        })
        .catch(() => {
          setActiveBoard({
            id: boardParam,
            title: 'Collaborative Board',
          });
        });
    }

    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const b = urlParams.get('board');
      if (b) {
        setActiveBoard({ id: b, title: 'Collaborative Board' });
      } else {
        setActiveBoard(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenBoard = (id: string, title: string, color?: string) => {
    try {
      const localSaved: string[] = JSON.parse(localStorage.getItem('exclid_saved_boards') || '[]');
      if (!localSaved.includes(id)) {
        localSaved.unshift(id);
        localStorage.setItem('exclid_saved_boards', JSON.stringify(localSaved));
      }
    } catch (e) {}

    setActiveBoard({ id, title, color });
    const url = new URL(window.location.href);
    url.searchParams.set('board', id);
    window.history.pushState({}, '', url.toString());
  };

  const handleBackToGreenBoard = () => {
    setActiveBoard(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('board');
    window.history.pushState({}, '', url.toString());
  };

  return (
    <main className="h-screen w-screen overflow-hidden">
      {activeBoard ? (
        <Whiteboard
          boardId={activeBoard.id}
          initialTitle={activeBoard.title}
          boardColor={activeBoard.color}
          onBack={handleBackToGreenBoard}
        />
      ) : (
        <GreenBoard onOpenBoard={handleOpenBoard} />
      )}
    </main>
  );
}
