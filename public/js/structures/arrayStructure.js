import { Structure, emptyLabel, makeLabel, makeNode } from '../engine/structure.js';

const CAPACITY = 12;
const GAP = 64;

const VALUE = { name: 'value', label: 'Value', kind: 'int', min: -99, max: 999 };
const INDEX = { name: 'index', label: 'Index', kind: 'int', min: 0, max: CAPACITY - 1 };

export class ArrayStructure extends Structure {
  static descriptor = {
    id: 'array',
    name: 'Array',
    tier: 'Novice',
    summary: 'A row of numbered slots. Any slot can be reached instantly by its index.',
    seed: [['append', 8], ['append', 3], ['append', 15], ['append', 4]],
  };

  #cells = [];

  operations() {
    return [
      { id: 'append', label: 'Append', params: [VALUE], complexity: 'O(1)', summary: 'Write a value into the first free slot at the end.' },
      { id: 'get', label: 'Get', params: [INDEX], complexity: 'O(1)', summary: 'Jump straight to a slot using its index.' },
      { id: 'insertAt', label: 'Insert at', params: [INDEX, VALUE], complexity: 'O(n)', summary: 'Shift later values right, then write into the gap.' },
      { id: 'removeAt', label: 'Remove at', params: [INDEX], complexity: 'O(n)', summary: 'Delete a value, then shift later values left.' },
      { id: 'search', label: 'Linear search', params: [VALUE], complexity: 'O(n)', summary: 'Check slots one by one until the value is found.' },
    ];
  }

  append(value) {
    if (this.#length() >= CAPACITY) {
      this.capture(`The array is full - all ${CAPACITY} slots are used.`);
      return false;
    }
    const cell = this.#newCell(value);
    this.#cells.push(cell);
    this.capture(`Wrote ${value} into slot ${this.#cells.length - 1}. Nothing else had to move.`, { [cell.id]: 'new' });
    return true;
  }

  get(index) {
    if (index >= this.#length()) {
      this.capture(`Index ${index} is out of bounds. Valid indexes are 0 to ${this.#length() - 1}.`);
      return null;
    }
    const cell = this.#cells[index];
    this.capture(`address = start + ${index} x slotSize, so slot ${index} is reached in one step. It holds ${cell.value}.`, {
      [cell.id]: 'found',
    });
    return cell.value;
  }

  insertAt(index, value) {
    const length = this.#length();
    if (length >= CAPACITY) {
      this.capture(`The array is full - there is no room to insert ${value}.`);
      return false;
    }
    if (index > length) {
      this.capture(`You can insert at indexes 0 to ${length}. ${index} would leave a gap.`);
      return false;
    }

    this.#cells.push(undefined);
    let moves = 0;
    for (let i = length; i > index; i -= 1) {
      this.#cells[i] = this.#cells[i - 1];
      this.#cells[i - 1] = undefined;
      moves += 1;
      this.capture(`Shift ${this.#cells[i].value} from slot ${i - 1} to slot ${i}.`, { [this.#cells[i].id]: 'active' });
    }
    const cell = this.#newCell(value);
    this.#cells[index] = cell;
    this.capture(`Slot ${index} is free, so write ${value} there. ${moves} value(s) had to move.`, { [cell.id]: 'new' });
    return true;
  }

  removeAt(index) {
    const length = this.#length();
    if (index >= length) {
      this.capture(`Index ${index} is out of bounds. Valid indexes are 0 to ${length - 1}.`);
      return null;
    }
    const removed = this.#cells[index];
    this.capture(`Remove ${removed.value} from slot ${index}.`, { [removed.id]: 'removed' });
    this.#cells[index] = undefined;

    for (let i = index + 1; i < length; i += 1) {
      this.#cells[i - 1] = this.#cells[i];
      this.#cells[i] = undefined;
      this.capture(`Shift ${this.#cells[i - 1].value} left into slot ${i - 1}.`, { [this.#cells[i - 1].id]: 'active' });
    }
    this.#cells.length = length - 1;
    this.capture(`Done. ${length - 1 - index} value(s) shifted left to close the gap.`);
    return removed.value;
  }

  search(value) {
    for (let i = 0; i < this.#cells.length; i += 1) {
      const cell = this.#cells[i];
      if (cell.value === value) {
        this.capture(`Slot ${i} holds ${value}. Found after ${i + 1} comparison(s).`, { [cell.id]: 'found' });
        return i;
      }
      this.capture(`Slot ${i}: ${cell.value} is not ${value}, keep going.`, { [cell.id]: 'compare' });
    }
    this.capture(`${value} is not in the array. Every one of the ${this.#cells.length} slots had to be checked.`);
    return -1;
  }

  scene(marks) {
    const nodes = [];
    const labels = [];
    this.#cells.forEach((cell, index) => {
      labels.push(makeLabel(`index-${index}`, index * GAP, 42, index, 'index'));
      if (cell) nodes.push(makeNode(cell.id, index * GAP, 0, cell.value, marks, { shape: 'rect' }));
    });
    if (this.#cells.length === 0) labels.push(emptyLabel('empty array'));
    return { nodes, edges: [], labels };
  }

  state() {
    const values = this.#cells.filter(Boolean).map((cell) => cell.value);
    return { values, size: values.length };
  }

  #newCell(value) {
    return { id: this.nextId('a'), value };
  }

  #length() {
    return this.#cells.length;
  }
}
