import { h } from '../core/dom.js';

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/;

export function createAuthView({ session, syncAccount, toaster, router }, mode) {
  const isRegister = mode === 'register';

  function validate(username, password, confirm) {
    if (!isRegister) return username && password ? null : 'Enter your username and password.';
    if (!USERNAME_PATTERN.test(username)) return 'Usernames are 3-24 characters: letters, digits and underscores.';
    if (password.length < 8) return 'Use at least 8 characters for your password.';
    if (password.toLowerCase().includes(username.toLowerCase())) return 'Your password must not contain your username.';
    if (password !== confirm) return 'The two passwords do not match.';
    return null;
  }

  return {
    mount(container) {
      if (session.isSignedIn) {
        router.navigate('/profile');
        return;
      }

      const error = h('p', { class: 'form-error', role: 'alert', hidden: true });
      const username = h('input', { class: 'input', id: 'username', name: 'username', autocomplete: 'username', required: true, maxlength: 24, spellcheck: 'false' });
      const password = h('input', { class: 'input', id: 'password', name: 'password', type: 'password', autocomplete: isRegister ? 'new-password' : 'current-password', required: true, maxlength: 128 });
      const confirm = h('input', { class: 'input', id: 'confirm', name: 'confirm', type: 'password', autocomplete: 'new-password', maxlength: 128 });
      const submit = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, isRegister ? 'Create account' : 'Sign in');

      const onSubmit = async (event) => {
        event.preventDefault();
        const problem = validate(username.value.trim(), password.value, confirm.value);
        if (problem) {
          error.textContent = problem;
          error.hidden = false;
          return;
        }
        submit.disabled = true;
        error.hidden = true;
        try {
          if (isRegister) await session.register(username.value.trim(), password.value);
          else await session.signIn(username.value.trim(), password.value);
          await syncAccount();
          toaster.show(isRegister ? 'Welcome aboard, Keeper!' : `Welcome back, ${session.user.username}!`, 'success');
          router.navigate('/story');
        } catch (failure) {
          error.textContent = failure.message;
          error.hidden = false;
          submit.disabled = false;
        }
      };

      container.append(
        h(
          'section',
          { class: 'auth card' },
          h('h1', {}, isRegister ? 'Create your account' : 'Sign in'),
          h('p', { class: 'muted' }, isRegister ? 'Save your missions, badges and simulation history. No email needed.' : 'Continue your journey where you left off.'),
          h(
            'form',
            { class: 'form', onSubmit, novalidate: true },
            h('label', { for: 'username' }, 'Username'),
            username,
            h('label', { for: 'password' }, 'Password'),
            password,
            isRegister ? [h('label', { for: 'confirm' }, 'Confirm password'), confirm, h('p', { class: 'muted small' }, 'At least 8 characters. Passwords are hashed with scrypt and never stored in plain text.')] : null,
            error,
            submit,
          ),
          h('p', { class: 'muted small' }, isRegister ? ['Already have an account? ', h('a', { href: '#/login' }, 'Sign in')] : ['New here? ', h('a', { href: '#/register' }, 'Create an account')]),
          isRegister ? h('p', { class: 'muted small' }, 'By creating an account you agree to the ', h('a', { href: '#/privacy' }, 'privacy notice'), '.') : null,
        ),
      );
      username.focus();
    },
  };
}
