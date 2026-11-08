document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#lead-form');
  if (!form) return;

  const $ = (sel) => document.querySelector(sel);
  const alertBox = $('#form-alert');
  const successBox = $('#form-success');
  const submitBtn = $('#submit-btn');
  const submitHTML = submitBtn.innerHTML;

  // Сьогоднішня дата у форматі YYYY-MM-DD (за локальним часом)
  const today = new Date().toLocaleDateString('sv-SE');
  $('#user-date').min = today;

  const NAME_RE = /^[\p{L}\s'’ʼ-]+$/u;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ---------- Маска телефону +380 (XX) XXX-XX-XX ----------
  function getLocalDigits(raw) {
    const d = raw.replace(/\D/g, '');
    let local;
    if (d.startsWith('380')) local = d.slice(3);
    else if ('380'.startsWith(d)) local = '';          // "", "3", "38"
    else if (d.startsWith('80')) local = d.slice(2);
    else if (d === '8') local = '';
    else if (d.startsWith('0')) local = d.slice(1);    // 050... -> 50...
    else local = d;
    return local.slice(0, 9);
  }

  function formatPhone(raw) {
    const l = getLocalDigits(raw);
    if (!l) return '';
    let out = '+380 (' + l.slice(0, 2);
    if (l.length > 2) out += ') ' + l.slice(2, 5);
    if (l.length > 5) out += '-' + l.slice(5, 7);
    if (l.length > 7) out += '-' + l.slice(7, 9);
    return out;
  }

  // ---------- Опис полів ----------
  const fields = [
    {
      input: $('#user-name'), error: $('#user-name-error'), required: true,
      test: (v) => v.trim().length >= 2 && NAME_RE.test(v.trim()),
    },
    {
      input: $('#user-email'), error: $('#user-email-error'), required: true,
      test: (v) => EMAIL_RE.test(v.trim()),
    },
    {
      input: $('#user-phone'), error: $('#user-phone-error'), required: true,
      test: (v) => getLocalDigits(v).length === 9,       // 380 + 9 цифр = 12
    },
    {
      input: $('#user-date'), error: $('#user-date-error'), required: false,
      test: (v) => v >= today,
    },
    {
      input: $('#user-message'), error: $('#user-message-error'), required: false,
      test: (v) => v.length <= 1000,
    },
  ];

  // ---------- Стани: neutral / valid / invalid ----------
  function render(f, state) {
  f.error.classList.add('hidden');
  f.input.removeAttribute('aria-invalid');
  f.input.removeAttribute('data-state');

  if (state === 'valid') {
    f.input.dataset.state = 'valid';
  } else if (state === 'invalid') {
    f.error.classList.remove('hidden');
    f.input.setAttribute('aria-invalid', 'true');
  }
}

  function validate(f) {
    const value = f.input.value;
    if (!value.trim()) {
      render(f, f.required ? 'invalid' : 'neutral');
      return !f.required;
    }
    const ok = f.test(value);
    render(f, ok ? 'valid' : 'invalid');
    return ok;
  }

  function resetAll() {
    form.reset();
    fields.forEach((f) => { f.touched = false; render(f, 'neutral'); });
    alertBox.classList.add('hidden');
  }

  // ---------- Події полів ----------
  fields.forEach((f) => {
    f.touched = false;

    f.input.addEventListener('input', () => {
      if (f.input.id === 'user-phone') f.input.value = formatPhone(f.input.value);
      if (f.touched) validate(f);
    });

    f.input.addEventListener('blur', () => {
      f.touched = true;
      validate(f);
    });
  });

  // ---------- Loading ----------
  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.innerHTML = on
      ? '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Надсилаємо…'
      : submitHTML;
  }

  // ---------- Відправка ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let firstInvalid = null;
    fields.forEach((f) => {
      f.touched = true;
      if (!validate(f) && !firstInvalid) firstInvalid = f;
    });

    if (firstInvalid) {
      alertBox.textContent = 'Перевірте виділені поля та спробуйте ще раз.';
      alertBox.classList.remove('hidden');
      firstInvalid.input.focus();
      return;
    }

    alertBox.classList.add('hidden');
    setLoading(true);

    // Імітація відправки (бекенду немає)
    setTimeout(() => {
      setLoading(false);
      resetAll();
      form.classList.add('hidden');
      if (successBox) {
        successBox.classList.remove('hidden');
        successBox.focus();
      }
    }, 1500);
  });

  const resetBtn = $('#success-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      successBox.classList.add('hidden');
      form.classList.remove('hidden');
      fields[0].input.focus();
    });
  }
});