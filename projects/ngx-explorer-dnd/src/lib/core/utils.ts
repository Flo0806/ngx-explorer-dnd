// With help from cdkDrag: https://github.com/angular/components/blob/72547a41d4230cea0c6a5448e85bd60cfc26bd35/src/cdk/drag-drop/drag-utils.ts
/** Clamps a number between zero and a maximum. */
function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

export interface Translate3DPosition {
  startX: number;
  startY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  halfWidthX: number;
  halfHeightY: number;
}

export enum DragRowPosition {
  SMALLER,
  GREATER,
  SAME,
  UNDEFINED,
}

export interface SameDragRow {
  sameRow: boolean;
  dragRowPosition: DragRowPosition;
  sameLineAsMouse: DragRowPosition;
}

/**
 * Moves an item one index in an array to another.
 * @param array Array in which to move the item.
 * @param fromIndex Starting index of the item.
 * @param toIndex Index to which the item should be moved.
 */
export function moveItemInArray<T = any>(
  array: T[],
  fromIndex: number,
  toIndex: number
): void {
  const from = clamp(fromIndex, array.length - 1);
  const to = clamp(toIndex, array.length - 1);

  console.log(from, to);
  if (from === to) {
    return;
  }

  const target = array[from];
  const delta = to < from ? -1 : 1;

  for (let i = from; i !== to; i += delta) {
    array[i] = array[i + delta];
  }

  array[to] = target;
}
