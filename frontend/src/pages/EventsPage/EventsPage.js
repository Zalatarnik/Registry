import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import ReactDOM from 'react-dom';
import './EventsPage.css';
import { useNotification } from '../../notification/NotificationContext';
import ClockwiseLoader from '../../components/common/Loader';

// иконки
import { ReactComponent as SearchIcon } from '../../icons/search-icon.svg';
import { ReactComponent as AddIcon } from '../../icons/add-icon.svg';
import { ReactComponent as RemoveIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as CloseIcon } from '../../icons/exit-icon.svg';
import { ReactComponent as DeleteIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as ListIcon } from '../../icons/add-icon.svg';

const API_BASE_URL = 'http://localhost:8000';

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
    if (!el.classList.contains('interactive-button')) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);

    // инициализируем состояние анимации, если его нет
    if (!el._animationState) {
        el._animationState = {
            isAnimating: false,
            current: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
            target: { tl: DEFAULT_RADIUS, tr: DEFAULT_RADIUS, br: DEFAULT_RADIUS, bl: DEFAULT_RADIUS },
        };
    }

    // вычисляем и запускаем анимацию радиусов
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
};

// обработчик увода мыши с интерактивного элемента
const handleButtonLeave = (e) => {
    const btn = e.currentTarget;
    if (!btn.classList.contains('interactive-button')) return;
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

// всплывающее окно для записи на мероприятие
const SignUpModal = ({ event, onClose, onConfirm, currentUser }) => {
    // состояние для плавной анимации закрытия
    const [isClosing, setIsClosing] = useState(false);
    // хук для уведомлений
    const { addNotification } = useNotification();
    
    // получение фио имени пользователя
    const getUserFullName = (user) => user ? [user.lastName, user.firstName, user.patronymic].filter(Boolean).join(' ') : '';
    
    const [participants, setParticipants] = useState(() => [{ fullName: getUserFullName(currentUser), group: currentUser.group || '' }]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    // добавляет нового участника в список
    const addParticipant = () => {
        if (participants.length < 5) {
            setParticipants([...participants, { fullName: '', group: '' }]);
        }
    };
    
    // удаляет участника из списка (кроме первого)
    const removeParticipant = (index) => {
        if (index > 0) {
            setParticipants(participants.filter((_, i) => i !== index));
        }
    };

    // обновляет данные участника в списке
    const handleParticipantChange = (index, field, value) => {
        const newParticipants = [...participants];
        newParticipants[index][field] = value;
        setParticipants(newParticipants);
    };
    
    // обработчик отправки формы записи
    const handleSubmit = (e) => {
        e.preventDefault();
        // валидация на заполненность полей
        for (const p of participants) {
            if (!p.fullName.trim() || !p.group.trim()) {
                addNotification('Пожалуйста, заполните все поля.', 'error');
                return;
            }
        }
        onConfirm({ eventId: event.id, user_login: currentUser.login, participants });
    };

    return ReactDOM.createPortal(
        <div className="events-container">
            <div className={`modal-overlay ${isClosing ? 'is-closing' : ''}`} onMouseDown={handleClose}>
                <div className={`edit-modal-content ${isClosing ? 'is-closing' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
                    <div className="chat-header">
                        <div className="chat-title-wrapper">
                            <h2>Запись на мероприятие</h2>
                            <p>{event.event_name}</p>
                        </div>
                        <button onClick={handleClose} className="chat-close-btn" title="Закрыть"><CloseIcon /></button>
                    </div>
                    <div className="edit-modal-body">
                        <form onSubmit={handleSubmit} className="edit-form-inside-modal">
                            <div className="participants-list">
                                {participants.map((p, index) => (
                                    <div className="participant-entry" key={index}>
                                        <div className="form-grid">
                                            <div className="form-field">
                                                <label>{index === 0 ? "Ваше ФИО" : "ФИО участника"}</label>
                                                <div className="input-wrapper">
                                                    <input type="text" className="form-input" value={p.fullName} onChange={(e) => handleParticipantChange(index, 'fullName', e.target.value)} required disabled={index === 0} />
                                                </div>
                                            </div>
                                            <div className="form-field">
                                                <label>{index === 0 ? "Ваша группа" : "Группа"}</label>
                                                <div className="input-wrapper">
                                                    <input type="text" className="form-input" value={p.group} onChange={(e) => handleParticipantChange(index, 'group', e.target.value)} required disabled={index === 0} />
                                                </div>
                                            </div>
                                        </div>
                                        {/* кнопка удаления доступна для всех, кроме первого участника */}
                                        {index > 0 && <button type="button" className="remove-participant-btn" onClick={() => removeParticipant(index)}><RemoveIcon/></button>}
                                    </div>
                                ))}
                            </div>
                            <div className="form-actions-container participant-actions">
                                <button type="button" className="form-secondary-btn" onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} onClick={addParticipant} disabled={participants.length >= 5}>
                                    <span>Добавить участника</span>
                                </button>
                                <button type="submit" className="form-submit-btn" onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                    <span>Записаться</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// всплывающее окно для просмотра списка записавшихся
const RegistrationsModal = ({ isOpen, onClose, eventName, registrations = [] }) => {
    // состояние для плавной анимации закрытия
    const [isClosing, setIsClosing] = useState(false);

    // группируем участников по id их заявки на запись
    const groupedSubmissions = useMemo(() =>
        registrations.reduce((acc, reg) => {
            const id = reg.submission_group_id;
            if (!acc[id]) acc[id] = [];
            acc[id].push(reg);
            return acc;
        }, {}), [registrations]);

    // обработчик закрытия окна
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    if (!isOpen) return null;

    // используем портал для рендеринга
    return ReactDOM.createPortal(
        <div className="events-container">
            <div className={`modal-overlay ${isClosing ? 'is-closing' : ''}`} onMouseDown={handleClose}>
                <div className={`registrations-modal-content ${isClosing ? 'is-closing' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
                    <div className="chat-header">
                        <div className="chat-title-wrapper">
                            <h2>Записавшиеся на "{eventName}"</h2>
                            <p>Всего: {registrations.length} чел.</p>
                        </div>
                        <button onClick={handleClose} className="chat-close-btn" title="Закрыть"><CloseIcon /></button>
                    </div>
                    <div className="registrations-modal-body">
                        {registrations.length > 0 ? (
                            Object.values(groupedSubmissions).map((submissionGroup, index) => (
                                <div key={submissionGroup[0].submission_group_id} className="submission-group">
                                    <h5>Группа записи №{index + 1} ({submissionGroup.length} чел.)</h5>
                                    <ul>
                                        {submissionGroup.map(member => <li key={member.id}>{member.full_name} <span>({member.group})</span></li>)}
                                    </ul>
                                </div>
                            ))
                        ) : (
                            <p className="no-registrations">На это мероприятие еще никто не записался.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// карточка мероприятия
const EventCard = memo(({ event, isActive, isExpanded, onCardClick, onSignUp, userRole, onDelete, onShowList, onMouseEnter, innerRef, isRegistered }) => {
    // формируем классы для карточки в зависимости от ее состояния
    const cardClassName = ['event-card', isActive && 'is-active', isExpanded && 'is-expanded'].filter(Boolean).join(' ');
    
    // обертка для обработчиков, чтобы остановить всплытие события
    const handleAction = (e, callback, ...args) => {
        e.stopPropagation();
        callback(...args);
    };

    return (
        <div ref={innerRef} className={cardClassName} onMouseEnter={onMouseEnter}>
            <div className="card-content-wrapper" onClick={() => onCardClick(event.id)}>
                <div className="card-header">
                    <div className="header-content">
                        <h3>{event.event_name}</h3>
                        <div className="card-date">{new Date(event.event_date).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div className="card-header-right">
                        {/* статус записи виден только студенту */}
                        {userRole === 'student' && (
                            <div className={`registration-status interactive-button ${isRegistered ? 'btn-style-registered' : 'btn-style-unregistered'}`} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                <span>{isRegistered ? 'Вы записаны' : 'Нет записи'}</span>
                            </div>
                        )}
                        {/* кнопки действий зависят от роли пользователя */}
                        {userRole === 'student' ? (
                            <button className="interactive-button btn-style-register" onClick={(e) => handleAction(e, onSignUp, event)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} disabled={isRegistered}>
                                <span><AddIcon /> Записаться</span>
                            </button>
                        ) : (
                            <>
                                <button className="interactive-button btn-style-list" onClick={(e) => handleAction(e, onShowList, event)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                    <span><ListIcon /> Список</span>
                                </button>
                                <button className="interactive-button btn-style-delete" onClick={(e) => handleAction(e, onDelete, event.id)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                    <span><DeleteIcon /> Удалить</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {/* детальная информация, видимая при раскрытии карточки */}
            <div className="card-details-wrapper">
                <div className="card-body">
                    <div className="detail-item"><span className="detail-label">Руководитель:</span> {event.leader}</div>
                    <div className="detail-item"><span className="detail-label">Организатор:</span> {event.organizer}</div>
                    <div className="detail-item"><span className="detail-label">Место:</span> {event.location}</div>
                    <div className="detail-item"><span className="detail-label">Статус:</span> {event.event_status_level}</div>
                </div>
            </div>
        </div>
    );
});


export default function EventsPage({ userLogin, userRole }) {
    // хук для уведомлений
    const { addNotification } = useNotification();
    // состояние для списка мероприятий
    const [events, setEvents] = useState([]);
    // состояние загрузки данных
    const [isLoading, setIsLoading] = useState(true);
    // состояние для данных текущего пользователя
    const [currentUser, setCurrentUser] = useState(null);
    const [registrations, setRegistrations] = useState({});
    const [userRegisteredEventIds, setUserRegisteredEventIds] = useState(new Set());
    // состояние для поискового запроса
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef(null);
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [hoveredCardId, setHoveredCardId] = useState(null);
    const [gliderStyle, setGliderStyle] = useState({ opacity: 0 });
    const cardElements = useRef(new Map());
    // состояние для открытия всплывающего окна записи
    const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
    // состояние для открытия всплывающего окна со списком записавшихся
    const [isRegistrationsModalOpen, setIsRegistrationsModalOpen] = useState(false);
    // состояние для хранения данных выбранного мероприятия
    const [selectedEvent, setSelectedEvent] = useState(null);
    // состояние для активного фильтра
    const [activeFilter, setActiveFilter] = useState('Все');

    // эффект для загрузки начальных данных
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const promises = [fetch(`${API_BASE_URL}/api/events`).then(res => res.json())];

                if (userRole === 'student' && userLogin) {
                    const profilePromise = fetch(`${API_BASE_URL}/api/profile/${userLogin}`).then(res => res.json());
                    const registrationsPromise = fetch(`${API_BASE_URL}/api/users/${userLogin}/registrations`).then(res => res.json());
                    promises.push(profilePromise, registrationsPromise);
                }

                const [eventsData, profileData, registrationIds] = await Promise.all(promises);
                
                setEvents(eventsData);
                if (profileData) {
                    setCurrentUser({ lastName: profileData.last_name, firstName: profileData.first_name, patronymic: profileData.patronymic, group: profileData.group, login: profileData.login });
                }
                if (registrationIds) {
                    setUserRegisteredEventIds(new Set(registrationIds));
                }
            } catch (error) {
                addNotification(error.message, 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [userLogin, userRole, addNotification]);
    
    const filteredEvents = useMemo(() => {
        return events
            .filter(event => {
                // логика фильтрации для студента
                if (userRole === 'student' && activeFilter !== 'Все') {
                    const isRegistered = userRegisteredEventIds.has(event.id);
                    if (activeFilter === 'Записан') return isRegistered;
                    if (activeFilter === 'Не записан') return !isRegistered;
                }
                return true;
            })
            // общая логика поиска по названию
            .filter(e => e.event_name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [events, searchTerm, activeFilter, userRegisteredEventIds, userRole]);
    
    const gliderTargetId = expandedCardId ? null : hoveredCardId;
    
    useEffect(() => {
        const targetElement = gliderTargetId ? cardElements.current.get(gliderTargetId) : null;
        if (targetElement) {
            setGliderStyle({ transform: `translateY(${targetElement.offsetTop}px)`, height: `${targetElement.querySelector('.card-content-wrapper').offsetHeight}px`, opacity: 1 });
        } else {
            setGliderStyle(prev => ({ ...prev, opacity: 0 }));
        }
    }, [gliderTargetId, filteredEvents]);
    
    // обработчик клика по карточке для раскрытия/сворачивания
    const handleCardClick = (id) => setExpandedCardId(prevId => prevId === id ? null : id);
    
    // открывает всплывающее окно записи на мероприятие
    const handleSignUp = (event) => {
        if (!currentUser) return;
        setSelectedEvent(event);
        setIsSignUpModalOpen(true);
    };

    // обработчик подтверждения записи
    const handleConfirmRegistration = async (data) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/events/${data.eventId}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_login: data.user_login, participants: data.participants }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Ошибка записи');
            
            addNotification(result.message, 'success');
            setUserRegisteredEventIds(prev => new Set(prev).add(data.eventId));
            setIsSignUpModalOpen(false);
        } catch (e) {
            addNotification(e.message, 'error');
        }
    };
    
    // обработчик удаления мероприятия (для куратора)
    const handleDeleteEvent = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить это мероприятие?')) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/events/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Ошибка удаления');
                addNotification('Мероприятие удалено.', 'success');
                // обновляем список мероприятий, удаляя из него элемент
                setEvents(prev => prev.filter(e => e.id !== id));
            } catch (e) {
                addNotification(e.message, 'error');
            }
        }
    };
    
    // показывает список записавшихся (для куратора)
    const handleShowList = async (event) => {
        setSelectedEvent(event);
        setIsRegistrationsModalOpen(true);
        if (!registrations[event.id]) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/events/${event.id}/registrations`);
                if (!response.ok) throw new Error('Ошибка загрузки списка');
                const data = await response.json();
                setRegistrations(prev => ({ ...prev, [event.id]: data }));
            } catch (e) {
                addNotification(e.message, 'error');
            }
        }
    };

    // карта стилей для кнопок фильтра
    const filterStyleMap = { 'Все': 'btn-style-neutral', 'Записан': 'btn-style-registered-filter', 'Не записан': 'btn-style-unregistered-filter' };

    return (
        <div className="events-container">
            {/* рендерим всплывающие окна, если они активны */}
            {isSignUpModalOpen && <SignUpModal event={selectedEvent} onClose={() => setIsSignUpModalOpen(false)} onConfirm={handleConfirmRegistration} currentUser={currentUser} />}
            {isRegistrationsModalOpen && <RegistrationsModal isOpen={isRegistrationsModalOpen} onClose={() => setIsRegistrationsModalOpen(false)} eventName={selectedEvent?.event_name} registrations={registrations[selectedEvent?.id]} />}
            
            <h1>Мероприятия</h1>
            
            {isLoading ? (
                <div className="page-loader-container"><ClockwiseLoader /></div>
            ) : (
                <>
                    <div className={`filter-container ${userRole === 'curator' ? 'is-curator-view' : ''}`}>
                        <div className="search-bar-wrapper">
                            <div className="interactive-button btn-style-neutral" onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} onClick={() => inputRef.current?.focus()}>
                                <span><SearchIcon /><input ref={inputRef} type="text" placeholder="Поиск по названию..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></span>
                            </div>
                        </div>
                        {/* фильтры доступны только студенту */}
                        {userRole === 'student' && (
                            <div className="filter-buttons">
                                {Object.keys(filterStyleMap).map(status => (
                                    <button key={status} className={`interactive-button ${activeFilter === status ? 'is-active-filter' : ''} ${filterStyleMap[status]}`} onClick={() => setActiveFilter(status)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                        <span>{status}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
            
                    <div className="page-content">
                        <div className="events-list-container" onMouseLeave={() => setHoveredCardId(null)}>
                            <div className="list-glider" style={gliderStyle}></div>
                            {filteredEvents.length > 0 ? (
                                filteredEvents.map((event, index) => (
                                    <React.Fragment key={event.id}>
                                        <EventCard
                                            innerRef={node => node ? cardElements.current.set(event.id, node) : cardElements.current.delete(event.id)}
                                            event={event}
                                            isActive={expandedCardId ? event.id === expandedCardId : event.id === hoveredCardId}
                                            isExpanded={expandedCardId === event.id}
                                            isRegistered={userRegisteredEventIds.has(event.id)}
                                            onCardClick={handleCardClick}
                                            onMouseEnter={() => { if (!expandedCardId) setHoveredCardId(event.id); }}
                                            onSignUp={handleSignUp}
                                            onDelete={handleDeleteEvent}
                                            onShowList={handleShowList}
                                            userRole={userRole}
                                        />
                                        {index < filteredEvents.length - 1 && <div className="event-divider" />}
                                    </React.Fragment>
                                ))
                            ) : (
                                <p className="no-events-found">Мероприятия с выбранными фильтрами не найдены.</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}