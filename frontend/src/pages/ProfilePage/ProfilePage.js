import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNotification } from '../../notification/NotificationContext';
import './ProfilePage.css';

import { ReactComponent as CameraIcon } from '../../icons/photo-icon.svg';
import ClockwiseLoader from '../../components/common/Loader';

// АНИМАЦИЯ КНОПКИ

// коэффициент для плавности анимации радиусов углов
const EASING_FACTOR = 0.15;
// радиус углов по умолчанию
const DEFAULT_RADIUS = 0;

// функция для анимирования радиусов углов кнопки
function animateRadii(btn) {
  // получаем состояние анимации из кастомного свойства объекта кнопки
  const state = btn._animationState;
  // выходим, если состояния нет
  if(!state) return;
  
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
  
  // применяем вычисленные радиусы к стилю кнопки
  btn.style.borderRadius = `${state.current.tl}px ${state.current.tr}px ${state.current.br}px ${state.current.bl}px`;
  
  // если анимация все еще нужна, запрашиваем следующий кадр
  if (isAnimationNeeded) {
    requestAnimationFrame(() => animateRadii(btn));
  } else {
    // иначе, помечаем, что анимация завершена
    state.isAnimating = false;
  }
}

// обработчик движения мыши над кнопкой
const handleButtonMove = (e) => {
  const btn = e.currentTarget;
  // инициализируем состояние анимации, если его нет
  if (!btn._animationState) {
    btn._animationState = {
      isAnimating: false,
      current: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
      target: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
    };
  }
  const state = btn._animationState;
  
  // получаем координаты мыши относительно кнопки
  const rect = btn.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const { width, height } = rect;
  
  // устанавливаем максимальный радиус и вычисляем диагональ
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
    requestAnimationFrame(() => animateRadii(btn));
  }
  
  // передаем координаты мыши в css переменные для других эффектов (например, градиента)
  btn.style.setProperty('--mouse-x', `${x}px`);
  btn.style.setProperty('--mouse-y', `${y}px`);
};

// обработчик увода мыши с кнопки
const handleButtonLeave = (e) => {
  const btn = e.currentTarget;
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
};

// коэффициент для плавности анимации угла
const ANGLE_EASING_FACTOR = 0.08;

// функция для плавной анимации угла поворота элемента
function animateAngle(el) {
  const state = el._angleAnimationState;
  if(!state) return;
  
  // вычисляем кратчайшую разницу между углами
  let diff = state.targetAngle - state.currentAngle;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  // если разница существенна, продолжаем анимацию
  if (Math.abs(diff) > 0.1) {
    state.currentAngle += diff * ANGLE_EASING_FACTOR;
    // применяем вычисленный угол в CSS переменную
    el.style.setProperty('--mouse-angle', `${state.currentAngle}deg`);
    requestAnimationFrame(() => animateAngle(el));
  } else {
    // иначе, завершаем анимацию и устанавливаем точное целевое значение
    state.currentAngle = state.targetAngle;
    el.style.setProperty('--mouse-angle', `${state.targetAngle}deg`);
    state.isAnimating = false;
  }
}

// обработчик движения мыши над аватаром
const handleAvatarMove = (e) => {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  
  // получаем координаты мыши относительно центра элемента
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  // вычисляем целевой угол в градусах
  const targetAngle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);

  // инициализируем состояние анимации, если его нет
  if (!el._angleAnimationState) {
    el._angleAnimationState = { isAnimating: false, currentAngle: targetAngle, targetAngle: targetAngle };
  }
  
  const state = el._angleAnimationState;
  // обновляем целевой угол
  state.targetAngle = targetAngle;
  
  // запускаем анимацию, если она не активна
  if (!state.isAnimating) {
    state.isAnimating = true;
    animateAngle(el);
  }
  
  // передаем координаты мыши в CSS переменные
  el.style.setProperty('--mouse-x', `${x}px`);
  el.style.setProperty('--mouse-y', `${y}px`);
};

const API_URL = 'http://localhost:8000';

// компонент всплывающего окна для настроек безопасности
const SecurityModal = ({ isOpen, onClose, userLogin }) => {
  // хук для отображения уведомлений
  const { addNotification } = useNotification();
  // состояние для полей ввода
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  // состояние для индикации процесса сохранения
  const [isSaving, setIsSaving] = useState(false);

  // если всплывающее окно не открыто, ничего не рендерим
  if (!isOpen) return null;

  // обработчик сохранения данных безопасности
  const handleSave = async () => {
    setIsSaving(true);
    try {
        // формируем тело запроса, отправляем только заполненные поля
        const payload = {
            login: userLogin,
            email: email || undefined,
            old_password: oldPassword || undefined,
            new_password: newPassword || undefined,
        };
        
        const response = await fetch(`${API_URL}/api/profile/security`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Ошибка обновления');
        }
        
        addNotification('Данные безопасности успешно обновлены!');
        onClose();
    } catch (error) {
        addNotification(error.message, 'error');
    } finally {
        setIsSaving(false);
    }
  };
  
  // обработчик клика для закрытия окна
  const handleOverlayClick = (e) => {
    if (e.target.id === 'modal-overlay') onClose();
  };

  // используем портал для рендеринга всплывающего окна в body
  return ReactDOM.createPortal(
    <div className="profile-page-modal-scope">
        <div className="modal-overlay" id="modal-overlay" onClick={handleOverlayClick}>
          <div className="modal-content">
            <div className="modal-header"><h2>Настройки безопасности</h2></div>
            <div className="modal-body">
              <div className="form-group"><label htmlFor="email">Новый адрес электронной почты</label><input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Оставьте пустым, если не меняете"/></div>
              <div className="form-group"><label htmlFor="old-password">Старый пароль</label><input type="password" id="old-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Обязательно для смены пароля" /></div>
              <div className="form-group"><label htmlFor="password">Новый пароль</label><input type="password" id="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Оставьте пустым, если не меняете" /></div>
            </div>
            <div className="modal-footer">
              <button className="profile-secondary-btn" onClick={onClose} onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave} disabled={isSaving}><span>Отмена</span></button>
              <button className="profile-submit-btn" onClick={handleSave} onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave} disabled={isSaving}>
                {isSaving ? <ClockwiseLoader size={20} /> : <span>Сохранить</span>}
              </button>
            </div>
          </div>
        </div>
    </div>, document.body
  );
};

// компонент редактируемого поля
const EditableField = ({ label, value, onValueChange, fieldId, activeField, setActiveField, isLocked = false }) => {
  // определяем, находится ли поле в режиме редактирования
  const isEditing = fieldId === activeField && !isLocked;
  // ссылка для управления фокусом на поле ввода
  const inputRef = useRef(null);

  // устанавливаем фокус на поле ввода при переходе в режим редактирования
  useEffect(() => { 
    if (isEditing) inputRef.current.focus(); 
  }, [isEditing]);

  // обработчик клика по контейнеру поля для активации редактирования
  const handleContainerClick = () => {
    if (isLocked || isEditing) return;
    setActiveField(fieldId);
  };
  
  // обработчик нажатия клавиш enter или esc для завершения редактирования
  const handleKeyDown = (e) => { 
    if (e.key === 'Enter' || e.key === 'Escape') { 
      setActiveField(null); 
      e.target.blur(); 
    } 
  };

  return (
    <div 
      className={`editable-field-container ${isEditing ? 'is-editing' : ''} ${isLocked ? 'is-locked' : ''}`} 
      onClick={handleContainerClick}
    >
      <label>{label}</label>
      <div className="editable-field-value-wrapper">
        {isEditing ? (
          // если в режиме редактирования, показываем input (для изменения)
          <input ref={inputRef} type="text" value={value || ''} onChange={(e) => onValueChange(e.target.value)} onBlur={() => setActiveField(null)} onKeyDown={handleKeyDown} className="editable-input" />
        ) : (
          // иначе, показываем span с текстом
          <span className="editable-field-value">{value || 'Не указано'}</span>
        )}
      </div>
    </div>
  );
};

// главный компонент страницы профиля
export default function ProfilePage({ userRole, userLogin }) {
  // хук для уведомлений
  const { addNotification } = useNotification();
  // состояние для данных пользователя, которые можно изменять
  const [userData, setUserData] = useState(null);
  // состояние для исходных данных пользователя (для отмены изменений)
  const [originalUserData, setOriginalUserData] = useState(null);
  // состояние загрузки данных
  const [isLoading, setIsLoading] = useState(true);
  // состояние процесса сохранения
  const [isSaving, setIsSaving] = useState(false);
  // хранит id поля, которое сейчас редактируется
  const [editingField, setEditingField] = useState(null);
  // состояние видимости модального окна
  const [isModalOpen, setIsModalOpen] = useState(false);
  // состояние режима редактирования всей формы
  const [isEditingMode, setIsEditingMode] = useState(false);

  // загрузка данных профиля
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userLogin) return;
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/profile/${userLogin}`);
        if (!response.ok) throw new Error('Не удалось загрузить данные профиля');
        const data = await response.json();
        // сохраняем полученные данные в оба состояния
        setUserData(data);
        setOriginalUserData(data);
      } catch (error) {
        addNotification(error.message, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfileData();
  }, [userLogin, addNotification])

  // обработчик изменения значения в любом редактируемом поле
  const handleValueChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };
  
  // обработчик смены аватара
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // используем FormData для отправки файла
    const formData = new FormData();
    formData.append('login', userLogin);
    formData.append('file', file);
    
    setIsSaving(true);
    try {
        const response = await fetch(`${API_URL}/api/profile/avatar`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Ошибка загрузки аватара');
        }
        // обновляем данные профиля после успешной загрузки аватара
        const updatedProfile = await response.json();
        setUserData(updatedProfile);
        setOriginalUserData(updatedProfile);
        addNotification('Аватар успешно обновлен!');
    } catch (error) {
        addNotification(error.message, 'error');
    } finally {
        setIsSaving(false);
    }
  };
  
  // включает режим редактирования
  const handleEditClick = () => setIsEditingMode(true);

  // отменяет изменения и выходит из режима редактирования
  const handleCancelClick = () => {
    setUserData(originalUserData);
    setIsEditingMode(false);
    setEditingField(null);
  };

  // обработчик отправки формы с измененными данными
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        // Из userData исключаем поля, которые не должны отправляться на сервер
        const { student_id_number, login, ...payload } = userData;
        const response = await fetch(`${API_URL}/api/profile/${userLogin}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Ошибка сохранения профиля');
        }
        // после успешного сохранения обновляем оба состояния данных
        const savedData = await response.json();
        setOriginalUserData(savedData);
        setUserData(savedData);
        setIsEditingMode(false);
        setEditingField(null);
        addNotification('Профиль успешно обновлен!');
    } catch (error) {
        addNotification(error.message, 'error');
    } finally {
        setIsSaving(false);
    }
  };
  
  // открывает модальное окно безопасности
  const handleSecurityClick = () => setIsModalOpen(true);

  // функция для определения, заблокировано ли поле для редактирования
  const isFieldLocked = (fieldName) => {
    // если не в режиме редактирования, все поля заблокированы
    if (!isEditingMode) return true;
    // поля, которые нельзя редактировать никогда
    const nonEditableFields = ['student_id_number', 'login']; 
    if(nonEditableFields.includes(fieldName)) return true;
    return false;
  };

  return (
    <div className="profile-container">
      <h1>Профиль пользователя</h1>
      {isLoading ? (
        // показываем загрузчик, пока данные загружаются
        <div className="page-loader-container"><ClockwiseLoader /></div>
      ) : userData ? (
        // если данные загружены, показываем контент страницы
        <div className="page-content">
          <form onSubmit={handleSubmit}>
            <div className="profile-layout">
              <label 
                htmlFor="avatarUpload" 
                className={`profile-avatar-section ${!isEditingMode ? 'is-locked' : ''}`}
                onMouseMove={isEditingMode ? handleAvatarMove : null} // применяем анимацию только в режиме редактирования
              >
                {/* формируем полный url для аватара */}
                <img src={`${API_URL}${userData.avatar}`} alt="Аватар" className="profile-avatar-preview" />
                {isEditingMode && (
                    <div className="avatar-upload-label">
                        <CameraIcon /> Сменить фото
                    </div>
                )}
                <input type="file" id="avatarUpload" className="avatar-upload-input" accept="image/*" onChange={handleAvatarChange} disabled={!isEditingMode || isSaving} />
              </label>
              
              <div className="profile-form">
                <EditableField label="Фамилия" value={userData.last_name} onValueChange={(val) => handleValueChange('last_name', val)} fieldId="lastName" activeField={editingField} setActiveField={setEditingField} isLocked={isFieldLocked('lastName')} />
                
                {userRole === 'student' ? (
                  <EditableField label="№ студенческого билета" value={userData.student_id_number} fieldId="studentId" isLocked={true} />
                ) : (
                  <EditableField label="Логин" value={userData.login} fieldId="login" isLocked={true} />
                )}

                <EditableField label="Имя" value={userData.first_name} onValueChange={(val) => handleValueChange('first_name', val)} fieldId="firstName" activeField={editingField} setActiveField={setEditingField} isLocked={isFieldLocked('firstName')} />

                {userRole === 'student' ? (
                  <EditableField label="Группа" value={userData.group} onValueChange={(val) => handleValueChange('group', val)} fieldId="group" activeField={editingField} setActiveField={setEditingField} isLocked={isFieldLocked('group')}/>
                ) : (
                  <EditableField label="Должность" value={userData.position} onValueChange={(val) => handleValueChange('position', val)} fieldId="position" activeField={editingField} setActiveField={setEditingField} isLocked={isFieldLocked('position')}/>
                )}
                
                <EditableField label="Отчество" value={userData.patronymic} onValueChange={(val) => handleValueChange('patronymic', val)} fieldId="patronymic" activeField={editingField} setActiveField={setEditingField} isLocked={isFieldLocked('patronymic')} />
                
                {/* контейнер для кнопки "безопасность", выровненный с другими полями */}
                <div className="editable-field-container" style={{ cursor: 'default' }}>
                  <label> </label>
                  <button type="button" className="profile-secondary-btn" onClick={handleSecurityClick} onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave}>
                    <span>Безопасность</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="profile-submit-container">
              {/* контейнер с кнопкой "редактировать", видимый по умолчанию */}
              <div className={`action-buttons-wrapper ${!isEditingMode ? 'is-visible' : ''}`}>
                <button type="button" className="profile-submit-btn profile-submit-btn-large" onClick={handleEditClick} onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave}>
                  <span>Редактировать</span>
                </button>
              </div>

              {/* контейнер с кнопками "отмена" и "сохранить", видимый в режиме редактирования */}
              <div className={`action-buttons-wrapper ${isEditingMode ? 'is-visible' : ''}`}>
                <button type="button" className="profile-secondary-btn" onClick={handleCancelClick} onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave} disabled={isSaving}>
                  <span>Отмена</span>
                </button>
                <button type="submit" className="profile-submit-btn profile-submit-btn-large" onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave} disabled={isSaving}>
                  {isSaving ? <ClockwiseLoader size={20} /> : <span>Сохранить изменения</span>}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        // если данные не загрузились, показываем сообщение об ошибке
        <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>Не удалось загрузить данные профиля.</div>
      )}
      
      {/* рендерим всплывающее окно */}
      <SecurityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} userLogin={userLogin} />
    </div>
  );
}