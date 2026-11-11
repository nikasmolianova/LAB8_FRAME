/**
 * Валідація форми заявки Nicole Frame (Vanilla JS, без бібліотек).
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#lead-form');
  if (!form) return;

  // ================= 1. КОНСТАНТИ =================
  const REGEX_NAME = /^\p{L}+(?:[ '\u2019\u02BC-]\p{L}+)*$/u;  // літери, пробіли, дефіс, апостроф; мін. 2 символи
  const REGEX_EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/; // name@domain.tld
  const REGEX_PHONE = /^\+380\d{9}$/;                // +380 і рівно 9 цифр
  const MAX_MESSAGE = 1000;

  // Сьогоднішня дата у форматі YYYY-MM-DD за локальним часом
  const TODAY = new Date().toLocaleDateString('sv-SE');

  // Елементи форми
  const nameInput      = document.querySelector('#user-name');
  const emailInput     = document.querySelector('#user-email');
  const phoneInput     = document.querySelector('#user-phone');
  const dateInput      = document.querySelector('#user-date');
  const messageInput   = document.querySelector('#user-message');
  const agreementInput = document.querySelector('#user-agreement'); 

  const alertBox   = document.querySelector('#form-alert');
  const modal      = document.querySelector('#success-modal');
  const modalClose = document.querySelector('#success-close');
  const submitBtn  = document.querySelector('#submit-btn');
  const submitHTML = submitBtn.innerHTML;

  dateInput.min = TODAY; // нативний календар блокує минулі дні

  // ================= 2. МАСКА ТЕЛЕФОНУ =================
  const PHONE_LOCAL_MAX = 12;   // 9 потрібних + запас, щоб показати помилку «забагато»
  let lastPhoneDigits = '';     // цифри з попереднього стану поля (для Backspace)

  /** Цифри після коду 380: приймає 050..., 50..., 380..., +380 (050)... */
  function parsePhoneDigits(raw) {
    let d = raw.replace(/\D/g, '');
    if (d.startsWith('380')) {
      d = d.slice(3);
      if (d.startsWith('0')) d = d.slice(1);   // "+380 (050)" -> лишній 0
    } else if (d && '380'.startsWith(d)) {
      d = '';                                  // "3", "38": ще набирає код країни
    } else if (d.startsWith('0')) {
      d = d.slice(1);                          // 050... -> 50...
    }
    return d.slice(0, PHONE_LOCAL_MAX);
  }

  /** Форматує у +380 (XX) XXX-XX-XX. Надлишок цифр лишається видимим. */
  function formatPhone(raw) {
    const digits = raw.replace(/\D/g, '');
    const local = parsePhoneDigits(raw);

    if (!local) {
      if (!digits) return '';
      if ('380'.startsWith(digits)) return '+' + digits;  // як набрав користувач
      return '+380 (';                                    // користувач почав з 0
    }
    let out = '+380 (' + local.slice(0, 2);
    if (local.length > 2) out += ') ' + local.slice(2, 5);
    if (local.length > 5) out += '-' + local.slice(5, 7);
    if (local.length > 7) out += '-' + local.slice(7);
    return out;
  }

  // "+380 (50) 123-45-67" -> "+380501234567" (для RegEx)
  const normalizePhone = (value) => '+' + value.replace(/\D/g, '');

  // --- Курсор ---
  const countDigitsBefore = (str, pos) => str.slice(0, pos).replace(/\D/g, '').length;

  function positionAfterDigits(str, k) {
    if (k <= 0) return Math.min(1, str.length);
    let seen = 0;
    for (let i = 0; i < str.length; i++) {
      if (/\d/.test(str[i]) && ++seen === k) return i + 1;
    }
    return str.length;
  }

  // --- Підказка про літери (елемент необов'язковий) ---
  const phoneHint = document.querySelector('#user-phone-hint');
  let phoneHintTimer;
  function showPhoneHint(show) {
    if (!phoneHint) return;
    clearTimeout(phoneHintTimer);
    phoneHint.classList.toggle('hidden', !show);
    if (show) phoneHintTimer = setTimeout(() => phoneHint.classList.add('hidden'), 3000);
  }

  /**
   * Обробка input у полі телефону.
   * Повертає true, якщо цифр забагато (тоді помилку показуємо одразу).
   */
  function handlePhoneInput(event) {
    const raw = phoneInput.value;
    const caret = phoneInput.selectionStart;
    const caretAtEnd = caret === raw.length;
    let digits = raw.replace(/\D/g, '');
    let k = countDigitsBefore(raw, caret);

    // Літери та інші сторонні символи: відкидаємо, але пояснюємо
    showPhoneHint(/[^\d\s()+\-]/.test(raw));

    // Backspace по роздільнику: цифри не змінились, тож видаляємо цифру перед курсором
    if (event.inputType === 'deleteContentBackward' && digits === lastPhoneDigits && k > 0) {
      digits = digits.slice(0, k - 1) + digits.slice(k);
      k -= 1;
    }

    const formatted = formatPhone(digits);
    phoneInput.value = formatted;
    lastPhoneDigits = formatted.replace(/\D/g, '');

    // Курсор лишаємо на місці, якщо редагували всередині й цифри не зсунулись
    if (!caretAtEnd && lastPhoneDigits === digits) {
      const pos = positionAfterDigits(formatted, k);
      phoneInput.setSelectionRange(pos, pos);
    }
    return parsePhoneDigits(digits).length > 9;
  }

  /** Конкретне повідомлення про помилку телефону */
  function getPhoneError(value) {
    const n = parsePhoneDigits(value).length;
    if (!value.trim()) return 'Введіть номер телефону';
    if (n > 9) return `Забагато цифр: після +380 має бути рівно 9, зараз ${n}`;
    return `Номер неповний: після +380 потрібно 9 цифр, зараз ${n}`;
  }

  // ================= 3. UI-ФУНКЦІЇ =================
  const getErrorEl = (input) => document.getElementById(input.id + '-error');

  /** Зв'язати поле з повідомленням лише коли помилка видима */
  function setDescribedBy(input, on) {
    if (on) input.setAttribute('aria-describedby', input.id + '-error');
    else input.removeAttribute('aria-describedby');
  }

  /** Показати помилку: червона рамка (aria-invalid) + текст під полем */
  function showError(input, message) {
    const errorEl = getErrorEl(input);
    input.removeAttribute('data-state');
    input.setAttribute('aria-invalid', 'true');
    setDescribedBy(input, true);
    if (errorEl) {
      if (message) errorEl.textContent = message;
      errorEl.classList.remove('invisible');
    }
  }

  /** Показати успіх: зелена рамка (data-state="valid") + галочка */
  function showSuccess(input) {
    const errorEl = getErrorEl(input);
    input.setAttribute('aria-invalid', 'false');
    input.dataset.state = 'valid';
    setDescribedBy(input, false);
    if (errorEl) errorEl.classList.add('invisible');
  }

  /** Повернути поле у нейтральний стан */
  function clearError(input) {
    const errorEl = getErrorEl(input);
    input.setAttribute('aria-invalid', 'false');
    input.removeAttribute('data-state');
    setDescribedBy(input, false);
    if (errorEl) errorEl.classList.add('invisible');
  }

  // ================= 4. ВАЛІДАЦІЯ ПОЛІВ =================
  // Кожна функція повертає true (поле валідне) або false.

 function validateName() {
  const value = nameInput.value.trim();

  // 1. Не менше 2 символів
  if (value.length < 2) {
    showError(nameInput, 'Ім\'я має містити щонайменше 2 символи');
    return false;
  }

  // 2. Не повинно складатися лише з розділових знаків (дефіс, апостроф, пробіли)
  if (/^[ '\u2019\u02BC-]+$/.test(value)) {
    showError(nameInput, 'Введіть коректне ім\'я (не лише апостроф чи дефіс)');
    return false;
  }

  // 3. Загальна перевірка регуляторним виразом
  if (REGEX_NAME.test(value)) {
    showSuccess(nameInput);
    return true;
  }

  showError(nameInput, 'Ім\'я може містити лише літери, дефіс та апостроф');
  return false;
}

  function validateEmail() {
    const value = emailInput.value.trim();
    if (REGEX_EMAIL.test(value)) { showSuccess(emailInput); return true; }
    showError(emailInput);
    return false;
  }

  function validatePhone() {
    if (REGEX_PHONE.test(normalizePhone(phoneInput.value))) {
      showSuccess(phoneInput);
      return true;
    }
    showError(phoneInput, getPhoneError(phoneInput.value));
    return false;
  }

  // Необов'язкове поле: порожнє дозволене, заповнене не раніше сьогодні
  function validateDate() {
    const value = dateInput.value;
    if (!value) { clearError(dateInput); return true; }
    if (value >= TODAY) { showSuccess(dateInput); return true; }
    showError(dateInput);
    return false;
  }

  // Необов'язкове поле: порожнє дозволене, заповнене не більше 1000 символів
  function validateMessage() {
    const value = messageInput.value;
    if (!value.trim()) { clearError(messageInput); return true; }
    if (value.length <= MAX_MESSAGE) { showSuccess(messageInput); return true; }
    showError(messageInput);
    return false;
  }

  // За таблицею згода дається фактом відправки, тож чекбокса немає.
  // Якщо додати <input id="user-agreement" type="checkbox">, перевірка запрацює сама.
  function validateAgreement() {
    if (!agreementInput) return true;
    if (agreementInput.checked) { showSuccess(agreementInput); return true; }
    showError(agreementInput);
    return false;
  }

  // Список полів: елемент + його функція валідації
  const fields = [
    { input: nameInput,    validate: validateName },
    { input: emailInput,   validate: validateEmail },
    { input: phoneInput,   validate: validatePhone },
    { input: dateInput,    validate: validateDate },
    { input: messageInput, validate: validateMessage },
  ];
  if (agreementInput) fields.push({ input: agreementInput, validate: validateAgreement });

  // Початковий стан: aria-invalid="false"; помилки озвучуються при появі
  fields.forEach(({ input }) => {
    const errorEl = getErrorEl(input);
    if (errorEl) errorEl.setAttribute('aria-live', 'polite');
    clearError(input);
  });

  // ================= 5. ДИНАМІЧНА ВАЛІДАЦІЯ І ПОДІЇ =================
  const touched = new Set(); // поля, з яких користувач уже виходив

  /**
   * М'яка перевірка під час першого набору:
   * коректне значення показує успіх, некоректне лишає поле нейтральним (без червоного).
   */
  function softValidate(input, validate) {
    if (validate()) return;
    clearError(input);
  }

  // Телефон: якщо лишився тільки префікс без цифр, очищаємо поле (спрацює раніше за загальний blur)
  phoneInput.addEventListener('blur', () => {
    if (!parsePhoneDigits(phoneInput.value)) phoneInput.value = '';
    lastPhoneDigits = phoneInput.value.replace(/\D/g, '');
  });

  fields.forEach(({ input, validate }) => {
    // blur: фінальна перевірка поля, показує і помилку, і успіх
    input.addEventListener('blur', () => {
      touched.add(input);
      validate();
    });

    input.addEventListener('input', (event) => {
      if (input === phoneInput) {
        const tooManyDigits = handlePhoneInput(event);
        if (tooManyDigits) { validate(); return; }   // надлишок цифр показуємо одразу
      }

      if (touched.has(input)) {
        validate();                       // поле вже «пройдене»: оновлюємо на кожен символ
      } else {
        softValidate(input, validate);    // перший набір: тільки успіх, без червоного
      }
    });
  });

  if (agreementInput) agreementInput.addEventListener('change', validateAgreement);

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.innerHTML = isLoading
      ? '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Надсилаємо…'
      : submitHTML;
  }

  function resetForm() {
    form.reset();
    touched.clear();
    lastPhoneDigits = '';
    showPhoneHint(false);
    fields.forEach(({ input }) => clearError(input));
    alertBox.classList.add('hidden');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    // Перевіряємо ВСІ поля, щоб підсвітити всі помилки одразу
    let firstInvalid = null;
    fields.forEach(({ input, validate }) => {
      touched.add(input);
      if (!validate() && !firstInvalid) firstInvalid = input;
    });

    // Є помилка: не надсилаємо, показуємо сповіщення, фокус на першому невалідному
    if (firstInvalid) {
      alertBox.textContent = 'Перевірте виділені поля та спробуйте ще раз.';
      alertBox.classList.remove('hidden');
      firstInvalid.focus();
      return;
    }

    alertBox.classList.add('hidden');
    setLoading(true);

    // Імітація успішного надсилання (бекенду немає)
    setTimeout(() => {
      setLoading(false);
      resetForm();
      openModal();
    }, 1500);
  });

  // ================= 6. МОДАЛЬНЕ ВІКНО =================
  function openModal() {
    if (modal && typeof modal.showModal === 'function') {
      modal.showModal();            // фокус автоматично переходить усередину вікна
    } else {
      alert('Дякуємо! Ваше повідомлення успішно надіслано.'); // запасний варіант для старих браузерів
    }
  }

  if (modal) {
    modalClose.addEventListener('click', () => modal.close());

    // Клік по затемненню (поза вікном) теж закриває
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });

    // Після закриття повертаємо фокус на початок форми
    modal.addEventListener('close', () => nameInput.focus());
  }
});