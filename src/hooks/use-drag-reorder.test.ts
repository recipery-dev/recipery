/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import * as React from "react";
import { useDragReorder } from "./use-drag-reorder";

interface Row {
  id: string;
}

function setup(initial: Row[]) {
  return renderHook(() => {
    const [items, setItems] = React.useState(initial);
    const reorder = useDragReorder(setItems);
    return { items, ...reorder };
  });
}

function drag(
  result: { current: ReturnType<typeof setup>["result"]["current"] },
  fromId: string,
  toId: string
) {
  const dragEvent = { preventDefault: () => {} } as React.DragEvent;
  act(() => result.current.handleProps(fromId).onDragStart());
  act(() => result.current.dropTargetProps(toId).onDrop(dragEvent));
}

describe("useDragReorder", () => {
  it("moves the dragged row to the drop target's position", () => {
    const { result } = setup([{ id: "a" }, { id: "b" }, { id: "c" }]);
    drag(result, "a", "c");
    expect(result.current.items.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("moving forward inserts before the target that was ahead of it", () => {
    const { result } = setup([{ id: "a" }, { id: "b" }, { id: "c" }]);
    drag(result, "c", "a");
    expect(result.current.items.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("does nothing when dropped on itself", () => {
    const { result } = setup([{ id: "a" }, { id: "b" }]);
    drag(result, "a", "a");
    expect(result.current.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("clears dragged/drop-target state after a drop", () => {
    const { result } = setup([{ id: "a" }, { id: "b" }]);
    drag(result, "a", "b");
    expect(result.current.isDragged("a")).toBe(false);
    expect(result.current.isDropTarget("b")).toBe(false);
  });

  it("reports the drop target only while something else is being dragged over it", () => {
    const { result } = setup([{ id: "a" }, { id: "b" }]);
    act(() => result.current.handleProps("a").onDragStart());
    act(() => result.current.dropTargetProps("b").onDragEnter());
    expect(result.current.isDropTarget("b")).toBe(true);
    expect(result.current.isDropTarget("a")).toBe(false);
  });
});
