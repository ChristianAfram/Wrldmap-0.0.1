import type { AABB, Vec2 } from '../types';

export interface QTItem {
  id: string;
  aabb: AABB;
}

interface QTNode {
  bounds: AABB;
  items: QTItem[];
  children: QTNode[] | null;
  depth: number;
}

const MAX_ITEMS = 8;
const MAX_DEPTH = 8;

const makeNode = (bounds: AABB, depth: number): QTNode => ({
  bounds, items: [], children: null, depth,
});

const subdivide = (node: QTNode): void => {
  const { minX, minY, maxX, maxY } = node.bounds;
  const mx = (minX + maxX) / 2;
  const my = (minY + maxY) / 2;
  const d = node.depth + 1;
  node.children = [
    makeNode({ minX, minY, maxX: mx, maxY: my }, d),
    makeNode({ minX: mx, minY, maxX, maxY: my }, d),
    makeNode({ minX, minY: my, maxX: mx, maxY }, d),
    makeNode({ minX: mx, minY: my, maxX, maxY }, d),
  ];
  const existing = node.items.splice(0);
  for (const item of existing) insertIntoNode(node, item);
};

const aabbFits = (aabb: AABB, bounds: AABB): boolean =>
  aabb.minX >= bounds.minX && aabb.maxX <= bounds.maxX &&
  aabb.minY >= bounds.minY && aabb.maxY <= bounds.maxY;

const aabbIntersects = (a: AABB, b: AABB): boolean =>
  a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;

const insertIntoNode = (node: QTNode, item: QTItem): void => {
  if (node.children) {
    for (const child of node.children) {
      if (aabbFits(item.aabb, child.bounds)) {
        insertIntoNode(child, item);
        return;
      }
    }
    node.items.push(item);
    return;
  }
  node.items.push(item);
  if (node.items.length > MAX_ITEMS && node.depth < MAX_DEPTH) subdivide(node);
};

const queryNode = (node: QTNode, rect: AABB, result: QTItem[]): void => {
  if (!aabbIntersects(node.bounds, rect)) return;
  for (const item of node.items) {
    if (aabbIntersects(item.aabb, rect)) result.push(item);
  }
  if (node.children) for (const child of node.children) queryNode(child, rect, result);
};

const queryPointNode = (node: QTNode, pt: Vec2, result: QTItem[]): void => {
  const rect: AABB = { minX: pt.x, minY: pt.y, maxX: pt.x, maxY: pt.y };
  if (!aabbIntersects(node.bounds, rect)) return;
  for (const item of node.items) {
    if (pt.x >= item.aabb.minX && pt.x <= item.aabb.maxX && pt.y >= item.aabb.minY && pt.y <= item.aabb.maxY)
      result.push(item);
  }
  if (node.children) for (const child of node.children) queryPointNode(child, pt, result);
};

const removeFromNode = (node: QTNode, id: string): boolean => {
  const idx = node.items.findIndex(i => i.id === id);
  if (idx !== -1) { node.items.splice(idx, 1); return true; }
  if (node.children) {
    for (const child of node.children) if (removeFromNode(child, id)) return true;
  }
  return false;
};

export class Quadtree {
  private root: QTNode;

  constructor(bounds: AABB) {
    this.root = makeNode(bounds, 0);
  }

  insert(item: QTItem): void {
    insertIntoNode(this.root, item);
  }

  remove(id: string): void {
    removeFromNode(this.root, id);
  }

  update(item: QTItem): void {
    this.remove(item.id);
    this.insert(item);
  }

  query(rect: AABB): QTItem[] {
    const result: QTItem[] = [];
    queryNode(this.root, rect, result);
    return result;
  }

  queryPoint(pt: Vec2): QTItem[] {
    const result: QTItem[] = [];
    queryPointNode(this.root, pt, result);
    return result;
  }

  clear(): void {
    this.root = makeNode(this.root.bounds, 0);
  }
}
