const CONFETTI_COLOURS = ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#0984e3', '#e84393'];
const CONFETTI_MS = 2800;

const MELODIES = {
  success: [523.25, 659.25, 783.99, 1046.5],
  levelUp: [392, 523.25, 659.25, 783.99, 1046.5, 1318.5],
  correct: [659.25, 880],
  wrong: [220, 174.6],
};

/** Visual and audio rewards. Respects the sound setting and reduced-motion preferences. */
export class Celebration {
  #isSoundOn;
  #reducedMotion;
  #audio = null;

  constructor({ isSoundOn, reducedMotion }) {
    this.#isSoundOn = isSoundOn;
    this.#reducedMotion = reducedMotion;
  }

  confetti(pieces = 160) {
    if (this.#reducedMotion()) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.append(canvas);
    const context = canvas.getContext('2d');

    const particles = Array.from({ length: pieces }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.3,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      size: 5 + Math.random() * 6,
      spin: Math.random() * Math.PI,
      colour: CONFETTI_COLOURS[Math.floor(Math.random() * CONFETTI_COLOURS.length)],
    }));

    const start = performance.now();
    const draw = (now) => {
      const elapsed = now - start;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.globalAlpha = Math.max(0, 1 - elapsed / CONFETTI_MS);
      for (const p of particles) {
        p.vy += 0.35;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.spin += 0.15;
        context.save();
        context.translate(p.x, p.y);
        context.rotate(p.spin);
        context.fillStyle = p.colour;
        context.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        context.restore();
      }
      if (elapsed < CONFETTI_MS) requestAnimationFrame(draw);
      else canvas.remove();
    };
    requestAnimationFrame(draw);
  }

  play(name) {
    if (!this.#isSoundOn()) return;
    const notes = MELODIES[name];
    if (!notes) return;
    try {
      this.#audio ??= new AudioContext();
      const startAt = this.#audio.currentTime + 0.02;
      const step = name === 'wrong' ? 0.16 : 0.09;
      notes.forEach((frequency, index) => this.#tone(frequency, startAt + index * step, name === 'wrong' ? 'square' : 'triangle'));
    } catch {
      // Audio is optional; some browsers block it until the user interacts with the page.
    }
  }

  #tone(frequency, at, type) {
    const oscillator = this.#audio.createOscillator();
    const gain = this.#audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
    oscillator.connect(gain).connect(this.#audio.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.32);
  }
}
