import { formatDate, h } from '../core/dom.js';
import { MISSIONS } from '../game/curriculum.js';
import { openModal } from '../ui/modal.js';
import { badge, pageHeader, rankCard } from './components.js';

function downloadJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = h('a', { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createProfileView({ session, progress, theme, syncAccount, toaster, router }) {
  function settingsCard() {
    const themeSelect = h(
      'select',
      { class: 'input', id: 'theme-setting' },
      [['system', 'Match my device'], ['light', 'Light'], ['dark', 'Dark']].map(([value, label]) => h('option', { value, selected: theme.preference === value }, label)),
    );
    themeSelect.addEventListener('change', () => theme.set(themeSelect.value));

    const sound = h('input', { type: 'checkbox', id: 'sound-setting', checked: progress.progress.settings.sound });
    sound.addEventListener('change', () => progress.updateSettings({ sound: sound.checked }));

    return h(
      'section',
      { class: 'card' },
      h('h2', {}, 'Settings'),
      h('div', { class: 'setting' }, h('label', { for: 'theme-setting' }, 'Theme'), themeSelect),
      h('div', { class: 'setting' }, h('label', { for: 'sound-setting' }, 'Sound effects'), sound),
    );
  }

  function accountCard() {
    if (!session.isSignedIn) {
      return h(
        'section',
        { class: 'card' },
        h('h2', {}, 'Guest mode'),
        h('p', {}, 'Your progress is stored only in this browser. Create an account to keep it safe, encrypted on the server, and available on any device. Your guest progress will be carried over.'),
        h('div', { class: 'button-row' }, h('a', { class: 'btn btn-primary', href: '#/register' }, 'Create account'), h('a', { class: 'btn btn-ghost', href: '#/login' }, 'Sign in')),
      );
    }

    const signOut = async () => {
      await session.signOut();
      await syncAccount();
      toaster.show('Signed out.', 'success');
      router.navigate('/');
    };

    const exportData = async () => {
      try {
        downloadJson(await session.exportData(), 'ds-sim-my-data.json');
      } catch (error) {
        toaster.show(error.message, 'error');
      }
    };

    const deleteAccount = () => {
      const password = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', 'aria-label': 'Password' });
      const error = h('p', { class: 'form-error', hidden: true });
      openModal({
        title: 'Delete your account?',
        content: [h('p', {}, 'This permanently erases your account, progress and history from the server. It cannot be undone.'), h('label', {}, 'Enter your password to confirm', password), error],
        actions: [
          { label: 'Cancel' },
          {
            label: 'Delete forever',
            primary: true,
            onClick: async () => {
              try {
                await session.deleteAccount(password.value);
              } catch (failure) {
                error.textContent = failure.message;
                error.hidden = false;
                return false;
              }
              await syncAccount();
              toaster.show('Your account and all its data were deleted.', 'success');
              router.navigate('/');
              return true;
            },
          },
        ],
      });
    };

    return h(
      'section',
      { class: 'card' },
      h('h2', {}, 'Account'),
      h('p', {}, `Signed in as `, h('strong', {}, session.user.username), `. Member since ${formatDate(session.user.createdAt)}.`),
      h('p', { class: 'muted small' }, 'Your progress and history are encrypted at rest with AES-256-GCM.'),
      h(
        'div',
        { class: 'button-row' },
        h('button', { class: 'btn', type: 'button', onClick: exportData }, 'Download my data'),
        h('button', { class: 'btn btn-ghost', type: 'button', onClick: signOut }, 'Sign out'),
        h('button', { class: 'btn btn-ghost btn-danger', type: 'button', onClick: deleteAccount }, 'Delete account'),
      ),
    );
  }

  return {
    mount(container) {
      const earned = MISSIONS.filter((mission) => progress.isCompleted(mission.id)).length;
      container.append(
        pageHeader(session.isSignedIn ? session.user.username : 'Your profile', `${earned} of ${MISSIONS.length} badges earned`),
        rankCard(progress.progress.xp),
        h('section', { class: 'card' }, h('h2', {}, 'Badges'), h('div', { class: 'badge-grid' }, MISSIONS.map((mission) => badge(mission, progress.isCompleted(mission.id))))),
        h('div', { class: 'two-column' }, accountCard(), settingsCard()),
      );
    },
  };
}
