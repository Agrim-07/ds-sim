import { h } from '../core/dom.js';
import { ACTS, isUnlocked, missionsInAct } from '../game/curriculum.js';
import { pageHeader, rankCard, starRow } from './components.js';

export function createStoryView({ progress }) {
  return {
    mount(container) {
      const completed = (id) => progress.isCompleted(id);
      let number = 0;

      container.append(
        pageHeader('Story mode', 'Restore the Citadel one mission at a time. Each completed mission unlocks the next.'),
        rankCard(progress.progress.xp),
        ...ACTS.map((act) =>
          h(
            'section',
            { class: 'act card' },
            h('header', { class: 'act-head' }, h('p', { class: 'eyebrow' }, `Act ${act.number} - ${act.tier}`), h('h2', {}, act.title), h('p', { class: 'muted' }, act.blurb)),
            h(
              'ol',
              { class: 'mission-path' },
              missionsInAct(act.id).map((mission) => {
                number += 1;
                const unlocked = isUnlocked(mission.id, completed);
                const done = completed(mission.id);
                const state = done ? 'done' : unlocked ? 'open' : 'locked';
                const content = [
                  h('span', { class: 'mission-number', 'aria-hidden': 'true' }, done ? mission.reward.badge.mark : number),
                  h('span', { class: 'mission-text' }, h('span', { class: 'mission-title' }, mission.title), h('span', { class: 'muted small' }, done ? 'Completed' : unlocked ? `${mission.reward.xp} XP` : 'Locked')),
                  done ? starRow(progress.starsFor(mission.id)) : null,
                ];
                return h(
                  'li',
                  { class: `mission mission-${state}` },
                  unlocked ? h('a', { class: 'mission-link', href: `#/mission/${mission.id}` }, content) : h('div', { class: 'mission-link', 'aria-disabled': 'true' }, content),
                );
              }),
            ),
          ),
        ),
      );
    },
  };
}
