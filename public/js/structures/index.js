import { StructureRegistry } from '../engine/structureRegistry.js';
import { ArrayStructure } from './arrayStructure.js';
import { AvlStructure } from './avlStructure.js';
import { BstStructure } from './bstStructure.js';
import { GraphStructure } from './graphStructure.js';
import { HashTableStructure } from './hashTableStructure.js';
import { HeapStructure } from './heapStructure.js';
import { LinkedListStructure } from './linkedListStructure.js';
import { QueueStructure } from './queueStructure.js';
import { StackStructure } from './stackStructure.js';
import { TrieStructure } from './trieStructure.js';
import { UnionFindStructure } from './unionFindStructure.js';

export function createStructureRegistry() {
  return new StructureRegistry()
    .register(ArrayStructure)
    .register(StackStructure)
    .register(QueueStructure)
    .register(LinkedListStructure)
    .register(HashTableStructure)
    .register(BstStructure)
    .register(HeapStructure)
    .register(TrieStructure)
    .register(AvlStructure)
    .register(GraphStructure)
    .register(UnionFindStructure);
}
