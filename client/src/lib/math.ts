import { Point, ViewportState, CanvasElement, ResizeHandle } from '../types/canvas';

export function screenToWorld(
  clientX: number,
  clientY: number,
  viewport: ViewportState,
  rect: DOMRect
): Point {
  return {
    x: (clientX - rect.left - viewport.panX) / viewport.zoom,
    y: (clientY - rect.top - viewport.panY) / viewport.zoom,
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: ViewportState,
  rect: DOMRect
): Point {
  return {
    x: worldX * viewport.zoom + viewport.panX + rect.left,
    y: worldY * viewport.zoom + viewport.panY + rect.top,
  };
}

export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return distance(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distance(p, {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  });
}

export function getElementBounds(el: CanvasElement): { minX: number; minY: number; maxX: number; maxY: number } {
  if (el.type === 'draw' && el.points && el.points.length > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of el.points) {
      const px = el.x + p.x;
      const py = el.y + p.y;
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    return { minX, minY, maxX, maxY };
  }

  if (el.type === 'text' && el.text) {
    const lines = el.text.split('\n');
    const maxLineLength = Math.max(...lines.map((l) => l.length), 1);
    const fontSize = el.fontSize || 24;
    const w = Math.max(el.width || 0, maxLineLength * (fontSize * 0.55));
    const h = Math.max(el.height || 0, lines.length * (fontSize * 1.3));
    return { minX: el.x, minY: el.y, maxX: el.x + w, maxY: el.y + h };
  }

  const x1 = Math.min(el.x, el.x + el.width);
  const x2 = Math.max(el.x, el.x + el.width);
  const y1 = Math.min(el.y, el.y + el.height);
  const y2 = Math.max(el.y, el.y + el.height);
  return { minX: x1, minY: y1, maxX: x2, maxY: y2 };
}

export function isPointInElement(p: Point, el: CanvasElement, hitTolerance = 8): boolean {
  const bounds = getElementBounds(el);

  // Quick bounding box check with tolerance
  if (
    p.x < bounds.minX - hitTolerance ||
    p.x > bounds.maxX + hitTolerance ||
    p.y < bounds.minY - hitTolerance ||
    p.y > bounds.maxY + hitTolerance
  ) {
    return false;
  }

  switch (el.type) {
    case 'rectangle':
    case 'text':
    case 'image': {
      return (
        p.x >= bounds.minX &&
        p.x <= bounds.maxX &&
        p.y >= bounds.minY &&
        p.y <= bounds.maxY
      );
    }

    case 'diamond': {
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      const dx = Math.abs(p.x - cx) / (Math.abs(el.width) / 2 || 1);
      const dy = Math.abs(p.y - cy) / (Math.abs(el.height) / 2 || 1);
      return dx + dy <= 1.05;
    }

    case 'ellipse': {
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      const rx = Math.abs(el.width) / 2 || 1;
      const ry = Math.abs(el.height) / 2 || 1;
      return ((p.x - cx) ** 2) / (rx ** 2) + ((p.y - cy) ** 2) / (ry ** 2) <= 1.05;
    }

    case 'line':
    case 'arrow': {
      const a = { x: el.x, y: el.y };
      const b = { x: el.x + el.width, y: el.y + el.height };
      return distanceToSegment(p, a, b) <= hitTolerance;
    }

    case 'draw': {
      if (!el.points || el.points.length < 2) return false;
      for (let i = 0; i < el.points.length - 1; i++) {
        const a = { x: el.x + el.points[i].x, y: el.y + el.points[i].y };
        const b = { x: el.x + el.points[i + 1].x, y: el.y + el.points[i + 1].y };
        if (distanceToSegment(p, a, b) <= hitTolerance) {
          return true;
        }
      }
      return false;
    }

    default:
      return false;
  }
}

export function isElementInBox(
  el: CanvasElement,
  box: { startX: number; startY: number; endX: number; endY: number }
): boolean {
  const minX = Math.min(box.startX, box.endX);
  const maxX = Math.max(box.startX, box.endX);
  const minY = Math.min(box.startY, box.endY);
  const maxY = Math.max(box.startY, box.endY);

  const bounds = getElementBounds(el);
  return (
    bounds.minX >= minX &&
    bounds.maxX <= maxX &&
    bounds.minY >= minY &&
    bounds.maxY <= maxY
  );
}

export function getResizeHandles(
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): Record<ResizeHandle, Point> {
  const midX = (bounds.minX + bounds.maxX) / 2;
  const midY = (bounds.minY + bounds.maxY) / 2;

  return {
    tl: { x: bounds.minX, y: bounds.minY },
    tr: { x: bounds.maxX, y: bounds.minY },
    bl: { x: bounds.minX, y: bounds.maxY },
    br: { x: bounds.maxX, y: bounds.maxY },
    tm: { x: midX, y: bounds.minY },
    bm: { x: midX, y: bounds.maxY },
    ml: { x: bounds.minX, y: midY },
    mr: { x: bounds.maxX, y: midY },
  };
}

export function getHandleAtPoint(
  p: Point,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  handleRadius = 6
): ResizeHandle | null {
  const handles = getResizeHandles(bounds);
  for (const [key, point] of Object.entries(handles)) {
    if (distance(p, point) <= handleRadius) {
      return key as ResizeHandle;
    }
  }
  return null;
}
