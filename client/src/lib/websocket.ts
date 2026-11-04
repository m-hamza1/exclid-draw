import { CanvasElement, UserPresence } from '../types/canvas';

type WSMessageHandler = {
  onRoomState?: (data: { roomId: string; elements: CanvasElement[]; users: UserPresence[] }) => void;
  onUserJoined?: (user: UserPresence) => void;
  onUserLeft?: (userId: string) => void;
  onCursorUpdate?: (userId: string, cursor: { x: number; y: number } | null) => void;
  onElementsUpdated?: (elements: CanvasElement[], updatedBy: string) => void;
  onElementsDeleted?: (elementIds: string[], updatedBy: string) => void;
  onSelectionUpdated?: (userId: string, selectedElementIds: string[]) => void;
  onStatusChange?: (status: 'connected' | 'connecting' | 'disconnected') => void;
};

export class WhiteboardWSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private roomId: string;
  private userName: string;
  private handlers: WSMessageHandler = {};
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor(url: string, roomId: string, userName: string, handlers: WSMessageHandler) {
    this.url = url;
    this.roomId = roomId;
    this.userName = userName;
    this.handlers = handlers;
    this.connect();
  }

  private connect() {
    if (this.isDestroyed) return;

    this.handlers.onStatusChange?.('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.handlers.onStatusChange?.('connected');
        this.send({
          type: 'join',
          roomId: this.roomId,
          userName: this.userName,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'room_state':
              this.handlers.onRoomState?.(msg);
              break;
            case 'user_joined':
              this.handlers.onUserJoined?.(msg.user);
              break;
            case 'user_left':
              this.handlers.onUserLeft?.(msg.userId);
              break;
            case 'cursor_update':
              this.handlers.onCursorUpdate?.(msg.userId, msg.cursor);
              break;
            case 'elements_updated':
              this.handlers.onElementsUpdated?.(msg.elements, msg.updatedBy);
              break;
            case 'elements_deleted':
              this.handlers.onElementsDeleted?.(msg.elementIds, msg.updatedBy);
              break;
            case 'selection_updated':
              this.handlers.onSelectionUpdated?.(msg.userId, msg.selectedElementIds);
              break;
          }
        } catch (e) {
          console.error('[WS Client] Failed to parse incoming message:', e);
        }
      };

      this.ws.onclose = () => {
        this.handlers.onStatusChange?.('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.handlers.onStatusChange?.('disconnected');
        this.ws?.close();
      };
    } catch {
      this.handlers.onStatusChange?.('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.isDestroyed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2500);
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public sendCursorMove(cursor: { x: number; y: number } | null) {
    this.send({ type: 'cursor_move', cursor });
  }

  public sendElementsUpdate(elements: CanvasElement[]) {
    this.send({ type: 'element_update', elements });
  }

  public sendElementsDelete(elementIds: string[]) {
    this.send({ type: 'element_delete', elementIds });
  }

  public sendSelectionChange(selectedElementIds: string[]) {
    this.send({ type: 'selection_change', selectedElementIds });
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
  }
}
