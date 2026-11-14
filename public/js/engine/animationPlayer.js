const BASE_DELAY_MS = 1100;

/** Steps through a list of frames: play, pause, step forward/back and change speed. */
export class AnimationPlayer {
  #renderer;
  #onFrame;
  #onStateChange;
  #reducedMotion;
  #frames = [];
  #index = -1;
  #timer = 0;
  #playing = false;
  #speed = 1;
  #waiters = [];

  constructor(renderer, { onFrame = () => {}, onStateChange = () => {}, reducedMotion = false } = {}) {
    this.#renderer = renderer;
    this.#onFrame = onFrame;
    this.#onStateChange = onStateChange;
    this.#reducedMotion = reducedMotion;
  }

  get playing() {
    return this.#playing;
  }

  get position() {
    return { index: this.#index, total: this.#frames.length };
  }

  /** Shows a single scene immediately, without animation. */
  show(scene) {
    this.#stop();
    this.#releaseWaiters();
    this.#frames = [scene];
    this.#index = 0;
    this.#renderer.render(scene, 0);
    this.#onFrame(scene, 0, 1);
  }

  load(frames, { autoplay = true } = {}) {
    this.#stop();
    this.#releaseWaiters();
    this.#frames = frames;
    this.#index = -1;
    if (autoplay) this.play();
    else this.#goTo(0);
  }

  play() {
    if (this.#frames.length === 0) return;
    if (this.#index >= this.#frames.length - 1) this.#index = -1;
    this.#playing = true;
    this.#onStateChange(true);
    this.#advance();
  }

  pause() {
    this.#stop();
  }

  toggle() {
    if (this.#playing) this.pause();
    else this.play();
  }

  next() {
    this.#stop();
    this.#goTo(this.#index + 1);
  }

  previous() {
    this.#stop();
    this.#goTo(this.#index - 1);
  }

  skipToEnd() {
    this.#stop();
    this.#goTo(this.#frames.length - 1);
  }

  setSpeed(multiplier) {
    this.#speed = Math.min(4, Math.max(0.25, multiplier));
  }

  /** Resolves once the last frame of the current animation has been shown. */
  whenFinished() {
    if (this.#frames.length === 0 || this.#index >= this.#frames.length - 1) return Promise.resolve();
    return new Promise((resolve) => this.#waiters.push(resolve));
  }

  destroy() {
    this.#stop();
    this.#releaseWaiters();
  }

  #advance() {
    if (!this.#playing) return;
    this.#goTo(this.#index + 1);
    if (this.#index < this.#frames.length - 1) {
      this.#timer = setTimeout(() => this.#advance(), this.#delay());
    } else {
      this.#stop();
    }
  }

  #goTo(index) {
    if (this.#frames.length === 0) return;
    const clamped = Math.max(0, Math.min(this.#frames.length - 1, index));
    if (clamped === this.#index) return;
    this.#index = clamped;
    const frame = this.#frames[clamped];
    this.#renderer.render(frame, this.#reducedMotion ? 0 : Math.min(520, this.#delay() * 0.6));
    this.#onFrame(frame, clamped, this.#frames.length);
    if (clamped === this.#frames.length - 1) this.#releaseWaiters();
  }

  #delay() {
    return (this.#reducedMotion ? 450 : BASE_DELAY_MS) / this.#speed;
  }

  #stop() {
    clearTimeout(this.#timer);
    if (this.#playing) {
      this.#playing = false;
      this.#onStateChange(false);
    }
  }

  #releaseWaiters() {
    const waiters = this.#waiters;
    this.#waiters = [];
    for (const resolve of waiters) resolve();
  }
}
