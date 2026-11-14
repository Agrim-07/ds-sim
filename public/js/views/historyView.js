import { formatDate, h } from '../core/dom.js';
import { openModal } from '../ui/modal.js';
import { describeOperation, pageHeader } from './components.js';

const PREVIEW_OPS = 6;

export function createHistoryView({ history, registry, session, toaster, router }) {
  return {
    async mount(container) {
      container.append(pageHeader('Simulation history', 'Every operation you run is saved here, grouped by session. Replay any session to rebuild it.'));
      if (!session.isSignedIn) {
        container.append(h('p', { class: 'notice' }, 'You are browsing as a guest, so history is kept only in this browser. ', h('a', { href: '#/register' }, 'Create an account'), ' to keep it safe and encrypted on the server.'));
      }

      const list = h('div', { class: 'history-list' }, h('p', { class: 'muted' }, 'Loading...'));
      container.append(list);

      let sessions;
      try {
        sessions = await history.list();
      } catch (error) {
        list.replaceChildren(h('p', { class: 'notice notice-error' }, error.message));
        return;
      }

      if (sessions.length === 0) {
        list.replaceChildren(h('div', { class: 'card empty-state' }, h('p', {}, 'No simulations yet.'), h('a', { class: 'btn btn-primary', href: '#/sandbox' }, 'Open the sandbox')));
        return;
      }

      const clearButton = h('button', {
        class: 'btn btn-ghost btn-danger',
        type: 'button',
        onClick: () =>
          openModal({
            title: 'Clear all history?',
            content: h('p', {}, 'This permanently deletes every saved simulation session. Your mission progress is not affected.'),
            actions: [
              { label: 'Cancel' },
              {
                label: 'Delete history',
                primary: true,
                onClick: async () => {
                  await history.clear();
                  toaster.show('History cleared.', 'success');
                  router.refresh();
                },
              },
            ],
          }),
      }, 'Clear history');

      list.replaceChildren(
        ...sessions.map((item) => {
          const descriptor = registry.descriptor(item.structure);
          const preview = item.ops.slice(0, PREVIEW_OPS).map(describeOperation).join(', ');
          return h(
            'article',
            { class: 'card history-item' },
            h(
              'div',
              { class: 'history-meta' },
              h('h2', {}, descriptor?.name ?? item.structure),
              h('p', { class: 'muted small' }, `${item.label || 'Sandbox'} - ${formatDate(item.updatedAt)} - ${item.ops.length} operation(s)`),
              h('p', { class: 'history-ops' }, h('code', {}, preview + (item.ops.length > PREVIEW_OPS ? ', ...' : ''))),
            ),
            descriptor ? h('a', { class: 'btn btn-small', href: `#/sandbox/${item.structure}?replay=${encodeURIComponent(item.id)}` }, 'Replay') : null,
          );
        }),
        h('div', { class: 'history-footer' }, clearButton),
      );
    },
  };
}
