import { Structure, makeEdge, makeNode } from '../engine/structure.js';
import { layoutForest } from '../engine/treeLayout.js';

const MAX_NODES = 40;
const WORD = { name: 'word', label: 'Word', kind: 'word', max: 8 };
const ROOT_ID = 'trie-root';

const sortedChildren = (node) => [...node.children.values()].sort((a, b) => a.char.localeCompare(b.char));

export class TrieStructure extends Structure {
  static descriptor = {
    id: 'trie',
    name: 'Trie',
    tier: 'Adept',
    summary: 'A prefix tree. Each edge is a letter, so words that share a beginning share a path.',
    seed: [['insert', 'car'], ['insert', 'cat'], ['insert', 'dog']],
  };

  #root = { id: ROOT_ID, char: '', children: new Map(), end: false };
  #nodeCount = 1;

  operations() {
    return [
      { id: 'insert', label: 'Insert word', params: [WORD], complexity: 'O(L)', summary: 'Follow or create one node per letter.' },
      { id: 'search', label: 'Search word', params: [WORD], complexity: 'O(L)', summary: 'Follow the letters, then check the end marker.' },
      { id: 'startsWith', label: 'Starts with', params: [{ ...WORD, name: 'prefix', label: 'Prefix' }], complexity: 'O(L)', summary: 'Every word below the prefix node matches.' },
    ];
  }

  insert(word) {
    let node = this.#root;
    this.capture(`Start at the root to insert "${word}".`, { [ROOT_ID]: 'active' });
    for (const char of word) {
      let child = node.children.get(char);
      if (child) {
        this.capture(`'${char}' already exists here, so follow it.`, { [child.id]: 'active' });
      } else {
        if (this.#nodeCount >= MAX_NODES) {
          this.capture(`The simulator keeps tries to ${MAX_NODES} nodes so they fit on screen.`);
          return false;
        }
        child = { id: this.nextId('r'), char, children: new Map(), end: false };
        node.children.set(char, child);
        this.#nodeCount += 1;
        this.capture(`No '${char}' branch yet, so create one.`, { [child.id]: 'new' });
      }
      node = child;
    }
    if (node.end) {
      this.capture(`"${word}" was already stored.`, { [node.id]: 'found' });
      return false;
    }
    node.end = true;
    this.capture(`Mark this node as the end of "${word}".`, { [node.id]: 'found' });
    return true;
  }

  search(word) {
    const node = this.#walk(word);
    if (!node) return false;
    if (node.end) {
      this.capture(`"${word}" is stored: its last node is marked as a word end.`, { [node.id]: 'found' });
      return true;
    }
    this.capture(`The letters exist, but "${word}" is only a prefix here: its last node is not a word end.`, { [node.id]: 'compare' });
    return false;
  }

  startsWith(prefix) {
    const node = this.#walk(prefix);
    if (!node) return [];
    const words = [];
    const marks = {};
    const collect = (current, text) => {
      marks[current.id] = 'found';
      if (current.end) words.push(text);
      for (const child of sortedChildren(current)) collect(child, text + child.char);
    };
    collect(node, prefix);
    this.capture(
      words.length ? `${words.length} word(s) start with "${prefix}": ${words.join(', ')}.` : `The path exists, but no complete word starts with "${prefix}".`,
      marks,
    );
    return words;
  }

  scene(marks) {
    const { positions } = layoutForest([this.#root], sortedChildren);
    const nodes = [];
    const edges = [];
    for (const [node, position] of positions) {
      const isRoot = node === this.#root;
      nodes.push(
        makeNode(node.id, position.x, position.y, isRoot ? '' : node.char, marks, {
          caption: isRoot ? 'root' : '',
          variant: node.end ? 'terminal' : '',
        }),
      );
      for (const child of node.children.values()) edges.push(makeEdge(node.id, child.id, marks, { directed: false }));
    }
    return { nodes, edges, labels: [] };
  }

  state() {
    const words = [];
    const collect = (node, text) => {
      if (node.end) words.push(text);
      for (const child of sortedChildren(node)) collect(child, text + child.char);
    };
    collect(this.#root, '');
    return { words, nodeCount: this.#nodeCount };
  }

  #walk(text) {
    let node = this.#root;
    this.capture(`Start at the root and follow "${text}" letter by letter.`, { [ROOT_ID]: 'active' });
    for (let i = 0; i < text.length; i += 1) {
      const child = node.children.get(text[i]);
      if (!child) {
        this.capture(`There is no '${text[i]}' after "${text.slice(0, i)}". Stop: nothing stored starts with "${text}".`, {
          [node.id]: 'removed',
        });
        return null;
      }
      this.capture(`Follow '${text[i]}'.`, { [child.id]: 'active' });
      node = child;
    }
    return node;
  }
}
