import { h, prefersReducedMotion, randomId } from '../core/dom.js';
import { ACTS, findMission, isUnlocked, nextMission } from '../game/curriculum.js';
import { MissionRunner } from '../game/missionRunner.js';
import { rankFor } from '../game/rewards.js';
import { openModal } from '../ui/modal.js';
import { SimulatorPanel } from '../ui/simulatorPanel.js';
import { starRow } from './components.js';

const COUNT_UP_MS = 900;

export function createMissionView({ progress, history, registry, celebration, toaster, router }) {
  return {
    mount(container, { params }) {
      const mission = findMission(params.id);
      if (!mission) {
        router.navigate('/story');
        return undefined;
      }
      if (!isUnlocked(mission.id, (id) => progress.isCompleted(id))) {
        toaster.show('Finish the previous mission to unlock this one.', 'info');
        router.navigate('/story');
        return undefined;
      }

      const act = ACTS.find((candidate) => candidate.id === mission.act);
      const runner = new MissionRunner(mission);
      const sessionId = randomId();
      let panel = null;

      const stepBody = h('div', { class: 'step-body' });
      const dots = h('ol', { class: 'step-dots', 'aria-label': 'Mission progress' });
      const nextButton = h('button', { class: 'btn btn-primary', type: 'button', onClick: () => onNext() });

      const renderDots = () => {
        dots.replaceChildren(
          ...mission.steps.map((step, index) =>
            h('li', { class: index < runner.index ? 'dot dot-done' : index === runner.index ? 'dot dot-current' : 'dot', title: step.type }),
          ),
        );
      };

      const renderNext = () => {
        nextButton.textContent = runner.isLastStep ? 'Complete mission' : 'Continue';
        nextButton.disabled = !runner.canAdvance();
        nextButton.classList.toggle('pulse', runner.canAdvance() && runner.step.type !== 'lesson');
      };

      const renderStep = () => {
        renderDots();
        renderNext();
        const step = runner.step;
        if (step.type === 'lesson') stepBody.replaceChildren(renderLesson(step));
        else if (step.type === 'task') stepBody.replaceChildren(renderTask(step, runner.taskDone));
        else stepBody.replaceChildren(renderQuiz(step, onAnswer));
        stepBody.focus({ preventScroll: true });
      };

      function onAnswer(index, button, explanation, optionButtons) {
        const correct = runner.answer(index);
        if (correct === null) return;
        explanation.hidden = false;
        if (correct) {
          button.classList.add('option-correct');
          optionButtons.forEach((other) => (other.disabled = true));
          explanation.textContent = `Correct! ${runner.step.explain}`;
          explanation.className = 'quiz-explain quiz-explain-good';
          celebration.play('correct');
        } else {
          button.classList.add('option-wrong');
          button.disabled = true;
          explanation.textContent = 'Not quite. Have another look and try again.';
          explanation.className = 'quiz-explain quiz-explain-bad';
          celebration.play('wrong');
        }
        renderNext();
      }

      async function onNext() {
        if (!runner.canAdvance()) return;
        if (runner.isLastStep) {
          nextButton.disabled = true;
          await completeMission();
          return;
        }
        runner.advance();
        renderStep();
      }

      async function completeMission() {
        const stars = runner.stars;
        const rankBefore = rankFor(progress.progress.xp).current;
        const outcome = await progress.completeMission(mission.id, stars);
        const rankAfter = rankFor(outcome.xp).current;
        const rankedUp = rankAfter.name !== rankBefore.name;

        celebration.confetti(rankedUp ? 260 : 160);
        celebration.play(rankedUp ? 'levelUp' : 'success');

        const xpCounter = h('span', { class: 'xp-gain' }, '+0 XP');
        countUp(xpCounter, outcome.gained);
        const following = nextMission(mission.id);

        openModal({
          title: 'Mission complete!',
          className: 'modal-celebrate',
          content: [
            h('div', { class: 'celebrate-stars' }, starRow(stars)),
            h('p', { class: 'celebrate-line' }, stars === 3 ? 'Flawless. Not a single wrong answer.' : `Finished with ${runner.mistakes} wrong answer(s). Replay any time for 3 stars.`),
            xpCounter,
            outcome.firstTime
              ? h('div', { class: 'badge badge-earned badge-large' }, h('span', { class: 'badge-mark' }, mission.reward.badge.mark), h('span', { class: 'badge-name' }, `Badge unlocked: ${mission.reward.badge.name}`))
              : null,
            rankedUp ? h('p', { class: 'rank-up' }, `Rank up! You are now ${rankAfter.name}.`) : null,
          ],
          actions: [
            { label: 'Mission map', onClick: () => router.navigate('/story') },
            following
              ? { label: `Next: ${following.title}`, primary: true, onClick: () => router.navigate(`/mission/${following.id}`) }
              : { label: 'See my badges', primary: true, onClick: () => router.navigate('/profile') },
          ],
        });
        renderNext();
      }

      function countUp(element, target) {
        if (prefersReducedMotion() || target <= 0) {
          element.textContent = `+${target} XP`;
          return;
        }
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / COUNT_UP_MS);
          element.textContent = `+${Math.round(target * t)} XP`;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }

      const storyCard = h(
        'section',
        { class: 'story-panel card' },
        h('p', { class: 'eyebrow' }, `Act ${act.number} - ${act.title}`),
        h('h1', { class: 'mission-heading' }, mission.title),
        dots,
        stepBody,
        h('div', { class: 'story-actions' }, h('a', { class: 'btn btn-ghost', href: '#/story' }, 'Leave mission'), nextButton),
      );
      stepBody.setAttribute('tabindex', '-1');

      const layout = h('div', { class: mission.structure ? 'mission-layout' : 'mission-layout mission-layout-single' }, storyCard);
      if (mission.structure) {
        const structure = registry.create(mission.structure);
        structure.runSilently(mission.setup);
        panel = new SimulatorPanel({
          structure,
          title: registry.descriptor(mission.structure).name,
          reducedMotion: prefersReducedMotion(),
          notify: (text, kind) => toaster.show(text, kind),
          onOperation: (event) => {
            history.record({ sessionId, structure: mission.structure, op: event.op, args: event.args, label: `Mission: ${mission.title}` });
            event.finished.then(() => {
              if (runner.recordOperation(event, structure.state())) {
                celebration.play('correct');
                renderStep();
              }
            });
          },
        });
        layout.append(panel.element);
      }

      container.append(layout);
      renderStep();
      return () => panel?.destroy();
    },
  };
}

function speaker() {
  return h('div', { class: 'speaker' }, h('span', { class: 'avatar', 'aria-hidden': 'true' }, 'B'), h('span', { class: 'speaker-name' }, 'Byte'));
}

function renderLesson(step) {
  return h(
    'div',
    { class: 'step step-lesson' },
    speaker(),
    h('h2', {}, step.title),
    step.text.map((paragraph) => h('p', {}, paragraph)),
    step.points ? h('ul', { class: 'key-points' }, step.points.map((point) => h('li', {}, point))) : null,
  );
}

function renderTask(step, done) {
  const hint = h('p', { class: 'hint', hidden: true }, step.hint);
  return h(
    'div',
    { class: done ? 'step step-task step-task-done' : 'step step-task' },
    h('p', { class: 'eyebrow' }, 'Your task'),
    h('p', { class: 'task-text' }, step.text),
    h('p', { class: 'task-status', role: 'status' }, done ? 'Task complete! Press Continue.' : 'Use the simulator to complete this task.'),
    done ? null : h('button', { class: 'btn btn-small btn-ghost', type: 'button', onClick: (event) => { hint.hidden = false; event.currentTarget.remove(); } }, 'Show a hint'),
    hint,
  );
}

function renderQuiz(step, onAnswer) {
  const explanation = h('p', { class: 'quiz-explain', hidden: true, role: 'status' });
  const buttons = [];
  step.options.forEach((option, index) => {
    const button = h('button', { class: 'option', type: 'button' }, option);
    button.addEventListener('click', () => onAnswer(index, button, explanation, buttons));
    buttons.push(button);
  });
  return h('div', { class: 'step step-quiz' }, h('p', { class: 'eyebrow' }, 'Question'), h('h2', {}, step.question), h('div', { class: 'options' }, buttons), explanation);
}
