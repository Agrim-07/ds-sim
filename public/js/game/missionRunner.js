import { starsFor } from './rewards.js';

/** Tracks a learner's way through one mission: current step, task goals and quiz mistakes. */
export class MissionRunner {
  #mission;
  #index = 0;
  #mistakes = 0;
  #counts = {};
  #last = null;
  #taskDone = false;
  #quizSolved = false;

  constructor(mission) {
    this.#mission = mission;
  }

  get step() {
    return this.#mission.steps[this.#index];
  }

  get index() {
    return this.#index;
  }

  get total() {
    return this.#mission.steps.length;
  }

  get isLastStep() {
    return this.#index === this.total - 1;
  }

  get stars() {
    return starsFor(this.#mistakes);
  }

  get mistakes() {
    return this.#mistakes;
  }

  get taskDone() {
    return this.#taskDone;
  }

  canAdvance() {
    if (this.step.type === 'task') return this.#taskDone;
    if (this.step.type === 'quiz') return this.#quizSolved;
    return true;
  }

  advance() {
    if (!this.canAdvance() || this.isLastStep) return false;
    this.#index += 1;
    this.#counts = {};
    this.#last = null;
    this.#taskDone = false;
    this.#quizSolved = false;
    return true;
  }

  /** Feeds a simulator operation to the current task. Returns true when it completes the task. */
  recordOperation({ op, args, result }, state) {
    if (this.step.type !== 'task' || this.#taskDone) return false;
    this.#counts[op] = (this.#counts[op] ?? 0) + 1;
    this.#last = { op, args, result };
    this.#taskDone = Boolean(this.step.check({ counts: { ...this.#counts }, last: this.#last, state }));
    return this.#taskDone;
  }

  /** Returns true for a correct answer, false for a wrong one, null if the quiz is already solved. */
  answer(optionIndex) {
    if (this.step.type !== 'quiz' || this.#quizSolved) return null;
    if (optionIndex === this.step.answer) {
      this.#quizSolved = true;
      return true;
    }
    this.#mistakes += 1;
    return false;
  }
}
