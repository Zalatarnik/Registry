import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useNotification } from '../../notification/NotificationContext';
import './AllUsersPage.css';
import ClockwiseLoader from '../../components/common/Loader';

// иконки
import { ReactComponent as SearchIcon } from '../../icons/search-icon.svg';

const API_BASE_URL = 'http://localhost:8000';

// АНИМАЦИЯ КНОПОК

// коэффициент для плавности анимации радиусов углов
const EASING_FACTOR = 0.15;
// радиус углов по умолчанию
const DEFAULT_RADIUS = 0;

// функция для анимирования радиусов углов элемента
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

// универсальный обработчик движения мыши для создания эффектов
const handleMouseMoveForEffect = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // передаем координаты мыши в CSS переменные для градиентного эффекта
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);
    
    // если это интерактивный элемент, запускаем анимацию радиусов
    if (el.classList.contains('interactive-button') || el.classList.contains('role-badge')) {
        const initialRadius = el.classList.contains('role-badge') ? DEFAULT_RADIUS : 0;
        // инициализируем состояние анимации, если его нет
        if (!el._animationState) {
            el._animationState = {
                isAnimating: false,
                current: { tl: initialRadius, tr: initialRadius, br: initialRadius, bl: initialRadius },
                target: { tl: initialRadius, tr: initialRadius, br: initialRadius, bl: initialRadius },
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
    }
};

// обработчик увода мыши с интерактивного элемента
const handleButtonLeave = (e) => {
    const el = e.currentTarget;
    if (el.classList.contains('interactive-button') || el.classList.contains('role-badge')) {
        const state = el._animationState;
        if (!state) return;
        const initialRadius = el.classList.contains('role-badge') ? DEFAULT_RADIUS : 0;
        state.target.tl = initialRadius;
        state.target.tr = initialRadius;
        state.target.br = initialRadius;
        state.target.bl = initialRadius;
        if (!state.isAnimating) {
            state.isAnimating = true;
            requestAnimationFrame(() => animateRadii(el));
        }
    }
};


// карточка пользователя
const UserCard = memo(({ user, isActive, isExpanded, onCardClick, onMouseEnter, innerRef }) => {
    const cardClassName = ['user-card', isActive && 'is-active', isExpanded && 'is-expanded'].filter(Boolean).join(' ');
    // формируем фио пользователя
    const userFullName = `${user.last_name} ${user.first_name} ${user.patronymic || ''}`.trim();
    // карта для отображения названий ролей
    const roleDisplayMap = { student: 'Студент', curator: 'Куратор' };
    // формируем текст с ролью (и группой для студента)
    const roleText = user.role === 'student' ? `${roleDisplayMap[user.role]}, ${user.group}` : roleDisplayMap[user.role];

    return (
        <div ref={innerRef} className={cardClassName} onMouseEnter={onMouseEnter}>
            <div className="card-content-wrapper" onClick={onCardClick}>
                <div className="card-header">
                    <img src={`${API_BASE_URL}${user.avatar}`} alt="avatar" className="user-avatar" />
                    <div className="header-content">
                        <h3>{userFullName}</h3>
                        <div className="card-subtitle">{roleText}</div>
                    </div>
                    <div className="card-header-right">
                        {/* значок с ролью пользователя */}
                        <div className={`role-badge role-${user.role} interactive-button`} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                           <span>{roleDisplayMap[user.role]}</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* детальная информация, видимая при раскрытии карточки */}
            <div className="card-details-wrapper">
                <div className="card-body">
                    <div className="detail-item"><span className="detail-label">Логин:</span> {user.login}</div>
                    <div className="detail-item"><span className="detail-label">Почта:</span> {user.email}</div>
                    {user.role === 'student' && (
                        <div className="detail-item"><span className="detail-label">№ студ. билета:</span> {user.student_id_number}</div>
                    )}
                </div>
            </div>
        </div>
    );
});

const roleStyleMap = { 'Все': 'btn-style-neutral', 'Студенты': 'btn-style-student', 'Кураторы': 'btn-style-curator' };


export default function AllUsersPage() {
    // состояние для хранения списка всех пользователей
    const [users, setUsers] = useState([]);
    // состояние для индикации загрузки
    const [isLoading, setIsLoading] = useState(true);
    // хук для отображения уведомлений
    const { addNotification } = useNotification();
    const [hoveredCardId, setHoveredCardId] = useState(null);
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [gliderStyle, setGliderStyle] = useState({ opacity: 0 });
    const cardElements = useRef(new Map());
    // состояние для поискового запроса
    const [searchTerm, setSearchTerm] = useState('');
    // состояние для активного фильтра по ролям
    const [activeFilter, setActiveFilter] = useState('Все');
    const inputRef = useRef(null);

    // эффект для загрузки списка пользователей
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
    
    const filteredUsers = useMemo(() => {
        return users
            // сначала фильтруем по роли
            .filter(user => {
                if (activeFilter === 'Все') return true;
                if (activeFilter === 'Студенты') return user.role === 'student';
                if (activeFilter === 'Кураторы') return user.role === 'curator';
                return true;
            })
            // затем фильтруем по поисковому запросу
            .filter(user => {
                const fullName = `${user.last_name} ${user.first_name} ${user.patronymic || ''}`.toLowerCase();
                const search = searchTerm.toLowerCase();
                return fullName.includes(search) ||
                       user.login.toLowerCase().includes(search) ||
                       (user.group && user.group.toLowerCase().includes(search));
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

    // обработчик клика по карточке для раскрытия/сворачивания
    const handleCardClick = (id) => setExpandedCardId(prev => prev === id ? null : id);

    return (
        <div className="all-users-container">
            <h1>Все пользователи</h1>
            <div className="page-content">
                {isLoading ? (
                    // показываем загрузчик во время получения данных
                    <div className="profile-loader-container"><ClockwiseLoader /></div>
                ) : (
                    // если загрузка завершена, показываем контент
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
                                // рендерим список отфильтрованных пользователей
                                filteredUsers.map((user, index) => (
                                    <React.Fragment key={user.id}>
                                        <UserCard
                                            innerRef={node => node ? cardElements.current.set(user.id, node) : cardElements.current.delete(user.id)}
                                            user={user}
                                            isActive={activeCardId === user.id}
                                            isExpanded={expandedCardId === user.id}
                                            onCardClick={() => handleCardClick(user.id)}
                                            onMouseEnter={() => { if (!expandedCardId) setHoveredCardId(user.id); }}
                                        />
                                        {/* добавляем разделитель между карточками */}
                                        {index < filteredUsers.length - 1 && <div className="user-divider" />}
                                    </React.Fragment>
                                ))
                            ) : (
                                // сообщение, если пользователи не найдены
                                <div className="no-results-message">Пользователи с такими параметрами не найдены.</div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}