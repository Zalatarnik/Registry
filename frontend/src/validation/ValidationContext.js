
const API_URL = 'http://localhost:8000';

const tr = (t, key, fallback, vars) =>
  typeof t === 'function' ? t(key, vars) : fallback;

const postTaken = async (endpoint, body, errorMessage) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.taken ? { valid: false, message: errorMessage } : null;
  } catch {
    return null;
  }
};


// Проверка данных формы регистрации
export async function validateRegistration({
  lastName,
  firstName,
  middleName,
  email,
  password,
  confirmPassword,
  role,
  studentId,
  group,
  curatorLogin
}, t) {
  // Регулярки
  const NAME_PATTERN = /^[A-ZА-ЯЁ][a-zа-яё]+$/i;
  const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const STUDENT_ID_PATTERN = /^\d+$/;
  const GROUP_PATTERN = /^[А-ЯЁа-яё\-0-9]+$/;

  // Стандартный формат ошибки
  const ValidationError = (message) => ({ valid: false, message });

  // Проверка ФИО
  if (!NAME_PATTERN.test(lastName)) {
    return ValidationError(tr(t, 'validation.lastName.invalid', 'Last name must start with a capital letter and contain only letters'));
  }

  if (!NAME_PATTERN.test(firstName)) {
    return ValidationError(tr(t, 'validation.firstName.invalid', 'First name must start with a capital letter and contain only letters'));
  }

  if (middleName && !NAME_PATTERN.test(middleName)) {
    return ValidationError(tr(t, 'validation.middleName.invalid', 'Middle name must start with a capital letter and contain only letters'));
  }

  // Проверка email
  const trimmedEmail = email.trim();
  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    return ValidationError(tr(t, 'validation.email.invalid', 'Enter a valid email address'));
  }

  const emailCheck = await postTaken(
    '/api/check-email',
    { email: trimmedEmail },
    tr(t, 'validation.email.taken', 'This email is already in use')
  );
  if (emailCheck) return emailCheck;

  // Проверка пароля
  if (password.length < 6) {
    return ValidationError(tr(t, 'validation.password.short', 'Password must be at least 6 characters'));
  }

  if (password !== confirmPassword) {
    return ValidationError(tr(t, 'validation.password.mismatch', 'Passwords do not match'));
  }

  // Проверки, специфичные для роли студент
  if (role === 'student') {
    if (!STUDENT_ID_PATTERN.test(studentId)) {
      return ValidationError(tr(t, 'validation.studentId.invalid', 'Student ID must contain digits only'));
    }

    if (!GROUP_PATTERN.test(group)) {
      return ValidationError(tr(t, 'validation.group.invalid', 'Group must contain only Russian letters, digits, and hyphen'));
    }

    const studentCheck = await postTaken(
      '/api/check-student-id',
      { studentId },
      tr(t, 'validation.studentId.taken', 'This student ID is already registered')
    );
    if (studentCheck) return studentCheck;

  } else if (role === 'curator') {
    // Проверка логин куратора не пустой
    if (!curatorLogin?.trim()) {
      return ValidationError(tr(t, 'validation.curatorLogin.empty', 'Enter curator login'));
    }

    const curatorCheck = await postTaken(
      '/api/check-curator-login',
      { login: curatorLogin },
      tr(t, 'validation.curatorLogin.taken', 'This login is already in use')
    );
    if (curatorCheck) return curatorCheck;
  }

  return { valid: true };
}

// Проверка данных при редактировании профиля
export function validateProfileUpdate(userData, t) {
  const NAME_PATTERN = /^[A-Za-zА-Яа-яЁё]+$/;
  const ValidationError = (message) => ({ valid: false, message });

  const sanitizedData = { ...userData };

  // Фамилия не может быть пустой
  const last = sanitizedData.lastName?.trim();
  if (!last) {
    return ValidationError(tr(t, 'validation.profile.lastName.empty', 'Last name cannot be empty'));
  }
  if (!NAME_PATTERN.test(last)) {
    return ValidationError(tr(t, 'validation.profile.lastName.invalid', 'Last name may contain letters only'));
  }
  sanitizedData.lastName = last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();

  // Имя не может быть пустым
  const first = sanitizedData.firstName?.trim();
  if (!first) {
    return ValidationError(tr(t, 'validation.profile.firstName.empty', 'First name cannot be empty'));
  }
  if (!NAME_PATTERN.test(first)) {
    return ValidationError(tr(t, 'validation.profile.firstName.invalid', 'First name may contain letters only'));
  }
  sanitizedData.firstName = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();

  // Проверка отчества — опционально
  const middle = sanitizedData.middleName?.trim();
  if (middle) {
    if (!NAME_PATTERN.test(middle)) {
      return ValidationError(tr(t, 'validation.profile.middleName.invalid', 'Middle name may contain letters only'));
    }
    sanitizedData.middleName = middle.charAt(0).toUpperCase() + middle.slice(1).toLowerCase();
  }

  return {
    valid: true,
    sanitizedData,
  };
}

export const validateSecurity = async ({ email, oldPassword, newPassword, t }) => {
  const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const errors = {};

  const trimmedEmail = email?.trim();

  // Проверка email
  if (trimmedEmail) {
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = tr(t, 'validation.security.email.invalid', 'Enter a valid email address');
    } else {
      const check = await postTaken(
        '/api/check-email',
        { email: trimmedEmail },
        tr(t, 'validation.security.email.taken', 'This email is already in use')
      );
      if (check) errors.email = check.message;
    }
  }

  // Проверка пароля
  if (newPassword?.trim() && newPassword.trim().length < 6) {
    errors.newPassword = tr(t, 'validation.security.password.short', 'New password must be at least 6 characters');
  }

  // Старый пароль обязателен, если что-то меняется
  if ((trimmedEmail || newPassword?.trim()) && !oldPassword?.trim()) {
    errors.oldPassword = tr(t, 'validation.security.oldPassword.required', 'Please enter your current password first');
  }

  return errors;
};
