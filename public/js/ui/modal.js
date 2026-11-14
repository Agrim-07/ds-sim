import { h } from '../core/dom.js';

/**
 * Opens a modal <dialog>. The browser handles focus trapping and the Escape key.
 * actions: [{ label, primary, onClick }] - onClick may return false to keep the dialog open.
 */
export function openModal({ title, content, actions = [], className = '' }) {
  const dialog = h('dialog', { class: `modal ${className}`.trim(), 'aria-labelledby': 'modal-title' });
  const close = () => {
    if (dialog.open) dialog.close();
  };
  // A dialog belongs to the page that opened it, so leaving the page (links, Back button) closes it.
  window.addEventListener('hashchange', close);
  dialog.addEventListener('close', () => {
    window.removeEventListener('hashchange', close);
    dialog.remove();
  });

  const buttons = actions.map((action) =>
    h(
      'button',
      {
        class: action.primary ? 'btn btn-primary' : 'btn btn-ghost',
        type: 'button',
        onClick: async () => {
          const keepOpen = (await action.onClick?.()) === false;
          if (!keepOpen) close();
        },
      },
      action.label,
    ),
  );

  dialog.append(
    h('h2', { class: 'modal-title', id: 'modal-title' }, title),
    h('div', { class: 'modal-body' }, content),
    h('div', { class: 'modal-actions' }, buttons),
  );
  document.body.append(dialog);
  dialog.showModal();
  buttons.find((button) => button.classList.contains('btn-primary'))?.focus();
  return close;
}
