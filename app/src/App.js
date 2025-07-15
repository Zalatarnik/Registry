import React, { useState, useEffect } from 'react';
import { NotificationProvider, useNotification } from './notification/NotificationContext';
import './App.css';
import LoginPage from './components/LoginPage/LoginPage';
import Dashboard from './components/Dashboard/Dashboard';
import localLogo from './images/logo.png';

function AppContent() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("Could not parse user from localStorage", e);
      return null;
    }
  });

  // состояние для управления анимацией исчезновения экрана входа
  const [isHidingLogin, setIsHidingLogin] = useState(false);
  // состояние для отслеживания активной страницы в Dashboard
  // 'profile' - страница по умолчанию после входа
  const [activePage, setActivePage] = useState('profile');
  const { addNotification } = useNotification();

  // эффект для обработки нажатия клавиши esc
  useEffect(() => {
    const handleKeyDown = (event) => {
      // если пользователь авторизован, нажатие esc сбрасывает activePage
      if (user && event.key === 'Escape') {
        setActivePage(null); // возвращает пользователя в главное меню Dashboard
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  // функция для обработки попытки входа
  const handleLoginSuccess = async (login, password) => {
    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка аутентификации');
      }

      // получаем данные пользователя (login, role)
      const data = await response.json();
      const userData = { login: data.login, role: data.role };

      localStorage.setItem('user', JSON.stringify(userData));

      // показываем приветственное уведомление
      addNotification(`Добро пожаловать! Вы вошли как ${data.role === 'student' ? 'студент' : 'куратор'}.`);
      // запускаем анимацию скрытия формы входа
      setIsHidingLogin(true);

      setTimeout(() => {
        setUser(userData);
        setActivePage('profile'); // устанавливаем 'profile' как страницу по умолчанию
        setIsHidingLogin(false); // сбрасываем состояние анимации
      }, 400);

    } catch (error) {
      console.error("Login Error:", error);
      addNotification(error.message, 'error');
    }
  };
  
  // функция для выхода из системы
  const handleLogout = () => {
    // удаляет данные пользователя из localStorage
    localStorage.removeItem('user');
    setActivePage(null);
    setUser(null);
  };

  // вычисляемая переменная, чтобы определить, должен ли логотип быть скрыт
  const isLogoHidden = user && activePage;

  return (
    <div className="App">
      <div className={`background-triangle ${user ? 'is-visible' : ''} ${user && !activePage ? 'is-enlarged' : ''}`}></div>
      <div className={`background-shape-right ${user && !activePage ? 'is-visible' : ''}`}></div>
      <img src={localLogo} alt="Логотип" className={`app-logo ${isLogoHidden ? 'is-hidden' : ''} ${user && !activePage ? 'is-enlarged' : ''}`} />

      {!user ? (
        <div className={`login-page-container ${isHidingLogin ? 'is-hiding' : ''}`}>
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        </div>
      ) : (
        <Dashboard
          userLogin={user.login}
          userRole={user.role}
          onLogout={handleLogout}
          activePage={activePage}
          onPageChange={setActivePage}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}