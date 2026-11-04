import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { CanvasElement } from './types.js';

dotenv.config();

let pool: mysql.Pool | null = null;
let isConnected = false;

// Fallback in-memory store if MySQL is offline
const memoryStore = new Map<string, { id: string; title: string; elements: CanvasElement[]; appState?: any; updatedAt: Date }>();

export async function initDatabase(): Promise<boolean> {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'exclid_draw';

  try {
    const tempConnection = await mysql.createConnection({ host, port, user, password });
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConnection.end();

    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`boards\` (
        \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`title\` VARCHAR(255) NOT NULL DEFAULT 'Untitled Board',
        \`elements\` JSON NOT NULL,
        \`app_state\` JSON NULL,
        \`version\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    isConnected = true;
    console.log(`[Database] MySQL connected successfully to database "${database}".`);
    return true;
  } catch (error: any) {
    console.warn(`[Database] MySQL connection failed (${error.message}). Falling back to in-memory persistence.`);
    isConnected = false;
    return false;
  }
}

export async function getBoard(id: string): Promise<{ id: string; title: string; elements: CanvasElement[]; appState?: any } | null> {
  if (isConnected && pool) {
    try {
      const [rows]: [any[], any] = await pool.query('SELECT id, title, elements, app_state, updated_at FROM boards WHERE id = ? LIMIT 1', [id]);
      if (rows.length > 0) {
        const row = rows[0];
        return {
          id: row.id,
          title: row.title,
          elements: typeof row.elements === 'string' ? JSON.parse(row.elements) : (row.elements || []),
          appState: typeof row.app_state === 'string' ? JSON.parse(row.app_state) : (row.app_state || null),
        };
      }
    } catch (err: any) {
      console.error(`[Database] Error getting board ${id}:`, err.message);
    }
  }

  const mem = memoryStore.get(id);
  return mem ? { id: mem.id, title: mem.title, elements: mem.elements, appState: mem.appState } : null;
}

export async function saveBoard(id: string, title: string, elements: CanvasElement[], appState?: any): Promise<boolean> {
  memoryStore.set(id, { id, title, elements, appState, updatedAt: new Date() });

  if (isConnected && pool) {
    try {
      const elementsJson = JSON.stringify(elements);
      const appStateJson = appState ? JSON.stringify(appState) : null;

      await pool.query(
        `INSERT INTO boards (id, title, elements, app_state, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           elements = VALUES(elements),
           app_state = VALUES(app_state),
           updated_at = CURRENT_TIMESTAMP`,
        [id, title, elementsJson, appStateJson]
      );
      return true;
    } catch (err: any) {
      console.error(`[Database] Error saving board ${id}:`, err.message);
      return false;
    }
  }

  return true;
}

export async function deleteBoard(id: string): Promise<boolean> {
  memoryStore.delete(id);

  if (isConnected && pool) {
    try {
      await pool.query('DELETE FROM boards WHERE id = ?', [id]);
      return true;
    } catch (err: any) {
      console.error(`[Database] Error deleting board ${id}:`, err.message);
      return false;
    }
  }

  return true;
}

export async function listBoards(): Promise<Array<{ id: string; title: string; appState?: any; updatedAt: string; elementCount: number; elementsPreview?: CanvasElement[] }>> {
  if (isConnected && pool) {
    try {
      const [rows]: [any[], any] = await pool.query(
        'SELECT id, title, elements, app_state, updated_at FROM boards ORDER BY updated_at DESC LIMIT 50'
      );
      return rows.map((r) => {
        const parsedElements = typeof r.elements === 'string' ? JSON.parse(r.elements) : (r.elements || []);
        return {
          id: r.id,
          title: r.title,
          appState: typeof r.app_state === 'string' ? JSON.parse(r.app_state) : (r.app_state || null),
          updatedAt: r.updated_at,
          elementCount: Array.isArray(parsedElements) ? parsedElements.length : 0,
          elementsPreview: Array.isArray(parsedElements) ? parsedElements.slice(0, 10) : [],
        };
      });
    } catch (err: any) {
      console.error('[Database] Error listing boards:', err.message);
    }
  }

  return Array.from(memoryStore.values()).map((b) => ({
    id: b.id,
    title: b.title,
    appState: b.appState,
    updatedAt: b.updatedAt.toISOString(),
    elementCount: b.elements.length,
    elementsPreview: b.elements.slice(0, 10),
  }));
}
