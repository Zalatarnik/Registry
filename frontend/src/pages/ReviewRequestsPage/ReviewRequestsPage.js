import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useNotification } from '../../notification/NotificationContext';
import './ReviewRequestsPage.css';
import ClockwiseLoader from '../../components/common/Loader';
import ChatView from '../../components/Chat/Chat';
import FilterModal from '../../components/FilterModal';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

// иконки
import { ReactComponent as ChatIcon } from '../../icons/chat-icon.svg';
import { ReactComponent as DownloadIcon } from '../../icons/download-icon.svg';
import { ReactComponent as SearchIcon } from '../../icons/search-icon.svg';
import { ReactComponent as ApproveIcon } from '../../icons/accept-icon.svg';
import { ReactComponent as RejectIcon } from '../../icons/reject-icon.svg';
import { ReactComponent as ExportIcon } from '../../icons/upload-icon.svg';
import { ReactComponent as FilterIcon } from '../../icons/filter-icon.svg';

const API_BASE_URL = 'http://localhost:8000';

// АНИМАЦИЯ КНОПКИ
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
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);

    if (el.classList.contains('interactive-button')) {
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

const handleButtonLeave = (e) => {
    const btn = e.currentTarget;
    if (btn.classList.contains('interactive-button')) {
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

const downloadFile = (fileUrl, fileName) => {
    const fullUrl = `${API_BASE_URL}${fileUrl}`;
    const link = document.createElement('a');
    link.href = fullUrl;
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_blank');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const statusStyleMap = {
    'Все': 'btn-style-neutral',
    'Одобрено': 'btn-style-approved',
    'Отклонено': 'btn-style-rejected',
    'На рассмотрении': 'btn-style-pending'
};

const RequestReviewCard = memo(({ request, isActive, isExpanded, onCardClick, onMouseEnter, onApprove, onReject, onDownload, onOpenChat, innerRef, onSelect, isSelected }) => {
    const cardClassName = ['request-card', isActive && 'is-active', isExpanded && 'is-expanded', isSelected && 'is-selected-card'].filter(Boolean).join(' ');
    
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
                animationTimer.current = setTimeout(() => setAreButtonsRendered(false), 300);
            }
        }
        prevIsExpanded.current = isExpanded;
        return () => clearTimeout(animationTimer.current);
    }, [isExpanded]);
    
    const handleActionClick = (e, callback, ...args) => {
        e.stopPropagation();
        if (typeof callback === 'function') callback(...args);
    };

    const handleCheckboxClick = (e) => {
        e.stopPropagation();
        if (typeof onSelect === 'function') onSelect();
    };

    // фио студента
    const studentFullName = `${request.owner.lastName} ${request.owner.firstName} ${request.owner.middleName || ''}`.trim();
    
    const formatFileText = (count) => {
        if (count % 10 === 1 && count % 100 !== 11) return `${count} файл`;
        if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return `${count} файла`;
        return `${count} файлов`;
    };

    return (
        <div ref={innerRef} className={cardClassName} onMouseEnter={onMouseEnter}>
            <div className="card-content-wrapper" onClick={onCardClick}>
                <div className="card-header">
                    <div className="selection-checkbox-wrapper" onClick={handleCheckboxClick}>
                        <input type="checkbox" className="selection-checkbox" checked={isSelected} readOnly />
                    </div>
                    <div className="header-content">
                        <h3>{request.eventName}</h3>
                        <div className="card-date">От: {studentFullName} | Подана: {new Date(request.created_at).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div className="card-header-right">
                        {areButtonsRendered && request.status === 'На рассмотрении' && (
                            <>
                                <button className={`interactive-button is-icon btn-style-approved ${animationClass}`} title="Одобрить" onClick={(e) => handleActionClick(e, onApprove, request.id)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><ApproveIcon /></span></button>
                                <button className={`interactive-button is-icon btn-style-rejected ${animationClass}`} title="Отклонить" onClick={(e) => handleActionClick(e, onReject, request.id)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><RejectIcon /></span></button>
                            </>
                        )}
                        <button className="interactive-button is-icon btn-style-chat" title="Открыть чат" onClick={(e) => handleActionClick(e, onOpenChat, request)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span><ChatIcon /></span></button>
                        <button className={`interactive-button is-status-button ${statusStyleMap[request.status]}`} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}><span>{request.status}</span></button>
                    </div>
                </div>
            </div>
            <div className="card-details-wrapper">
                <div className="request-card-body-grid">
                    <div className="card-body-column column-files">
                        {(request.files && request.files.length > 0) ? (
                            <div className="m-stack-download" onClick={(e) => handleActionClick(e, onDownload, request)} title="Скачать прикрепленные файлы">
                                <DownloadIcon className="stack-download-icon" />
                                <div className="stack-label">{formatFileText(request.files.length)}</div>
                            </div>
                        ) : (
                            <div className="m-stack-download is-empty">
                                <DownloadIcon className="stack-download-icon" />
                                <div className="stack-label">Нет файлов</div>
                            </div>
                        )}
                    </div>
                    <div className="card-body-column column-description">
                        <div className="detail-item">
                            <span className="detail-label">Описание:</span>
                            {request.description || 'Описание для этой заявки еще не добавлено.'}
                        </div>
                        <div className="detail-item detail-item-link">
                            <span className="detail-label">Ссылка на ресурс:</span>
                            {request.link ? (
                                <a href={request.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{request.link}</a>
                            ) : 'Ссылка не указана.'}
                        </div>
                    </div>
                    <div className="card-body-column column-details">
                        <div className="detail-item"><span className="detail-label">Руководитель:</span> {request.leader}</div>
                        <div className="detail-item"><span className="detail-label">Организатор:</span> {request.organizer}</div>
                        <div className="detail-item"><span className="detail-label">Место:</span> {request.location}</div>
                        <div className="detail-item"><span className="detail-label">Статус:</span> {request.eventStatus}</div>
                        <div className="detail-item"><span className="detail-label">Дата:</span> {new Date(request.eventDate).toLocaleDateString('ru-RU')}</div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default function ReviewRequestsPage({ userLogin }) {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addNotification } = useNotification();
    const [hoveredCardId, setHoveredCardId] = useState(null);
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [gliderStyle, setGliderStyle] = useState({ opacity: 0 });
    const cardElements = useRef(new Map());
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('Все');
    const inputRef = useRef(null);
    const [activeChatRequest, setActiveChatRequest] = useState(null);
    const [selectedRequests, setSelectedRequests] = useState([]);
    const topPanelRef = useRef(null);

    // сотояние открытия модалки фильтра
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
    sort: '',
    regional: false,
    allRussian: false,
    international: false,
    city: false,
    });
    
    useEffect(() => {
        const fetchRequests = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/requests`);
                if (!response.ok) {
                    throw new Error('Не удалось загрузить заявки');
                }
                const data = await response.json();
                const processedData = data.map(req => ({
                    ...req,
                    description: req.description || "Описание для этой заявки еще не добавлено.",
                    link: req.link || ""
                }));
                setRequests(processedData);
                setIsLoading(false);

            } catch (error) {
                console.error("Ошибка при загрузке заявок:", error);
            }
        };

        fetchRequests();
    }, []);

    const handleCloseFilter = () => {
        const filterModal = topPanelRef.current?.querySelector('.filter-modal-dropdown-container');
        if (filterModal) {
            filterModal.classList.add('is-closing');
            setTimeout(() => {
                setIsFilterModalOpen(false);
            }, 250);
        } else {
            setIsFilterModalOpen(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isFilterModalOpen && topPanelRef.current && !topPanelRef.current.contains(event.target)) {
                handleCloseFilter();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isFilterModalOpen]);

    const filteredRequests = useMemo(() => {
    let result = requests
        .filter(request => (activeFilter === 'Все' ? true : request.status === activeFilter))
        .filter(request =>
        request.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${request.owner.lastName} ${request.owner.firstName}`.toLowerCase().includes(searchTerm.toLowerCase())
        );

    // сортировка
    if (advancedFilters.sort === 'recent') {
        result = result.filter(r => new Date(r.eventDate) > Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    if (advancedFilters.sort === 'alphabetical') {
        result = [...result].sort((a, b) => a.owner.lastName.localeCompare(b.owner.lastName));
    }
    if (advancedFilters.sort === 'reverseAlphabetical') {
        result = [...result].sort((a, b) => b.owner.lastName.localeCompare(a.owner.lastName));
    }

    // фильтры по типу
    const typeFilters = [];

    if (advancedFilters.regional) typeFilters.push('Региональный');
    if (advancedFilters.allRussian) typeFilters.push('Всероссийский');
    if (advancedFilters.international) typeFilters.push('Международный');
    if (advancedFilters.city) typeFilters.push('Городской');

    if (typeFilters.length > 0) {
        result = result.filter(r => typeFilters.includes(r.eventStatus));
    }

    return result;
    }, [requests, searchTerm, activeFilter, advancedFilters]);



    const gliderTargetId = expandedCardId ? null : hoveredCardId;

    useEffect(() => {
        const targetElement = gliderTargetId ? cardElements.current.get(gliderTargetId) : null;
        if (targetElement) {
            setGliderStyle({
                transform: `translateY(${targetElement.offsetTop}px)`,
                height: `${targetElement.querySelector('.card-content-wrapper').offsetHeight}px`,
                opacity: 1
            });
        } else {
            setGliderStyle(prevStyle => ({ ...prevStyle, opacity: 0 }));
        }
    }, [gliderTargetId, filteredRequests]);

    const handleCardClick = (clickedId) => setExpandedCardId(prevId => (prevId === clickedId ? null : clickedId));

    const handleSelectRequest = (requestId) => {
        setSelectedRequests(prev => prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]);
    };

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

    const handleAction = async (id, action) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/requests/${id}/${action}`, { method: 'PUT' });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Действие не удалось');
            }
            const result = await response.json();
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: result.status } : r));
            addNotification(`Заявка успешно ${action === 'approve' ? 'одобрена' : 'отклонена'}.`, 'success');
        } catch (error) {
            addNotification(error.message, 'error');
        }
    };
    
    const handleApprove = (id) => handleAction(id, 'approve');
    const handleReject = (id) => handleAction(id, 'reject');

    const handleOpenChat = (request) => setActiveChatRequest({ id: request.id, eventName: request.eventName });
    const handleCloseChat = () => setActiveChatRequest(null);
    

    // Преобразует массив заявок в лист Excel и скачивает .xlsx
    const generateXlsx = async (requestsToExport, fileName = 'export.xlsx') => {
    if (!requestsToExport || requestsToExport.length === 0) {
        addNotification('Нет данных для экспорта.', 'info');
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Заявки');

    // Колонки
    worksheet.columns = [
        { header: 'Название мероприятия', key: 'eventName', width: 40 },
        { header: 'ФИО студента', key: 'student', width: 30 },
        { header: 'Подана (дата)', key: 'createdAt', width: 14 },
        { header: 'Статус заявки', key: 'status', width: 14 },
        { header: 'Тип мероприятия', key: 'eventStatus', width: 16 },
        { header: 'Дата мероприятия', key: 'eventDate', width: 14 },
        { header: 'Руководитель', key: 'leader', width: 22 },
        { header: 'Организатор', key: 'organizer', width: 22 },
        { header: 'Место', key: 'location', width: 20 },
        { header: 'Описание', key: 'description', width: 60 },
        { header: 'Ссылка на ресурс', key: 'resourceLink', width: 40 },
        { header: 'Файлы', key: 'files', width: 40 }
    ];

    // Заголовки
    const headerRow = worksheet.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // белый текст
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD35400' } // фон d35400
        };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Заполняем данные
    requestsToExport.forEach((req) => {
        const studentFullName = `${req.owner?.lastName || ''} ${req.owner?.firstName || ''} ${req.owner?.middleName || ''}`.trim();
        const createdAt = req.created_at ? new Date(req.created_at).toLocaleDateString('ru-RU') : '';
        const eventDate = req.eventDate ? new Date(req.eventDate).toLocaleDateString('ru-RU') : '';

        let filesCellText = '';
        if (req.files && req.files.length > 0) {
            filesCellText = req.files.map(f => f.name).join('\n');
        }

        const rowValues = {
            eventName: req.eventName || '',
            student: studentFullName,
            createdAt,
            status: req.status || '',
            eventStatus: req.eventStatus || '',
            eventDate,
            leader: req.leader || '',
            organizer: req.organizer || '',
            location: req.location || '',
            description: req.description || '',
            resourceLink: req.link || '',
            files: filesCellText
        };

        worksheet.addRow(rowValues);
    });

    // Теперь установим гиперссылки и стиль ссылок:
    const resourceColNum = worksheet.getColumn('resourceLink').number; // 1-based
    const filesColNum = worksheet.getColumn('files').number;

    for (let r = 2; r <= worksheet.rowCount; r++) {
        const row = worksheet.getRow(r);

        // resource link
        const resCell = row.getCell(resourceColNum);
        if (resCell && resCell.value && typeof resCell.value === 'string' && resCell.value.trim() !== '') {
            const url = resCell.value;
            resCell.value = { text: url, hyperlink: url };
            resCell.font = { color: { argb: 'FF0000FF' }, underline: true }; // синий + подчёркнутый
        }

        // files — ставим hyperlink на первый файл если есть
        const reqIdx = r - 2;
        const reqObj = requestsToExport[reqIdx];
        if (reqObj && reqObj.files && reqObj.files.length > 0) {
            const firstFile = reqObj.files[0];
            if (firstFile && firstFile.url) {
                const fullUrl = `${API_BASE_URL}${firstFile.url}`;
                const filesCell = row.getCell(filesColNum);
                const text = (filesCell.value && typeof filesCell.value === 'string') ? filesCell.value : (firstFile.name || fullUrl);
                filesCell.value = { text: text, hyperlink: fullUrl };
                filesCell.font = { color: { argb: 'FF0000FF' }, underline: true };
            }
        }
    }

    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            // Центрирование по вертикали и горизонтали для всех ячеек
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            // Одна и та же тонкая граница вокруг каждой ячейки
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // Сохраняем и предлагаем скачать
    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Ошибка при создании xlsx', err);
        addNotification('Ошибка при создании файла', 'error');
    }
    };

  const handleExport = () => {
    if (!filteredRequests || filteredRequests.length === 0) {
        addNotification('Нет заявок для экспорта.', 'info');
        return;
    }
    const fileName = `requests_all_${new Date().toISOString().slice(0,10)}`.xlsx;
    generateXlsx(filteredRequests, fileName);
    };

    const handleExportSelected = () => {
    if (selectedRequests.length === 0) {
        addNotification("Сначала выберите заявки для выгрузки.", "info");
        return;
    }
    const toExport = filteredRequests.filter(r => selectedRequests.includes(r.id));
    const exportList = toExport.length > 0 ? toExport : requests.filter(r => selectedRequests.includes(r.id));
    if (exportList.length === 0) {
        addNotification('Не найдены выбранные заявки для экспорта.', 'error');
        return;
    }
    const fileName = `requests_selected_${new Date().toISOString().slice(0,10)}`.xlsx;
    generateXlsx(exportList, fileName);
    };

    return (
        <div className="review-requests-scope">
            {activeChatRequest && (<ChatView userLogin={userLogin} request={activeChatRequest} onClose={handleCloseChat} />)}
            
            <div className="review-requests-container">
                <h1>Все заявки</h1>
                
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
                            <div className="filter-buttons-panel" ref={topPanelRef}>
                                <button
                                    className={`interactive-button btn-style-neutral is-icon ${isFilterModalOpen ? 'is-active-filter' : ''}`}
                                    onClick={() => isFilterModalOpen ? handleCloseFilter() : setIsFilterModalOpen(true)}
                                    onMouseMove={handleMouseMoveForEffect}
                                    onMouseLeave={handleButtonLeave}
                                    title="Фильтр"
                                    >
                                    <span>
                                        <FilterIcon />
                                    </span>
                                </button>
                                {Object.keys(statusStyleMap).map(status => (
                                    <button key={status} className={`interactive-button ${activeFilter === status ? 'is-active-filter' : ''} ${statusStyleMap[status]}`} onClick={() => setActiveFilter(status)} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                        <span>{status}</span>
                                    </button>
                                ))}
                                
                                {isFilterModalOpen && <FilterModal
                                    isOpen={isFilterModalOpen}
                                    onClose={handleCloseFilter}
                                    filters={advancedFilters}
                                    setFilters={setAdvancedFilters}
                                    handleMouseMoveForEffect={handleMouseMoveForEffect}
                                    handleButtonLeave={handleButtonLeave}
                                />}
                            </div>
                        </div>

                        <div className="requests-list-container" onMouseLeave={() => setHoveredCardId(null)}>
                            <div className="list-glider" style={gliderStyle}></div>
                            
                            {filteredRequests.length > 0 ? (
                                filteredRequests.map((request, index) => (
                                    <React.Fragment key={request.id}>
                                        <RequestReviewCard
                                            innerRef={node => node ? cardElements.current.set(request.id, node) : cardElements.current.delete(request.id)}
                                            request={request}
                                            isActive={expandedCardId ? request.id === expandedCardId : expandedCardId ? false : hoveredCardId === request.id}
                                            isExpanded={expandedCardId === request.id}
                                            onCardClick={() => handleCardClick(request.id)}
                                            onMouseEnter={() => { if(!expandedCardId) setHoveredCardId(request.id); }}
                                            onApprove={handleApprove}
                                            onReject={handleReject}
                                            onDownload={handleDownloadAll}
                                            onOpenChat={handleOpenChat}
                                            onSelect={() => handleSelectRequest(request.id)}
                                            isSelected={selectedRequests.includes(request.id)}
                                        />
                                        {index < filteredRequests.length - 1 && <div className="request-divider" />}
                                    </React.Fragment>
                                ))
                            ) : (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>Заявки с выбранными фильтрами не найдены.</div>
                            )}
                        </div>
                        
                        <div className="export-button-container">
                            <button className="interactive-button btn-style-neutral" onClick={handleExportSelected} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave} disabled={selectedRequests.length === 0}>
                                <span>Выгрузить выбранные ({selectedRequests.length})</span>
                            </button>
                            <button className="interactive-button btn-style-export" onClick={handleExport} onMouseMove={handleMouseMoveForEffect} onMouseLeave={handleButtonLeave}>
                                <span><ExportIcon/> Выгрузить все</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}