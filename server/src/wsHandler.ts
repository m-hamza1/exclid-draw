import type { WebSocket } from 'ws';
import { nanoid } from 'nanoid';
import { WSClientMessage, UserPresence } from './types.js';
import { roomManager } from './rooms.js';

const PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
];

export function handleWebSocketConnection(ws: WebSocket) {
  let currentRoomId: string | null = null;
  let currentUserId: string = nanoid(10);
  let currentUserPresence: UserPresence | null = null;

  ws.on('message', async (data: Buffer | string) => {
    try {
      const msg = JSON.parse(data.toString()) as WSClientMessage;

      if (msg.type === 'join') {
        const { roomId, userName, userColor } = msg;
        currentRoomId = roomId;

        const assignedColor = userColor || PALETTE[Math.floor(Math.random() * PALETTE.length)];
        currentUserPresence = {
          userId: currentUserId,
          userName: userName || `User-${currentUserId.slice(0, 4)}`,
          userColor: assignedColor,
          cursor: null,
          selectedElementIds: [],
        };

        const room = await roomManager.getOrCreateRoom(roomId);
        room.clients.set(currentUserId, {
          ws,
          user: currentUserPresence,
          roomId,
        });

        // 1. Send full room state to the joining client
        ws.send(
          JSON.stringify({
            type: 'room_state',
            roomId,
            elements: room.getElementsArray(),
            users: room.getActiveUsers(),
          })
        );

        // 2. Announce join to other users in room
        room.broadcast(
          {
            type: 'user_joined',
            user: currentUserPresence,
          },
          currentUserId
        );
        return;
      }

      if (!currentRoomId || !currentUserPresence) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return;

      switch (msg.type) {
        case 'cursor_move': {
          currentUserPresence.cursor = msg.cursor;
          room.broadcast(
            {
              type: 'cursor_update',
              userId: currentUserId,
              cursor: msg.cursor,
            },
            currentUserId
          );
          break;
        }

        case 'element_update': {
          room.updateElements(msg.elements, currentUserId);
          break;
        }

        case 'element_delete': {
          room.deleteElements(msg.elementIds, currentUserId);
          break;
        }

        case 'selection_change': {
          currentUserPresence.selectedElementIds = msg.selectedElementIds;
          room.broadcast(
            {
              type: 'selection_updated',
              userId: currentUserId,
              selectedElementIds: msg.selectedElementIds,
            },
            currentUserId
          );
          break;
        }

        case 'board_sync_request': {
          ws.send(
            JSON.stringify({
              type: 'room_state',
              roomId: room.id,
              elements: room.getElementsArray(),
              users: room.getActiveUsers(),
            })
          );
          break;
        }
      }
    } catch (err: any) {
      console.error('[WS] Error processing message:', err.message);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && currentUserId) {
      const room = roomManager.getRoom(currentRoomId);
      if (room) {
        room.clients.delete(currentUserId);
        room.broadcast({
          type: 'user_left',
          userId: currentUserId,
        });
        roomManager.cleanupRoomIfEmpty(currentRoomId);
      }
    }
  });

  ws.on('error', (err: any) => {
    console.error(`[WS] Connection error for ${currentUserId}:`, err.message);
  });
}
