import rough from 'roughjs';
import { CanvasElement, ViewportState } from '../types/canvas';
import { getElementBounds, getResizeHandles } from './math';

const imageCache = new Map<string, HTMLImageElement>();

export function renderGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: ViewportState
) {
  const gridSize = 24 * viewport.zoom;
  if (gridSize < 8) return; // Skip if too dense

  const offsetX = viewport.panX % gridSize;
  const offsetY = viewport.panY % gridSize;

  ctx.save();
  ctx.fillStyle = '#cbd5e1';
  const dotSize = Math.max(1.2, Math.min(2.2, 1.3 * viewport.zoom));

  for (let x = offsetX; x < width; x += gridSize) {
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function renderElement(
  rc: ReturnType<typeof rough.canvas>,
  ctx: CanvasRenderingContext2D,
  element: CanvasElement
) {
  if (element.isDeleted) return;

  ctx.save();
  ctx.globalAlpha = element.opacity;

  const roughOptions = {
    seed: element.seed || 1,
    stroke: element.strokeColor,
    strokeWidth: element.strokeWidth,
    roughness: element.roughness,
    fill: element.backgroundColor === 'transparent' ? undefined : element.backgroundColor,
    fillStyle: element.fillStyle,
    bowing: 1.2,
  };

  switch (element.type) {
    case 'rectangle': {
      rc.rectangle(
        element.x,
        element.y,
        element.width,
        element.height,
        roughOptions
      );
      break;
    }

    case 'diamond': {
      const p1: [number, number] = [element.x + element.width / 2, element.y];
      const p2: [number, number] = [element.x + element.width, element.y + element.height / 2];
      const p3: [number, number] = [element.x + element.width / 2, element.y + element.height];
      const p4: [number, number] = [element.x, element.y + element.height / 2];
      rc.polygon([p1, p2, p3, p4], roughOptions);
      break;
    }

    case 'ellipse': {
      const cx = element.x + element.width / 2;
      const cy = element.y + element.height / 2;
      const w = Math.abs(element.width);
      const h = Math.abs(element.height);
      rc.ellipse(cx, cy, w, h, roughOptions);
      break;
    }

    case 'line': {
      rc.line(
        element.x,
        element.y,
        element.x + element.width,
        element.y + element.height,
        roughOptions
      );
      break;
    }

    case 'arrow': {
      const startX = element.x;
      const startY = element.y;
      const endX = element.x + element.width;
      const endY = element.y + element.height;

      // Draw shaft
      rc.line(startX, startY, endX, endY, roughOptions);

      // Draw arrowhead
      const angle = Math.atan2(endY - startY, endX - startX);
      const arrowLength = Math.max(12, element.strokeWidth * 4);
      const arrowAngle = Math.PI / 6;

      const p1: [number, number] = [
        endX - arrowLength * Math.cos(angle - arrowAngle),
        endY - arrowLength * Math.sin(angle - arrowAngle),
      ];
      const p2: [number, number] = [
        endX - arrowLength * Math.cos(angle + arrowAngle),
        endY - arrowLength * Math.sin(angle + arrowAngle),
      ];

      rc.line(endX, endY, p1[0], p1[1], roughOptions);
      rc.line(endX, endY, p2[0], p2[1], roughOptions);
      break;
    }

    case 'draw': {
      if (element.points && element.points.length > 1) {
        const pts: [number, number][] = element.points.map((p) => [
          element.x + p.x,
          element.y + p.y,
        ]);
        rc.linearPath(pts, {
          ...roughOptions,
          roughness: Math.max(0.2, element.roughness * 0.5),
        });
      }
      break;
    }

    case 'text': {
      if (element.text) {
        ctx.fillStyle = element.strokeColor;
        const fontSize = element.fontSize || 20;
        const fontFamily = element.fontFamily || "'Newsreader', Georgia, serif";
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textBaseline = 'top';

        const lines = element.text.split('\n');
        const lineHeight = fontSize * 1.35;
        lines.forEach((line, index) => {
          ctx.fillText(line, element.x, element.y + index * lineHeight);
        });
      }
      break;
    }

    case 'image': {
      if (element.imageUrl) {
        let img = imageCache.get(element.imageUrl);
        if (!img) {
          img = new Image();
          img.src = element.imageUrl;
          imageCache.set(element.imageUrl, img);
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, element.x, element.y, element.width, element.height);
        }
      }
      break;
    }
  }

  ctx.restore();
}

export function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  selectedElements: CanvasElement[],
  viewport: ViewportState
) {
  if (selectedElements.length === 0) return;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of selectedElements) {
    const b = getElementBounds(el);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }

  // Margin around element bounds
  const padding = 6;
  const bx = minX - padding;
  const by = minY - padding;
  const bw = maxX - minX + padding * 2;
  const bh = maxY - minY + padding * 2;

  ctx.save();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5 / viewport.zoom;
  ctx.setLineDash([6 / viewport.zoom, 4 / viewport.zoom]);
  ctx.strokeRect(bx, by, bw, bh);
  ctx.setLineDash([]);

  // Render 8 handles
  const handles = getResizeHandles({ minX: bx, minY: by, maxX: bx + bw, maxY: by + bh });
  const handleSize = 7 / viewport.zoom;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5 / viewport.zoom;

  for (const pt of Object.values(handles)) {
    ctx.fillRect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize);
  }

  ctx.restore();
}

export function renderMarquee(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  viewport: ViewportState
) {
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const w = Math.abs(currentX - startX);
  const h = Math.abs(currentY - startY);

  ctx.save();
  ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1 / viewport.zoom;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}
