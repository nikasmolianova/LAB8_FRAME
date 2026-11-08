/**
 * Валідація форми заявки Nicole Frame (Vanilla JS, без бібліотек).
 * Структура файлу:
 *   1. Константи та RegEx
 *   2. Допоміжні функції (маска телефону)
 *   3. UI-функції: showError / showSuccess / clearError
 *   4. Функції валідації окремих полів
 *   5. Відправка форми та події
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#lead-form');
  if (!form) return;

  // ================= 1. КОНСТАНТИ =================
  const REGEX_NAME  = /^[\p{L}][\p{L}\s'’ʼ-]+$/u;   // літери, пробіли, дефіс, апостроф; мін. 2 символи
  const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;  // name@domain.tld
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
  const agreementInput = document.querySelector('#user-agreement'); // за таблицею чекбокса немає

  const alertBox  = document.querySelector('#form-alert');
  const successBox = document.querySelector('#form-success');
  const resetBtn  = document.querySelector('#success-reset');
  const submitBtn = document.querySelector('#submit-btn');
  const submitHTML = submitBtn.innerHTML;

  dateInput.min = TODAY; // нативний календар блокує минулі дні

  // ================= 2. МАСКА ТЕЛЕФОНУ =================
  // Лишає тільки 9 цифр після коду 380 (приймає 050..., 80..., 380... та +380...)
  function getLocalDigits(raw) {
    const d = raw.replace(/\D/g, '');
    let local;
    if (d.startsWith('380')) local = d.slice(3);
    else if ('380'.startsWith(d)) local = '';
    else if (d.startsWith('80')) local = d.slice(2);
    else if (d.startsWith('0')) local = d.slice(1);
    else local = d;
    return local.slice(0, 9);
  }

  // Форматує у вигляд +380 (XX) XXX-XX-XX
  function formatPhone(raw) {
    const l = getLocalDigits(raw);
    if (!l) return '';
    let out = '+380 (' + l.slice(0, 2);
    if (l.length > 2) out += ') ' + l.slice(2, 5);
    if (l.length > 5) out += '-' + l.slice(5, 7);
    if (l.length > 7) out += '-' + l.slice(7, 9);
    return out;
  }

  // "+380 (50) 123-45-67" -> "+380501234567" (для перевірки RegEx)
  const normalizePhone = (value) => '+' + value.replace(/\D/g, '');

  // ================= 3. UI-ФУНКЦІЇ =================
  const getErrorEl = (input) => document.getElementById(input.id + '-error');

  /** Показати помилку: червона рамка (aria-invalid) + текст під полем */
  function showError(input, message) {
    const errorEl = getErrorEl(input);
    input.removeAttribute('data-state');
    input.setAttribute('aria-invalid', 'true');
    if (errorEl) {
      if (message) errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  /** Показати успіх: зелена рамка (data-state="valid") + галочка, без тексту помилки */
  function showSuccess(input) {
    const errorEl = getErrorEl(input);
    input.removeAttribute('aria-invalid');
    input.dataset.state = 'valid';
    if (errorEl) errorEl.classList.add('hidden');
  }

  /** Повернути поле у нейтральний стан */
  function clearError(input) {
    const errorEl = getErrorEl(input);
    input.removeAttribute('aria-invalid');
    input.removeAttribute('data-state');
    if (errorEl) errorEl.classList.add('hidden');
  }

  // ================= 4. ВАЛІДАЦІЯ ПОЛІВ =================
  // Кожна функція повертає true (поле валідне) або false.

  function validateName() {
    const value = nameInput.value.trim();
    if (REGEX_NAME.test(value)) { showSuccess(nameInput); return true; }
    showError(nameInput);
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
    showError(phoneInput);
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

  // ================= 5. ПОДІЇ =================
  const touched = new Set(); // поля, з яких користувач уже виходив
  /**
   * М'яка перевірка під час першого набору:
   * якщо значення вже коректне, показуємо успіх;
   * якщо ні, лишаємо поле нейтральним (без червоного).
   */
  function softValidate(input, validate) {
    // validate() сама малює і помилку, і успіх, тож результат
    // перевіряємо, а при невдачі прибираємо червоне
    if (validate()) return;
    clearError(input);
  }
    fields.forEach(({ input, validate }) => {
    // blur: фінальна перевірка поля, показує і помилку, і успіх
    input.addEventListener('blur', () => {
      touched.add(input);
      validate();
    });

    input.addEventListener('input', () => {
      if (input === phoneInput) input.value = formatPhone(input.value);

      if (touched.has(input)) {
        // Поле вже «пройдене»: оновлюємо стан на кожен символ
        validate();
      } else {
        // Користувач ще пише вперше: показуємо тільки успіх, без червоного
        softValidate(input, validate);
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
    fields.forEach(({ input }) => clearError(input));
    alertBox.classList.add('hidden');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    // Перевіряємо ВСІ поля (щоб підсвітити всі помилки одразу)
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

    // Імітація відправки (бекенду немає)
    setTimeout(() => {
      setLoading(false);
      resetForm();
      form.classList.add('hidden');
      if (successBox) {
        successBox.classList.remove('hidden');
        successBox.focus();
      }
    }, 1500);
  });

  // Кнопка «Надіслати ще одну заявку»
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      successBox.classList.add('hidden');
      form.classList.remove('hidden');
      nameInput.focus();
    });
  }
});