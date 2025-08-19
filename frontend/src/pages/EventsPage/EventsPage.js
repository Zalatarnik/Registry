import React, { useState, useEffect, useMemo, useRef, memo, forwardRef, useImperativeHandle, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './EventsPage.css';
import { useNotification } from '../../notification/NotificationContext';
import ClockwiseLoader from '../../components/common/Loader';

// импорт изображения по умолчанию
import defaultEventImage from '../../images/event-default.jpg';
import defaultAvatar from '../../images/event-default.jpg';

// иконки
import { ReactComponent as SearchIcon } from '../../icons/search-icon.svg';
import { ReactComponent as AddIcon } from '../../icons/add-icon.svg';
import { ReactComponent as RemoveIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as CloseIcon } from '../../icons/exit-icon.svg';
import { ReactComponent as DeleteIcon } from '../../icons/remove-icon.svg';
import { ReactComponent as ListIcon } from '../../icons/user-icon.svg'; // замените котика на другую иконку  /ᐠ. ᴗ.ᐟ\ /♡
import { ReactComponent as UsersIcon } from '../../icons/users-icon.svg'; // замените котика на другую иконку  /ᐠ. ᴗ.ᐟ\ /♡
import { ReactComponent as GroupIcon } from '../../icons/group-icon.svg'; // замените котика на другую иконку  /ᐠ. ᴗ.ᐟ\ /♡
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
    
    const getUserFullName = (user) => user 
    ? [user.lastName, user.firstName, user.middleName || user.patronymic]
        .filter(Boolean)
        .join(' ') 
    : '';

    const [participants, setParticipants] = useState(() => [{ 
        id: currentUser.id, 
        fullName: getUserFullName(currentUser), 
        group: currentUser.group || '', 
        avatar: currentUser.avatar || defaultAvatar,
        isLocked: true 
    }]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const modalRef = useRef(null);
    const [modalPosition, setModalPosition] = useState(position);
    const dragInfo = useRef({});

    const [allStudents, setAllStudents] = useState([]);
    const [activeSearchIndex, setActiveSearchIndex] = useState(null);
    
    const [hoveredStudentId, setHoveredStudentId] = useState(null);
    const [gliderStyle, setGliderStyle] = useState({ opacity: 0 });
    const studentElements = useRef(new Map());
    const participantsListWrapperRef = useRef(null);
    const modalBodyRef = useRef(null);
    const searchContainerRef = useRef(null);

    const [isSearchContainerVisible, setIsSearchContainerVisible] = useState(false);

    const shouldSearchBeVisible = useMemo(() => {
        if (activeSearchIndex === null) return false;
        const currentFullName = participants[activeSearchIndex]?.fullName.toLowerCase();
        if (!currentFullName) return false;

        const registeredIds = new Set(participants.map(p => p.id).filter(Boolean));
        return allStudents.some(student => {
            const fullName = `${student.lastName} ${student.firstName} ${student.middleName || ''}`.toLowerCase();
            return !registeredIds.has(student.id) && fullName.includes(currentFullName);
        });
    }, [activeSearchIndex, participants, allStudents]);

    useEffect(() => {
        if (shouldSearchBeVisible) {
            setIsSearchContainerVisible(true);
        }
    }, [shouldSearchBeVisible]);
    
    const handleSearchAnimationEnd = () => {
        if (!shouldSearchBeVisible) {
            setIsSearchContainerVisible(false);
        }
    };

    useEffect(() => {
        const bodyEl = modalBodyRef.current;
        if (bodyEl) {
            bodyEl.style.overflowY = activeSearchIndex !== null ? 'visible' : 'auto';
        }
    }, [activeSearchIndex]);

    useEffect(() => {
        const wrapper = participantsListWrapperRef.current;
        if (wrapper) {
            const oldHeight = wrapper.getBoundingClientRect().height;
            wrapper.style.height = 'auto';
            const newHeight = wrapper.scrollHeight;

            if (oldHeight > 0) {
                wrapper.style.height = `${oldHeight}px`;
                void wrapper.offsetHeight;
            }
            
            wrapper.style.height = `${newHeight}px`;
        }
    }, [participants.length]);
    
    const handleDragMove = useCallback((e) => {
        if (!dragInfo.current.isDragging || !modalRef.current) return;
        e.preventDefault();
    
        const modalNode = modalRef.current;
        const { height, width } = modalNode.getBoundingClientRect();
        const { innerWidth, innerHeight } = window;
    
        let newTop = e.clientY - dragInfo.current.offsetY;
        let newLeft = e.clientX - dragInfo.current.offsetX;
    
        newTop = Math.max(0, Math.min(newTop, innerHeight - height));
        newLeft = Math.max(0, Math.min(newLeft, innerWidth - width));
    
        modalNode.style.top = `${newTop}px`;
        modalNode.style.left = `${newLeft}px`;
    }, []);

    const handleDragEnd = useCallback(() => {
        if (!dragInfo.current.isDragging || !modalRef.current) return;
    
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
    
        const modalNode = modalRef.current;
        modalNode.style.transition = 'top 0.2s ease-out, left 0.2s ease-out';
    
        const rect = modalNode.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const snapThreshold = 60;
        const edgeGap = 20;
    
        let finalTop = rect.top;
        let finalLeft = rect.left;
    
        if (rect.top < snapThreshold && rect.top > -snapThreshold) {
            finalTop = edgeGap;
        } else if (vh - rect.bottom < snapThreshold && vh - rect.bottom > -snapThreshold) {
            finalTop = vh - rect.height - edgeGap;
        }
    
        if (rect.left < snapThreshold && rect.left > -snapThreshold) {
            finalLeft = edgeGap;
        } else if (vw - rect.right < snapThreshold && vw - rect.right > -snapThreshold) {
            finalLeft = vw - rect.width - edgeGap;
        }
        
        setModalPosition({
            top: `${finalTop}px`,
            left: `${finalLeft}px`,
        });
        
        dragInfo.current.isDragging = false;
    }, [handleDragMove]);

    const handleDragStart = (e) => {
        if (e.button !== 0 || !modalRef.current) return;
        
        const modalNode = modalRef.current;
        modalNode.style.transition = 'none';
    
        const rect = modalNode.getBoundingClientRect();
        dragInfo.current = {
            isDragging: true,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
        };
        
        document.body.style.cursor = 'grabbing';
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    };

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/all`, { credentials: 'include' });
                if (!response.ok) throw new Error('Не удалось загрузить список студентов');
                const data = await response.json();
                setAllStudents(data.filter(u => u.role === 'student'));
            } catch (error) {
                console.error("Ошибка при загрузке студентов:", error);
            }
        };
        fetchStudents();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
          if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
            setActiveSearchIndex(null);
          }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 400);
    };

    const handleOverlayMouseDown = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const addParticipant = () => {
        const maxGroupSize = event.max_group_size || 5;
        if (participants.length < maxGroupSize) {
            setParticipants([...participants, { id: null, fullName: '', group: '', avatar: defaultAvatar, isLocked: false }]);
        } else {
            addNotification(`Максимальный размер группы: ${maxGroupSize} чел.`, 'info');
        }
    };

    const removeParticipant = (index) => {
        if (!participants[index].isLocked) {
            setParticipants(participants.filter((_, i) => i !== index));
        }
    };

    const handleParticipantChange = (index, value) => {
        const newParticipants = [...participants];
        if (newParticipants[index].id) {
            newParticipants[index].id = null;
            newParticipants[index].group = '';
            newParticipants[index].avatar = defaultAvatar;
        }
        newParticipants[index].fullName = value;
        setParticipants(newParticipants);
        setActiveSearchIndex(value ? index : null);
    };

    const handleUserSelect = (index, user) => {
        const newParticipants = [...participants];
        newParticipants[index] = {
            id: user.id,
            fullName: `${user.lastName} ${user.firstName} ${user.middleName || ''}`.trim(),
            group: user.group,
            avatar: user.avatar || defaultAvatar,
            isLocked: false
        };
        setParticipants(newParticipants);
        setActiveSearchIndex(null);
    };

    const filteredStudents = useMemo(() => {
        if (activeSearchIndex === null) return [];
        const currentFullName = participants[activeSearchIndex]?.fullName.toLowerCase();
        if (!currentFullName) return [];

        const registeredIds = new Set(participants.map(p => p.id).filter(Boolean));

        return allStudents.filter(student => {
            const fullName = `${student.lastName} ${student.firstName} ${student.middleName || ''}`.toLowerCase();
            return !registeredIds.has(student.id) && fullName.includes(currentFullName);
        }).slice(0, 5);
    }, [activeSearchIndex, participants, allStudents]);
    
    useEffect(() => {
        const targetElement = hoveredStudentId ? studentElements.current.get(hoveredStudentId) : null;
        if (targetElement) {
            setGliderStyle({
                transform: `translateY(${targetElement.offsetTop}px)`,
                height: `${targetElement.offsetHeight}px`,
                opacity: 1,
            });
        } else {
            setGliderStyle(prev => ({ ...prev, opacity: 0 }));
        }
    }, [hoveredStudentId, filteredStudents]);

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
        <div className={`events-page-scope modal-overlay ${isClosing ? 'is-closing' : ''}`} onMouseDown={handleOverlayMouseDown}>
            <div ref={modalRef} className={`edit-modal-content signup-modal ${isClosing ? 'is-closing' : ''}`} style={modalPosition || {}}>
                <div className="chat-header" onMouseDown={handleDragStart}>
                    <div className="chat-title-wrapper">
                        <h2>Запись на мероприятие</h2>
                        <p>{event.eventName}</p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="edit-form-inside-modal">
                    <div ref={modalBodyRef} className="edit-modal-body">
                        <div
                            ref={participantsListWrapperRef}
                            style={{ 
                                transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)', 
                                overflow: activeSearchIndex !== null ? 'visible' : 'hidden' 
                            }}
                        >
                            <div className="participants-list">
                                {participants.map((p, index) => (
                                    <div className="participant-entry" key={index}>
                                        <img 
                                            src={p.avatar === defaultAvatar ? defaultAvatar : `${API_BASE_URL}${p.avatar}`} 
                                            alt="avatar" 
                                            className="participant-avatar" 
                                        />
                                        {!p.isLocked && <button type="button" className="remove-participant-btn" onClick={() => removeParticipant(index)}><RemoveIcon /></button>}
                                        <div className="form-grid signup-form-grid">
                                            <div className="participant-search-container" ref={index === activeSearchIndex ? searchContainerRef : null}>
                                                <FormField label={p.isLocked ? "Ваше ФИО" : "ФИО участника"}>
                                                    <input 
                                                        type="text" 
                                                        className="form-input" 
                                                        value={p.fullName} 
                                                        onChange={(e) => handleParticipantChange(index, e.target.value)} 
                                                        required 
                                                        disabled={p.isLocked}
                                                        onFocus={() => { if (!p.isLocked) setActiveSearchIndex(index); }}
                                                    />
                                                </FormField>
                                                {isSearchContainerVisible && activeSearchIndex === index && (
                                                    <div
                                                        className={`user-search-results-container ${!shouldSearchBeVisible ? 'is-closing' : ''}`}
                                                        onAnimationEnd={handleSearchAnimationEnd}
                                                        onMouseLeave={() => setHoveredStudentId(null)}
                                                    >
                                                        <div className="list-glider" style={gliderStyle}></div>
                                                        {filteredStudents.map(user => (
                                                            <div 
                                                                key={user.id} 
                                                                ref={node => node ? studentElements.current.set(user.id, node) : studentElements.current.delete(user.id)}
                                                                className={`user-search-item ${hoveredStudentId === user.id ? 'is-active' : ''}`}
                                                                onClick={() => handleUserSelect(index, user)}
                                                                onMouseEnter={() => setHoveredStudentId(user.id)}
                                                            >
                                                                <img src={`${API_BASE_URL}${user.avatar}`} alt="avatar" />
                                                                <div className="user-search-info">
                                                                    <span>{`${user.lastName} ${user.firstName}`}</span>
                                                                    <small>{user.group}</small>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <FormField label={p.isLocked ? "Ваша группа" : "Группа"}>
                                                <input type="text" className="form-input" value={p.group} readOnly required disabled={p.isLocked || p.id} />
                                            </FormField>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
  { eventId, eventName, curatorLogin, onClose, position, registeredParticipants = [] }, ref ) => {
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
    const [invitedLogins, setInvitedLogins] = useState(new Set());

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

    // Множество логинов уже участвующих 
    const registeredLogins = useMemo(
    () => new Set((registeredParticipants || []).map(r => r.userLogin)),
    [registeredParticipants]
    );

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
                                    const isRegistered = registeredLogins.has(user.login);
                                    const isInvited = invitedLogins.has(user.login);
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
                                                        disabled={isRegistered || isInvited}
                                                        onMouseEnter={() => setHoveredCardId(user.id)}
                                                        onMouseMove={handleMouseMoveForEffect}
                                                        onMouseLeave={handleButtonLeave}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (isRegistered || isInvited) return;

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

                                                            setInvitedLogins(prev => new Set(prev).add(user.login));
                                                            addNotification(`Приглашение отправлено ${user.firstName} ${user.lastName}`, 'success');
                                                            } catch (err) {
                                                            addNotification(err.message, 'error');
                                                            }
                                                        }}
                                                        >
                                                        <span>
                                                            {isRegistered
                                                            ? 'Участвует'
                                                            : (isInvited ? 'Приглашён' : <><AddIcon /> Пригласить</>)
                                                            }
                                                        </span>
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
const RegistrationsModal = ({ onClose, event, registrations = [], position, onInvite, onCloseInvite, isInviteModalOpen, onDeleteGroup }) => {
    const [isClosing, setIsClosing] = useState(false);
    const modalRef = useRef(null);
    const [dynamicPosition, setDynamicPosition] = useState(position);
    const dragInfo = useRef({});

    const handleDragMove = useCallback((e) => {
        if (!dragInfo.current.isDragging || !modalRef.current) return;
        e.preventDefault();
    
        const modalNode = modalRef.current;
        const { height, width } = modalNode.getBoundingClientRect();
        const { innerWidth, innerHeight } = window;
    
        let newTop = e.clientY - dragInfo.current.offsetY;
        let newLeft = e.clientX - dragInfo.current.offsetX;
    
        newTop = Math.max(0, Math.min(newTop, innerHeight - height));
        newLeft = Math.max(0, Math.min(newLeft, innerWidth - width));
    
        modalNode.style.top = `${newTop}px`;
        modalNode.style.left = `${newLeft}px`;
    }, []);

    const handleDragEnd = useCallback(() => {
        if (!dragInfo.current.isDragging || !modalRef.current) return;
    
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
    
        const modalNode = modalRef.current;
        modalNode.style.transition = 'top 0.2s ease-out, left 0.2s ease-out';
    
        const rect = modalNode.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const snapThreshold = 60;
        const edgeGap = 20;
    
        let finalTop = rect.top;
        let finalLeft = rect.left;
    
        if (rect.top < snapThreshold && rect.top > -snapThreshold) {
            finalTop = edgeGap;
        } else if (vh - rect.bottom < snapThreshold && vh - rect.bottom > -snapThreshold) {
            finalTop = vh - rect.height - edgeGap;
        }
    
        if (rect.left < snapThreshold && rect.left > -snapThreshold) {
            finalLeft = edgeGap;
        } else if (vw - rect.right < snapThreshold && vw - rect.right > -snapThreshold) {
            finalLeft = vw - rect.width - edgeGap;
        }
        
        setDynamicPosition({
            top: `${finalTop}px`,
            left: `${finalLeft}px`,
        });
        
        dragInfo.current.isDragging = false;
    }, [handleDragMove]);

    const handleDragStart = (e) => {
        if (e.button !== 0 || !modalRef.current) return;
        
        const modalNode = modalRef.current;
        modalNode.style.transition = 'none';
    
        const rect = modalNode.getBoundingClientRect();
        dragInfo.current = {
            isDragging: true,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
        };
        
        document.body.style.cursor = 'grabbing';
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    };

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
                <div className="chat-header" onMouseDown={handleDragStart}>
                    <div className="chat-title-wrapper">
                        <h2>Записавшиеся на "{event.eventName}"</h2>
                        <p>{new Date(event.eventDate).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <div className="details-icons registration-modal-icons">
                        <div className="icon-item" title="Макс. участников">
                            <UsersIcon />
                            <span>{registrations.length}/{event.max_participants || '∞'}</span>
                        </div>
                        <div className="icon-item" title="Макс. чел. в группе">
                            <GroupIcon />
                            <span>{event.max_group_size || 1}</span>
                        </div>
                    </div>
                </div>
                <div className="registrations-modal-body">
                    {registrations.length > 0 ? (
                        Object.values(groupedSubmissions).map((submissionGroup, index) => (
                            <div key={submissionGroup[0].submission_group_id} className="submission-group">
                                <div className="submission-group-header">
                                    <h5>Группа №{index + 1} ({submissionGroup.length} чел.)</h5>
                                    {onDeleteGroup && (
                                        <button
                                            className="delete-group-btn"
                                            onClick={() => onDeleteGroup(submissionGroup[0].submission_group_id)}
                                            title="Удалить группу"
                                        >
                                            <DeleteIcon />
                                        </button>
                                    )}
                                </div>
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
                                <span>{event.current_participants || 0}/{event.max_participants || '∞'}</span>
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

                // Пытаемся загрузить количество участников, но не прерываем выполнение, если не получится
                let countsData = {};
                try {
                    const countsResponse = await fetch(`${API_BASE_URL}/api/events/registrations/counts`);
                    if (countsResponse.ok) {
                        countsData = await countsResponse.json();
                    }
                } catch (e) {
                    console.error("Не удалось загрузить количество регистраций:", e);
                }

                // Обрабатываем данные мероприятий
                const processedEvents = eventsData.map(event => ({
                    ...event,
                    imageUrl: event.coverImage ? `${API_BASE_URL}${event.coverImage}` : defaultEventImage,
                    max_participants: event.maxParticipants,  
                    max_group_size: event.teamSize,           
                    current_participants: countsData[event.id] || 0,
                    imageUrl: event.coverImage ? `${API_BASE_URL}${event.coverImage}` : defaultEventImage,
                    max_participants: event.max_participants || event.maxParticipants || 100,
                    max_group_size: event.max_group_size || event.teamSize || 5,
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
                        id: profileData.id,
                        lastName: profileData.lastName || profileData.last_name,
                        firstName: profileData.firstName || profileData.first_name,
                        middleName: profileData.middleName || profileData.patronymic || '',
                        group: profileData.group || '',
                        login: profileData.login,
                        avatar: profileData.avatar
                    });
                    // Загружаем записи на мероприятия
                    const registrationsResponse = await fetch(`${API_BASE_URL}/api/users/${userLogin}/registrations`, {
                        credentials: 'include'
                    });
                    if (!registrationsResponse.ok) throw new Error('Не удалось загрузить записи.');
                    const registrationIds = await registrationsResponse.json();
                    setUserRegisteredEventIds(new Set(registrationIds));
                }

            } catch (error) {
                console.error("Ошибка при загрузке данных для страницы мероприятий:", error);
            } finally {
                setIsLoading(false);
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
        setEvents(prevEvents => prevEvents.map(event => 
            event.id === eventId 
                ? { ...event, current_participants: (event.current_participants || 0) + 1 }
                : event
        ));
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

    const handleDeleteGroup = (groupId) => {
        if (!selectedEvent) return;
        addNotification(`Удаление группы #${groupId}...`, 'info');
        const eventId = selectedEvent.id;
        const updatedRegistrationsForEvent = registrations[eventId].filter(
            (reg) => reg.submission_group_id !== groupId
        );
        setRegistrations((prev) => ({
            ...prev,
            [eventId]: updatedRegistrationsForEvent,
        }));
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

            {isRegistrationsModalOpen && <RegistrationsModal onClose={handleCloseRegistrationsModal} onInvite={handleOpenInviteModal} onCloseInvite={handleCloseInviteModal} isInviteModalOpen={isInviteModalOpen} event={selectedEvent} registrations={registrations[selectedEvent?.id]} position={modalPosition} onDeleteGroup={handleDeleteGroup} />}

            {isInviteModalOpen && (
            <AllUsersModal
                ref={inviteModalRef}
                eventId={selectedEvent?.id}            
                eventName={selectedEvent?.eventName}
                curatorLogin={currentUser?.login} 
                registeredParticipants={registrations[selectedEvent?.id] || []} 
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