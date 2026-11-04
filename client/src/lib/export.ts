import { CanvasElement } from '../types/canvas';
import { getElementBounds } from './math';

export function exportToJson(elements: CanvasElement[], title: string = 'whiteboard') {
  const data = JSON.stringify(
    {
      version: 1,
      source: 'exclid-draw',
      elements: elements.filter((el) => !el.isDeleted),
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );

  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPng(
  canvas: HTMLCanvasElement,
  elements: CanvasElement[],
  title: string = 'whiteboard',
  options: { background?: string; padding?: number } = {}
) {
  const activeElements = elements.filter((el) => !el.isDeleted);
  if (activeElements.length === 0) {
    alert('Canvas is empty. Draw something before exporting.');
    return;
  }

  // Calculate tight bounding box of all elements
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of activeElements) {
    const b = getElementBounds(el);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }

  const padding = options.padding ?? 40;
  const width = Math.max(100, maxX - minX + padding * 2);
  const height = Math.max(100, maxY - minY + padding * 2);

  // Create offscreen high-res canvas
  const exportCanvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 2;
  exportCanvas.width = width * dpr;
  exportCanvas.height = height * dpr;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);

  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, width, height);
  }

  // We can render directly using the main canvas or draw the region
  // For precise vector rendering, render elements into export canvas context
  import('roughjs').then(({ default: rough }) => {
    const rc = rough.canvas(exportCanvas);
    ctx.translate(-minX + padding, -minY + padding);

    // Dynamic import renderer
    import('./renderer').then(({ renderElement }) => {
      for (const el of activeElements) {
        renderElement(rc, ctx, el);
      }

      const link = document.createElement('a');
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    });
  });
}
