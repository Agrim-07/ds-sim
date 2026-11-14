import { h } from '../core/dom.js';
import { pageHeader } from './components.js';

const SECTIONS = [
  ['What we store', [
    'For an account: your username, a scrypt hash of your password, the missions you completed (with stars and dates), your settings, and the operations you ran in the simulator.',
    'We do not ask for your email, name, location or any other personal details.',
  ]],
  ['How it is protected', [
    'Account data is encrypted at rest with AES-256-GCM using a separate key for every record. Usernames are looked up through a keyed hash, so the database file contains no readable usernames.',
    'Passwords are never stored; only a salted scrypt hash is kept. Sessions use a random token in an HttpOnly, SameSite=Strict cookie, and only a hash of that token is stored on the server.',
  ]],
  ['Cookies and tracking', [
    'ds-sim sets a single, strictly necessary session cookie when you sign in. There are no analytics, advertising or third-party scripts, and no data is shared with or sold to anyone.',
    'Guest progress is kept in your browser\'s local storage and never leaves your device.',
  ]],
  ['Your rights', [
    'You can download everything stored about you at any time from your profile ("Download my data").',
    'You can permanently delete your account and all associated data from your profile. Deletion takes effect immediately.',
  ]],
  ['Contact', ['Questions about this notice can be raised through the project\'s repository issue tracker.']],
];

export function createPrivacyView() {
  return {
    mount(container) {
      container.append(
        pageHeader('Privacy notice', 'Short version: we keep only what the app needs, encrypt it, and you can take it or delete it whenever you like.'),
        h('article', { class: 'card prose' }, SECTIONS.map(([title, paragraphs]) => [h('h2', {}, title), paragraphs.map((text) => h('p', {}, text))])),
      );
    },
  };
}
