import React, { useState, useEffect, useRef } from 'react';
import './CreateEventPage.css';
import { useNotification } from '../../notification/NotificationContext';

// иконки
import { ReactComponent as DownIcon } from '../../icons/down-icon.svg';

const API_BASE_URL = 'http://localhost:8000';

// АНИМАЦИЯ КНОПОК

// коэффициент для плавности анимации радиусов углов
const EASING_FACTOR = 0.15;
// радиус углов по умолчанию
const DEFAULT_RADIUS = 0;

// функция для анимирования радиусов углов элемента
function animateRadii(btn) {
  // получаем состояние анимации элемента
  const state = btn._animationState;
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
  btn.style.borderRadius = `${state.current.tl}px ${state.current.tr}px ${state.current.br}px ${state.current.bl}px`;

  // если анимация все еще нужна, запрашиваем следующий кадр
  if (isAnimationNeeded) {
    requestAnimationFrame(() => animateRadii(btn));
  } else {
    // иначе, помечаем, что анимация завершена
    state.isAnimating = false;
  }
}

// универсальный обработчик движения мыши для создания эффектов
const handleMouseMoveForEffect = (e) => {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // передаем координаты мыши в css переменные для градиентного эффекта
  el.style.setProperty('--mouse-x', `${x}px`);
  el.style.setProperty('--mouse-y', `${y}px`);

  // если это кнопка формы, запускаем анимацию радиусов
  if (el.classList.contains('form-submit-btn') || el.classList.contains('form-secondary-btn')) {
    // инициализируем состояние анимации, если его нет
    if (!el._animationState) {
      el._animationState = {
        isAnimating: false,
        current: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
        target: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
      };
    }
    const state = el._animationState;
    const { width, height } = rect;
    const maxRadius = 25;
    const diagonal = Math.sqrt(width**2 + height**2);
    
    // функция для расчета радиуса в зависимости от удаленности курсора от угла
    const calculateRadius = (cx, cy) => Math.max(0, maxRadius * Math.pow(1 - (Math.sqrt((x - cx)**2 + (y - cy)**2) / diagonal), 3));
    
    // вычисляем целевые радиусы для каждого угла
    state.target.tl = calculateRadius(0, 0);
    state.target.tr = calculateRadius(width, 0);
    state.target.br = calculateRadius(width, height);
    state.target.bl = calculateRadius(0, height);
    
    // запускаем анимацию, если она не активна
    if (!state.isAnimating) {
        state.isAnimating = true;
        requestAnimationFrame(() => animateRadii(el));
    }
  }
};

// обработчик увода мыши с кнопки
const handleButtonLeave = (e) => {
  const btn = e.currentTarget;
  // проверяем, является ли элемент кнопкой формы
  if(btn.classList.contains('form-submit-btn') || btn.classList.contains('form-secondary-btn')) {
    const state = btn._animationState;
    if (!state) return;
    
    // сбрасываем целевые радиусы к значениям по умолчанию
    state.target.tl = DEFAULT_RADIUS;
    state.target.tr = DEFAULT_RADIUS;
    state.target.br = DEFAULT_RADIUS;
    state.target.bl = DEFAULT_RADIUS;
    
    // запускаем анимацию возврата в исходное состояние
    if (!state.isAnimating) {
        state.isAnimating = true;
        requestAnimationFrame(() => animateRadii(btn));
    }
  }
};


const FormField = ({ label, children }) => (
    <div className="form-field">
        <label>{label}</label>
        <div className="input-wrapper">{children}</div>
    </div>
);


const CustomSelect = ({ options, value, onChange, placeholder }) => {
    // состояние для отслеживания, открыт ли список
    const [isOpen, setIsOpen] = useState(false);
    // ссылка на корневой элемент для отслеживания кликов вне его
    const ref = useRef(null);

    // эффект для закрытия списка при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    // обработчик выбора опции
    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div ref={ref} className={`custom-select-container ${isOpen ? 'is-open' : ''}`}>
            <div className="form-input custom-select-value" onClick={() => setIsOpen(!isOpen)}>
                {value || <span style={{opacity: 0.6}}>{placeholder}</span>}
                <DownIcon />
            </div>
            <div className="custom-select-options">
                {/* рендерим список опций */}
                {options.map(option => (
                    <div key={option} className={`custom-select-option ${value === option ? 'is-selected' : ''}`} onClick={() => handleSelect(option)}>
                        {option}
                    </div>
                ))}
            </div>
        </div>
    );
};


export default function CreateEventPage({ userLogin }) {
    // хук для отображения уведомлений
    const { addNotification } = useNotification();
    
    // статичный список опций для статуса мероприятия
    const [statusOptions] = useState(['Международный', 'Всероссийский', 'Городской', 'Региональный', 'Внутривузовский']);
    
    // состояние для хранения данных формы
    const [formData, setFormData] = useState({
        eventName: '', leader: '', organizer: '', location: '', eventStatus: '', eventDate: '',
    });
    
    // универсальный обработчик для обновления полей формы
    const handleInputChange = (field, value) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    
    // функция для очистки всех полей формы
    const clearForm = () => {
        setFormData({
            eventName: '', leader: '', organizer: '', location: '', eventStatus: '', eventDate: '',
        });
    };
    
    // обработчик отправки формы
    const handleSubmit = async (e) => {
        // предотвращаем стандартное поведение формы
        e.preventDefault();
        
        // проверка, определен ли пользователь
        if (!userLogin) {
            addNotification('Ошибка: Не удалось определить пользователя. Пожалуйста, перезайдите в систему.', 'error');
            return;
        }
        
        // простая валидация на заполненность всех полей
        if (!formData.eventName || !formData.leader || !formData.organizer || !formData.location || !formData.eventStatus || !formData.eventDate) {
            addNotification('Пожалуйста, заполните все поля формы.', 'warning');
            return;
        }
        
        // формируем тело запроса, добавляя логин пользователя
        const body = { ...formData, user_login: userLogin };
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/events/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            // если ответ успешный, показываем уведомление и очищаем форму
            if (response.ok) {
                addNotification('Мероприятие успешно создано!', 'success');
                clearForm();
            } else {
                // если сервер вернул ошибку, пытаемся извлечь сообщение
                const errorData = await response.json();
                addNotification(`Ошибка при создании мероприятия: ${errorData.detail || response.statusText}`, 'error');
            }
        } catch (error) {
            // обрабатываем ошибки сети
            console.error("Ошибка при отправке данных на сервер:", error);
            addNotification('Не удалось подключиться к серверу. Попробуйте позже.', 'error');
        }
    };
    
    return (
        <div className="create-event-container">
            <h1>Создать мероприятие</h1>
            
            <div className="page-content">
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        {/* поля для ввода данных о мероприятии */}
                        <FormField label="Название мероприятия">
                            <input className="form-input" type="text" value={formData.eventName} onChange={(e) => handleInputChange('eventName', e.target.value)} required />
                        </FormField>
                        <FormField label="Руководитель">
                            <input className="form-input" type="text" value={formData.leader} onChange={(e) => handleInputChange('leader', e.target.value)} required />
                        </FormField>
                        <FormField label="Организатор">
                            <input className="form-input" type="text" value={formData.organizer} onChange={(e) => handleInputChange('organizer', e.target.value)} required />
                        </FormField>
                        <FormField label="Место проведения">
                            <input className="form-input" type="text" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} required />
                        </FormField>
                        <FormField label="Статус мероприятия">
                           <CustomSelect
                                options={statusOptions}
                                value={formData.eventStatus}
                                onChange={(value) => handleInputChange('eventStatus', value)}
                                placeholder="Выберите статус"
                           />
                        </FormField>
                        <FormField label="Дата проведения">
                            <input className="form-input" type="date" value={formData.eventDate} onChange={(e) => handleInputChange('eventDate', e.target.value)} required />
                        </FormField>
                    </div>

                    <div className="form-actions-container">
                        {/* кнопка для очистки формы */}
                        <button
                            type="button"
                            className="form-secondary-btn"
                            onClick={clearForm}
                            onMouseMove={handleMouseMoveForEffect}
                            onMouseLeave={handleButtonLeave}
                        >
                            <span>Очистить форму</span>
                        </button>
                        {/* кнопка для отправки формы */}
                        <button
                            type="submit"
                            className="form-submit-btn"
                            onMouseMove={handleMouseMoveForEffect}
                            onMouseLeave={handleButtonLeave}
                        >
                            <span>Создать мероприятие</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}