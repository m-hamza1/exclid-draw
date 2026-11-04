'use client';

import React from 'react';
import { UserPresence, ViewportState } from '../types/canvas';
import { MousePointer2 } from 'lucide-react';

interface PresenceCursorsProps {
  users: UserPresence[];
  viewport: ViewportState;
  currentUserId?: string;
}

export const PresenceCursors: React.FC<PresenceCursorsProps> = ({
  users,
  viewport,
  currentUserId,
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {users
        .filter((u) => u.userId !== currentUserId && u.cursor !== null)
        .map((user) => {
          if (!user.cursor) return null;

          // Convert scene coordinates to screen coordinates
          const screenX = user.cursor.x * viewport.zoom + viewport.panX;
          const screenY = user.cursor.y * viewport.zoom + viewport.panY;

          return (
            <div
              key={user.userId}
              className="absolute transition-transform duration-75 ease-out"
              style={{
                transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
              }}
            >
              <MousePointer2
                size={18}
                className="drop-shadow-sm"
                style={{
                  color: user.userColor,
                  fill: user.userColor,
                  transform: 'rotate(-45deg) translate(-2px, -2px)',
                }}
              />
              <div
                className="mt-1 ml-4 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shadow-md whitespace-nowrap"
                style={{ backgroundColor: user.userColor }}
              >
                {user.userName}
              </div>
            </div>
          );
        })}
    </div>
  );
};
