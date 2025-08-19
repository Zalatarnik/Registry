import React, { useState, useEffect, useMemo, useRef, memo, forwardRef, useImperativeHandle, useCallback } from 'react';
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
import { ReactComponent as ListIcon } from '../../icons/cat.svg'; // замените котика на другую иконку  /ᐠ. ᴗ.ᐟ\ /♡
import { ReactComponent as UsersIcon } from '../../icons/cat.svg'; // замените котика на другую иконку  /ᐠ. ᴗ.ᐟ\ /♡
import { ReactComponent as GroupIcon } from '../../icons/cat.svg'; // замените котика на другую иконку  /ᐠ. ᴗ.ᐟ\ /♡
import { ReactComponent as DownloadIcon } from '../../icons/download-icon.svg';

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
    if (!el.classList.contains('interactive-button') && !el.classList.contains('form-submit-btn') && !el.classList.contains('form-secondary-btn') && !el.classList.contains('confirmation-modal-button')) return;
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
    const diagonal = Math.sqrt(width ** 2 + height ** 2);
    const calculateRadius = (cx, cy) => Math.max(0, maxRadius * Math.pow(1 - (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / diagonal), 3));
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
    if (!btn.classList.contains('interactive-button') && !btn.classList.contains('form-submit-btn') && !btn.classList.contains('form-secondary-btn') && !btn.classList.contains('confirmation-modal-button')) return;
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

const handleDownloadZip = (eventId) => {
        window.open(`${API_BASE_URL}/api/events/${eventId}/download-documents`, "_blank");
};

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    position,
    title = "Подтверждение",
    message = "Вы уверены?",
    confirmText = "Подтвердить",
    cancelText = "Отмена"
}) => {
    const [isClosing, setIsClosing] = useState(false);
    const modalRef = useRef(null);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 200);
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                handleClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    const handleConfirmAction = () => {
        onConfirm();
        handleClose();
    };

    if (!isOpen) return null;

    const modalStyle = {
        top: `${position.top}px`,
        left: `${position.left}px`,
    };

    return ReactDOM.createPortal(
        <div
            ref={modalRef}
            className={`events-page-scope confirmation-modal-content ${isClosing ? 'is-closing' : ''}`}
            style={modalStyle}
            onMouseDown={e => e.stopPropagation()}
        >
            <div className="confirmation-modal-header">
                <h2>{title}</h2>
            </div>
            <div className="confirmation-modal-body">
                <p>{message}</p>
            </div>
            <div className="confirmation-modal-footer">
                <button
                    className="confirmation-modal-button neutral"
                    onClick={handleClose}
                    onMouseMove={handleMouseMoveForEffect}
                    onMouseLeave={handleButtonLeave}
                >
                    <span>{cancelText}</span>
                </button>
                <button
                    className="confirmation-modal-button reject"
                    onClick={handleConfirmAction}
                    onMouseMove={handleMouseMoveForEffect}
                    onMouseLeave={handleButtonLeave}
                >
                    <span>{confirmText}</span>
                </button>
            </div>
        </div>,
        document.body
    );
};


const FormField = ({ label, children }) => (
    <div className="form-field">
        <label>{label}</label>
        <div className="input-wrapper">{children}</div>
    </div>
);


// всплывающее окно для записи на мероприятие
const SignUpModal = ({ event, onClose, onConfirm, currentUser, position }) => {
    const [isClosing, setIsClosing] = useState(false);
    const { addNotification } = useNotification();
    const getUserFullName = (user) => user ? [user.lastName, user.firstName, user.middleName || user.patronymic].filter(Boolean).join(' ') : '';
    const [participants, setParticipants] = useState(() => [{ fullName: getUserFullName(currentUser), group: currentUser.group || '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const modalRef = useRef(null);
    const prevHeight = useRef(null);
    const [dynamicPosition, setDynamicPosition] = useState(position);

    useEffect(() => {
        if (modalRef.current) {
            const currentHeight = modalRef.current.offsetHeight;
            const oldHeight = prevHeight.current;
            if (oldHeight !== null && currentHeight !== oldHeight) {
                const heightDifference = currentHeight - oldHeight;
                setDynamicPosition(pos => {
                    if (!pos || typeof pos.top !== 'string') return pos;
                    return {
                        ...pos,
                        top: `${parseFloat(pos.top) - heightDifference}px`
                    };
                });
            }

            prevHeight.current = currentHeight;
        }
    }, [participants.length]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 400);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        for (const p of participants) {
            if (!p.fullName.trim() || !p.group.trim()) {
                addNotification('Пожалуйста, заполните все поля.', 'error');
                return;
            }
        }
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/events/${event.id}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_login: currentUser.login, participants }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Ошибка записи');
            addNotification(result.message, 'success');
            onConfirm(event.id);
        } catch (error) {
            addNotification(error.message, 'error');
            setIsSubmitting(false);
        }
    };

    return ReactDOM.createPortal(
        <div className={`events-page-scope modal-overlay ${isClosing ? 'is-closing' : ''}`} onMouseDown={handleClose}>
            <div ref={modalRef} className={`edit-modal-content signup-modal ${isClosing ? 'is-closing' : ''}`} onMouseDown={(e) => e.stopPropagation()} style={dynamicPosition || {}}>
                <div className="chat-header">
                    <div className="chat-title-wrapper">
                        <h2>Запись на мероприятие</h2>
                        <p>{event.eventName}</p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="edit-form-inside-modal">
                    <div className="edit-modal-body">
                        <div className="participants-list">
                            {participants.map((p, index) => (
                                <div className="participant-entry" key={index}>
                                    {index > 0 && <button type="button" className="remove-participant-btn" onClick={() => removeParticipant(index)}><RemoveIcon /></button>}
                                    <div className="form-grid signup-form-grid">
                                        <FormField label={index === 0 ? "Ваше ФИО" : "ФИО участника"}>
                                            <input type="text" className="form-input" value={p.fullName} onChange={(e) => handleParticipantChange(index, 'fullName', e.target.value)} required disabled={index === 0} />
                                        </FormField>
                                        <FormField label={index === 0 ? "Ваша группа" : "Группа"}>
                                            <input type="text" className="form-input" value={p.group} onChange={(e) => handleParticipantChange(index, 'group', e.target.value)} required disabled={index === 0} />
                                        </FormField>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="form-actions-container participant-actions">
                        <button type="button" className="form-secondary-btn btn-add-plus" onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} onClick={addParticipant} disabled={isSubmitting || participants.length >= (event.max_group_size || 5)}>
                            <span>+</span>
                        </button>
                        <div className="form-actions-right">
                            <button type="button" className="form-secondary-btn" onClick={handleClose} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} disabled={isSubmitting}>
                                <span>Отмена</span>
                            </button>
                            <button type="submit" className="form-submit-btn" disabled={isSubmitting} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                <span>{isSubmitting ? 'Запись...' : 'Записаться'}</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );

};

// модальное окно для приглашения пользователей
const AllUsersModal = memo(forwardRef((
  { eventId, eventName, curatorLogin, onClose, position }, ref ) => {
    const { addNotification } = useNotification();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef(null);
    const [hoveredCardId, setHoveredCardId] = useState(null);
    const [gliderStyle, setGliderStyle] = useState({ opacity: 0 });
    const cardElements = useRef(new Map());
    const modalRef = useRef(null);
    const [dynamicPosition, setDynamicPosition] = useState(position);

    const handleClose = useCallback(() => {
        if (isClosing) return;
        setIsClosing(true);
        setTimeout(onClose, 400);
    }, [isClosing, onClose]);

    useImperativeHandle(ref, () => ({
        close: () => {
            handleClose();
        }
    }));

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/all`, { credentials: 'include' });
                if (!response.ok) throw new Error('Не удалось загрузить список пользователей');
                const data = await response.json();
                setUsers(data);
            } catch (error) {
                console.error("Ошибка при загрузке пользователей:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        if (modalRef.current) {
            const rect = modalRef.current.getBoundingClientRect();
            if (rect.height > 0) {
                const windowHeight = window.innerHeight;
                const gap = 15;
                let newTop = rect.top;

                if (rect.bottom > windowHeight - gap) {
                    newTop = windowHeight - rect.height - gap;
                }
                if (newTop < gap) {
                    newTop = gap;
                }
                if (newTop !== rect.top) {
                    setDynamicPosition(pos => ({ ...pos, top: `${newTop}px` }));
                }
            }
        }
    }, [isLoading, users]);

    const filteredUsers = useMemo(() => {
        return users
            .filter(user => user.role === 'student')
            .filter(user => {
                const fullName = `${user.lastName} ${user.firstName} ${user.middleName || ''}`.toLowerCase();
                const search = searchTerm.toLowerCase();
                return fullName.includes(search) || user.login.toLowerCase().includes(search) || (user.group && user.group.toLowerCase().includes(search));
            });
    }, [users, searchTerm]);

    useEffect(() => {
        const targetElement = hoveredCardId ? cardElements.current.get(hoveredCardId) : null;
        if (targetElement) {
            setGliderStyle({
                transform: `translateY(${targetElement.offsetTop}px)`,
                height: `${targetElement.offsetHeight}px`,
                opacity: 1,
            });
        } else {
            setGliderStyle(prev => ({ ...prev, opacity: 0 }));
        }
    }, [hoveredCardId, filteredUsers]);

    return ReactDOM.createPortal(
        <div className={`events-page-scope modal-overlay invite-overlay ${isClosing ? 'is-closing' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
            <div ref={modalRef} className={`edit-modal-content signup-modal invite-modal ${isClosing ? 'is-closing' : ''}`} onMouseDown={(e) => e.stopPropagation()} style={dynamicPosition || {}}>
                <div className="edit-modal-body">
                    <div className="filter-container">
                        <div className="search-bar-wrapper">
                            <div className="interactive-button btn-style-neutral" onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} onClick={() => inputRef.current?.focus()}>
                                <span><SearchIcon /><input ref={inputRef} type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></span>
                            </div>
                        </div>
                    </div>
                    <div className="invite-users-list-container" onMouseLeave={() => setHoveredCardId(null)}>
                        <div className="list-glider" style={gliderStyle}></div>
                        {isLoading ? <div className="page-loader-container"><ClockwiseLoader /></div> :
                            filteredUsers.length > 0 ? (
                                filteredUsers.map((user, index) => {
                                    const isActive = hoveredCardId === user.id;
                                    return (
                                        <React.Fragment key={user.id}>
                                            <div
                                                ref={node => node ? cardElements.current.set(user.id, node) : cardElements.current.delete(user.id)}
                                                className={`invite-user-card ${isActive ? 'is-active' : ''}`}
                                                onMouseEnter={() => setHoveredCardId(user.id)}
                                            >
                                                <div className="invite-user-card-main-info">
                                                    <img src={`${API_BASE_URL}${user.avatar}`} alt="avatar" className="user-avatar" />
                                                    <div className="header-content">
                                                        <h3>{`${user.lastName} ${user.firstName}`}</h3>
                                                        <div className="card-subtitle">{user.group}</div>
                                                    </div>
                                                </div>
                                                <div className="invite-user-card-actions">
                                                    <button
                                                    className="interactive-button btn-style-register"
                                                    onMouseEnter={() => setHoveredCardId(user.id)}
                                                    onMouseMove={handleMouseMoveForEffect}
                                                    onMouseLeave={handleButtonLeave}
                                                    onClick={async (e) => {
                                                        e.stopPropagation();

                                                        if (!eventId || !curatorLogin) {
                                                            addNotification('Не удалось определить мероприятие или куратора.', 'error');
                                                            return;
                                                        }

                                                        try {
                                                            const resp = await fetch(`${API_BASE_URL}/api/notifications`, {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            credentials: "include",
                                                            body: JSON.stringify({
                                                                recipientLogin: user.login,   
                                                                inviter: curatorLogin,        
                                                                eventId: eventId              
                                                            })
                                                        });

                                                        const data = await resp.json();
                                                        if (!resp.ok) throw new Error(data.detail || 'Не удалось отправить приглашение');

                                                        addNotification(`Приглашение отправлено ${user.firstName} ${user.lastName}`, 'success');
                                                    } catch (err) {
                                                            addNotification(err.message, 'error');
                                                    }
                                                    }}
                                                    >
                                                    <span><AddIcon /> Пригласить</span>
                                                    </button>
                                                </div>
                                            </div>
                                            {index < filteredUsers.length - 1 && <div className="invite-user-divider" />}
                                        </React.Fragment>
                                    )
                                })
                            ) : (
                                <div className="no-results-message">Студенты с такими данными не найдены.</div>
                            )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}));


// всплывающее окно для просмотра списка записавшихся
const RegistrationsModal = ({ onClose, eventName, registrations = [], position, onInvite, onCloseInvite, isInviteModalOpen }) => {
    const [isClosing, setIsClosing] = useState(false);
    const modalRef = useRef(null);
    const [dynamicPosition, setDynamicPosition] = useState(position);

    useEffect(() => {
        if (modalRef.current) {
            const rect = modalRef.current.getBoundingClientRect();
            if (rect.height > 0) {
                const windowHeight = window.innerHeight;
                const gap = 15;
                let newTop = rect.top;

                if (rect.bottom > windowHeight - gap) {
                    newTop = windowHeight - rect.height - gap;
                }

                if (newTop < gap) {
                    newTop = gap;
                }

                if (newTop !== rect.top) {
                    setDynamicPosition(pos => ({ ...pos, top: `${newTop}px` }));
                }
            }
        }
    }, [registrations]);

    const groupedSubmissions = useMemo(() =>
        registrations.reduce((acc, reg) => {
            const id = reg.submission_group_id;
            if (!acc[id]) acc[id] = [];
            acc[id].push(reg);
            return acc;
        }, {}), [registrations]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 400);
    };

    return ReactDOM.createPortal(
        <div className={`events-page-scope modal-overlay ${isClosing ? 'is-closing' : ''}`} onMouseDown={handleClose}>
            <div ref={modalRef} className={`edit-modal-content signup-modal ${isClosing ? 'is-closing' : ''}`} onMouseDown={(e) => e.stopPropagation()} style={dynamicPosition || {}}>
                <div className="chat-header">
                    <div className="chat-title-wrapper">
                        <h2>Записавшиеся на "{eventName}"</h2>
                        <p>Всего: {registrations.length} чел.</p>
                    </div>
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
                <div className="form-actions-container">
                    <div className="form-actions-right registration-modal-actions">
                        <button type="button" className="form-secondary-btn" onClick={handleClose} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                            <span>Закрыть</span>
                        </button>
                        <button type="button" className={`form-submit-btn ${isInviteModalOpen ? 'btn-style-delete' : ''}`} onClick={isInviteModalOpen ? onCloseInvite : onInvite} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                            <span>{isInviteModalOpen ? 'Отмена' : 'Пригласить'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// карточка мероприятия для вида куратора
const CuratorEventCard = memo(({ event, isActive, isExpanded, onCardClick, onDelete, onShowList, onDownload, onMouseEnter, currentUser, innerRef }) => {
    const cardClassName = ['event-card', 'curator-card', isActive && 'is-active', isExpanded && 'is-expanded'].filter(Boolean).join(' ');
    const handleAction = (e, callback, ...args) => {
        e.stopPropagation();
        callback(...args);
    };

    const [areButtonsRendered, setAreButtonsRendered] = useState(false);
    const [animationClass, setAnimationClass] = useState('');
    const prevIsExpanded = useRef(isExpanded);
    const animationTimer = useRef();

    useEffect(() => {
        clearTimeout(animationTimer.current);
        if (isExpanded) {
            setAreButtonsRendered(true);
            setAnimationClass('is-action-button-fly-in');
        } else {
            if (prevIsExpanded.current) {
                setAnimationClass('is-action-button-fade-out');
                animationTimer.current = setTimeout(() => {
                    setAreButtonsRendered(false);
                }, 300);
            }
        }
        prevIsExpanded.current = isExpanded;

        return () => clearTimeout(animationTimer.current);
    }, [isExpanded]);


    return (
        <div ref={innerRef} className={cardClassName} onMouseEnter={onMouseEnter}>
            <div className="card-content-wrapper" onClick={() => onCardClick(event.id)}>
                <div className="card-header">
                    <div className="header-content">
                        <h3>{event.eventName}</h3>
                        <div className="card-date">{new Date(event.eventDate).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div className="card-header-right">
                        {areButtonsRendered && (
                            <button
                                className={`interactive-button is-icon btn-style-neutral ${animationClass}`}
                                onClick={() => handleDownloadZip(event.id)} 
                                onMouseMove={handleMouseMoveForEffect}
                                onMouseLeave={handleButtonLeave}
                                title="Скачать отчет"
                            >
                                <span><DownloadIcon /></span>
                            </button>
                        )}
                        <button className="interactive-button btn-style-list" onClick={(e) => handleAction(e, onShowList, event, e)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                            <span><ListIcon /> Список</span>
                        </button>
                        {currentUser?.id === event.userId && (
                            <button
                                className="interactive-button btn-style-delete"
                                onClick={(e) => handleAction(e, onDelete, event, e)}
                                onMouseMove={handleMouseMoveForEffect}
                                onMouseLeave={handleButtonLeave}
                            >
                               <span><DeleteIcon/> Удалить</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className="card-details-wrapper">
                <div className="card-body curator-card-body-grid">
                    <div className="card-body-column column-image">
                        <img 
                            src={event.coverImage ? `${API_BASE_URL}${event.coverImage}` : defaultEventImage} 
                            alt={event.eventName} 
                            className="curator-card-image" 
                        />
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
const StudentEventCard = memo(({ event, onSignUp, isRegistered, isCentral, isDetailed, onDownload }) => {
    const cardClassName = [
        'event-card-student',
        isCentral && 'is-central',
        isDetailed && 'is-detailed-view'
    ].filter(Boolean).join(' ');
    const handleActionClick = (e, action) => {
        e.stopPropagation();
        action(event, e);
    };

    return (
        <div className={cardClassName}>
            <div className="student-card-inner">
                <div
                    className="cover-image"
                    style={{ backgroundImage: `url(${event.coverImage ? `${API_BASE_URL}${event.coverImage}` : defaultEventImage})` }}
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
                            className="interactive-button btn-style-neutral is-icon"
                            onClick={() => handleDownloadZip(event.id)} 
                            onMouseMove={handleMouseMoveForEffect}
                            onMouseLeave={handleButtonLeave}
                            title="Скачать материалы"
                        >
                            <span><DownloadIcon /></span>
                        </button>
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
const StudentEventsView = ({ events, userRegisteredEventIds, onSignUp, onCardClick, detailedCardId, onDownload }) => {
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
                            onDownload={onDownload}
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
const CuratorEventsView = ({ events, onCardClick, onDelete, onShowList, onDownload, expandedCardId, hoveredCardId, setHoveredCardId, gliderStyle, cardElements, currentUser }) => {
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
                                onDownload={onDownload}
                                currentUser={currentUser}
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
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [modalPosition, setModalPosition] = useState(null);
    const [inviteModalPosition, setInviteModalPosition] = useState(null);
    const [activeFilter, setActiveFilter] = useState('Все');
    const inviteModalRef = useRef(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);
    const [deleteModalPosition, setDeleteModalPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                // Загружаем данные о мероприятиях
                const eventsResponse = await fetch(`${API_BASE_URL}/api/events`);
                if (!eventsResponse.ok) throw new Error('Не удалось загрузить мероприятия.');
                const eventsData = await eventsResponse.json();
                // Обрабатываем данные мероприятий
                const processedEvents = eventsData.map(event => ({
                    ...event,
                    imageUrl: event.coverImage ? `${API_BASE_URL}${event.coverImage}` : defaultEventImage,
                    max_participants: event.maxParticipants,  
                    max_group_size: event.teamSize,           
                    recruitment_status: 'Активен',
                    description: event.description || 'Тут будет описание, возможно, когда-нибудь'
                }));

                setEvents(processedEvents);
                if (userRole === 'curator') {
                    console.log("userRole в useEffect:", userRole);
                    const meResp = await fetch(`${API_BASE_URL}/api/profile/me`, { credentials: 'include' });
                    if (meResp.ok) {
                        const me = await meResp.json();
                        setCurrentUser({ id: me.id, login: me.login });
                    } else {
                        console.error("Ошибка при получении профиля:", meResp.status);
                    }
                }
                // Если пользователь - студент, загружаем дополнительные данные
                if (userRole === 'student' && userLogin) {
                    const profileResponse = await fetch(`${API_BASE_URL}/api/profile/${userLogin}`, {
                        credentials: 'include'
                    });
                    if (!profileResponse.ok) throw new Error('Не удалось загрузить профиль.');
                    const profileData = await profileResponse.json();
                    setCurrentUser({
                        lastName: profileData.last_name,
                        firstName: profileData.first_name,
                        middleName: profileData.patronymic,
                        group: profileData.group,
                        login: profileData.login
                    });
                    // Загружаем записи на мероприятия
                    const registrationsResponse = await fetch(`${API_BASE_URL}/api/users/${userLogin}/registrations`, {
                        credentials: 'include'
                    });
                    if (!registrationsResponse.ok) throw new Error('Не удалось загрузить записи.');
                    const registrationIds = await registrationsResponse.json();
                    setUserRegisteredEventIds(new Set(registrationIds));
                }
                setIsLoading(false);

            } catch (error) {
                console.error("Ошибка при загрузке данных для страницы мероприятий:", error);
            }
        };
        fetchInitialData();
    }, [userLogin, userRole]);

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

    const handleSignUp = (event, e) => {
        if (!currentUser) return;
        const buttonRect = e.currentTarget.getBoundingClientRect();
        const modalWidth = 600; 
        const gap = 15;
        let top = buttonRect.top - 150;
        const left = buttonRect.left - modalWidth - gap;
        if (top < gap) {
            top = gap;
        }

        setModalPosition({
            top: `${top}px`,
            left: `${Math.max(left, gap)}px`
        });
        setSelectedEvent(event);
        setIsSignUpModalOpen(true);
    };

    const handleCloseSignUpModal = () => {
        setIsSignUpModalOpen(false);
        setModalPosition(null);
        setSelectedEvent(null);
    };

    const handleConfirmRegistration = (eventId) => {
        setUserRegisteredEventIds(prev => new Set(prev).add(eventId));
        handleCloseSignUpModal();
    };

    const promptDeleteEvent = (event, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const modalWidth = 380;
        const gap = 15;
        const top = rect.top;
        let left = rect.left - modalWidth - gap;

        if (left < gap) {
            left = rect.right + gap;
        }

        setDeleteModalPosition({ top, left });
        setEventToDelete(event);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!eventToDelete) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/events/${eventToDelete.id}`, { 
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Ошибка удаления');
            addNotification('Мероприятие удалено.', 'success');
            setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
        } catch (e) {
            addNotification(e.message, 'error');
        } finally {
            setIsDeleteModalOpen(false);
            setEventToDelete(null);
        }
    };

    const handleDownloadReport = (eventId) => {
        addNotification(`Загрузка отчета для мероприятия #${eventId}...`, 'info');
        console.log(`Downloading report for event ${eventId}`);
    };

    const handleStudentDownload = (event) => {
        addNotification(`Загрузка материалов для мероприятия "${event.eventName}"...`, 'info');
        console.log("Download requested for student for event:", event.id);
    };

    const handleShowList = async (event, e) => {
        const buttonRect = e.currentTarget.getBoundingClientRect();
        const modalWidth = 600;
        const gap = 15;
        const left = buttonRect.left - modalWidth - gap;
        const top = buttonRect.top;

        const finalPos = {
            top: `${top}px`,
            left: `${Math.max(left, gap)}px`
        };

        setModalPosition(finalPos);
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

    const handleOpenInviteModal = () => {
        if (modalPosition && modalPosition.left) {
            const inviteModalWidth = 400;
            const gap = 16;
            const newLeft = `calc(${modalPosition.left} - ${inviteModalWidth}px - ${gap}px)`;
            setInviteModalPosition({
                top: modalPosition.top,
                left: newLeft
            });
        }
        setIsInviteModalOpen(true);
    };

    const handleCloseInviteModal = () => {
        if (inviteModalRef.current) {
            inviteModalRef.current.close();
        }
    };

    const onInviteModalClosed = () => {
        setIsInviteModalOpen(false);
        setInviteModalPosition(null);
    };

    const handleCloseRegistrationsModal = () => {
        setIsRegistrationsModalOpen(false);
        if (isInviteModalOpen) {
            handleCloseInviteModal();
        }
    };

    const filterStyleMap = { 'Все': 'btn-style-neutral', 'Записан': 'btn-style-registered-filter', 'Не записан': 'btn-style-unregistered-filter' };

    return (
        <div className="events-page-scope">
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                position={deleteModalPosition}
                title="Подтверждение удаления"
                message={`Вы уверены, что хотите удалить мероприятие "${eventToDelete?.eventName || ''}"? Это действие необратимо.`}
                confirmText="Удалить"
                cancelText="Назад"
            />

            {isSignUpModalOpen && <SignUpModal event={selectedEvent} onClose={handleCloseSignUpModal} onConfirm={handleConfirmRegistration} currentUser={currentUser} position={modalPosition} />}

            {isRegistrationsModalOpen && <RegistrationsModal onClose={handleCloseRegistrationsModal} onInvite={handleOpenInviteModal} onCloseInvite={handleCloseInviteModal} isInviteModalOpen={isInviteModalOpen} eventName={selectedEvent?.eventName} registrations={registrations[selectedEvent?.id]} position={modalPosition} />}

            {isInviteModalOpen && (
            <AllUsersModal
                ref={inviteModalRef}
                eventId={selectedEvent?.id}            
                eventName={selectedEvent?.eventName}
                curatorLogin={currentUser?.login}  
                onClose={onInviteModalClosed}
                position={inviteModalPosition}
            />
            )}
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
                                onDownload={handleStudentDownload}
                            />
                        ) : (
                            <CuratorEventsView
                                events={filteredEvents}
                                onCardClick={handleCardClick}
                                onDelete={promptDeleteEvent}
                                onShowList={handleShowList}
                                onDownload={handleDownloadReport}
                                expandedCardId={expandedCardId}
                                hoveredCardId={hoveredCardId}
                                setHoveredCardId={setHoveredCardId}
                                gliderStyle={gliderStyle}
                                cardElements={cardElements}
                                currentUser={currentUser}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );

}