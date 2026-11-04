import type { WebSocket } from 'ws';
import { CanvasElement, UserPresence, WSServerMessage } from './types.js';
import { getBoard, saveBoard } from './db.js';

interface ClientSession {
  ws: WebSocket;
  user: UserPresence;
  roomId: string;
}

class Room {
  public id: string;
  public title: string = 'Untitled Whiteboard';
  public clients: Map<string, ClientSession> = new Map();
  public elements: Map<string, CanvasElement> = new Map();
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(id: string) {
    this.id = id;
  }

  public async loadFromStorage(): Promise<void> {
    const saved = await getBoard(this.id);
    if (saved) {
      this.title = saved.title;
      this.elements.clear();
      for (const el of saved.elements) {
        if (!el.isDeleted) {
          this.elements.set(el.id, el);
        }
      }
    }
  }

  public broadcast(message: WSServerMessage, excludeUserId?: string) {
    const raw = JSON.stringify(message);
    for (const [userId, session] of this.clients.entries()) {
      if (excludeUserId && userId === excludeUserId) continue;
      if (session.ws.readyState === 1 /* OPEN */) {
        try {
          session.ws.send(raw);
        } catch (err) {
          console.error(`Failed to send message to user ${userId}:`, err);
        }
      }
    }
  }

  public getActiveUsers(): UserPresence[] {
    return Array.from(this.clients.values()).map((c) => c.user);
  }

  public getElementsArray(): CanvasElement[] {
    return Array.from(this.elements.values());
  }

  public updateElements(updated: CanvasElement[], updatedBy: string) {
    for (const el of updated) {
      if (el.isDeleted) {
        this.elements.delete(el.id);
      } else {
        this.elements.set(el.id, el);
      }
    }

    // Debounced snapshot persistence to DB (every 3 seconds after last update)
    this.scheduleDebouncedSave();

    // Broadcast change to peers
    this.broadcast(
      {
        type: 'elements_updated',
        elements: updated,
        updatedBy,
      },
      updatedBy
    );
  }

  public deleteElements(elementIds: string[], updatedBy: string) {
    for (const id of elementIds) {
      this.elements.delete(id);
    }
    this.scheduleDebouncedSave();
    this.broadcast(
      {
        type: 'elements_deleted',
        elementIds,
        updatedBy,
      },
      updatedBy
    );
  }

  public scheduleDebouncedSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(async () => {
      try {
        await saveBoard(this.id, this.title, this.getElementsArray());
        console.log(`[Storage] Auto-saved board "${this.id}" (${this.elements.size} elements)`);
      } catch (err: any) {
        console.error(`[Storage] Auto-save error for "${this.id}":`, err.message);
      }
    }, 3000);
  }
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();

  public async getOrCreateRoom(roomId: string): Promise<Room> {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Room(roomId);
      await room.loadFromStorage();
      this.rooms.set(roomId, room);
    }
    return room;
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  public cleanupRoomIfEmpty(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room && room.clients.size === 0) {
      // Save one final time before unloading from memory
      saveBoard(room.id, room.title, room.getElementsArray());
      this.rooms.delete(roomId);
      console.log(`[Rooms] Unloaded empty room "${roomId}" from memory.`);
    }
  }
}

export const roomManager = new RoomManager();
