import { ApiClient } from './core/apiClient.js';
import { h, prefersReducedMotion } from './core/dom.js';
import { EventBus } from './core/eventBus.js';
import { HashRouter } from './core/hashRouter.js';
import { findMission } from './game/curriculum.js';
import { rankFor, xpForMission } from './game/rewards.js';
import { HistoryService, LocalHistoryStore, RemoteHistoryStore } from './services/historyService.js';
import { ProgressService } from './services/progressService.js';
import { LocalProgressStore, RemoteProgressStore } from './services/progressStores.js';
import { SessionService } from './services/sessionService.js';
import { ThemeService } from './services/themeService.js';
import { createStructureRegistry } from './structures/index.js';
import { Celebration } from './ui/celebration.js';
import { Toaster } from './ui/toaster.js';
import { createAuthView } from './views/authView.js';
import { createHistoryView } from './views/historyView.js';
import { createHomeView } from './views/homeView.js';
import { createMissionView } from './views/missionView.js';
import { createPrivacyView } from './views/privacyView.js';
import { createProfileView } from './views/profileView.js';
import { createSandboxView } from './views/sandboxView.js';
import { createStoryView } from './views/storyView.js';

const bus = new EventBus();
const api = new ApiClient();
const session = new SessionService(api, bus);
const progress = new ProgressService({
  local: new LocalProgressStore(),
  remote: new RemoteProgressStore(api),
  bus,
  xpFor: (missionId, stars) => xpForMission(findMission(missionId), stars),
});
const history = new HistoryService({ local: new LocalHistoryStore(), remote: new RemoteHistoryStore(api), session, bus });
const theme = new ThemeService(progress, bus);
const toaster = new Toaster(document.getElementById('toasts'));
const celebration = new Celebration({ isSoundOn: () => progress.progress.settings.sound, reducedMotion: prefersReducedMotion });

const navLinks = [...document.querySelectorAll('[data-nav]')];
const accountSlot = document.getElementById('account-slot');

function renderAccount() {
  const { current } = rankFor(progress.progress.xp);
  const label = session.isSignedIn ? session.user.username : 'Guest';
  const chip = h('a', { class: 'account-chip', href: '#/profile' }, h('span', { class: 'account-rank' }, current.name), h('span', { class: 'account-name' }, label));
  if (session.isSignedIn) accountSlot.replaceChildren(chip);
  else accountSlot.replaceChildren(chip, h('a', { class: 'btn btn-small btn-primary', href: '#/login' }, 'Sign in'));
}

function highlightNav(pattern) {
  for (const link of navLinks) {
    const active = pattern === link.dataset.nav || (link.dataset.nav !== '/' && pattern.startsWith(link.dataset.nav));
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

async function syncAccount() {
  await progress.useAccount(session.isSignedIn);
  renderAccount();
}

bus.on('notify', ({ kind, text }) => toaster.show(text, kind));
bus.on('progress:changed', renderAccount);

const registry = createStructureRegistry();
const router = new HashRouter(document.getElementById('main'), { onChange: highlightNav });
const deps = { session, progress, history, theme, registry, celebration, toaster, router, syncAccount };

router
  .add('/', createHomeView(deps))
  .add('/story', createStoryView(deps))
  .add('/mission/:id', createMissionView(deps))
  .add('/sandbox', createSandboxView(deps))
  .add('/sandbox/:id', createSandboxView(deps))
  .add('/history', createHistoryView(deps))
  .add('/profile', createProfileView(deps))
  .add('/login', createAuthView(deps, 'login'))
  .add('/register', createAuthView(deps, 'register'))
  .add('/privacy', createPrivacyView(deps));

document.getElementById('theme-toggle').addEventListener('click', () => theme.toggle());

theme.apply();
await session.restore();
await syncAccount();
router.start();
