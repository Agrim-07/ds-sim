import { h, svg } from '../core/dom.js';
import { AnimationPlayer } from '../engine/animationPlayer.js';
import { OperationError } from '../engine/structure.js';
import { SvgRenderer } from '../engine/svgRenderer.js';

const SAMPLE_WORDS = ['car', 'cart', 'cat', 'dog', 'door', 'tea', 'ten', 'tree'];
const SPEEDS = [0.5, 1, 1.5, 2, 3];

function suggestion(param) {
  if (param.kind === 'word') return SAMPLE_WORDS[Math.floor(Math.random() * SAMPLE_WORDS.length)];
  if (['index', 'count'].includes(param.name)) return String(Math.min(param.max, Math.max(param.min, param.name === 'count' ? 8 : 0)));
  const high = Math.min(param.max, param.max > 20 ? 99 : param.max);
  const low = Math.max(param.min, param.max > 20 ? 1 : param.min);
  return String(low + Math.floor(Math.random() * (high - low + 1)));
}

/**
 * The interactive simulator: canvas, narration, playback controls and one small form
 * per operation. It knows nothing about missions or history - it simply reports each
 * operation through onOperation, and callers decide what to do with it.
 */
export class SimulatorPanel {
  element;
  #structure;
  #player;
  #renderer;
  #onOperation;
  #notify;
  #ui = {};

  constructor({ structure, title, onOperation = () => {}, notify = () => {}, reducedMotion = false }) {
    this.#structure = structure;
    this.#onOperation = onOperation;
    this.#notify = notify;
    this.element = this.#build(title);
    this.#renderer = new SvgRenderer(this.#ui.canvas);
    this.#player = new AnimationPlayer(this.#renderer, {
      reducedMotion,
      onFrame: (frame, index, total) => {
        this.#ui.message.textContent = frame.message || 'Choose an operation below to see it animated.';
        this.#ui.step.textContent = total > 1 ? `Step ${index + 1} of ${total}` : '';
      },
      onStateChange: (playing) => {
        this.#ui.play.textContent = playing ? 'Pause' : 'Play';
        this.#ui.play.setAttribute('aria-pressed', String(playing));
      },
    });
    this.#player.show(structure.snapshot());
  }

  get structure() {
    return this.#structure;
  }

  run(operationId, args) {
    let outcome;
    try {
      outcome = this.#structure.run(operationId, args);
    } catch (error) {
      if (error instanceof OperationError) {
        this.#notify(error.message, 'error');
        return false;
      }
      throw error;
    }
    const operation = this.#structure.operations().find((candidate) => candidate.id === operationId);
    this.#ui.cost.textContent = `${operation.label}: ${operation.complexity}`;
    this.#player.load(outcome.frames);
    this.#onOperation({ op: operationId, args: outcome.args, result: outcome.result, finished: this.#player.whenFinished() });
    return true;
  }

  /** Applies a list of [op, ...args] steps instantly, e.g. to rebuild a session from history. */
  replay(steps) {
    try {
      this.#structure.runSilently(steps);
    } catch (error) {
      if (!(error instanceof OperationError)) throw error;
    }
    this.#player.show(this.#structure.snapshot(`Replayed ${steps.length} operation(s).`));
  }

  destroy() {
    this.#player.destroy();
    this.#renderer.destroy();
  }

  #build(title) {
    this.#ui.canvas = svg('svg', { class: 'sim-canvas', role: 'img', 'aria-label': `${title} visualisation` });
    this.#ui.message = h('p', { class: 'sim-message' });
    this.#ui.step = h('span', { class: 'sim-step' });
    this.#ui.cost = h('span', { class: 'chip chip-cost' }, 'Pick an operation');
    this.#ui.play = h('button', { class: 'btn btn-small btn-primary', type: 'button', 'aria-pressed': 'false', onClick: () => this.#player.toggle() }, 'Play');

    const speed = h('select', { class: 'input input-small', 'aria-label': 'Animation speed' }, SPEEDS.map((value) => h('option', { value, selected: value === 1 }, `${value}x`)));
    speed.addEventListener('change', () => this.#player.setSpeed(Number(speed.value)));

    const controls = h(
      'div',
      { class: 'sim-controls', role: 'group', 'aria-label': 'Playback' },
      h('button', { class: 'btn btn-small btn-ghost', type: 'button', onClick: () => this.#player.previous(), 'aria-label': 'Previous step' }, '< Step'),
      this.#ui.play,
      h('button', { class: 'btn btn-small btn-ghost', type: 'button', onClick: () => this.#player.next(), 'aria-label': 'Next step' }, 'Step >'),
      h('button', { class: 'btn btn-small btn-ghost', type: 'button', onClick: () => this.#player.skipToEnd() }, 'Skip'),
      h('label', { class: 'sim-speed' }, 'Speed ', speed),
    );

    return h(
      'section',
      { class: 'sim card' },
      h('header', { class: 'sim-head' }, h('h2', { class: 'sim-title' }, title), this.#ui.cost),
      h('div', { class: 'sim-stage' }, this.#ui.canvas),
      h('div', { class: 'sim-narration', 'aria-live': 'polite' }, this.#ui.step, this.#ui.message),
      controls,
      h('div', { class: 'sim-ops' }, this.#structure.operations().map((operation) => this.#buildOperation(operation))),
    );
  }

  #buildOperation(operation) {
    const inputs = operation.params.map((param) =>
      h('input', {
        class: 'input input-small',
        name: param.name,
        type: param.kind === 'int' ? 'number' : 'text',
        min: param.kind === 'int' ? param.min : undefined,
        max: param.kind === 'int' ? param.max : undefined,
        maxlength: param.kind === 'word' ? param.max : undefined,
        autocomplete: 'off',
        spellcheck: 'false',
        required: true,
        value: suggestion(param),
        'aria-label': `${operation.label}: ${param.label}`,
        placeholder: param.label,
      }),
    );

    const onSubmit = (event) => {
      event.preventDefault();
      if (!this.run(operation.id, inputs.map((input) => input.value))) return;
      operation.params.forEach((param, index) => {
        if (['value', 'key', 'word'].includes(param.name)) inputs[index].value = suggestion(param);
      });
    };

    return h(
      'form',
      { class: 'op-form', title: operation.summary, onSubmit, novalidate: true },
      h('span', { class: 'op-name' }, operation.label),
      inputs,
      h('button', { class: 'btn btn-small', type: 'submit' }, 'Run'),
      h('span', { class: 'op-cost' }, operation.complexity),
    );
  }
}
