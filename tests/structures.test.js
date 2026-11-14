import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { OperationError } from '../public/js/engine/structure.js';
import { createStructureRegistry } from '../public/js/structures/index.js';

const registry = createStructureRegistry();
const make = (id, steps = []) => {
  const structure = registry.create(id);
  structure.runSilently(steps);
  return structure;
};

describe('every registered structure', () => {
  for (const descriptor of registry.list()) {
    it(`${descriptor.name}: seeds, runs every operation and produces valid frames`, () => {
      const structure = registry.create(descriptor.id, { seeded: true });
      for (const operation of structure.operations()) {
        const args = operation.params.map((param) => (param.kind === 'word' ? 'ca' : Math.min(param.max, Math.max(param.min, 2))));
        const { frames } = structure.run(operation.id, args);
        assert.ok(frames.length > 0, `${operation.id} produced no frames`);
        for (const frame of frames) {
          const ids = new Set(frame.nodes.map((node) => node.id));
          assert.equal(ids.size, frame.nodes.length, `${operation.id}: duplicate node ids`);
          for (const edge of frame.edges) {
            assert.ok(ids.has(edge.from) && ids.has(edge.to), `${operation.id}: edge ${edge.id} points at a missing node`);
          }
          assert.equal(typeof frame.message, 'string');
        }
      }
    });
  }
});

describe('argument validation', () => {
  it('rejects out-of-range and non-numeric input', () => {
    const stack = make('stack');
    assert.throws(() => stack.run('push', ['abc']), OperationError);
    assert.throws(() => stack.run('push', [100000]), OperationError);
    assert.throws(() => make('trie').run('insert', ['h3llo']), OperationError);
  });
});

describe('Array', () => {
  it('shifts on insert and remove', () => {
    const array = make('array', [['append', 1], ['append', 2], ['append', 3]]);
    array.run('insertAt', [1, 9]);
    assert.deepEqual(array.state().values, [1, 9, 2, 3]);
    array.run('removeAt', [0]);
    assert.deepEqual(array.state().values, [9, 2, 3]);
    assert.equal(array.run('search', [3]).result, 2);
    assert.equal(array.run('search', [42]).result, -1);
  });
});

describe('Stack and Queue', () => {
  it('stack is LIFO', () => {
    const stack = make('stack', [['push', 1], ['push', 2], ['push', 3]]);
    assert.equal(stack.run('pop').result, 3);
    assert.equal(stack.run('peek').result, 2);
  });

  it('queue is FIFO', () => {
    const queue = make('queue', [['enqueue', 1], ['enqueue', 2]]);
    assert.equal(queue.run('dequeue').result, 1);
    assert.deepEqual(queue.state().values, [2]);
  });
});

describe('Linked list', () => {
  it('inserts, removes and reverses', () => {
    const list = make('linked-list', [['insertTail', 1], ['insertTail', 2], ['insertHead', 0], ['insertTail', 3]]);
    assert.deepEqual(list.state().values, [0, 1, 2, 3]);
    list.run('remove', [2]);
    list.run('reverse');
    assert.deepEqual(list.state().values, [3, 1, 0]);
  });
});

describe('Hash table', () => {
  it('chains colliding keys in the same bucket', () => {
    const table = make('hash-table', [['insert', 3], ['insert', 10], ['insert', 17]]);
    assert.equal(table.state().chainLengths[3], 3);
    assert.equal(table.run('search', [10]).result, true);
    table.run('remove', [10]);
    assert.equal(table.run('search', [10]).result, false);
  });
});

describe('Binary search tree', () => {
  it('keeps values sorted and handles all three deletion cases', () => {
    const bst = make('bst', [50, 30, 70, 20, 40, 60, 80].map((v) => ['insert', v]));
    assert.deepEqual(bst.run('inorder').result, [20, 30, 40, 50, 60, 70, 80]);
    bst.run('delete', [20]);
    bst.run('delete', [30]);
    bst.run('delete', [50]);
    assert.deepEqual(bst.state().values, [40, 60, 70, 80]);
    assert.equal(bst.state().root, 60);
    assert.deepEqual(bst.run('levelorder').result, [60, 40, 70, 80]);
  });
});

describe('AVL tree', () => {
  it('stays balanced when values arrive in sorted order', () => {
    const avl = make('avl');
    for (let v = 1; v <= 15; v += 1) avl.run('insert', [v]);
    assert.equal(avl.state().height, 4);
    assert.deepEqual(avl.state().values, Array.from({ length: 15 }, (_, i) => i + 1));
  });

  it('handles the double-rotation cases', () => {
    const leftRight = make('avl', [['insert', 30], ['insert', 10], ['insert', 20]]);
    assert.equal(leftRight.state().root, 20);
    const rightLeft = make('avl', [['insert', 10], ['insert', 30], ['insert', 20]]);
    assert.equal(rightLeft.state().root, 20);
  });

  it('rebalances after deletion', () => {
    const avl = make('avl', [20, 10, 30, 40].map((v) => ['insert', v]));
    avl.run('delete', [10]);
    assert.equal(avl.state().root, 30);
    assert.equal(avl.state().height, 2);
  });
});

describe('Min-heap', () => {
  it('always extracts the smallest value', () => {
    const heap = make('heap', [9, 4, 7, 1, 8, 2].map((v) => ['insert', v]));
    const extracted = [];
    for (let i = 0; i < 6; i += 1) extracted.push(heap.run('extractMin').result);
    assert.deepEqual(extracted, [1, 2, 4, 7, 8, 9]);
  });
});

describe('Trie', () => {
  it('distinguishes words from prefixes', () => {
    const trie = make('trie', [['insert', 'car'], ['insert', 'cart'], ['insert', 'cat']]);
    assert.equal(trie.run('search', ['car']).result, true);
    assert.equal(trie.run('search', ['ca']).result, false);
    assert.deepEqual(trie.run('startsWith', ['car']).result, ['car', 'cart']);
  });
});

describe('Graph', () => {
  it('runs BFS, DFS and shortest path', () => {
    const graph = registry.create('graph', { seeded: true });
    assert.deepEqual(graph.run('bfs', [0]).result, [0, 1, 2, 3, 4, 5]);
    assert.deepEqual(graph.run('dfs', [0]).result, [0, 1, 3, 2, 4, 5]);
    assert.deepEqual(graph.run('shortestPath', [0, 5]).result, [0, 1, 3, 4, 5]);
  });
});

describe('Union-Find', () => {
  it('merges sets and compresses paths', () => {
    const sets = make('union-find', [['makeSets', 6], ['union', 0, 1], ['union', 2, 3], ['union', 1, 3]]);
    assert.equal(sets.run('connected', [0, 2]).result, true);
    assert.equal(sets.run('connected', [0, 4]).result, false);
    assert.equal(sets.state().sets, 3);
  });
});
