import { h, prefersReducedMotion, randomId } from '../core/dom.js';
import { SimulatorPanel } from '../ui/simulatorPanel.js';
import { pageHeader } from './components.js';

const TIERS = ['Novice', 'Apprentice', 'Adept', 'Master'];

export function createSandboxView({ registry, history, toaster, router }) {
  function mountPicker(container) {
    container.append(
      pageHeader('Sandbox', 'Pick any structure and experiment freely. Every operation is saved to your history.'),
      ...TIERS.map((tier) =>
        h(
          'section',
          { class: 'tier' },
          h('h2', { class: 'tier-title' }, tier),
          h(
            'div',
            { class: 'structure-grid' },
            registry
              .list()
              .filter((descriptor) => descriptor.tier === tier)
              .map((descriptor) =>
                h('a', { class: 'card structure-card', href: `#/sandbox/${descriptor.id}` }, h('h3', {}, descriptor.name), h('p', { class: 'muted' }, descriptor.summary)),
              ),
          ),
        ),
      ),
    );
    return undefined;
  }

  async function mountSimulator(container, id, replayId) {
    const descriptor = registry.descriptor(id);
    let steps = null;
    if (replayId) {
      const session = (await history.list()).find((item) => item.id === replayId);
      if (session) steps = session.ops.map(({ op, args }) => [op, ...args]);
      else toaster.show('That history session no longer exists.', 'error');
    }

    const structure = registry.create(id, { seeded: steps === null });
    const sessionId = randomId();
    const panel = new SimulatorPanel({
      structure,
      title: descriptor.name,
      reducedMotion: prefersReducedMotion(),
      notify: (text, kind) => toaster.show(text, kind),
      onOperation: (event) => history.record({ sessionId, structure: id, op: event.op, args: event.args, label: 'Sandbox' }),
    });
    if (steps) panel.replay(steps);

    container.append(
      h(
        'div',
        { class: 'sandbox-head' },
        h('a', { class: 'btn btn-ghost btn-small', href: '#/sandbox' }, '< All structures'),
        h('button', { class: 'btn btn-ghost btn-small', type: 'button', onClick: () => router.navigate(`/sandbox/${id}?fresh=${Date.now()}`) }, 'Reset'),
      ),
      h(
        'div',
        { class: 'sandbox-layout' },
        panel.element,
        h(
          'aside',
          { class: 'card cheat-sheet' },
          h('p', { class: 'eyebrow' }, descriptor.tier),
          h('h2', {}, descriptor.name),
          h('p', {}, descriptor.summary),
          h(
            'table',
            { class: 'cost-table' },
            h('thead', {}, h('tr', {}, h('th', {}, 'Operation'), h('th', {}, 'Cost'))),
            h('tbody', {}, structure.operations().map((operation) => h('tr', { title: operation.summary }, h('td', {}, operation.label), h('td', {}, h('code', {}, operation.complexity))))),
          ),
        ),
      ),
    );
    return () => panel.destroy();
  }

  return {
    mount(container, { params, query }) {
      if (!params.id) return mountPicker(container);
      if (!registry.has(params.id)) {
        router.navigate('/sandbox');
        return undefined;
      }
      return mountSimulator(container, params.id, query.get('replay'));
    },
  };
}
