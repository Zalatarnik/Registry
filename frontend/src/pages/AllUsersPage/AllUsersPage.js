import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useNotification } from '../../notification/NotificationContext';
import './AllUsersPage.css';
import ClockwiseLoader from '../../components/common/Loader';
import ConfirmationModal from '../../pages/ConfirmationModal'; 

// иконки
import { ReactComponent as SearchIcon } from '../../icons/search-icon.svg';
import { ReactComponent as DeleteIcon } from '../../icons/remove-icon.svg';

const API_BASE_URL = 'http://localhost:8000';

// АНИМАЦИЯ
const EASING_FACTOR = 0.15;
const DEFAULT_RADIUS = 0;

function animateRadii(el) {
    const state = el._animationState;
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
    el.style.borderRadius = `${state.current.tl}px ${state.current.tr}px ${state.current.br}px ${state.current.bl}px`;
    if (isAnimationNeeded) {
        requestAnimationFrame(() => animateRadii(el));
    } else {
        state.isAnimating = false;
    }
}

const handleMouseMoveForEffect = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);
    if (el.classList.contains('interactive-button') || el.classList.contains('role-badge')) {
        if (!el._animationState) {
            el._animationState = { isAnimating: false, current: { tl: 0, tr: 0, br: 0, bl: 0 }, target: { tl: 0, tr: 0, br: 0, bl: 0 } };
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

const handleButtonLeave = (e) => {
    const el = e.currentTarget;
    if (el.classList.contains('interactive-button') || el.classList.contains('role-badge')) {
        const state = el._animationState;
        if (!state) return;
        state.target.tl = 0;
        state.target.tr = 0;
        state.target.br = 0;
        state.target.bl = 0;
        if (!state.isAnimating) {
            state.isAnimating = true;
            requestAnimationFrame(() => animateRadii(el));
        }
    }
};


// карточка пользователя
const UserCard = memo(({ user, isActive, isExpanded, onCardClick, onMouseEnter, innerRef, onDeleteUser }) => {
    const cardClassName = ['user-card', isActive && 'is-active', isExpanded && 'is-expanded'].filter(Boolean).join(' ');
    const userFullName = `${user.lastName} ${user.firstName} ${user.middleName || ''}`.trim();
    const roleDisplayMap = { student: 'Студент', curator: 'Куратор' };
    const roleText = user.role === 'student' ? `${roleDisplayMap[user.role]}, ${user.group}` : roleDisplayMap[user.role];

    return (
        <div ref={innerRef} className={cardClassName} onMouseEnter={onMouseEnter}>
            <div className="card-content-wrapper" onClick={() => onCardClick(user.id)}>
                <div className="card-header">
                    <img src={`${API_BASE_URL}${user.avatar}`} alt="avatar" className="user-avatar" />
                    <div className="header-content">
                        <h3>{userFullName}</h3>
                        <div className="card-subtitle">{roleText}</div>
                    </div>
                    <div className="card-header-right">
                        <button 
                            className="interactive-button btn-style-delete" 
                            onClick={(e) => { e.stopPropagation(); onDeleteUser(user, e); }}
                            onMouseMove={handleMouseMoveForEffect}
                            onMouseLeave={handleButtonLeave}
                        >
                            <span><DeleteIcon /> Удалить</span>
                        </button>
                        <div 
                            className={`interactive-button role-badge role-${user.role}`} 
                            onMouseMove={handleMouseMoveForEffect} 
                            onMouseLeave={handleButtonLeave}
                        >
                           <span>{roleDisplayMap[user.role]}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card-details-wrapper">
                <div className="card-body">
                    <div className="detail-item"><span className="detail-label">Логин:</span> {user.login}</div>
                    <div className="detail-item"><span className="detail-label">Почта:</span> {user.email}</div>
                    {user.role === 'student' && (
                        <div className="detail-item"><span className="detail-label">№ студ. билета:</span> {user.studentIdNumber}</div>
                    )}
                </div>
            </div>
        </div>
    );
});

const roleStyleMap = { 'Все': 'btn-style-neutral', 'Студенты': 'btn-style-student', 'Кураторы': 'btn-style-curator' };

// главный компонент страницы
export default function AllUsersPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addNotification } = useNotification();
    const [hoveredCardId, setHoveredCardId] = useState(null);
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [gliderStyle, setGliderStyle] = useState({ opacity: 0 });
    const cardElements = useRef(new Map());
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('Все');
    const inputRef = useRef(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/all`);
                if (!response.ok) throw new Error('Не удалось загрузить список пользователей');
                const data = await response.json();
                setUsers(data);
            } catch (error) {
                addNotification(error.message, 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, [addNotification]);
    
    const promptDeleteUser = (user, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const modalWidth = 380; 
        const gap = 15;
        const top = rect.top;
        let left = rect.left - modalWidth - gap;

        if (left < gap) {
            left = rect.right + gap;
        }

        setModalPosition({ top, left });
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userToDelete.id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Не удалось удалить пользователя' }));
                throw new Error(errorData.detail);
            }
            setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));
            addNotification('Пользователь успешно удален', 'success');
        } catch (error) {
            addNotification(error.message, 'error');
        } finally {
            setUserToDelete(null); 
        }
    };

    const filteredUsers = useMemo(() => {
        return users
            .filter(user => {
                if (activeFilter === 'Все') return true;
                if (activeFilter === 'Студенты') return user.role === 'student';
                if (activeFilter === 'Кураторы') return user.role === 'curator';
                return true;
            })
            .filter(user => {
                const fullName = `${user.lastName} ${user.firstName} ${user.middleName || ''}`.toLowerCase();
                const search = searchTerm.toLowerCase();
                return fullName.includes(search) || user.login.toLowerCase().includes(search) || (user.group && user.group.toLowerCase().includes(search));
            });
    }, [users, searchTerm, activeFilter]);

    const gliderTargetId = expandedCardId ? null : hoveredCardId;
    const activeCardId = expandedCardId ? expandedCardId : gliderTargetId;

    useEffect(() => {
        const targetElement = gliderTargetId ? cardElements.current.get(gliderTargetId) : null;
        if (targetElement) {
            setGliderStyle({
                transform: `translateY(${targetElement.offsetTop}px)`,
                height: `${targetElement.querySelector('.card-content-wrapper').offsetHeight}px`,
                opacity: 1
            });
        } else {
            setGliderStyle(prev => ({ ...prev, opacity: 0 }));
        }
    }, [gliderTargetId, filteredUsers]);

    const handleCardClick = (id) => setExpandedCardId(prev => prev === id ? null : id);

    return (
        <div className="all-users-scope">
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                position={modalPosition}
                title="Подтверждение удаления"
                message={`Вы уверены, что хотите удалить пользователя "${userToDelete?.firstName || ''} ${userToDelete?.lastName || ''}"? Это действие необратимо.`}
                confirmText="Удалить"
                cancelText="Отмена"
            />

            <div className="all-users-container">
                <h1>Все пользователи</h1>
                {isLoading ? (
                    <div className="page-loader-container"><ClockwiseLoader /></div>
                ) : (
                    <>
                        <div className="filter-container">
                            <div className="search-bar-wrapper">
                                <div className="interactive-button btn-style-neutral" onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} onClick={() => inputRef.current?.focus()}>
                                    <span><SearchIcon /><input ref={inputRef} type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></span>
                                </div>
                            </div>
                            <div className="filter-buttons">
                                {Object.keys(roleStyleMap).map(role => (
                                    <button key={role} className={`interactive-button ${activeFilter === role ? 'is-active-filter' : ''} ${roleStyleMap[role]}`} onClick={() => setActiveFilter(role)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                        <span>{role}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="users-list-container" onMouseLeave={() => setHoveredCardId(null)}>
                            <div className="list-glider" style={gliderStyle}></div>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user, index) => (
                                    <React.Fragment key={user.id}>
                                        <UserCard
                                            innerRef={node => node ? cardElements.current.set(user.id, node) : cardElements.current.delete(user.id)}
                                            user={user}
                                            isActive={activeCardId === user.id}
                                            isExpanded={expandedCardId === user.id}
                                            onCardClick={handleCardClick}
                                            onMouseEnter={() => { if (!expandedCardId) setHoveredCardId(user.id); }}
                                            onDeleteUser={promptDeleteUser}
                                        />
                                        {index < filteredUsers.length - 1 && <div className="user-divider" />}
                                    </React.Fragment>
                                ))
                            ) : (
                                <div className="no-results-message">Пользователи с такими параметрами не найдены.</div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}