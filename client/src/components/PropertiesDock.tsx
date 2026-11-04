'use client';

import React from 'react';
import { ElementStyleProps, FillStyle } from '../types/canvas';
import { Palette, Menu, X, Type } from 'lucide-react';

interface PropertiesDockProps {
  styles: ElementStyleProps;
  onChangeStyle: (partial: Partial<ElementStyleProps>) => void;
  hasSelectedElements: boolean;
  onClose: () => void;
}

const STROKE_COLORS = [
  '#1e293b', // Slate dark
  '#ef4444', // Red
  '#f97316', // Orange
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

const BG_COLORS = [
  'transparent',
  '#fee2e2', // Light Red
  '#ffedd5', // Light Orange
  '#fef3c7', // Light Amber
  '#d1fae5', // Light Green
  '#e0e7ff', // Light Indigo
  '#f3e8ff', // Light Purple
  '#fce7f3', // Light Pink
];

const FILL_STYLES: { label: string; value: FillStyle }[] = [
  { label: 'Hachure', value: 'hachure' },
  { label: 'Cross-hatch', value: 'cross-hatch' },
  { label: 'Solid', value: 'solid' },
  { label: 'Dots', value: 'dots' },
];

const FONT_OPTIONS = [
  {
    label: 'Claude',
    desc: 'Editorial Serif',
    value: "'Newsreader', Georgia, serif",
    preview: 'Ag',
    badge: 'Claude',
  },
  {
    label: 'Virgil',
    desc: 'Hand-drawn Sketch',
    value: "'Virgil', 'Caveat', cursive",
    preview: 'Ag',
    badge: 'Excalidraw',
  },
  {
    label: 'Modern Sans',
    desc: 'Inter / Jakarta',
    value: "'Plus Jakarta Sans', Inter, system-ui, sans-serif",
    preview: 'Ag',
    badge: 'Clean UI',
  },
  {
    label: 'Code Mono',
    desc: 'Cascadia Mono',
    value: "'Cascadia', 'Fira Code', monospace",
    preview: '</>',
    badge: 'Code',
  },
];

const FONT_SIZES = [
  { label: 'S', value: 16, desc: '16px' },
  { label: 'M', value: 24, desc: '24px' },
  { label: 'L', value: 36, desc: '36px' },
  { label: 'XL', value: 48, desc: '48px' },
];

export const PropertiesDock: React.FC<PropertiesDockProps> = ({
  styles,
  onChangeStyle,
  hasSelectedElements,
  onClose,
}) => {
  return (
    <div className="absolute top-0 left-12 bottom-0 z-40 w-72 bg-white/98 backdrop-blur-md border-r border-zinc-300 p-4 space-y-4 text-xs font-medium text-zinc-700 shadow-2xl overflow-y-auto animate-in fade-in slide-in-from-left-2 duration-150">
      {/* Header with Title and Close toggle */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
        <span className="font-bold text-zinc-900 flex items-center gap-1.5 font-sans text-sm">
          <Palette size={16} className="text-blue-500" />
          {hasSelectedElements ? 'Element Style' : 'Canvas Style'}
        </span>
        <button
          onClick={onClose}
          title="Close Style Menu"
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Font Family (Claude / Virgil / Modern Sans / Code Mono) */}
      <div>
        <div className="text-[11px] font-bold text-zinc-500 mb-2 font-sans flex items-center justify-between">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <Type size={13} className="text-blue-500" />
            Font Family
          </span>
          <span className="text-[10px] text-zinc-400 font-normal">
            {FONT_OPTIONS.find((f) => f.value === styles.fontFamily)?.label || 'Claude'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map((f) => {
            const isSelected = styles.fontFamily === f.value;
            return (
              <button
                key={f.label}
                onClick={() => onChangeStyle({ fontFamily: f.value })}
                className={`p-2 rounded-xl text-left transition-all flex items-center gap-2.5 border relative ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500/20'
                    : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/80 text-zinc-700 bg-white'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-800'
                  }`}
                  style={{ fontFamily: f.value }}
                >
                  {f.preview}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-xs font-bold leading-tight truncate text-zinc-900"
                    style={{ fontFamily: f.value }}
                  >
                    {f.label}
                  </div>
                  <div className="text-[9px] text-zinc-400 font-sans truncate leading-tight mt-0.5">
                    {f.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Size (S / M / L / XL) */}
      <div>
        <div className="text-[11px] font-bold text-zinc-500 mb-1.5 font-sans uppercase tracking-wider flex items-center justify-between">
          <span>Font Size</span>
          <span className="text-[10px] text-zinc-400 font-normal font-mono">
            {styles.fontSize || 24}px
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {FONT_SIZES.map((s) => {
            const isSelected = (styles.fontSize || 24) === s.value;
            return (
              <button
                key={s.label}
                onClick={() => onChangeStyle({ fontSize: s.value })}
                className={`py-1.5 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                    : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700 bg-white'
                }`}
                title={`Font Size: ${s.desc}`}
              >
                <span className="text-xs font-semibold leading-none">{s.label}</span>
                <span className={`text-[8px] mt-0.5 leading-none ${isSelected ? 'text-blue-100' : 'text-zinc-400'}`}>
                  {s.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stroke Color */}
      <div>
        <div className="text-[11px] font-semibold text-zinc-500 mb-1.5 font-sans">Stroke Color</div>
        <div className="grid grid-cols-4 gap-1.5">
          {STROKE_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onChangeStyle({ strokeColor: color })}
              className={`h-6 rounded-lg border transition-all flex items-center justify-center ${
                styles.strokeColor === color
                  ? 'ring-2 ring-blue-500 ring-offset-1 scale-105 border-transparent'
                  : 'border-zinc-300 hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Background Fill Color */}
      <div>
        <div className="text-[11px] font-semibold text-zinc-500 mb-1.5 font-sans">Background Fill</div>
        <div className="grid grid-cols-4 gap-1.5">
          {BG_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onChangeStyle({ backgroundColor: color })}
              className={`h-6 rounded-lg border transition-all relative flex items-center justify-center ${
                styles.backgroundColor === color
                  ? 'ring-2 ring-blue-500 ring-offset-1 scale-105 border-transparent'
                  : 'border-zinc-300 hover:scale-105'
              } ${color === 'transparent' ? 'bg-zinc-100' : ''}`}
              style={{ backgroundColor: color === 'transparent' ? undefined : color }}
              title={color === 'transparent' ? 'Transparent' : color}
            >
              {color === 'transparent' && (
                <span className="text-[10px] text-zinc-400 select-none">None</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Fill Style */}
      {styles.backgroundColor !== 'transparent' && (
        <div>
          <div className="text-[11px] font-semibold text-zinc-500 mb-1.5 font-sans">Fill Style</div>
          <div className="grid grid-cols-2 gap-1.5">
            {FILL_STYLES.map((fs) => (
              <button
                key={fs.value}
                onClick={() => onChangeStyle({ fillStyle: fs.value })}
                className={`py-1.5 px-2 rounded-xl text-[11px] border text-center transition-all ${
                  styles.fillStyle === fs.value
                    ? 'bg-blue-50 border-blue-500 text-blue-600 font-bold'
                    : 'border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                {fs.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stroke Width */}
      <div>
        <div className="text-[11px] font-semibold text-zinc-500 mb-1.5 font-sans">Stroke Width</div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Thin', width: 1.5 },
            { label: 'Medium', width: 2.5 },
            { label: 'Bold', width: 4 },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onChangeStyle({ strokeWidth: item.width })}
              className={`py-1 px-1.5 rounded-xl text-[11px] border text-center transition-all ${
                styles.strokeWidth === item.width
                  ? 'bg-blue-50 border-blue-500 text-blue-600 font-bold'
                  : 'border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roughness / Sloppiness */}
      <div>
        <div className="text-[11px] font-semibold text-zinc-500 mb-1.5 font-sans">Roughness (Sketch)</div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Clean', val: 0.1 },
            { label: 'Artist', val: 1.2 },
            { label: 'Sloppy', val: 2.5 },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onChangeStyle({ roughness: item.val })}
              className={`py-1 px-1.5 rounded-xl text-[11px] border text-center transition-all ${
                Math.abs(styles.roughness - item.val) < 0.2
                  ? 'bg-blue-50 border-blue-500 text-blue-600 font-bold'
                  : 'border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Opacity */}
      <div>
        <div className="flex justify-between text-[11px] font-semibold text-zinc-500 mb-1 font-sans">
          <span>Opacity</span>
          <span>{Math.round(styles.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={styles.opacity}
          onChange={(e) => onChangeStyle({ opacity: parseFloat(e.target.value) })}
          className="w-full accent-blue-600 cursor-pointer"
        />
      </div>
    </div>
  );
};
