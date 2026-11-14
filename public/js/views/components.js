import { h } from '../core/dom.js';
import { rankFor } from '../game/rewards.js';

export function pageHeader(title, subtitle) {
  return h('header', { class: 'page-header' }, h('h1', {}, title), subtitle ? h('p', { class: 'lead' }, subtitle) : null);
}

export function starRow(stars, total = 3) {
  return h(
    'span',
    { class: 'stars', 'aria-label': `${stars} of ${total} stars` },
    Array.from({ length: total }, (_, i) => h('span', { class: i < stars ? 'star star-on' : 'star', 'aria-hidden': 'true' }, '★')),
  );
}

export function rankCard(xp) {
  const { current, next, progress } = rankFor(xp);
  const bar = h('div', { class: 'xp-bar-fill' });
  bar.style.width = `${Math.round(progress * 100)}%`;
  return h(
    'div',
    { class: 'rank-card card' },
    h('div', { class: 'rank-emblem', 'aria-hidden': 'true' }, current.name[0]),
    h(
      'div',
      { class: 'rank-info' },
      h('p', { class: 'rank-name' }, current.name),
      h('div', { class: 'xp-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(progress * 100) }, bar),
      h('p', { class: 'muted' }, next ? `${xp} XP - ${next.xp - xp} XP to ${next.name}` : `${xp} XP - highest rank reached`),
    ),
  );
}

export function badge(mission, earned) {
  return h(
    'div',
    { class: earned ? 'badge badge-earned' : 'badge', title: earned ? mission.reward.badge.name : 'Locked' },
    h('span', { class: 'badge-mark', 'aria-hidden': 'true' }, earned ? mission.reward.badge.mark : '?'),
    h('span', { class: 'badge-name' }, earned ? mission.reward.badge.name : 'Locked'),
  );
}

export function describeOperation({ op, args }) {
  return `${op}(${args.join(', ')})`;
}
