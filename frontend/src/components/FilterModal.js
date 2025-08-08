import React, { useEffect, useState } from 'react';
import { useTranslation } from './common/useTranslation';

// Компонент
const FilterModal = ({
  isOpen, // открыто ли окно фильтра
  onClose, // Функция закрытия модалки
  filters, // Текущие выбранные фильтры
  setFilters, // Функция для обновления фильтров
  handleMouseMoveForEffect,  // Обработчик движения мыши (для эффекта кнопок)
  handleButtonLeave   // Обработчик ухода мыши с кнопки
}) => {
  const { t } = useTranslation();
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
        // Сброс состояния при следующем открытии
        setIsClosing(false);
    }
  }, [isOpen]);

  const handleCloseAnimation = () => {
    setIsClosing(true);
    // Длительность анимации закрытия 250мс
    setTimeout(() => {
      onClose();
    }, 250);
  };

  // Если модалка закрыта, ничего не рендерим
  if (!isOpen) return null;

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
    handleCloseAnimation();
  };

  const containerClassName = `filter-modal-dropdown-container ${isClosing ? 'is-closing' : ''}`;

  return (
    <div className={containerClassName}>
      <div className="modal-content">
        <div className="modal-body">
            <div className="filter-grid">
                <div className="form-field">
                <h4>{t('filterModal.sort.title')}</h4>
                <label className="input-label">
                    <input
                    type="radio"
                    name="sort"
                    checked={filters.sort === 'recent'}
                    onChange={() => setFilters(prev => ({ ...prev, sort: 'recent' }))}
                    />
                    <span>{t('filterModal.sort.recent')}</span>
                </label>
                <label className="input-label">
                    <input
                    type="radio"
                    name="sort"
                    checked={filters.sort === 'alphabetical'}
                    onChange={() => setFilters(prev => ({ ...prev, sort: 'alphabetical' }))}
                    />
                    <span>{t('filterModal.sort.alphabetical')}</span>
                </label>
                <label className="input-label">
                    <input
                    type="radio"
                    name="sort"
                    checked={filters.sort === 'reverseAlphabetical'}
                    onChange={() => setFilters(prev => ({ ...prev, sort: 'reverseAlphabetical' }))}
                    />
                    <span>{t('filterModal.sort.reverseAlphabetical')}</span>
                </label>
                </div>

                <div className="form-field">
                <h4>{t('filterModal.status.title')}</h4>
                <label className="input-label">
                  <input
                    type="checkbox"
                    checked={filters.international}
                    onChange={() => setFilters(prev => ({ ...prev, international: !prev.international }))}
                    />
                    <span>{t('filterModal.status.international')}</span>
                </label>
                <label className="input-label">
                    <input
                    type="checkbox"
                    checked={filters.allRussian}
                    onChange={() => setFilters(prev => ({ ...prev, allRussian: !prev.allRussian }))}
                    />
                    <span>{t('filterModal.status.allRussian')}</span>
                </label>
                <label className="input-label">
                  <input
                    type="checkbox"
                    checked={filters.city}
                    onChange={() => setFilters(prev => ({ ...prev, city: !prev.city }))}
                    />
                    <span>{t('filterModal.status.city')}</span>
                </label>
                <label className="input-label">
                    <input
                    type="checkbox"
                    checked={filters.regional}
                    onChange={() => setFilters(prev => ({ ...prev, regional: !prev.regional }))}
                    />
                    <span>{t('filterModal.status.regional')}</span>
                </label>
                </div>
            </div>
        </div>

        <div className="modal-footer">
          <button
            className="interactive-button btn-style-neutral"
            onClick={handleClear}
            onMouseMove={handleMouseMoveForEffect}
            onMouseLeave={handleButtonLeave}
          >
            <span>{t('filterModal.button.clear')}</span>
          </button>
          <button
            className="interactive-button btn-style-export"
            onClick={handleApply}
            onMouseMove={handleMouseMoveForEffect}
            onMouseLeave={handleButtonLeave}
          >
            <span>{t('filterModal.button.apply')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;