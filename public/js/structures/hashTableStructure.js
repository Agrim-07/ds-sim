import { Structure, makeEdge, makeLabel, makeNode } from '../engine/structure.js';

const BUCKETS = 7;
const MAX_KEYS = 18;
const ROW = 58;
const CHAIN_X = 104;
const CHAIN_GAP = 72;
const KEY = { name: 'key', label: 'Key', kind: 'int', min: 0, max: 999 };

const bucketId = (index) => `bucket-${index}`;

export class HashTableStructure extends Structure {
  static descriptor = {
    id: 'hash-table',
    name: 'Hash Table',
    tier: 'Apprentice',
    summary: 'A hash function turns a key into a bucket number, giving near-instant lookups.',
    seed: [['insert', 15], ['insert', 22], ['insert', 10], ['insert', 31]],
  };

  #buckets = Array.from({ length: BUCKETS }, () => []);
  #size = 0;

  operations() {
    return [
      { id: 'insert', label: 'Insert', params: [KEY], complexity: 'O(1) average', summary: 'Hash the key and add it to that bucket\'s chain.' },
      { id: 'search', label: 'Search', params: [KEY], complexity: 'O(1) average', summary: 'Hash the key and scan only that bucket.' },
      { id: 'remove', label: 'Remove', params: [KEY], complexity: 'O(1) average', summary: 'Hash the key and unlink it from the chain.' },
    ];
  }

  insert(key) {
    if (this.#size >= MAX_KEYS) {
      this.capture(`The simulator stops at ${MAX_KEYS} keys. A real table would now grow and rehash.`);
      return false;
    }
    const index = this.#hash(key);
    const chain = this.#buckets[index];
    for (const item of chain) {
      if (item.key === key) {
        this.capture(`${key} is already stored. Keys in a hash table are unique.`, { [item.id]: 'found' });
        return false;
      }
      this.capture(`${item.key} is not ${key}, check the next one in the chain.`, { [item.id]: 'compare' });
    }
    const item = { id: this.nextId('h'), key };
    chain.push(item);
    this.#size += 1;
    this.capture(
      chain.length > 1
        ? `Collision! Bucket ${index} already had ${chain.length - 1} key(s), so ${key} is chained after them.`
        : `Bucket ${index} was empty, so ${key} goes straight in.`,
      { [item.id]: 'new' },
    );
    return true;
  }

  search(key) {
    const index = this.#hash(key);
    for (const item of this.#buckets[index]) {
      if (item.key === key) {
        this.capture(`Found ${key} in bucket ${index}. The other buckets were never looked at.`, { [item.id]: 'found' });
        return true;
      }
      this.capture(`${item.key} is not ${key}.`, { [item.id]: 'compare' });
    }
    this.capture(`Bucket ${index} has no ${key}, so ${key} is not in the table.`);
    return false;
  }

  remove(key) {
    const index = this.#hash(key);
    const chain = this.#buckets[index];
    const position = chain.findIndex((item) => item.key === key);
    if (position === -1) {
      this.capture(`${key} is not in bucket ${index}, so there is nothing to remove.`);
      return false;
    }
    this.capture(`Found ${key}. Unlink it from bucket ${index}'s chain.`, { [chain[position].id]: 'removed' });
    chain.splice(position, 1);
    this.#size -= 1;
    this.capture(`${key} removed. Load factor is now ${this.#loadFactor()}.`);
    return true;
  }

  scene(marks) {
    const nodes = [];
    const edges = [];
    this.#buckets.forEach((chain, index) => {
      const y = index * ROW;
      nodes.push(makeNode(bucketId(index), 0, y, index, marks, { shape: 'rect', variant: 'bucket' }));
      let previous = bucketId(index);
      chain.forEach((item, position) => {
        nodes.push(makeNode(item.id, CHAIN_X + position * CHAIN_GAP, y, item.key, marks, { shape: 'rect' }));
        edges.push(makeEdge(previous, item.id, marks));
        previous = item.id;
      });
    });
    const labels = [
      makeLabel('load', CHAIN_X + 110, -48, `${this.#size} keys / ${BUCKETS} buckets, load factor ${this.#loadFactor()}`, 'info'),
    ];
    return { nodes, edges, labels };
  }

  state() {
    return {
      size: this.#size,
      keys: this.#buckets.flat().map((item) => item.key),
      chainLengths: this.#buckets.map((chain) => chain.length),
    };
  }

  #hash(key) {
    const index = key % BUCKETS;
    this.capture(`hash(${key}) = ${key} mod ${BUCKETS} = ${index}. Go to bucket ${index}.`, { [bucketId(index)]: 'active' });
    return index;
  }

  #loadFactor() {
    return (this.#size / BUCKETS).toFixed(2);
  }
}
