import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { nanoid } from 'nanoid';
import { getBoard, saveBoard, deleteBoard, listBoards } from './db.js';
import { roomManager } from './rooms.js';
import { CanvasElement } from './types.js';

export const apiRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Health check
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // List recent boards / sticky notes
  server.get('/boards', async () => {
    const boards = await listBoards();
    return { boards };
  });

  // Create a new board (Sticky note)
  server.post<{
    Body: {
      title?: string;
      color?: string;
      posX?: number;
      posY?: number;
      rotation?: number;
    };
  }>('/boards', async (request, reply) => {
    const id = nanoid(12);
    const title = request.body?.title || 'New Note';
    const appState = {
      color: request.body?.color || '#fef08a', // Default canary yellow
      posX: request.body?.posX ?? 100 + Math.random() * 300,
      posY: request.body?.posY ?? 100 + Math.random() * 200,
      rotation: request.body?.rotation ?? (Math.random() * 6 - 3), // -3 to +3 deg
    };

    await saveBoard(id, title, [], appState);
    return reply.status(201).send({ id, title, elements: [], appState });
  });

  // Get board details
  server.get<{ Params: { id: string } }>('/boards/:id', async (request, reply) => {
    const { id } = request.params;
    const activeRoom = roomManager.getRoom(id);
    const board = await getBoard(id);

    if (activeRoom && board) {
      return {
        id: activeRoom.id,
        title: board.title || activeRoom.title,
        elements: activeRoom.getElementsArray(),
        appState: board.appState,
        activeUsersCount: activeRoom.clients.size,
      };
    }

    if (activeRoom) {
      return {
        id: activeRoom.id,
        title: activeRoom.title,
        elements: activeRoom.getElementsArray(),
        appState: { color: '#fef08a', posX: 150, posY: 150, rotation: 1 },
        activeUsersCount: activeRoom.clients.size,
      };
    }

    if (board) {
      return board;
    }

    // Auto-create board in DB so any shared room code immediately becomes a persistent sticky note!
    const colors = ['#fef08a', '#bae6fd', '#bbf7d0', '#fbcfe8', '#e9d5ff', '#fed7aa'];
    const defaultColor = colors[Math.floor(Math.random() * colors.length)];
    const defaultAppState = {
      color: defaultColor,
      posX: 120 + Math.floor(Math.random() * 200),
      posY: 120 + Math.floor(Math.random() * 200),
      rotation: Number((Math.random() * 6 - 3).toFixed(1)),
    };
    await saveBoard(id, 'Shared Whiteboard', [], defaultAppState);
    return {
      id,
      title: 'Shared Whiteboard',
      elements: [],
      appState: defaultAppState,
    };
  });

  // Update board state (drawings and/or sticky note position & color)
  server.put<{
    Params: { id: string };
    Body: { title?: string; elements?: CanvasElement[]; appState?: any };
  }>('/boards/:id', async (request, reply) => {
    const { id } = request.params;
    const existing = await getBoard(id);

    const colors = ['#fef08a', '#bae6fd', '#bbf7d0', '#fbcfe8', '#e9d5ff', '#fed7aa'];
    const defaultColor = colors[Math.floor(Math.random() * colors.length)];
    const defaultAppState = {
      color: defaultColor,
      posX: 120 + Math.floor(Math.random() * 200),
      posY: 120 + Math.floor(Math.random() * 200),
      rotation: Number((Math.random() * 6 - 3).toFixed(1)),
    };

    const title = request.body.title ?? existing?.title ?? 'Untitled Note';
    const elements = request.body.elements ?? existing?.elements ?? [];
    const appState = {
      ...defaultAppState,
      ...(existing?.appState || {}),
      ...(request.body.appState || {}),
    };

    await saveBoard(id, title, elements, appState);
    return { success: true, savedAt: new Date().toISOString() };
  });

  // Delete board / sticky note
  server.delete<{ Params: { id: string } }>('/boards/:id', async (request, reply) => {
    const { id } = request.params;
    const ok = await deleteBoard(id);
    return { success: ok, deletedId: id };
  });
};
