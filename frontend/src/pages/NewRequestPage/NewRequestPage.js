import React, { useState, useEffect, useRef } from 'react';
import './NewRequestPage.css';
import { useNotification } from '../../notification/NotificationContext';
import ClockwiseLoader from '../../components/common/Loader';

// иконки
import { ReactComponent as UploadIcon } from '../../icons/upload-icon.svg';
import { ReactComponent as DownIcon } from '../../icons/down-icon.svg';


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
  if (btn.classList.contains('form-submit-btn') || btn.classList.contains('form-secondary-btn')) {
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

const FormField = ({ label, children, isTextarea }) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (isTextarea) {
            const textarea = inputRef.current;
            const handleInput = () => {
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
            };
            textarea.addEventListener('input', handleInput);
            // Вызываем handleInput при инициализации, чтобы установить правильную высоту
            handleInput();
            return () => textarea.removeEventListener('input', handleInput);
        }
    }, [isTextarea]);

    const childrenWithRef = isTextarea ? React.cloneElement(children, { ref: inputRef, rows: 1 }) : children;

    return (
        <div className="form-field">
            <label>{label}</label>
            <div className="input-wrapper">{childrenWithRef}</div>
        </div>
    );
};

const CustomSelect = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);
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
                {options.map(option => (
                    <div key={option} className={`custom-select-option ${value === option ? 'is-selected' : ''}`} onClick={() => handleSelect(option)}>
                        {option}
                    </div>
                ))}
            </div>
        </div>
    );
};

// компонент для загрузки файлов
const FileUploadArea = ({ files, setFiles }) => {
    // состояние для отслеживания, перетаскивается ли файл над областью
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);

    // обработчик добавления новых файлов
    const handleFileChange = (selectedFiles) => {
        // фильтруем дубликаты по имени файла
        const newFiles = Array.from(selectedFiles).filter(file => !files.some(f => f.name === file.name));
        setFiles(prev => [...prev, ...newFiles]);
    };

    // обработчики событий перетаскивания
    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    };

    // функция для удаления файла из списка
    const removeFile = (fileName) => {
        setFiles(files.filter(file => file.name !== fileName));
    };

    return (
        <div className="file-upload-container">
            <div
                className={`file-upload-area ${isDragging ? 'is-dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current.click()} // открываем диалог выбора файла по клику
                onMouseMove={handleMouseMoveForEffect}
            >
                {files.length === 0 ? (
                    // вид, когда файлы не выбраны
                    <>
                        <UploadIcon className="file-upload-icon" />
                        <p className="file-upload-text">
                            Перетащите файлы сюда или <span>выберите их</span>
                        </p>
                    </>
                ) : (
                    // вид со списком выбранных файлов
                    <div className="file-list-inside">
                        {files.map(file => (
                            <div key={file.name} className="file-item">
                                <span className="file-item-name">{file.name}</span>
                                <button className="file-item-remove-btn" onClick={(e) => {e.stopPropagation(); removeFile(file.name);}}>
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                 <input
                    ref={inputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e.target.files)}
                />
            </div>
        </div>
    );
}

export default function NewRequestPage({ userLogin }) {
    // состояние для хранения данных формы
    const [formData, setFormData] = useState({
        eventName: '', leader: '', organizer: '', location: '', eventStatus: '', eventDate: '', link: '', description: '',
    });
    // состояние для хранения прикрепленных файлов
    const [files, setFiles] = useState([]);
    // состояние для отслеживания процесса отправки формы
    const [isSubmitting, setIsSubmitting] = useState(false);
    // хук для отображения уведомлений
    const { addNotification } = useNotification();

    // универсальный обработчик для обновления полей формы
    const handleInputChange = (field, value) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    // функция для очистки всех полей формы и списка файлов
    const clearForm = () => {
        setFormData({
            eventName: '', leader: '', organizer: '', location: '', eventStatus: '', eventDate: '', link: '', description: '',
        });
        setFiles([]);
    };

    // обработчик отправки формы
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userLogin) {
            addNotification("Ошибка: Не удалось определить пользователя. Пожалуйста, войдите в систему снова.", "error");
            return;
        }

        // Проверяем только обязательные поля
        const requiredFields = ['eventName', 'leader', 'organizer', 'location', 'eventStatus', 'eventDate'];
        for (const key of requiredFields) {
            if (!formData[key]) {
                addNotification("Пожалуйста, заполните все обязательные поля.", "error");
                return;
            }
        }

        setIsSubmitting(true);
        const data = new FormData();
        // Добавляем все поля из formData
        for (const key in formData) {
            if (key === 'eventDate' && formData[key]) {
                 data.append(key, new Date(formData[key]).toISOString());
            } else if (formData[key]) {
                 data.append(key, formData[key]);
            }
        }
        data.append('user_login', userLogin);

        files.forEach(file => {
            data.append('files', file, file.name);
        });

        try {
            const response = await fetch('http://localhost:8000/api/requests', {
                method: 'POST',
                body: data,
            });

            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({ detail: 'Произошла неизвестная ошибка на сервере.' }));
                throw new Error(errorResult.detail || `Ошибка ${response.status}: ${response.statusText}`);
            }

            addNotification('Заявка успешно создана!', 'success');
            clearForm();

        } catch (error) {
            addNotification(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="new-request-container">
            <h1>Подать заявку</h1>
            <div className="page-content">
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <FormField label="Название мероприятия*"><input className="form-input" type="text" value={formData.eventName} onChange={(e) => handleInputChange('eventName', e.target.value)} required /></FormField>
                        <FormField label="Руководитель*"><input className="form-input" type="text" value={formData.leader} onChange={(e) => handleInputChange('leader', e.target.value)} required /></FormField>
                        <FormField label="Организатор*"><input className="form-input" type="text" value={formData.organizer} onChange={(e) => handleInputChange('organizer', e.target.value)} required /></FormField>
                        <FormField label="Место проведения*"><input className="form-input" type="text" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} required /></FormField>
                        <FormField label="Статус мероприятия*">
                           <CustomSelect
                                options={['Международный', 'Всероссийский', 'Городской', 'Региональный', 'Внутривузовский']}
                                value={formData.eventStatus}
                                onChange={(value) => handleInputChange('eventStatus', value)}
                                placeholder="Выберите статус"
                           />
                        </FormField>
                        <FormField label="Дата проведения*"><input className="form-input" type="date" value={formData.eventDate} onChange={(e) => handleInputChange('eventDate', e.target.value)} required /></FormField>
                        <FileUploadArea files={files} setFiles={setFiles} />
                        
                        {/* поля, которые были в модальном окне */}
                        <FormField label="Ссылка на ресурс мероприятия"><input className="form-input" name="link" type="text" value={formData.link} onChange={(e) => handleInputChange('link', e.target.value)} /></FormField>
                        <FormField label="Описание" isTextarea={true}><textarea className="form-input" name="description" value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)}></textarea></FormField>
                    </div>
                     <div className="form-actions-container">
                        <button type="button" className="form-secondary-btn" onClick={clearForm} disabled={isSubmitting} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span>Очистить форму</span></button>
                        <button type="submit" className="form-submit-btn" disabled={isSubmitting} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                            {isSubmitting ? <ClockwiseLoader size={20} /> : <span>Подать заявку</span>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}