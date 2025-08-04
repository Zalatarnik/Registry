import React, { useState } from 'react';
import './LoginPage.css';
import { useNotification } from '../../notification/NotificationContext';
import { validateRegistration } from '../../validation/ValidationContext';


// иконки
import { ReactComponent as UserIcon } from '../../icons/user-icon.svg';
import { ReactComponent as PasswordIcon } from '../../icons/password-icon.svg';
import { ReactComponent as EmailIcon } from '../../icons/email-icon.svg';

// АНИМАЦИЯ КНОПОК

// коэффициент для плавности анимации радиусов углов
const EASING_FACTOR = 0.15;
// радиус углов по умолчанию
const DEFAULT_RADIUS = 0;

// функция для анимирования радиусов углов элемента
function animateRadii(btn) {
  const state = btn._animationState;
  if (!state) return;
  let isAnimationNeeded = false;
  for (const corner in state.current) {
    const diff = state.target[corner] - state.current[corner];
    if (Math.abs(diff) > 0.01) {
      isAnimationNeeded = true;
      state.current[corner] += diff * EASING_FACTOR;
    } else {
      state.current[corner] = state.target[corner];
    }
  }
  btn.style.borderRadius = `${state.current.tl}px ${state.current.tr}px ${state.current.br}px ${state.current.bl}px`;
  if (isAnimationNeeded) {
    requestAnimationFrame(() => animateRadii(btn));
  } else {
    state.isAnimating = false;
  }
}

// универсальный обработчик движения мыши для создания эффектов
const handleButtonMove = (e) => {
  const btn = e.currentTarget;
  if (!btn._animationState) {
    btn._animationState = {
      isAnimating: false,
      current: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
      target: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
    };
  }
  const state = btn._animationState;
  const rect = btn.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const { width, height } = rect;
  const maxRadius = 25;
  const diagonal = Math.sqrt(width**2 + height**2);
  const calculateRadius = (cx, cy) => Math.max(0, maxRadius * Math.pow(1 - (Math.sqrt((x - cx)**2 + (y - cy)**2) / diagonal), 3));
  state.target.tl = calculateRadius(0, 0);
  state.target.tr = calculateRadius(width, 0);
  state.target.br = calculateRadius(width, height);
  state.target.bl = calculateRadius(0, height);
  if (!state.isAnimating) {
    state.isAnimating = true;
    requestAnimationFrame(() => animateRadii(btn));
  }
  btn.style.setProperty('--mouse-x', `${x}px`);
  btn.style.setProperty('--mouse-y', `${y}px`);
};

// обработчик увода мыши с кнопки
const handleButtonLeave = (e) => {
  const btn = e.currentTarget;
  const state = btn._animationState;
  if (!state) return;
  state.target.tl = DEFAULT_RADIUS;
  state.target.tr = DEFAULT_RADIUS;
  state.target.br = DEFAULT_RADIUS;
  state.target.bl = DEFAULT_RADIUS;
  if (!state.isAnimating) {
    state.isAnimating = true;
    requestAnimationFrame(() => animateRadii(btn));
  }
};


function LoginPage({ onLoginSuccess }) {
  // состояние для переключения между формами "вход" и регистрация"
  const [selectedTab, setSelectedTab] = useState('login');
  const [hoveredTab, setHoveredTab] = useState('login');

  // состояния для полей формы входа
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  // состояния для полей формы регистрации (общие)
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // состояния для ошибок валидации и ответа сервера
  const [passwordError, setPasswordError] = useState('');
  const [registerError, setRegisterError] = useState('');

  // состояния для выбора роли при регистрации
  const [selectedRole, setSelectedRole] = useState('student');
  const [hoveredRole, setHoveredRole] = useState('student');

  // состояния для полей, зависящих от выбранной роли
  const [studentId, setStudentId] = useState('');
  const [group, setGroup] = useState('');
  const [curatorLogin, setCuratorLogin] = useState('');

  // обработчик отправки формы входа
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    onLoginSuccess(login, password);
  };
  
  // хук для отображения уведомлений
  const { addNotification } = useNotification();

  // обработчик отправки формы регистрации
const handleRegisterSubmit = async (e) => {
  e.preventDefault();
  setPasswordError('');
  setRegisterError('');

  const validationResult = await validateRegistration({
    lastName,
    firstName,
    middleName,
    email,
    password: registerPassword,
    confirmPassword,
    role: selectedRole,
    studentId,
    group,
    curatorLogin
  });

  if (!validationResult.valid) {
    addNotification(validationResult.message, 'error');
    return;
  }

    // формируем базовый объект с общими данными для всех ролей
    const baseData = {
      lastName: lastName,
      firstName: firstName,
      middleName: middleName || null,
      email: email,
      password: registerPassword,
      role: selectedRole,
    };
    
    // добавляем в объект поля, специфичные для выбранной роли
    let registrationData;
    if (selectedRole === 'student') {
        registrationData = { ...baseData, studentId: studentId, group: group };
    } else { // для куратора
        registrationData = { ...baseData, curatorLogin: curatorLogin };
    }

    try {
        const response = await fetch('http://localhost:8000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(registrationData),
        });

        // если сервер вернул ошибку
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Произошла ошибка при регистрации');
        }

        // при успешной регистрации показываем сообщение и переключаем на вкладку входа
        alert('Регистрация прошла успешно! Теперь вы можете войти.');
        setSelectedTab('login');
        
        // полностью очищаем все поля формы регистрации
        setLastName('');
        setFirstName('');
        setMiddleName('');
        setEmail('');
        setRegisterPassword('');
        setConfirmPassword('');
        setStudentId('');
        setGroup('');
        setCuratorLogin('');
        setRegisterError('');
        setPasswordError('');

    } catch (error) {
        // отображаем ошибку, полученную от сервера или сети
        addNotification(error.message);
    }
  };

  return (
    <div className="auth-container">
      {/* переключатель вкладок "вход" / "регистрация" */}
      <div className="form-toggle" onMouseLeave={() => setHoveredTab(selectedTab)}>
        <button onClick={() => setSelectedTab('login')} onMouseEnter={() => setHoveredTab('login')} className={`toggle-button ${selectedTab === 'login' ? 'selected' : ''} ${hoveredTab === 'login' ? 'hover-active' : ''}`}>
          ВХОД
        </button>
        <button onClick={() => setSelectedTab('register')} onMouseEnter={() => setHoveredTab('register')} className={`toggle-button ${selectedTab === 'register' ? 'selected' : ''} ${hoveredTab === 'register' ? 'hover-active' : ''}`}>
          РЕГИСТРАЦИЯ
        </button>
        <div className="glider" style={{ transform: `translateX(${hoveredTab === 'register' ? '100%' : '0'})` }} />
      </div>

      <div className="form-box" key={selectedTab}>
        {/* условный рендеринг формы входа */}
        {selectedTab === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="login-email">Логин</label>
              <div className="input-wrapper">
                <UserIcon className="input-icon" />
                <input type="text" id="login-email" value={login} onChange={(e) => setLogin(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Пароль</label>
              <div className="input-wrapper">
                 <PasswordIcon className="input-icon" />
                 <input type="password" id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="submit-btn" onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave}>
              <span>Войти</span>
            </button>
          </form>
        )}
        {/* условный рендеринг формы регистрации */}
        {selectedTab === 'register' && (
          <form onSubmit={handleRegisterSubmit}>
            {/* общие поля для всех ролей */}
            <div className="form-group"><label htmlFor="reg-lastname">Фамилия</label><div className="input-wrapper"><UserIcon className="input-icon" /><input type="text" id="reg-lastname" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div></div>
            <div className="form-group"><label htmlFor="reg-firstname">Имя</label><div className="input-wrapper"><UserIcon className="input-icon" /><input type="text" id="reg-firstname" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div></div>
            <div className="form-group"><label htmlFor="reg-middlename">Отчество</label><div className="input-wrapper"><UserIcon className="input-icon" /><input type="text" id="reg-middlename" value={middleName} onChange={(e) => setMiddleName(e.target.value)} /></div></div>
            <div className="form-group"><label htmlFor="reg-email">Почта</label><div className="input-wrapper"><EmailIcon className="input-icon" /><input type="email" id="reg-email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div></div>
            <div className="form-group"><label htmlFor="reg-password">Пароль</label><div className="input-wrapper"><PasswordIcon className="input-icon" /><input type="password" id="reg-password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required /></div></div>
            <div className="form-group"><label htmlFor="reg-confirm-password">Подтвердите пароль</label><div className="input-wrapper"><PasswordIcon className="input-icon" /><input type="password" id="reg-confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div></div>
            
            {passwordError && <p className="form-error">{passwordError}</p>}
            
            {/* переключатель ролей */}
            <div className="role-toggle" onMouseLeave={() => setHoveredRole(selectedRole)}>
              <button type="button" onClick={() => setSelectedRole('student')} onMouseEnter={() => setHoveredRole('student')} className={`toggle-button ${selectedRole === 'student' ? 'selected' : ''} ${hoveredRole === 'student' ? 'hover-active' : ''}`}>Студент</button>
              <button type="button" onClick={() => setSelectedRole('curator')} onMouseEnter={() => setHoveredRole('curator')} className={`toggle-button ${selectedRole === 'curator' ? 'selected' : ''} ${hoveredRole === 'curator' ? 'hover-active' : ''}`}>Куратор</button>
              <div className="glider" style={{ transform: `translateX(${hoveredRole === 'curator' ? '100%' : '0'})` }}/>
            </div>

            {/* контейнер для условно отображаемых полей */}
            <div className="conditional-fields-wrapper" key={selectedRole}>
              {/* поля для студента */}
              {selectedRole === 'student' && (
                <>
                  <div className="form-group"><label htmlFor="reg-studentid">Номер студенческого билета</label><div className="input-wrapper"><UserIcon className="input-icon" /><input type="text" id="reg-studentid" value={studentId} onChange={(e) => setStudentId(e.target.value)} required /></div></div>
                  <div className="form-group"><label htmlFor="reg-group">Группа</label><div className="input-wrapper"><UserIcon className="input-icon" /><input type="text" id="reg-group" value={group} onChange={(e) => setGroup(e.target.value)} required /></div></div>
                </>
              )}
              {/* поля для куратора */}
              {selectedRole === 'curator' && (
                <div className="form-group"><label htmlFor="reg-curator-login">Логин</label><div className="input-wrapper"><UserIcon className="input-icon" /><input type="text" id="reg-curator-login" value={curatorLogin} onChange={(e) => setCuratorLogin(e.target.value)} required /></div></div>
              )}
            </div>

            <button type="submit" className="submit-btn" onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave}>
              <span>Зарегистрироваться</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginPage;