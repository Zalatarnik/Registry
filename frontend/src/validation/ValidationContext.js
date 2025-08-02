const API_URL = 'http://localhost:8000';

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
}) {
  // Регулярки
  const NAME_PATTERN = /^[A-ZА-ЯЁ][a-zа-яё]+$/i;
  const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const STUDENT_ID_PATTERN = /^\d+$/;
  const GROUP_PATTERN = /^[А-ЯЁа-яё\-0-9]+$/;

  // Стандартный формат ошибки
  const ValidationError = (message) => ({ valid: false, message });

  // Проверка ФИО
  if (!NAME_PATTERN.test(lastName)) {
    return ValidationError('Фамилия должна начинаться с заглавной буквы и содержать только буквы');
  }

  if (!NAME_PATTERN.test(firstName)) {
    return ValidationError('Имя должно начинаться с заглавной буквы и содержать только буквы');
  }

  if (middleName && !NAME_PATTERN.test(middleName)) {
    return ValidationError('Отчество должно начинаться с заглавной буквы и содержать только буквы');
  }

  // Проверка email
  const trimmedEmail = email.trim();
  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    return ValidationError('Введите корректный адрес электронной почты');
  }

  const emailCheck = await postTaken(
    '/api/check-email',
    { email: trimmedEmail },
    'Такая почта уже используется'
  );
  if (emailCheck) return emailCheck;

  // Проверка пароля
  if (password.length < 6) {
    return ValidationError('Пароль должен быть не менее 6 символов');
  }

  if (password !== confirmPassword) {
    return ValidationError('Пароли не совпадают');
  }

  // Проверки, специфичные для роли студент
  if (role === 'student') {
    if (!STUDENT_ID_PATTERN.test(studentId)) {
      return ValidationError('Номер студенческого должен содержать только цифры');
    }

    if (!GROUP_PATTERN.test(group)) {
      return ValidationError('Группа должна содержать только русские буквы, цифры и дефис');
    }

    const studentCheck = await postTaken(
      '/api/check-student-id',
      { studentId },
      'Такой номер студенческого уже зарегистрирован'
    );
    if (studentCheck) return studentCheck;

  } else if (role === 'curator') {
    // Проверка логин куратора не пустой
    if (!curatorLogin?.trim()) {
      return ValidationError('Введите логин куратора');
    }

    const curatorCheck = await postTaken(
      '/api/check-curator-login',
      { login: curatorLogin },
      'Такой логин уже используется'
    );
    if (curatorCheck) return curatorCheck;
  }

  return { valid: true };
}

// Проверка данных при редактировании профиля
export function validateProfileUpdate(userData) {
  const NAME_PATTERN = /^[A-Za-zА-Яа-яЁё]+$/;
  const ValidationError = (message) => ({ valid: false, message });

  const sanitizedData = { ...userData };

  // Фамилия не может быть пустой
  const last = sanitizedData.lastName?.trim();
  if (!last) {
    return ValidationError('Фамилия не может быть пустой');
  }
  if (!NAME_PATTERN.test(last)) {
    return ValidationError('Фамилия может содержать только буквы');
  }
  sanitizedData.lastName = last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();

  // Имя не может быть пустым
  const first = sanitizedData.firstName?.trim();
  if (!first) {
    return ValidationError('Имя не может быть пустым');
  }
  if (!NAME_PATTERN.test(first)) {
    return ValidationError('Имя может содержать только буквы');
  }
  sanitizedData.firstName = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();

  // Проверка отчества — опционально
  const middle = sanitizedData.middleName?.trim();
  if (middle) {
    if (!NAME_PATTERN.test(middle)) {
      return ValidationError('Отчество может содержать только буквы');
    }
    sanitizedData.middleName = middle.charAt(0).toUpperCase() + middle.slice(1).toLowerCase();
  }

  return {
    valid: true,
    sanitizedData,
  };
}

export const validateSecurity = async ({ email, oldPassword, newPassword }) => {
  const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const errors = {};

  const trimmedEmail = email?.trim();

  // Проверка email
  if (trimmedEmail) {
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = 'Введите корректный адрес электронной почты';
    } else {
      const check = await postTaken(
        '/api/check-email',
        { email: trimmedEmail },
        'Такая почта уже используется'
      );
      if (check) errors.email = check.message;
    }
  }

  // Проверка пароля
  if (newPassword?.trim() && newPassword.trim().length < 6) {
    errors.newPassword = 'Новый пароль должен быть не меньше 6 символов';
  }

  // Старый пароль обязателен, если что-то меняется
  if ((trimmedEmail || newPassword?.trim()) && !oldPassword?.trim()) {
    errors.oldPassword = 'Сначала введите старый пароль';
  }

  return errors;
};
