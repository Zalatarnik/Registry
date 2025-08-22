import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNotification } from '../../notification/NotificationContext';
import { validateProfileUpdate, validateSecurity } from '../../validation/ValidationContext';
import { useTranslation } from '../../components/common/useTranslation';

import './ProfilePage.css';

import { ReactComponent as CameraIcon } from '../../icons/photo-icon.svg';
import { ReactComponent as CloseIcon } from '../../icons/exit-icon.svg';
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

const FormField = ({ label, children }) => (
    <div className="form-field">
        <label>{label}</label>
        <div className="input-wrapper">{children}</div>
    </div>
);


// компонент всплывающего окна для настроек безопасности
const SecurityModal = ({ isOpen, onClose, userLogin, position }) => {
    const { t } = useTranslation();
    // хук для отображения уведомлений
    const { addNotification } = useNotification();
    // состояние для полей ввода
    const [email, setEmail] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    // состояние для индикации процесса сохранения
    const [isSaving, setIsSaving] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
        }
    }, [isOpen]);

    // если всплывающее окно не открыто, ничего не рендерим
    if (!isOpen) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            // очищаем поля при закрытии
            setEmail('');
            setOldPassword('');
            setNewPassword('');
        }, 400);
    };

    // обработчик сохранения данных безопасности
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // валидируем перед отправкой
            const validationErrors = await validateSecurity({ email, oldPassword, newPassword });

            // если есть ошибки - показать первую и остановить
            const errorKeys = Object.keys(validationErrors);
            if (errorKeys.length > 0) {
                addNotification(validationErrors[errorKeys[0]], 'error');
                setIsSaving(false);
                return;
            }

            // собираем тело запроса
            const payload = {};
            if (email.trim()) payload.email = email.trim();
            if (oldPassword.trim()) payload.old_password = oldPassword.trim();
            if (newPassword.trim()) payload.new_password = newPassword.trim();
            
            if (Object.keys(payload).length === 0) {
                 addNotification('Нет данных для обновления.', 'error');
                 setIsSaving(false);
                 return;
            }

            const res = await fetch(`${API_URL}/api/profile/security`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || t('security.update.error'));
            }

            addNotification(t('profile.notification.securityUpdated'), 'success');
            handleClose();
        } catch (e) {
            addNotification(e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        handleSave();
    };
    
    // используем портал для рендеринга всплывающего окна в body
    return ReactDOM.createPortal(
        <div className={`profile-page-modal-scope modal-overlay ${isClosing ? 'is-closing' : ''}`} onMouseDown={handleClose}>
            <div className={`edit-modal-content ${isClosing ? 'is-closing' : ''}`} onMouseDown={e => e.stopPropagation()} style={position || {}}>
                <div className="chat-header">
                    <div className="chat-title-wrapper">
                        <h2>{t('profile.security.title')}</h2>
                    </div>
                </div>
                <div className="edit-modal-body">
                    <form className="edit-form-inside-modal" onSubmit={handleFormSubmit}>
                        <div className="form-grid-two-col">
                            <div className="email-column">
                                <FormField label={t('profile.security.email')}>
                                    <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('profile.security.email.placeholder')} />
                                </FormField>
                            </div>
                            <div className="password-column">
                                <FormField label={t('profile.security.oldPassword')}>
                                    <input className="form-input" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder={t('profile.security.oldPassword.placeholder')} />
                                </FormField>
                                <FormField label={t('profile.security.newPassword')}>
                                    <input className="form-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('profile.security.newPassword')} />
                                </FormField>
                            </div>
                        </div>
                        <div className="form-actions-container">
                            <button type="button" className="form-secondary-btn" onClick={handleClose} onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave} disabled={isSaving}>
                                <span>{t('logout.cancel')}</span>
                            </button>
                            <button type="submit" className="form-submit-btn" onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave} disabled={isSaving}>
                                {isSaving ? <ClockwiseLoader size={20} /> : <span>{t('profile.saveSecurity')}</span>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>, document.body
    );
};

// компонент редактируемого поля
const EditableField = ({ label, value, onValueChange, fieldId, activeField, setActiveField, isLocked = false }) => {
  const { t } = useTranslation();
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
          <span className="editable-field-value">{value || t('profile.notSpecified')}</span>
        )}
      </div>
    </div>
  );
};

// главный компонент страницы профиля
export default function ProfilePage({ userRole, userLogin }) {
  const { t } = useTranslation();
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
  const [modalPosition, setModalPosition] = useState(null);

  const [errorShown, setErrorShown] = useState(false);
  // загрузка данных профиля
useEffect(() => {
  if (!userLogin) return;

  setIsLoading(true);

  fetch(`${API_URL}/api/profile/me`, {
    credentials: 'include'
  })
    .then(res => {
      if (!res.ok) throw new Error(t('profile.loadingError'));
      return res.json();
    })
    .then(data => {
      const normalized = {
        ...data,
        patronymic: data.patronymic ?? data.middleName ?? ''
      };
      setUserData(normalized);
      setOriginalUserData(normalized);
    })
    .catch(err => {
      console.error(err);
      if (!errorShown) {                               // уведомляем один раз
        addNotification(err.message, 'error');
        setErrorShown(true);
      }
    })
    .finally(() => setIsLoading(false));
}, [addNotification, errorShown, t, userLogin]);   

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
            credentials: 'include'
        });
        if (!response.ok) {
          // пробуем распарсить json; если это HTML — получим исключение
          let message = 'Unable to upload avatar';
          try {
            const errData = await response.json();
            message = errData.detail ?? message;
          } catch (_) {
            // значит сервер вернул HTML или пустой ответ
          }
          throw new Error(message);
        }
        // обновляем данные профиля после успешной загрузки аватара
        const updatedProfile = await response.json();
        setUserData(updatedProfile);
        setOriginalUserData(updatedProfile);
        addNotification(t('profile.notification.avatar'));
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
  e.preventDefault(); // чтобы страница не перезагружалась при отправке формы
  setIsSaving(true);  // сохранение

  try {
    // проверим данные через функцию валидации
    const validation = validateProfileUpdate(userData, t);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // берём очищенные и нормализованные данные (обрезаны пробелы, заглавные буквы и т.д.)
    const sanitizedData = validation.sanitizedData;

    // login не надо отправляем
    const { login, ...payload } = sanitizedData;

    // отправляем запрос на сервер на обновление профиля
    const response = await fetch(`${API_URL}/api/profile/${userLogin}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    // если сервер ответил ошибкой 
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail);
    }

    // если всё ок, обновляем данные в состоянии
    const savedData = await response.json();
    setOriginalUserData({ ...originalUserData, ...savedData }); // сохраняем исходные данные
    setUserData(prev => ({ ...prev, ...savedData }));           // и текущие тоже обновляем

    setIsEditingMode(false);  // выключаем режим редактирования
    setEditingField(null);    // убираем фокус с поля

    addNotification(t('profile.notification.updated')); 
  } catch (error) {
    addNotification(error.message, 'error');
  } finally {
    setIsSaving(false);
  }
};
  
  // открывает модальное окно безопасности
  const handleSecurityClick = (e) => {
    const buttonRect = e.currentTarget.getBoundingClientRect();
    const rightPosition = window.innerWidth - buttonRect.left + 20;
    const topPosition = buttonRect.top - 100;

    setModalPosition({ top: `${topPosition}px`, right: `${rightPosition}px` });
    setIsModalOpen(true);
  };

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
      <h1>{t('profile.title')}</h1>
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
                <img src={`${API_URL}${userData.avatar}`} alt="avatar" className="profile-avatar-preview" />
                {isEditingMode && (
                    <div className="avatar-upload-label">
                        <CameraIcon /> {t('profile.avatar.change')}
                    </div>
                )}
                <input type="file" id="avatarUpload" className="avatar-upload-input" accept="image/*" onChange={handleAvatarChange} disabled={!isEditingMode || isSaving} />
              </label>
              
              <div className="profile-form">
                <EditableField label={t('profile.fields.lastName')} value={userData.lastName} onValueChange={(val) => handleValueChange('lastName', val)} fieldId="lastName" activeField={editingField} setActiveField={setEditingField} isLocked={isFieldLocked('lastName')} />
                
                {userRole === 'student' ? (
                  <EditableField label={t('profile.fields.studentId')} value={userData.studentIdNumber} fieldId="studentId" isLocked={true} />
                ) : (
                  <EditableField label={t('profile.fields.login')} value={userData.login} fieldId="login" isLocked={true} />
                )}

                <EditableField label={t('profile.fields.firstName')} value={userData.firstName} onValueChange={(val) => handleValueChange('firstName', val)} fieldId="firstName" activeField={editingField} setActiveField={setEditingField} isLocked={isFieldLocked('firstName')} />

                {userRole === 'student' ? (
                  <EditableField label={t('profile.fields.group')} value={userData.group} onValueChange={(val) => handleValueChange('group', val)} fieldId="group" activeField={editingField} setActiveField={setEditingField} isLocked={isFieldLocked('group')}/>
                ) : (
                  <EditableField label={t('profile.fields.position')} value={userData.position} onValueChange={(val) => handleValueChange('position', val)} fieldId="position" activeField={editingField} setActiveField={setEditingField} isLocked={isFieldLocked('position')}/>
                )}
                
                <EditableField label={t('profile.fields.patronymic')} value={userData.patronymic} onValueChange={(val) => handleValueChange('patronymic', val)} fieldId="patronymic" activeField={editingField} setActiveField={setEditingField} isLocked={isFieldLocked('patronymic')} />
                
                {/* контейнер для кнопки "безопасность", выровненный с другими полями */}
                <div className="editable-field-container" style={{ cursor: 'default' }}>
                  <label> </label>
                  <button type="button" className="profile-secondary-btn" onClick={handleSecurityClick} onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave}>
                    <span>{t('profile.security')}</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="profile-submit-container">
              {/* контейнер с кнопкой "редактировать", видимый по умолчанию */}
              <div className={`action-buttons-wrapper ${!isEditingMode ? 'is-visible' : ''}`}>
                <button type="button" className="profile-submit-btn profile-submit-btn-large" onClick={handleEditClick} onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave}>
                  <span>{t('profile.edit')}</span>
                </button>
              </div>

              {/* контейнер с кнопками "отмена" и "сохранить", видимый в режиме редактирования */}
              <div className={`action-buttons-wrapper ${isEditingMode ? 'is-visible' : ''}`}>
                <button type="button" className="profile-secondary-btn" onClick={handleCancelClick} onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave} disabled={isSaving}>
                  <span>{t('profile.cancel')}</span>
                </button>
                <button type="submit" className="profile-submit-btn profile-submit-btn-large" onMouseMove={handleButtonMove} onMouseLeave={handleButtonLeave} disabled={isSaving}>
                  {isSaving ? <ClockwiseLoader size={20} /> : <span>{t('profile.saveChanges')}</span>}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        // если данные не загрузились, показываем сообщение об ошибке
        <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>{t('profile.loadingError')}</div>
      )}
      
      {/* рендерим всплывающее окно */}
      <SecurityModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setModalPosition(null); }} 
        userLogin={userLogin}
        position={modalPosition}
      />
    </div>
  );
}