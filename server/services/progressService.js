import { validateProgress } from '../domain/validation.js';

export class ProgressService {
  #repository;

  constructor(repository) {
    this.#repository = repository;
  }

  get(userId) {
    return this.#repository.get(userId);
  }

  save(userId, input) {
    const progress = validateProgress(input);
    return this.#repository.update(userId, () => progress);
  }

  remove(userId) {
    return this.#repository.remove(userId);
  }
}
