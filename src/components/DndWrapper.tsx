'use client';

// @ts-ignore
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export function DndWrapper({ children }: { children: React.ReactNode }) {
  return <DndProvider backend={HTML5Backend}>{children}</DndProvider>;
}
