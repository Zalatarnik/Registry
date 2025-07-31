import { createContext, useContext, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './Notification.css';

const NotificationContext = createContext();

// АНИМАЦИЯ УВЕДОМЛЕНИЙ

// коэффициент для плавности анимации радиусов углов
const EASING_FACTOR = 0.15;
// радиус углов по умолчанию
const DEFAULT_RADIUS = 0;
// максимальный радиус скругления при наведении
const MAX_RADIUS = 30;

// функция для анимирования радиусов углов элемента
function animateRadii(el) {
  // получаем состояние анимации элемента
  const state = el._animationState;
  if (!state) return;

  let isAnimationNeeded = false;
  // перебираем все углы (tl, tr, br, bl)
  for (const corner in state.current) {
    // вычисляем разницу между целевым и текущим значением радиуса
    const diff = state.target[corner] - state.current[corner];
    
    // если разница существенна, продолжаем анимацию
    if (Math.abs(diff) > 0.01) {
      isAnimationNeeded = true;
      // плавно приближаем текущее значение к целевому
      state.current[corner] += diff * EASING_FACTOR;
    } else {
      // если разница мала, присваиваем целевое значение
      state.current[corner] = state.target[corner];
    }
  }

  // применяем вычисленные радиусы к стилю элемента
  el.style.borderRadius = `${state.current.tl}px ${state.current.tr}px ${state.current.br}px ${state.current.bl}px`;

  // если анимация все еще нужна, запрашиваем следующий кадр
  if (isAnimationNeeded) {
    requestAnimationFrame(() => animateRadii(el));
  } else {
    // иначе, помечаем, что анимация завершена
    state.isAnimating = false;
  }
}

// обработчик движения мыши над элементом для создания эффектов
const handleElementMove = (e) => {
  const el = e.currentTarget;
  // инициализируем состояние анимации, если его нет
  if (!el._animationState) {
    el._animationState = {
      isAnimating: false,
      current: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
      target: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
    };
  }
  const state = el._animationState;
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const { width, height } = rect;
  
  // вычисляем и запускаем анимацию радиусов
  const diagonal = Math.sqrt(width**2 + height**2);
  const calculateRadius = (cx, cy) => Math.max(0, MAX_RADIUS * Math.pow(1 - (Math.sqrt((x - cx)**2 + (y - cy)**2) / diagonal), 3));
  state.target.tl = calculateRadius(0, 0);
  state.target.tr = calculateRadius(width, 0);
  state.target.br = calculateRadius(width, height);
  state.target.bl = calculateRadius(0, height);
  
  // запускаем анимацию, если она не активна
  if (!state.isAnimating) {
    state.isAnimating = true;
    requestAnimationFrame(() => animateRadii(el));
  }
  
  // передаем координаты мыши в CSS переменные для градиентного эффекта
  el.style.setProperty('--mouse-x', `${x}px`);
  el.style.setProperty('--mouse-y', `${y}px`);
};

// обработчик увода мыши с элемента
const handleElementLeave = (e) => {
  const el = e.currentTarget;
  const state = el._animationState;
  if (!state) return;
  
  // сбрасываем целевые радиусы к значениям по умолчанию
  state.target.tl = DEFAULT_RADIUS;
  state.target.tr = DEFAULT_RADIUS;
  state.target.br = DEFAULT_RADIUS;
  state.target.bl = DEFAULT_RADIUS;
  
  // запускаем анимацию возврата в исходное состояние
  if (!state.isAnimating) {
    state.isAnimating = true;
    requestAnimationFrame(() => animateRadii(el));
  }
};


// иконка для успешных уведомлений
const SuccessIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.5 12L11 14.5L15.5 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// компонент для отображения одного всплывающего уведомления
const Toast = ({ message, isClosing, onStartClose, onEndClose }) => {
  // эффект для автоматического запуска закрытия через 3.5 секунды
  useEffect(() => {
    const timer = setTimeout(onStartClose, 3500);
    return () => clearTimeout(timer); // очищаем таймер
  }, [onStartClose]);

  // эффект для полного удаления элемента
  useEffect(() => {
    if (isClosing) {
      const timer = setTimeout(onEndClose, 400); // 400ms - длительность анимации
      return () => clearTimeout(timer);
    }
  }, [isClosing, onEndClose]);

  return (
    <div
      className={`toast ${isClosing ? 'is-closing' : ''}`}
      onClick={onStartClose} // закрытие по клику
      onMouseMove={handleElementMove} // анимация при движении мыши
      onMouseLeave={handleElementLeave} // возврат в исходное состояние
    >
      <div className="toast-colored-bar">
        <div className="toast-icon"><SuccessIcon /></div>
      </div>
      <div className="toast-content">
        <p className="toast-message">{message}</p>
      </div>
    </div>
  );
};

// управляет состоянием уведомлений
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  /** обычное уведомление */
  const addNotification = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [
      ...prev,
      { id, message, type, isClosing: false }
    ]);
  };

  /** покажет уведомление, только если такого текста ещё нет среди открытых */
  const addNotificationOnce = (message, type = 'info') => {
    const already = notifications.some(
      n => n.message === message && !n.isClosing
    );
    if (!already) addNotification(message, type);
  };

  const startCloseNotification = id =>
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isClosing: true } : n))
    );

  const endCloseNotification = id =>
    setNotifications(prev => prev.filter(n => n.id !== id));

  return (
    <NotificationContext.Provider
      value={{ addNotification, addNotificationOnce }}
    >
      {children}
      {ReactDOM.createPortal(
        <div className="notification-container">
          {notifications.map(({ id, message, isClosing }) => (
            <Toast
              key={id}
              message={message}
              isClosing={isClosing}
              onStartClose={() => startCloseNotification(id)}
              onEndClose={() => endCloseNotification(id)}
            />
          ))}
        </div>,
        document.body
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);