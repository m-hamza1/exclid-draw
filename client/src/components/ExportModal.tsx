'use client';

import React, { useState } from 'react';
import { X, Image as ImageIcon, FileCode, Check, Copy } from 'lucide-react';
import { CanvasElement } from '../types/canvas';
import { exportToPng, exportToJson } from '../lib/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  elements: CanvasElement[];
  title: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  canvasRef,
  elements,
  title,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleExportPngWhite = () => {
    if (canvasRef.current) {
      exportToPng(canvasRef.current, elements, title, { background: '#ffffff' });
    }
    onClose();
  };

  const handleExportPngTransparent = () => {
    if (canvasRef.current) {
      exportToPng(canvasRef.current, elements, title, { background: undefined });
    }
    onClose();
  };

  const handleExportJson = () => {
    exportToJson(elements, title);
    onClose();
  };

  const handleCopyJson = () => {
    const raw = JSON.stringify(elements.filter((el) => !el.isDeleted), null, 2);
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Export Whiteboard
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {/* PNG White */}
          <button
            onClick={handleExportPngWhite}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                <ImageIcon size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Export as PNG (White Canvas)
                </div>
                <div className="text-xs text-zinc-500">
                  Crisp vector rasterization with white background
                </div>
              </div>
            </div>
          </button>

          {/* PNG Transparent */}
          <button
            onClick={handleExportPngTransparent}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                <ImageIcon size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Export as PNG (Transparent)
                </div>
                <div className="text-xs text-zinc-500">
                  Isolated shapes with transparent alpha channel
                </div>
              </div>
            </div>
          </button>

          {/* JSON File */}
          <button
            onClick={handleExportJson}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                <FileCode size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Save as Project JSON
                </div>
                <div className="text-xs text-zinc-500">
                  Complete element definitions for backup or import
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Copy raw JSON */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleCopyJson}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copied ? 'Copied to clipboard!' : 'Copy raw JSON data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
