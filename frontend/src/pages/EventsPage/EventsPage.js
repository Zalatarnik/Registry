import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import ReactDOM from 'react-dom';
import './EventsPage.css';
import { useNotification } from '../../notification/NotificationContext';
import ClockwiseLoader from '../../components/common/Loader';

// импорт изображения по умолчанию
import defaultEventImage from '../../images/event-default.jpg';

// иконки
import { ReactComponent as SearchIcon } from '../../icons/search-icon.svg';
import { ReactComponent as AddIcon } from '../../icons/add-icon.svg';
import { ReactComponent as RemoveIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as CloseIcon } from '../../icons/exit-icon.svg';
import { ReactComponent as DeleteIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as ListIcon } from '../../icons/add-icon.svg';
import { ReactComponent as UsersIcon } from '../../icons/cat.svg'; // замените котика на другую иконку  /ᐠ. ᴗ.ᐟ\ /♡
import { ReactComponent as GroupIcon } from '../../icons/cat.svg'; // замените котика на другую иконку  /ᐠ. ᴗ.ᐟ\ /♡

const API_BASE_URL = 'http://localhost:8000';

// АНИМАЦИЯ КНОПОК
const EASING_FACTOR = 0.15;
const DEFAULT_RADIUS = 0;

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

const handleMouseMoveForEffect = (e) => {
    const el = e.currentTarget;
    if (!el.classList.contains('interactive-button')) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);

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
};

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
    const [isClosing, setIsClosing] = useState(false);
    const { addNotification } = useNotification();
    const getUserFullName = (user) => user ? [user.lastName, user.firstName, user.patronymic].filter(Boolean).join(' ') : '';
    const [participants, setParticipants] = useState(() => [{ fullName: getUserFullName(currentUser), group: currentUser.group || '' }]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const addParticipant = () => {
        const maxGroupSize = event.max_group_size || 5;
        if (participants.length < maxGroupSize) {
            setParticipants([...participants, { fullName: '', group: '' }]);
        } else {
            addNotification(`Максимальный размер группы: ${maxGroupSize} чел.`, 'info');
        }
    };

    const removeParticipant = (index) => {
        if (index > 0) {
            setParticipants(participants.filter((_, i) => i !== index));
        }
    };

    const handleParticipantChange = (index, field, value) => {
        const newParticipants = [...participants];
        newParticipants[index][field] = value;
        setParticipants(newParticipants);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        for (const p of participants) {
            if (!p.fullName.trim() || !p.group.trim()) {
                addNotification('Пожалуйста, заполните все поля.', 'error');
                return;
            }
        }
        onConfirm({ eventId: event.id, user_login: currentUser.login, participants });
    };

    return ReactDOM.createPortal(
        <div className="events-page-scope">
            <div className={`modal-overlay ${isClosing ? 'is-closing' : ''}`} onMouseDown={handleClose}>
                <div className={`edit-modal-content ${isClosing ? 'is-closing' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
                    <div className="chat-header">
                        <div className="chat-title-wrapper">
                            <h2>Запись на мероприятие</h2>
                            <p>{event.eventName}</p>
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
                                        {index > 0 && <button type="button" className="remove-participant-btn" onClick={() => removeParticipant(index)}><RemoveIcon/></button>}
                                    </div>
                                ))}
                            </div>
                            <div className="form-actions-container participant-actions">
                                <button type="button" className="form-secondary-btn" onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} onClick={addParticipant} disabled={participants.length >= (event.max_group_size || 5)}>
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
    const [isClosing, setIsClosing] = useState(false);
    const groupedSubmissions = useMemo(() =>
        registrations.reduce((acc, reg) => {
            const id = reg.submission_group_id;
            if (!acc[id]) acc[id] = [];
            acc[id].push(reg);
            return acc;
        }, {}), [registrations]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="events-page-scope">
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


// карточка мероприятия для вида куратора
const CuratorEventCard = memo(({ event, isActive, isExpanded, onCardClick, onDelete, onShowList, onMouseEnter, innerRef }) => {
    const cardClassName = ['event-card', 'curator-card', isActive && 'is-active', isExpanded && 'is-expanded'].filter(Boolean).join(' ');

    const handleAction = (e, callback, ...args) => {
        e.stopPropagation();
        callback(...args);
    };

    return (
        <div ref={innerRef} className={cardClassName} onMouseEnter={onMouseEnter}>
            <div className="card-content-wrapper" onClick={() => onCardClick(event.id)}>
                <div className="card-header">
                    <div className="header-content">
                        <h3>{event.eventName}</h3>
                        <div className="card-date">{new Date(event.eventDate).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div className="card-header-right">
                        <>
                            <button className="interactive-button btn-style-list" onClick={(e) => handleAction(e, onShowList, event)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                <span><ListIcon /> Список</span>
                            </button>
                            <button className="interactive-button btn-style-delete" onClick={(e) => handleAction(e, onDelete, event.id)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                <span><DeleteIcon /> Удалить</span>
                            </button>
                        </>
                    </div>
                </div>
            </div>
            <div className="card-details-wrapper">
                <div className="card-body curator-card-body-grid">
                    <div className="card-body-column column-image">
                        <img src={defaultEventImage} alt={event.eventName} className="curator-card-image" />
                    </div>
                    <div className="card-body-column column-description">
                        <div className="detail-item">
                            <span className="detail-label">Описание:</span>
                            {event.description || 'Тут будет описание, возможно, когда-нибудь'}
                        </div>
                    </div>
                    <div className="card-body-column column-details">
                        <div className="detail-item"><span className="detail-label">Руководитель:</span> {event.leader}</div>
                        <div className="detail-item"><span className="detail-label">Организатор:</span> {event.organizer}</div>
                        <div className="detail-item"><span className="detail-label">Место:</span> {event.location}</div>
                        <div className="detail-item"><span className="detail-label">Статус:</span> {event.eventStatus}</div>
                    </div>
                </div>
            </div>
        </div>
    );
});

// карточка мероприятия для вида студента
const StudentEventCard = memo(({ event, onSignUp, isRegistered, isCentral, isDetailed }) => {
    const cardClassName = [
        'event-card-student',
        isCentral && 'is-central',
        isDetailed && 'is-detailed-view'
    ].filter(Boolean).join(' ');

    const handleActionClick = (e, action) => {
        e.stopPropagation();
        action(event);
    };

    return (
        <div className={cardClassName}>
            <div className="student-card-inner">
                <div
                    className="cover-image"
                    style={{ backgroundImage: `url(${event.imageUrl})` }}
                />

                <div className={`registration-status-badge ${isRegistered ? 'registered' : 'unregistered'}`}>
                    {isRegistered ? 'Вы записаны' : 'Нет записи'}
                </div>

                <div className={`recruitment-status-badge status-${event.recruitment_status === 'Активен' ? 'active' : 'completed'}`}>
                    {event.recruitment_status}
                </div>

                <div className="details-container">
                    <div className="details-header">
                        <div className="details-title-section">
                            <h4>{event.eventName}</h4>
                            <div className="card-date">{new Date(event.eventDate).toLocaleDateString('ru-RU')}</div>
                        </div>
                        <div className="details-icons">
                            <div className="icon-item" title="Макс. участников">
                                <UsersIcon />
                                <span>{event.max_participants || '∞'}</span>
                            </div>
                            <div className="icon-item" title="Макс. чел. в группе">
                                <GroupIcon />
                                <span>{event.max_group_size || 1}</span>
                            </div>
                        </div>
                    </div>

                    <div className="details-body">
                        <div className="detail-description">{event.description}</div>

                        <div className="detail-item"><span className="detail-label">Руководитель:</span> {event.leader}</div>
                        <div className="detail-item"><span className="detail-label">Организатор:</span> {event.organizer}</div>
                        <div className="detail-item"><span className="detail-label">Место:</span> {event.location}</div>
                        <div className="detail-item"><span className="detail-label">Статус:</span> {event.eventStatus}</div>
                        <div className="detail-item"><span className="detail-label">Дата:</span> {new Date(event.eventDate).toLocaleDateString('ru-RU')}</div>
                    </div>

                    <div className="details-actions">
                        <button
                            className="interactive-button btn-style-register"
                            onClick={(e) => handleActionClick(e, onSignUp)}
                            onMouseMove={handleMouseMoveForEffect}
                            onMouseLeave={handleButtonLeave}
                            disabled={isRegistered}
                        >
                            <span><AddIcon /> {isRegistered ? 'Вы уже записаны' : 'Записаться'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

// отображение карусели для студента
const StudentEventsView = ({ events, userRegisteredEventIds, onSignUp, onCardClick, detailedCardId }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const carouselRef = useRef(null);
    const isScrolling = useRef(false);

    useEffect(() => {
        if (currentIndex >= events.length) {
            setCurrentIndex(Math.max(0, events.length - 1));
        }
    }, [events, currentIndex]);

    const handleWheel = (e) => {
        if (isScrolling.current || detailedCardId) return;
        isScrolling.current = true;

        if (e.deltaY > 0) {
            setCurrentIndex(prev => Math.min(prev + 1, events.length - 1));
        } else {
            setCurrentIndex(prev => Math.max(prev - 1, 0));
        }

        setTimeout(() => { isScrolling.current = false; }, 500);
    };

    const handleItemClick = (index, eventId) => {
        if (index !== currentIndex) {
            setCurrentIndex(index);
            if (detailedCardId) {
                onCardClick(null);
            }
        } else {
            onCardClick(eventId);
        }
    };

    if (!events.length) {
        return <p className="no-events-found">Мероприятия с выбранными фильтрами не найдены.</p>;
    }

    const cardWidth = 340;
    const cardMargin = 20;
    const cardTotalSpace = cardWidth + cardMargin;

    return (
        <div className="student-view-container" onWheel={handleWheel} ref={carouselRef}>
            <div
                className="events-carousel"
                style={{ transform: `translateX(calc(50% - ${cardWidth / 2}px - ${currentIndex * cardTotalSpace}px))` }}
            >
                {events.map((event, index) => (
                    <div
                        key={event.id}
                        className="carousel-item-wrapper"
                        onClick={() => handleItemClick(index, event.id)}
                    >
                         <StudentEventCard
                            event={event}
                            isRegistered={userRegisteredEventIds.has(event.id)}
                            onSignUp={onSignUp}
                            isCentral={index === currentIndex}
                            isDetailed={detailedCardId === event.id}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

// отображение списка для куратора
const CuratorEventsView = ({ events, onCardClick, onDelete, onShowList, expandedCardId, hoveredCardId, setHoveredCardId, gliderStyle, cardElements }) => {
    return (
        <div className="page-content">
            <div className="events-list-container" onMouseLeave={() => setHoveredCardId(null)}>
                <div className="list-glider" style={gliderStyle}></div>
                {events.length > 0 ? (
                    events.map((event, index) => (
                        <React.Fragment key={event.id}>
                            <CuratorEventCard
                                innerRef={node => node ? cardElements.current.set(event.id, node) : cardElements.current.delete(event.id)}
                                event={event}
                                isActive={expandedCardId ? event.id === expandedCardId : event.id === hoveredCardId}
                                isExpanded={expandedCardId === event.id}
                                onCardClick={onCardClick}
                                onMouseEnter={() => { if (!expandedCardId) setHoveredCardId(event.id); }}
                                onDelete={onDelete}
                                onShowList={onShowList}
                            />
                            {index < events.length - 1 && <div className="event-divider" />}
                        </React.Fragment>
                    ))
                ) : (
                    <p className="no-events-found">Мероприятия не найдены.</p>
                )}
            </div>
        </div>
    );
};

// главный компонент страницы
export default function EventsPage({ userLogin, userRole }) {
    const { addNotification } = useNotification();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [registrations, setRegistrations] = useState({});
    const [userRegisteredEventIds, setUserRegisteredEventIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef(null);

    const [expandedCardId, setExpandedCardId] = useState(null);
    const [hoveredCardId, setHoveredCardId] = useState(null);
    const [detailedCardId, setDetailedCardId] = useState(null);

    const [gliderStyle, setGliderStyle] = useState({ opacity: 0 });
    const cardElements = useRef(new Map());

    const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
    const [isRegistrationsModalOpen, setIsRegistrationsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [activeFilter, setActiveFilter] = useState('Все');

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const eventsData = await fetch(`${API_BASE_URL}/api/events`).then(res => res.json());
                const processedEvents = eventsData.map((event, index) => ({
                    ...event,
                    imageUrl: event.image_url || defaultEventImage,
                    max_participants: event.max_participants || [50, 100, 20, 150][index % 4],
                    max_group_size: event.max_group_size || [1, 5, 10][index % 3],
                    recruitment_status: 'Активен',
                    description: event.description || 'Тут будет описание, возможно, когда-нибудь'
                }));

                const promises = [Promise.resolve(processedEvents)];

                if (userRole === 'student' && userLogin) {
                    const profilePromise = fetch(`${API_BASE_URL}/api/profile/${userLogin}`).then(res => res.json());
                    const registrationsPromise = fetch(`${API_BASE_URL}/api/users/${userLogin}/registrations`).then(res => res.json());
                    promises.push(profilePromise, registrationsPromise);
                }

                const [finalEventsData, profileData, registrationIds] = await Promise.all(promises);

                setEvents(finalEventsData);
                if (profileData) setCurrentUser({ lastName: profileData.last_name, firstName: profileData.first_name, patronymic: profileData.patronymic, group: profileData.group, login: profileData.login });
                if (registrationIds) setUserRegisteredEventIds(new Set(registrationIds));

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
                if (userRole === 'student' && activeFilter !== 'Все') {
                    const isRegistered = userRegisteredEventIds.has(event.id);
                    if (activeFilter === 'Записан') return isRegistered;
                    if (activeFilter === 'Не записан') return !isRegistered;
                }
                return true;
            })
            .filter(e => e.eventName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [events, searchTerm, activeFilter, userRegisteredEventIds, userRole]);

    useEffect(() => {
        if (detailedCardId && !filteredEvents.some(e => e.id === detailedCardId)) {
            setDetailedCardId(null);
        }
    }, [filteredEvents, detailedCardId]);

    const gliderTargetId = expandedCardId ? null : hoveredCardId;
    useEffect(() => {
        if (userRole === 'curator') {
            const targetElement = gliderTargetId ? cardElements.current.get(gliderTargetId) : null;
            if (targetElement) {
                setGliderStyle({ transform: `translateY(${targetElement.offsetTop}px)`, height: `${targetElement.querySelector('.card-content-wrapper').offsetHeight}px`, opacity: 1 });
            } else {
                setGliderStyle(prev => ({ ...prev, opacity: 0 }));
            }
        }
    }, [gliderTargetId, filteredEvents, userRole]);

    const handleCardClick = (id) => {
        if (userRole === 'student') {
            setDetailedCardId(prevId => (prevId === id ? null : id));
        } else {
            setExpandedCardId(prevId => (prevId === id ? null : id));
        }
    };

    const handleSignUp = (event) => {
        if (!currentUser) return;
        setSelectedEvent(event);
        setIsSignUpModalOpen(true);
    };

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

    const handleDeleteEvent = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить это мероприятие?')) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/events/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Ошибка удаления');
                addNotification('Мероприятие удалено.', 'success');
                setEvents(prev => prev.filter(e => e.id !== id));
            } catch (e) {
                addNotification(e.message, 'error');
            }
        }
    };

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

    const filterStyleMap = { 'Все': 'btn-style-neutral', 'Записан': 'btn-style-registered-filter', 'Не записан': 'btn-style-unregistered-filter' };

    return (
        <div className="events-page-scope">
            {isSignUpModalOpen && <SignUpModal event={selectedEvent} onClose={() => setIsSignUpModalOpen(false)} onConfirm={handleConfirmRegistration} currentUser={currentUser} />}
            {isRegistrationsModalOpen && <RegistrationsModal isOpen={isRegistrationsModalOpen} onClose={() => setIsRegistrationsModalOpen(false)} eventName={selectedEvent?.eventName} registrations={registrations[selectedEvent?.id]} />}

            <div className="events-container">
                <h1>Мероприятия</h1>

                {isLoading ? (
                    <div className="page-loader-container"><ClockwiseLoader /></div>
                ) : (
                    <>
                        <div className={`filter-container ${userRole === 'curator' ? 'is-curator-view' : ''}`}>
                            <div className="search-bar-wrapper">
                                <div className="interactive-button btn-style-neutral" onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} onClick={() => inputRef.current?.focus()}>
                                    <span><SearchIcon /><input ref={inputRef} type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></span>
                                </div>
                            </div>
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

                        {userRole === 'student' ? (
                            <StudentEventsView
                                events={filteredEvents}
                                userRegisteredEventIds={userRegisteredEventIds}
                                onSignUp={handleSignUp}
                                onCardClick={handleCardClick}
                                detailedCardId={detailedCardId}
                            />
                        ) : (
                            <CuratorEventsView
                                events={filteredEvents}
                                onCardClick={handleCardClick}
                                onDelete={handleDeleteEvent}
                                onShowList={handleShowList}
                                expandedCardId={expandedCardId}
                                hoveredCardId={hoveredCardId}
                                setHoveredCardId={setHoveredCardId}
                                gliderStyle={gliderStyle}
                                cardElements={cardElements}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}