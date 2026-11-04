import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';
import { apiRoutes } from './routes.js';
import { handleWebSocketConnection } from './wsHandler.js';

dotenv.config();

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

async function start() {
  try {
    // 1. Initialize MySQL database
    await initDatabase();

    // 2. Register CORS
    await server.register(cors, {
      origin: '*', // Allow client connections
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });

    // 3. Register WebSockets
    await server.register(websocket);

    // 4. WebSocket connection route
    server.get('/ws', { websocket: true }, (socket, req) => {
      handleWebSocketConnection(socket);
    });

    // 5. Register REST API routes
    await server.register(apiRoutes, { prefix: '/api' });

    // 6. Start server
    const port = parseInt(process.env.PORT || '4000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    console.log(`🚀 Excalidraw Realtime Hub running on http://${host}:${port}`);
    console.log(`🔌 WebSockets listening at ws://${host}:${port}/ws`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
