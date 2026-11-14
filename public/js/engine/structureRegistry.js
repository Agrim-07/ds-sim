/**
 * Catalogue of available structures. Adding a new structure means writing one class
 * and registering it; no existing view or engine code has to change.
 */
export class StructureRegistry {
  #classes = new Map();

  register(StructureClass) {
    const { descriptor } = StructureClass;
    if (!descriptor?.id) throw new Error(`${StructureClass.name} needs a static descriptor with an id.`);
    this.#classes.set(descriptor.id, StructureClass);
    return this;
  }

  has(id) {
    return this.#classes.has(id);
  }

  descriptor(id) {
    return this.#classes.get(id)?.descriptor ?? null;
  }

  list() {
    return [...this.#classes.values()].map((StructureClass) => StructureClass.descriptor);
  }

  create(id, { seeded = false } = {}) {
    const StructureClass = this.#classes.get(id);
    if (!StructureClass) throw new Error(`Unknown data structure "${id}".`);
    const structure = new StructureClass();
    if (seeded) structure.runSilently(StructureClass.descriptor.seed ?? []);
    return structure;
  }
}
