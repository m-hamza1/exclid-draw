'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import rough from 'roughjs';
import { nanoid } from 'nanoid';
import {
  ToolType,
  CanvasElement,
  ViewportState,
  ElementStyleProps,
  Point,
  DragState,
  ResizeHandle,
} from '../types/canvas';
import {
  screenToWorld,
  worldToScreen,
  isPointInElement,
  isElementInBox,
  getElementBounds,
  getHandleAtPoint,
} from '../lib/math';
import {
  renderGrid,
  renderElement,
  renderSelectionBox,
  renderMarquee,
} from '../lib/renderer';

interface CanvasProps {
  tool: ToolType;
  styleProps: ElementStyleProps;
  elements: CanvasElement[];
  selectedIds: string[];
  viewport: ViewportState;
  onElementsChange: (elements: CanvasElement[], isCommitted?: boolean) => void;
  onSelectElements: (ids: string[]) => void;
  onViewportChange: (viewport: ViewportState) => void;
  onCursorMove: (point: Point | null) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const Canvas: React.FC<CanvasProps> = ({
  tool,
  styleProps,
  elements,
  selectedIds,
  viewport,
  onElementsChange,
  onSelectElements,
  onViewportChange,
  onCursorMove,
  canvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null);

  // Text inline editor state
  const [editingText, setEditingText] = useState<{
    id?: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    color: string;
    fontFamily?: string;
  } | null>(null);

  // Active drag interaction state
  const dragStateRef = useRef<DragState | null>(null);
  const drawingElementRef = useRef<CanvasElement | null>(null);
  const isSpacePressedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus and select textarea when opened
  useEffect(() => {
    if (editingText) {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [editingText]);

  // Re-render Static Canvas (all committed elements)
  const renderStatic = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(dpr, dpr);

    // Ensure solid plain white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // Draw background grid
    renderGrid(ctx, canvas.width / dpr, canvas.height / dpr, viewport);

    // Apply viewport transform (pan + zoom)
    ctx.translate(viewport.panX, viewport.panY);
    ctx.scale(viewport.zoom, viewport.zoom);

    const rc = rough.canvas(canvas);
    for (const el of elements) {
      if (!el.isDeleted) {
        renderElement(rc, ctx, el);
      }
    }

    ctx.restore();
  }, [canvasRef, elements, viewport]);

  // Re-render Interactive Canvas (previews, selection box, handles, marquee)
  const renderInteractive = useCallback(() => {
    const canvas = interactiveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(viewport.panX, viewport.panY);
    ctx.scale(viewport.zoom, viewport.zoom);

    const rc = rough.canvas(canvas);

    // Render active drawing preview
    if (drawingElementRef.current) {
      renderElement(rc, ctx, drawingElementRef.current);
    }

    // Render selection bounding box & handles
    const selectedElements = elements.filter(
      (el) => selectedIds.includes(el.id) && !el.isDeleted
    );
    if (selectedElements.length > 0 && !dragStateRef.current?.type?.startsWith('drawing')) {
      renderSelectionBox(ctx, selectedElements, viewport);
    }

    // Render marquee selection box
    if (dragStateRef.current && dragStateRef.current.type === 'selecting') {
      renderMarquee(
        ctx,
        dragStateRef.current.startX,
        dragStateRef.current.startY,
        dragStateRef.current.currentX,
        dragStateRef.current.currentY,
        viewport
      );
    }

    ctx.restore();
  }, [elements, selectedIds, viewport]);

  // Handle Resize and DPR scaling
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const staticCanvas = canvasRef.current;
      const interCanvas = interactiveCanvasRef.current;
      if (!container || !staticCanvas || !interCanvas) return;

      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;

      staticCanvas.width = w * dpr;
      staticCanvas.height = h * dpr;
      staticCanvas.style.width = `${w}px`;
      staticCanvas.style.height = `${h}px`;

      interCanvas.width = w * dpr;
      interCanvas.height = h * dpr;
      interCanvas.style.width = `${w}px`;
      interCanvas.style.height = `${h}px`;

      renderStatic();
      renderInteractive();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') isSpacePressedRef.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') isSpacePressedRef.current = false;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ResizeObserver for reliable dimension adjustments
    let ro: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => handleResize());
      ro.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (ro) ro.disconnect();
    };
  }, [canvasRef, renderStatic, renderInteractive]);

  useEffect(() => {
    renderStatic();
  }, [renderStatic]);

  useEffect(() => {
    renderInteractive();
  }, [renderInteractive]);

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const worldPt = screenToWorld(e.clientX, e.clientY, viewport, rect);

    // Commit any currently open text editing first
    if (editingText) {
      handleCommitText();
      return;
    }

    // Pan with Hand tool or middle mouse or Space key
    if (tool === 'hand' || e.button === 1 || isSpacePressedRef.current) {
      dragStateRef.current = {
        type: 'panning',
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      };
      return;
    }

    if (e.button !== 0) return; // Only primary button

    // Eraser Tool
    if (tool === 'eraser') {
      const hit = elements.slice().reverse().find((el) => !el.isDeleted && isPointInElement(worldPt, el));
      if (hit) {
        const next = elements.map((el) => (el.id === hit.id ? { ...el, isDeleted: true } : el));
        onElementsChange(next, true);
      }
      return;
    }

    // Text Tool
    if (tool === 'text') {
      setEditingText({
        x: worldPt.x,
        y: worldPt.y,
        text: '',
        fontSize: styleProps.fontSize || 24,
        color: styleProps.strokeColor || '#1e293b',
        fontFamily: styleProps.fontFamily || "'Newsreader', Georgia, serif",
      });
      return;
    }

    // Select Tool
    if (tool === 'select') {
      // 1. Check if clicking on resize handles of selected elements
      const selected = elements.filter((el) => selectedIds.includes(el.id) && !el.isDeleted);
      if (selected.length === 1) {
        const bounds = getElementBounds(selected[0]);
        const handle = getHandleAtPoint(worldPt, bounds, 10 / viewport.zoom);
        if (handle) {
          dragStateRef.current = {
            type: 'resizing',
            startX: worldPt.x,
            startY: worldPt.y,
            currentX: worldPt.x,
            currentY: worldPt.y,
            resizeHandle: handle,
            originElements: [JSON.parse(JSON.stringify(selected[0]))],
          };
          return;
        }
      }

      // 2. Hit-test elements
      const hit = elements.slice().reverse().find((el) => !el.isDeleted && isPointInElement(worldPt, el));
      if (hit) {
        const isAlreadySelected = selectedIds.includes(hit.id);
        const newSelectedIds = e.shiftKey
          ? isAlreadySelected
            ? selectedIds.filter((id) => id !== hit.id)
            : [...selectedIds, hit.id]
          : isAlreadySelected
          ? selectedIds
          : [hit.id];

        onSelectElements(newSelectedIds);

        // Prepare move drag
        const originElements = elements
          .filter((el) => newSelectedIds.includes(el.id))
          .map((el) => JSON.parse(JSON.stringify(el)));

        dragStateRef.current = {
          type: 'moving',
          startX: worldPt.x,
          startY: worldPt.y,
          currentX: worldPt.x,
          currentY: worldPt.y,
          originElements,
        };
        renderInteractive();
        return;
      }

      // 3. Clicked empty space -> start marquee selection
      if (!e.shiftKey) {
        onSelectElements([]);
      }
      dragStateRef.current = {
        type: 'selecting',
        startX: worldPt.x,
        startY: worldPt.y,
        currentX: worldPt.x,
        currentY: worldPt.y,
      };
      renderInteractive();
      return;
    }

    // Shape Creation Tools (rectangle, diamond, ellipse, arrow, line, draw)
    const newElement: CanvasElement = {
      id: nanoid(10),
      type: tool,
      x: worldPt.x,
      y: worldPt.y,
      width: 0,
      height: 0,
      strokeColor: styleProps.strokeColor,
      backgroundColor: styleProps.backgroundColor,
      fillStyle: styleProps.fillStyle,
      strokeWidth: styleProps.strokeWidth,
      roughness: styleProps.roughness,
      opacity: styleProps.opacity,
      seed: Math.floor(Math.random() * 2000000),
      version: 1,
      points: tool === 'draw' ? [{ x: 0, y: 0 }] : undefined,
    };

    drawingElementRef.current = newElement;
    dragStateRef.current = {
      type: 'drawing',
      startX: worldPt.x,
      startY: worldPt.y,
      currentX: worldPt.x,
      currentY: worldPt.y,
    };

    renderInteractive();
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const worldPt = screenToWorld(e.clientX, e.clientY, viewport, rect);

    // Broadcast cursor position in world space
    onCursorMove(worldPt);

    const drag = dragStateRef.current;
    if (!drag) return;

    drag.currentX = worldPt.x;
    drag.currentY = worldPt.y;

    // Panning
    if (drag.type === 'panning') {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      drag.startX = e.clientX;
      drag.startY = e.clientY;

      onViewportChange({
        ...viewport,
        panX: viewport.panX + dx,
        panY: viewport.panY + dy,
      });
      return;
    }

    // Drawing
    if (drag.type === 'drawing' && drawingElementRef.current) {
      const el = drawingElementRef.current;
      if (el.type === 'draw') {
        const relX = worldPt.x - el.x;
        const relY = worldPt.y - el.y;
        el.points = [...(el.points || []), { x: relX, y: relY }];
      } else {
        el.width = worldPt.x - el.x;
        el.height = worldPt.y - el.y;
      }
      renderInteractive();
      return;
    }

    // Moving elements
    if (drag.type === 'moving' && drag.originElements) {
      const dx = worldPt.x - drag.startX;
      const dy = worldPt.y - drag.startY;

      const originMap = new Map(drag.originElements.map((el) => [el.id, el]));
      const next = elements.map((el) => {
        const orig = originMap.get(el.id);
        if (!orig) return el;
        return {
          ...el,
          x: orig.x + dx,
          y: orig.y + dy,
          version: orig.version + 1,
        };
      });

      onElementsChange(next, false);
      renderInteractive();
      return;
    }

    // Resizing single element
    if (drag.type === 'resizing' && drag.originElements?.[0] && drag.resizeHandle) {
      const orig = drag.originElements[0];
      const handle = drag.resizeHandle;
      let { x, y, width, height } = orig;

      const dx = worldPt.x - drag.startX;
      const dy = worldPt.y - drag.startY;

      if (handle.includes('r')) width += dx;
      if (handle.includes('l')) {
        x += dx;
        width -= dx;
      }
      if (handle.includes('b')) height += dy;
      if (handle.includes('t')) {
        y += dy;
        height -= dy;
      }

      const next = elements.map((el) =>
        el.id === orig.id ? { ...el, x, y, width, height, version: el.version + 1 } : el
      );

      onElementsChange(next, false);
      renderInteractive();
      return;
    }

    // Marquee Selecting
    if (drag.type === 'selecting') {
      const box = {
        startX: drag.startX,
        startY: drag.startY,
        endX: worldPt.x,
        endY: worldPt.y,
      };

      const selected = elements
        .filter((el) => !el.isDeleted && isElementInBox(el, box))
        .map((el) => el.id);

      onSelectElements(selected);
      renderInteractive();
      return;
    }
  };

  // Pointer Up
  const handlePointerUp = () => {
    const drag = dragStateRef.current;
    if (!drag) return;

    if (drag.type === 'drawing' && drawingElementRef.current) {
      const el = drawingElementRef.current;
      // Filter out accidental tiny clicks for shapes
      const isTiny = Math.abs(el.width) < 4 && Math.abs(el.height) < 4 && el.type !== 'draw';
      if (!isTiny) {
        onElementsChange([...elements, el], true);
        onSelectElements([el.id]);
      }
      drawingElementRef.current = null;
    } else if (drag.type === 'moving' || drag.type === 'resizing') {
      // Commit final positions to sync & history
      onElementsChange(elements, true);
    }

    dragStateRef.current = null;
    renderInteractive();
  };

  // Wheel (Zoom + Pan)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();

    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(0.15, viewport.zoom * zoomFactor), 4.0);

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPanX = mouseX - (mouseX - viewport.panX) * (newZoom / viewport.zoom);
      const newPanY = mouseY - (mouseY - viewport.panY) * (newZoom / viewport.zoom);

      onViewportChange({
        zoom: newZoom,
        panX: newPanX,
        panY: newPanY,
      });
    } else {
      // Pan
      onViewportChange({
        ...viewport,
        panX: viewport.panX - e.deltaX,
        panY: viewport.panY - e.deltaY,
      });
    }
  };

  // Double Click for Text Edit
  const handleDoubleClick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const worldPt = screenToWorld(e.clientX, e.clientY, viewport, rect);

    const hit = elements.slice().reverse().find((el) => !el.isDeleted && isPointInElement(worldPt, el));
    if (hit && hit.type === 'text') {
      setEditingText({
        id: hit.id,
        x: hit.x,
        y: hit.y,
        text: hit.text || '',
        fontSize: hit.fontSize || 22,
        color: hit.strokeColor,
        fontFamily: hit.fontFamily || styleProps.fontFamily || "'Newsreader', Georgia, serif",
      });
    }
  };

  // Commit Inline Text
  const handleCommitText = () => {
    if (!editingText) return;
    const text = editingText.text.trim();
    if (!text) {
      if (editingText.id) {
        // Delete empty text
        const next = elements.map((el) =>
          el.id === editingText.id ? { ...el, isDeleted: true } : el
        );
        onElementsChange(next, true);
      }
      setEditingText(null);
      return;
    }

    const fontSize = editingText.fontSize || 26;
    const lines = text.split('\n');
    const maxLineLength = Math.max(...lines.map((l) => l.length), 1);
    const computedWidth = maxLineLength * (fontSize * 0.55) + 12;
    const computedHeight = lines.length * (fontSize * 1.35);

    if (editingText.id) {
      // Update existing text
      const next = elements.map((el) =>
        el.id === editingText.id
          ? {
              ...el,
              text,
              fontSize,
              fontFamily: editingText.fontFamily || el.fontFamily || styleProps.fontFamily || "'Newsreader', Georgia, serif",
              strokeColor: editingText.color || el.strokeColor,
              width: computedWidth,
              height: computedHeight,
              version: el.version + 1,
            }
          : el
      );
      onElementsChange(next, true);
    } else {
      // Create new text element
      const newEl: CanvasElement = {
        id: nanoid(10),
        type: 'text',
        x: editingText.x,
        y: editingText.y,
        width: computedWidth,
        height: computedHeight,
        text,
        fontSize,
        fontFamily: editingText.fontFamily || styleProps.fontFamily || "'Newsreader', Georgia, serif",
        strokeColor: editingText.color || '#1e293b',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 0,
        opacity: 1,
        seed: Math.floor(Math.random() * 1000000),
        version: 1,
      };
      onElementsChange([...elements, newEl], true);
      onSelectElements([newEl.id]);
    }

    setEditingText(null);
  };

  // Handle Paste from Clipboard (Ctrl+V) for Images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
              const container = containerRef.current;
              const wScreen = container?.clientWidth || window.innerWidth;
              const hScreen = container?.clientHeight || window.innerHeight;

              const centerWorld = screenToWorld(wScreen / 2, hScreen / 2, viewport, {
                left: 0,
                top: 0,
              } as DOMRect);

              const maxDim = 450;
              let imgW = img.naturalWidth || 300;
              let imgH = img.naturalHeight || 200;

              if (imgW > maxDim || imgH > maxDim) {
                const ratio = Math.min(maxDim / imgW, maxDim / imgH);
                imgW = Math.round(imgW * ratio);
                imgH = Math.round(imgH * ratio);
              }

              const newEl: CanvasElement = {
                id: nanoid(10),
                type: 'image',
                x: centerWorld.x - imgW / 2,
                y: centerWorld.y - imgH / 2,
                width: imgW,
                height: imgH,
                imageUrl: dataUrl,
                strokeColor: '#000000',
                backgroundColor: 'transparent',
                fillStyle: 'solid',
                strokeWidth: 1,
                roughness: 0,
                opacity: 1,
                seed: Math.floor(Math.random() * 1000000),
                version: 1,
              };

              onElementsChange([...elements, newEl], true);
              onSelectElements([newEl.id]);
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [elements, viewport, onElementsChange, onSelectElements]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-white select-none ${
        tool === 'hand' ? 'cursor-grab active:cursor-grabbing' : tool === 'eraser' ? 'cursor-crosshair' : 'cursor-default'
      }`}
    >
      {/* 1. Static Canvas (Rendered elements cache) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* 2. Interactive Canvas (Dragging, drawing previews, handles, marquee) */}
      <canvas
        ref={interactiveCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          handlePointerUp();
          onCursorMove(null);
        }}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        className="absolute inset-0 touch-none"
      />

      {/* Inline Textarea overlay for direct typing on canvas - Pure Excalidraw Style */}
      {editingText && (
        <div
          className="absolute z-40 pointer-events-auto"
          style={{
            left: `${editingText.x * viewport.zoom + viewport.panX}px`,
            top: `${editingText.y * viewport.zoom + viewport.panY}px`,
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <textarea
            ref={textareaRef}
            value={editingText.text}
            onChange={(e) =>
              setEditingText((prev) => (prev ? { ...prev, text: e.target.value } : null))
            }
            onKeyDown={(e) => {
              e.stopPropagation(); // Stop global keyboard shortcuts
              if (e.key === 'Escape') {
                e.preventDefault();
                handleCommitText();
              }
            }}
            className="outline-none resize p-0 m-0 border border-dashed border-blue-400 bg-transparent text-zinc-900 font-claude select-text"
            style={{
              fontSize: `${Math.max(18, (editingText.fontSize || 24) * viewport.zoom)}px`,
              color: editingText.color || '#1e293b',
              minWidth: '120px',
              minHeight: '36px',
              lineHeight: 1.35,
              fontFamily: editingText.fontFamily || styleProps.fontFamily || "'Newsreader', Georgia, serif",
            }}
            placeholder="Type here..."
          />
        </div>
      )}
    </div>
  );
};
