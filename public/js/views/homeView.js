import { h } from '../core/dom.js';
import { ACTS, MISSIONS } from '../game/curriculum.js';

export function createHomeView({ progress, session }) {
  return {
    mount(container) {
      const done = progress.progress.completed.length;
      const nextMission = MISSIONS.find((mission) => !progress.isCompleted(mission.id));
      const primaryLink = done === 0 ? '#/story' : nextMission ? `#/mission/${nextMission.id}` : '#/story';
      const primaryText = done === 0 ? 'Start the story' : nextMission ? `Continue: ${nextMission.title}` : 'Replay missions';

      container.append(
        h(
          'section',
          { class: 'hero' },
          h('p', { class: 'eyebrow' }, 'Data structures, animated'),
          h('h1', { class: 'hero-title' }, 'Watch data structures move. Then make them move yourself.'),
          h(
            'p',
            { class: 'lead' },
            'ds-sim teaches data structures from your very first array to AVL rotations and graph search. ',
            'Every operation is animated step by step, and the story campaign turns each topic into a mission.',
          ),
          h(
            'div',
            { class: 'hero-actions' },
            h('a', { class: 'btn btn-primary btn-large', href: primaryLink }, primaryText),
            h('a', { class: 'btn btn-ghost btn-large', href: '#/sandbox' }, 'Open the sandbox'),
          ),
          done > 0 ? h('p', { class: 'muted' }, `${done} of ${MISSIONS.length} missions complete.`) : null,
          !session.isSignedIn ? h('p', { class: 'muted small' }, h('a', { href: '#/register' }, 'Create a free account'), ' to save progress and history across devices.') : null,
        ),
        h(
          'section',
          { class: 'feature-grid' },
          feature('Story missions', `${MISSIONS.length} missions across ${ACTS.length} acts, from Novice to Master. Read, experiment, answer, earn stars and badges.`),
          feature('Step-by-step animation', 'Play, pause and step through every comparison, shift, swap and rotation, with a plain-English explanation of each step.'),
          feature('Free sandbox', 'Eleven structures to experiment with freely. Every operation is saved to your history so you can replay it.'),
        ),
        h(
          'section',
          { class: 'card path-preview' },
          h('h2', {}, 'Your path'),
          h('ol', { class: 'path-list' }, ACTS.map((act) => h('li', {}, h('strong', {}, `Act ${act.number} - ${act.title}`), h('span', { class: 'chip' }, act.tier), h('p', { class: 'muted' }, act.blurb)))),
        ),
      );
    },
  };
}

function feature(title, text) {
  return h('article', { class: 'card feature' }, h('h3', {}, title), h('p', {}, text));
}
