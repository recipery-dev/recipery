"use client";

import * as React from "react";

/**
 * HTML5 drag-and-drop reordering for a flat list of rows, each identified
 * by `id` — the state and splice logic shared by the recipe form's steps
 * and ingredients, and Settings' discovery sources. Rendering (the drag
 * handle, drop-target border, dragged-row opacity) stays with the caller
 * since that differs per list; this just owns "what's being dragged, what's
 * under the pointer, and where it lands."
 */
export function useDragReorder<T extends { id: string }>(
  setItems: React.Dispatch<React.SetStateAction<T[]>>
) {
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);

  const reorder = React.useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      setItems((prev) => {
        const from = prev.findIndex((item) => item.id === fromId);
        const to = prev.findIndex((item) => item.id === toId);
        if (from < 0 || to < 0) return prev;
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    },
    [setItems]
  );

  const endDrag = React.useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  /** Spread onto the row — tracks what's being dragged over it and drops onto it. */
  const dropTargetProps = (id: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (draggedId) e.preventDefault();
    },
    onDragEnter: () => {
      if (draggedId && draggedId !== id) setDragOverId(id);
    },
    onDragLeave: (e: React.DragEvent) => {
      // dragenter/dragleave fire when moving onto a child too — only clear
      // once the pointer actually left the row.
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setDragOverId((prev) => (prev === id ? null : prev));
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (draggedId) reorder(draggedId, id);
      endDrag();
    },
  });

  /** Spread onto the drag handle itself. */
  const handleProps = (id: string) => ({
    draggable: true,
    onDragStart: () => setDraggedId(id),
    onDragEnd: endDrag,
    title: "Drag to reorder",
  });

  const isDragged = (id: string) => draggedId === id;
  const isDropTarget = (id: string) => dragOverId === id && !!draggedId && draggedId !== id;

  return { dropTargetProps, handleProps, isDragged, isDropTarget };
}
