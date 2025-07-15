import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import ReactDOM from 'react-dom';
import { useNotification } from '../../notification/NotificationContext';
import './MyRequestsPage.css';
import ClockwiseLoader from '../../components/common/Loader';
import ChatView from '../../components/Chat/Chat';

// иконки
import { ReactComponent as ChatIcon } from '../../icons/chat-icon.svg';
import { ReactComponent as DownloadIcon } from '../../icons/download-icon.svg';
import { ReactComponent as EditIcon } from '../../icons/edit-icon.svg';
import { ReactComponent as RemoveIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as SearchIcon } from '../../icons/search-icon.svg';
import { ReactComponent as UploadIcon } from '../../icons/upload-icon.svg';
import { ReactComponent as DownIcon } from '../../icons/down-icon.svg';
import { ReactComponent as CloseIcon } from '../../icons/exit-icon.svg';

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
const handleMouseMoveForEffect = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);

    // если это интерактивный элемент, запускаем анимацию радиусов
    const isInteractive = el.classList.contains('interactive-button') || el.classList.contains('form-submit-btn') || el.classList.contains('form-secondary-btn');
    if (isInteractive) {
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
        const calculateRadius = (cx, cy) => Math.max(0, maxRadius * Math.pow(1 - (Math.sqrt((x - cx)**2 + (y - cy)**2) / diagonal), 3));
        state.target.tl = calculateRadius(0, 0);
        state.target.tr = calculateRadius(width, 0);
        state.target.br = calculateRadius(width, height);
        state.target.bl = calculateRadius(0, height);
        if (!state.isAnimating) {
            state.isAnimating = true;
            requestAnimationFrame(() => animateRadii(el));
        }
    }
};

// обработчик увода мыши с интерактивного элемента
const handleButtonLeave = (e) => {
    const btn = e.currentTarget;
    const isInteractive = btn.classList.contains('interactive-button') || btn.classList.contains('form-submit-btn') || btn.classList.contains('form-secondary-btn');
    if (isInteractive) {
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
    }
};

// утилита для скачивания файла по url
const downloadFile = (fileUrl, fileName) => {
    const fullUrl = `http://localhost:8000${fileUrl}`;
    const link = document.createElement('a');
    link.href = fullUrl;
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_blank');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const FormField = ({ label, children }) => (
    <div className="form-field">
        <label>{label}</label>
        <div className="input-wrapper">{children}</div>
    </div>
);

// кастомный компонент выпадающего списка
const CustomSelect = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    // эффект для закрытия списка при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div ref={ref} className={`custom-select-container ${isOpen ? 'is-open' : ''}`}>
            <div className="form-input custom-select-value" onClick={() => setIsOpen(!isOpen)}>
                {value || <span style={{ opacity: 0.6 }}>{placeholder}</span>}
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
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);

    const handleFileChange = (selectedFiles) => {
        const newFiles = Array.from(selectedFiles).filter(file => !files.some(f => f.name === file.name));
        setFiles(prev => [...prev, ...newFiles]);
    };

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
                onClick={() => inputRef.current.click()}
                onMouseMove={handleMouseMoveForEffect}
            >
                {files.length === 0 ? (
                    <>
                        <UploadIcon className="file-upload-icon" />
                        <p className="file-upload-text">Перетащите файлы сюда или <span>выберите их</span></p>
                    </>
                ) : (
                    <div className="file-list-inside">
                        {files.map(file => (
                            <div key={file.name} className="file-item">
                                <span className="file-item-name">{file.name}</span>
                                <button className="file-item-remove-btn" onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}>✕</button>
                            </div>
                        ))}
                    </div>
                )}
                <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => handleFileChange(e.target.files)} />
            </div>
        </div>
    );
};


// ВСПЛЫВАЮЩЕЕ ОКНО - РЕДАКТИРОВАНИЕ
const EditRequestModal = ({ request, onClose, onSave }) => {
    const { addNotification } = useNotification();
    // состояние для плавной анимации закрытия
    const [isClosing, setIsClosing] = useState(false);
    // состояние для отслеживания процесса отправки
    const [isSubmitting, setIsSubmitting] = useState(false);
    // состояние для файлов
    const [files, setFiles] = useState(request.files || []);
    // состояние для полей формы
    const [formData, setFormData] = useState({
        eventName: request.event_name || '',
        leader: request.leader || '',
        organizer: request.organizer || '',
        location: request.location || '',
        eventStatus: request.event_status_level || '',
        eventDate: request.event_date ? new Date(request.event_date).toISOString().split('T')[0] : '',
    });

    const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    
    // запускает анимацию закрытия
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };
    
    // обработчик отправки формы
    const handleSubmit = async (e) => {
        e.preventDefault();
        // валидация на заполненность полей
        for (const key in formData) {
            if (!formData[key]) {
                addNotification("Пожалуйста, заполните все обязательные поля.", "error");
                return;
            }
        }
        setIsSubmitting(true);
        // вызываем колбэк сохранения, переданный из родительского компонента
        await onSave({ id: request.id, ...formData, files });
        setIsSubmitting(false);
    };

    return (
        <div className={`modal-overlay ${isClosing ? 'is-closing' : ''}`} onMouseDown={handleClose}>
            <div className={`edit-modal-content ${isClosing ? 'is-closing' : ''}`} onMouseDown={e => e.stopPropagation()}>
                <div className="chat-header">
                    <div className="chat-title-wrapper">
                        <h2>Редактирование заявки</h2>
                    </div>
                    <button onClick={handleClose} className="chat-close-btn" title="Закрыть"><CloseIcon /></button>
                </div>
                <div className="edit-modal-body">
                    <form onSubmit={handleSubmit} className="edit-form-inside-modal">
                        <div className="form-grid">
                            <FormField label="Название мероприятия"><input className="form-input" type="text" value={formData.eventName} onChange={(e) => handleInputChange('eventName', e.target.value)} required /></FormField>
                            <FormField label="Руководитель"><input className="form-input" type="text" value={formData.leader} onChange={(e) => handleInputChange('leader', e.target.value)} required /></FormField>
                            <FormField label="Организатор"><input className="form-input" type="text" value={formData.organizer} onChange={(e) => handleInputChange('organizer', e.target.value)} required /></FormField>
                            <FormField label="Место проведения"><input className="form-input" type="text" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} required /></FormField>
                            <FormField label="Статус мероприятия"><CustomSelect options={['Международный', 'Всероссийский', 'Городской', 'Региональный', 'Внутривузовский']} value={formData.eventStatus} onChange={(value) => handleInputChange('eventStatus', value)} placeholder="Выберите статус" /></FormField>
                            <FormField label="Дата проведения"><input className="form-input" type="date" value={formData.eventDate} onChange={(e) => handleInputChange('eventDate', e.target.value)} required /></FormField>
                            <FileUploadArea files={files} setFiles={setFiles} />
                        </div>
                        <div className="form-actions-container">
                            <button type="button" className="form-secondary-btn" onClick={handleClose} disabled={isSubmitting} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span>Отмена</span></button>
                            <button type="submit" className="form-submit-btn" disabled={isSubmitting} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span>{isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}</span></button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};


// карточка заявки
const RequestCard = memo(({ request, isActive, isExpanded, onCardClick, onMouseEnter, onDelete, onDownload, onEdit, onOpenChat, innerRef }) => {
    // формируем классы для карточки в зависимости от ее состояния
    const cardClassName = ['request-card', isActive && 'is-active', isExpanded && 'is-expanded'].filter(Boolean).join(' ');
    // обертка для обработчиков, чтобы остановить всплытие события клика на карточку
    const handleActionClick = (e, callback, ...args) => {
        e.stopPropagation();
        if (typeof callback === 'function') callback(...args);
    };
    // карта стилей для статусов
    const statusStyleMap = { 'Одобрено': 'btn-style-approved', 'Отклонено': 'btn-style-rejected', 'На рассмотрении': 'btn-style-pending' };

    return (
        <div ref={innerRef} className={cardClassName} onMouseEnter={onMouseEnter}>
            <div className="card-content-wrapper" onClick={onCardClick}>
                <div className="card-header">
                    <div className="header-content">
                        <h3>{request.event_name}</h3>
                        <div className="card-date">{new Date(request.event_date).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div className="card-header-right">
                        <div className="card-actions">
                            <button className="interactive-button is-icon btn-style-neutral" title="Скачать файлы" onClick={(e) => handleActionClick(e, onDownload, request)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><DownloadIcon /></span></button>
                            {/* кнопка редактирования доступна только для заявок "на рассмотрении" */}
                            {request.status === 'На рассмотрении' &&
                                <button className="interactive-button is-icon btn-style-neutral" title="Редактировать" onClick={(e) => handleActionClick(e, onEdit, request)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><EditIcon /></span></button>
                            }
                            <button className="interactive-button is-icon btn-style-rejected" title="Отменить заявку" onClick={(e) => handleActionClick(e, onDelete, request.id)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><RemoveIcon /></span></button>
                        </div>
                        <button className="interactive-button is-icon btn-style-chat" title="Открыть чат" onClick={(e) => handleActionClick(e, onOpenChat, request)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><ChatIcon /></span></button>
                        <button className={`interactive-button is-status-button ${statusStyleMap[request.status]}`} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span>{request.status}</span></button>
                    </div>
                </div>
            </div>
            {/* детальная информация, видимая при раскрытии карточки */}
            <div className="card-details-wrapper">
                <div className="card-body">
                    <div className="detail-item"><span className="detail-label">Руководитель:</span> {request.leader}</div>
                    <div className="detail-item"><span className="detail-label">Организатор:</span> {request.organizer}</div>
                    <div className="detail-item"><span className="detail-label">Место:</span> {request.location}</div>
                    <div className="detail-item"><span className="detail-label">Статус мероприятия:</span> {request.event_status_level}</div>
                </div>
            </div>
        </div>
    );
});


const statusStyleMap = { 'Все': 'btn-style-neutral', 'Одобрено': 'btn-style-approved', 'Отклонено': 'btn-style-rejected', 'На рассмотрении': 'btn-style-pending' };

export default function MyRequestsPage({ userLogin }) {
    // состояние для хранения списка всех заявок
    const [requests, setRequests] = useState([]);
    // состояние для индикации загрузки
    const [isLoading, setIsLoading] = useState(true);
    // хук для отображения уведомлений
    const { addNotification } = useNotification();
    // состояние для id карточки, на которую наведен курсор
    const [hoveredCardId, setHoveredCardId] = useState(null);
    // состояние для id раскрытой карточки
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [gliderStyle, setGliderStyle] = useState({ opacity: 0 });
    const cardElements = useRef(new Map());
    const [gliderVersion, setGliderVersion] = useState(0);
    // состояние для поискового запроса
    const [searchTerm, setSearchTerm] = useState('');
    // состояние для активного фильтра по статусу
    const [activeFilter, setActiveFilter] = useState('Все');
    // ref для доступа к полю ввода
    const inputRef = useRef(null);
    // состояние для отслеживания активного чата
    const [activeChatRequest, setActiveChatRequest] = useState(null);
    // состояние для отслеживания заявки
    const [editingRequest, setEditingRequest] = useState(null);

    // эффект для загрузки заявок
    useEffect(() => {
        const fetchRequests = async () => {
            if (!userLogin) return;
            setIsLoading(true);
            try {
                const response = await fetch(`http://localhost:8000/api/my-requests/${userLogin}`);
                if (!response.ok) throw new Error('Не удалось загрузить заявки');
                const data = await response.json();
                setRequests(data);
            } catch (error) {
                addNotification(error.message, 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchRequests();
    }, [userLogin, addNotification]);

    const gliderTargetId = expandedCardId ? null : hoveredCardId;
    const activeCardId = gliderTargetId || expandedCardId;
    const filteredRequests = useMemo(() => {
        return requests
            .filter(request => (activeFilter === 'Все' ? true : request.status === activeFilter))
            .filter(request => request.event_name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [requests, searchTerm, activeFilter]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const targetElement = gliderTargetId ? cardElements.current.get(gliderTargetId) : null;
            if (targetElement) {
                setGliderStyle({ transform: `translateY(${targetElement.offsetTop}px)`, height: `${targetElement.querySelector('.card-content-wrapper').offsetHeight}px`, opacity: 1 });
            } else {
                setGliderStyle(prevStyle => ({ ...prevStyle, opacity: 0 }));
            }
        }, 0);
        return () => clearTimeout(timeoutId);
    }, [gliderTargetId, filteredRequests, gliderVersion]);

    // раскрытие/сворачивание
    const handleCardClick = (clickedId) => {
        setExpandedCardId(prevId => (prevId === clickedId ? null : clickedId));
        setGliderVersion(v => v + 1);
    };

    // обработчик для открытия модального окна редактирования
    const handleEditClick = (request) => setEditingRequest(request);

    // обработчик скачивания всех файлов для заявки
    const handleDownloadAll = (request) => {
        if (!request.files || request.files.length === 0) {
            addNotification('У этой заявки нет приложенных файлов.', 'info');
            return;
        }
        addNotification(`Начинается скачивание ${request.files.length} файлов...`, 'success');
        request.files.forEach((file, index) => {
            setTimeout(() => { downloadFile(file.url, file.name); }, index * 300);
        });
    };

    // обработчик удаления заявки
    const handleCancelRequest = async (requestId) => {
        if (!window.confirm("Вы уверены, что хотите безвозвратно отменить эту заявку?")) return;
        try {
            const response = await fetch(`http://localhost:8000/api/requests/${requestId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Не удалось отменить заявку.');
            setRequests(current => current.filter(r => r.id !== requestId));
            addNotification('Заявка успешно отменена!', 'success');
        } catch (error) {
            addNotification(error.message, 'error');
        }
    };
    
    // обработчики для открытия и закрытия чата
    const handleOpenChat = (request) => setActiveChatRequest({ id: request.id, eventName: request.event_name });
    const handleCloseChat = () => setActiveChatRequest(null);
    
    // обработчик сохранения изменений в заявке
    const handleSaveRequest = async (updatedData) => {
        try {
            const data = new FormData();
    
            data.append('eventName', updatedData.eventName);
            data.append('leader', updatedData.leader);
            data.append('organizer', updatedData.organizer);
            data.append('location', updatedData.location);
            data.append('eventStatus', updatedData.eventStatus);
            data.append('eventDate', new Date(updatedData.eventDate).toISOString());
    
            const newFiles = updatedData.files.filter(f => f instanceof File);
            const existingFilesToKeep = updatedData.files.filter(f => !(f instanceof File));
    
            newFiles.forEach(file => {
                data.append('files', file, file.name);
            });
    
            data.append('existingFiles', JSON.stringify(existingFilesToKeep));
    
            const response = await fetch(`http://localhost:8000/api/requests/${updatedData.id}`, {
                method: 'PUT',
                body: data,
            });
    
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Не удалось обновить заявку.');
            }
    
            const savedRequest = await response.json();
            // обновляем состояние на клиенте, чтобы сразу увидеть изменения
            setRequests(prev => prev.map(r => r.id === savedRequest.id ? savedRequest : r));
            addNotification('Заявка успешно обновлена!', 'success');
            setEditingRequest(null); // закрываем всплывающее окно
    
        } catch (error) {
            addNotification(error.message, 'error');
        }
    };

    return (
        <>
            {/* рендерим чат, если он активен */}
            {activeChatRequest && (<ChatView userLogin={userLogin} request={activeChatRequest} onClose={handleCloseChat} />)}
            {/* рендерим всплывающее окно редактирования через портал, если оно активно */}
            {editingRequest && ReactDOM.createPortal(<EditRequestModal request={editingRequest} onClose={() => setEditingRequest(null)} onSave={handleSaveRequest} />, document.body )}

            <div className="requests-container">
                <h1>Мои заявки</h1>
                {isLoading ? (
                    <div className="requests-loader-container"><ClockwiseLoader /></div>
                ) : (
                    <>
                        <div className="filter-container">
                            <div className="search-bar-wrapper">
                                <div className="interactive-button btn-style-neutral" onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} onClick={() => inputRef.current?.focus()}>
                                    <span><SearchIcon /><input ref={inputRef} type="text" placeholder="Поиск по названию..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></span>
                                </div>
                            </div>
                            <div className="filter-buttons">
                                {Object.keys(statusStyleMap).map(status => (
                                    <button key={status} className={`interactive-button ${activeFilter === status ? 'is-active-filter' : ''} ${statusStyleMap[status]}`} onClick={() => setActiveFilter(status)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                        <span>{status}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="page-content">
                            <div className="requests-list-container" onMouseLeave={() => setHoveredCardId(null)}>
                                <div className="list-glider" style={gliderStyle}></div>
                                {filteredRequests.length > 0 ? (
                                    filteredRequests.map((request, index) => (
                                        <React.Fragment key={request.id}>
                                            <RequestCard
                                                innerRef={node => node ? cardElements.current.set(request.id, node) : cardElements.current.delete(request.id)}
                                                request={request}
                                                isActive={activeCardId === request.id}
                                                isExpanded={expandedCardId === request.id}
                                                onCardClick={() => handleCardClick(request.id)}
                                                onMouseEnter={() => setHoveredCardId(request.id)}
                                                onDelete={handleCancelRequest}
                                                onDownload={handleDownloadAll}
                                                onEdit={handleEditClick}
                                                onOpenChat={handleOpenChat}
                                            />
                                            {index < filteredRequests.length - 1 && <div className="request-divider" />}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>Заявки с выбранными фильтрами не найдены.</div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}