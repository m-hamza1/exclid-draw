export type ToolType =
  | 'select'
  | 'hand'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'draw'
  | 'text'
  | 'eraser'
  | 'image';

export type FillStyle = 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots';

export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  roughness: number;
  opacity: number;
  points?: Point[];
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  imageUrl?: string;
  seed: number;
  version: number;
  isDeleted?: boolean;
}

export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
}

export interface ElementStyleProps {
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  roughness: number;
  opacity: number;
  fontFamily: string;
  fontSize: number;
}

export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;
  cursor: Point | null;
  selectedElementIds: string[];
}

export type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'ml' | 'mr';

export interface DragState {
  type: 'drawing' | 'moving' | 'resizing' | 'panning' | 'selecting';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  originElements?: CanvasElement[];
  resizeHandle?: ResizeHandle;
}
