import React from 'react';
import ReactDOM from 'react-dom';

// Компонент
const FilterModal = ({
  isOpen, // открыто ли окно фильтра
  onClose, // Функция закрытия модалки
  filters, // Текущие выбранные фильтры
  setFilters, // Функция для обновления фильтров
  handleMouseMoveForEffect,  // Обработчик движения мыши (для эффекта кнопок)
  handleButtonLeave   // Обработчик ухода мыши с кнопки
}) => {

  // Если модалка закрыта, ничего не рендерим
  if (!isOpen) return null;

  // Закрывает модалку, если клик был именно по оверлею, а не по содержимому
  const handleOverlayClick = (e) => {
    if (e.target.id === 'modal-overlay') onClose();
  };

  // Сброс фильтров 
  const handleClear = () => {
    setFilters({
      sort: '',
      regional: false,
      allRussian: false,
      international: false,
      city: false,
    });
  };

  // Применение фильтров и закрытие модалки
  const handleApply = () => {
    onClose();
  };

  return ReactDOM.createPortal(
    <div
      className="modal-overlay"
      id="modal-overlay"
      onClick={handleOverlayClick}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2>Фильтр заявок</h2>
        </div>
        <div className="modal-body">
            <div
                style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '80px'
                }}
            >
                <div className="form-field">
                <h4>Сортировка</h4>
                <label className="input-label">
                    <input
                    type="radio"
                    name="sort"
                    checked={filters.sort === 'recent'}
                    onChange={() => setFilters(prev => ({ ...prev, sort: 'recent' }))}
                    />
                    Недавно прошедшие
                </label>
                <label className="input-label">
                    <input
                    type="radio"
                    name="sort"
                    checked={filters.sort === 'alphabetical'}
                    onChange={() => setFilters(prev => ({ ...prev, sort: 'alphabetical' }))}
                    />
                    По алфавиту ФИО
                </label>
                <label className="input-label">
                    <input
                    type="radio"
                    name="sort"
                    checked={filters.sort === 'reverseAlphabetical'}
                    onChange={() => setFilters(prev => ({ ...prev, sort: 'reverseAlphabetical' }))}
                    />
                    Против алфавита ФИО
                </label>
                </div>

                <div className="form-field">
                <h4>Статус мероприятия</h4>
                <label className="input-label">
                    <input
                    type="checkbox"
                    checked={filters.regional}
                    onChange={() => setFilters(prev => ({ ...prev, regional: !prev.regional }))}
                    />
                    Региональные
                </label>
                <label className="input-label">
                    <input
                    type="checkbox"
                    checked={filters.allRussian}
                    onChange={() => setFilters(prev => ({ ...prev, allRussian: !prev.allRussian }))}
                    />
                    Всероссийские
                </label>
                <label className="input-label">
                    <input
                    type="checkbox"
                    checked={filters.international}
                    onChange={() => setFilters(prev => ({ ...prev, international: !prev.international }))}
                    />
                    Международные
                </label>
                <label className="input-label">
                    <input
                    type="checkbox"
                    checked={filters.city}
                    onChange={() => setFilters(prev => ({ ...prev, city: !prev.city }))}
                    />
                    Городские
                </label>
                </div>
            </div>
        </div>

        <div className="modal-footer">
          <button
            className="form-secondary-btn"
            onClick={handleClear}
            onMouseMove={handleMouseMoveForEffect}
            onMouseLeave={handleButtonLeave}
          >
            <span>Очистить</span>
          </button>
          <button
            className="form-submit-btn"
            onClick={handleApply}
            onMouseMove={handleMouseMoveForEffect}
            onMouseLeave={handleButtonLeave}
          >
            <span>Применить</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FilterModal;