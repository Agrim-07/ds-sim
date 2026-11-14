export const LEVEL_GAP = 84;
export const SIBLING_GAP = 58;

/**
 * Binary-tree layout: x is the in-order rank, y is the depth.
 * Left children always sit left of their parent, which is what makes BSTs readable.
 */
export function layoutBinary(root, getLeft, getRight) {
  const positions = new Map();
  let rank = 0;
  let maxDepth = 0;
  const visit = (node, depth) => {
    if (node === null || node === undefined) return;
    visit(getLeft(node), depth + 1);
    positions.set(node, { x: rank * SIBLING_GAP, y: depth * LEVEL_GAP });
    rank += 1;
    maxDepth = Math.max(maxDepth, depth);
    visit(getRight(node), depth + 1);
  };
  visit(root, 0);
  return { positions, width: Math.max(0, rank - 1) * SIBLING_GAP, depth: maxDepth };
}

/**
 * General tree / forest layout: leaves are placed left to right, and each parent
 * is centred above its first and last child.
 */
export function layoutForest(roots, getChildren) {
  const positions = new Map();
  let nextLeafX = 0;
  let maxDepth = 0;
  const place = (node, depth) => {
    maxDepth = Math.max(maxDepth, depth);
    const children = getChildren(node);
    let x;
    if (children.length === 0) {
      x = nextLeafX;
      nextLeafX += SIBLING_GAP;
    } else {
      const childXs = children.map((child) => place(child, depth + 1));
      x = (childXs[0] + childXs[childXs.length - 1]) / 2;
    }
    positions.set(node, { x, y: depth * LEVEL_GAP });
    return x;
  };
  for (const root of roots) {
    place(root, 0);
    nextLeafX += SIBLING_GAP * 0.5;
  }
  return { positions, width: Math.max(0, nextLeafX - SIBLING_GAP * 1.5), depth: maxDepth };
}
