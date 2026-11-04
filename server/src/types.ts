export type ElementType =
  | 'selection'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'draw'
  | 'text'
  | 'eraser';

export type FillStyle = 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots';

export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
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
  seed: number;
  version: number;
  isDeleted?: boolean;
}

export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;
  cursor: { x: number; y: number } | null;
  selectedElementIds: string[];
}

export type WSClientMessage =
  | { type: 'join'; roomId: string; userName: string; userColor?: string }
  | { type: 'cursor_move'; cursor: { x: number; y: number } | null }
  | { type: 'element_update'; elements: CanvasElement[] }
  | { type: 'element_delete'; elementIds: string[] }
  | { type: 'selection_change'; selectedElementIds: string[] }
  | { type: 'board_sync_request' };

export type WSServerMessage =
  | { type: 'room_state'; roomId: string; elements: CanvasElement[]; users: UserPresence[] }
  | { type: 'user_joined'; user: UserPresence }
  | { type: 'user_left'; userId: string }
  | { type: 'cursor_update'; userId: string; cursor: { x: number; y: number } | null }
  | { type: 'elements_updated'; elements: CanvasElement[]; updatedBy: string }
  | { type: 'elements_deleted'; elementIds: string[]; updatedBy: string }
  | { type: 'selection_updated'; userId: string; selectedElementIds: string[] }
  | { type: 'error'; message: string };
