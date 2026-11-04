'use client';

import React from 'react';
import {
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
  RotateCcw,
} from 'lucide-react';
import { ToolType } from '../types/canvas';

interface ToolbarProps {
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
}

const TOOLS: { type: ToolType; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { type: 'select', label: 'Selection (V)', icon: MousePointer },
  { type: 'hand', label: 'Pan / Hand (H)', icon: Hand },
  { type: 'rectangle', label: 'Rectangle (R)', icon: Square },
  { type: 'diamond', label: 'Diamond (D)', icon: Diamond },
  { type: 'ellipse', label: 'Ellipse (O)', icon: Circle },
  { type: 'arrow', label: 'Arrow (A)', icon: ArrowRight },
  { type: 'line', label: 'Line (L)', icon: Minus },
  { type: 'draw', label: 'Pencil (P)', icon: Pencil },
  { type: 'text', label: 'Text (T)', icon: Type },
  { type: 'eraser', label: 'Eraser (E)', icon: Eraser },
];

export const Toolbar: React.FC<ToolbarProps> = ({
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
}) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-2.5 py-1.5 rounded-2xl shadow-xl border border-zinc-200/80 dark:border-zinc-800 transition-all">
      {/* Tool buttons */}
      <div className="flex items-center gap-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.type;
          return (
            <button
              key={tool.type}
              onClick={() => onSelectTool(tool.type)}
              title={tool.label}
              className={`p-2 rounded-xl transition-all duration-150 flex items-center justify-center ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>

      <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 mx-1" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="p-2 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
        >
          <Undo2 size={17} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="p-2 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
        >
          <Redo2 size={17} />
        </button>
      </div>

      <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 mx-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        <button
          onClick={onZoomOut}
          title="Zoom Out"
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={onResetZoom}
          title="Reset Zoom to 100%"
          className="px-1.5 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-w-[42px] text-center font-mono"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={onZoomIn}
          title="Zoom In"
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ZoomIn size={16} />
        </button>
      </div>
    </div>
  );
};
