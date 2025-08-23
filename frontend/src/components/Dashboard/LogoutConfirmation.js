import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './LogoutConfirmation.css';
import { useTranslation } from '../common/useTranslation';

/* АНИМАЦИЯ радиусов по курсору — оставляем твою реализацию */
const EASING_FACTOR = 0.15;
const DEFAULT_RADIUS = 0;

function animateRadii(btn){
  const state = btn._animationState;
  if (!state) return;
  let need = false;
  for (const k in state.current){
    const diff = state.target[k] - state.current[k];
    if (Math.abs(diff) > 0.01){ need = true; state.current[k] += diff * EASING_FACTOR; }
    else { state.current[k] = state.target[k]; }
  }
  btn.style.borderRadius = `${state.current.tl}px ${state.current.tr}px ${state.current.br}px ${state.current.bl}px`;
  if (need) requestAnimationFrame(() => animateRadii(btn));
  else state.isAnimating = false;
}

const handleMouseMoveForEffect = (e) => {
  // отключаем на тач-экранах
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;
  const btn = e.currentTarget;
  if (!btn._animationState){
    btn._animationState = {
      isAnimating:false,
      current:{tl:DEFAULT_RADIUS,tr:DEFAULT_RADIUS,br:DEFAULT_RADIUS,bl:DEFAULT_RADIUS},
      target:{tl:DEFAULT_RADIUS,tr:DEFAULT_RADIUS,br:DEFAULT_RADIUS,bl:DEFAULT_RADIUS},
    };
  }
  btn.style.setProperty('--mouse-x', `${e.clientX - btn.getBoundingClientRect().left}px`);
  btn.style.setProperty('--mouse-y', `${e.clientY - btn.getBoundingClientRect().top}px`);
  const state = btn._animationState;
  const rect = btn.getBoundingClientRect();
  const x = e.clientX - rect.left; const y = e.clientY - rect.top;
  const { width, height } = rect;
  const maxRadius = 25;
  const diagonal = Math.hypot(width, height);
  const calcR = (cx, cy) => Math.max(0, maxRadius * Math.pow(1 - (Math.hypot(x - cx, y - cy) / diagonal), 3));
  state.target.tl = calcR(0,0); state.target.tr = calcR(width,0);
  state.target.br = calcR(width,height); state.target.bl = calcR(0,height);
  if (!state.isAnimating){ state.isAnimating = true; requestAnimationFrame(() => animateRadii(btn)); }
};
const handleButtonLeave = (e) => {
  const btn = e.currentTarget; const st = btn._animationState; if (!st) return;
  st.target = { tl:0, tr:0, br:0, bl:0 };
  if (!st.isAnimating){ st.isAnimating = true; requestAnimationFrame(() => animateRadii(btn)); }
};

/* ===== Компонент ===== */
const LogoutConfirmation = ({ isOpen, onClose, onConfirm, position }) => {
  const { t } = useTranslation();
  const [isClosing, setIsClosing] = useState(false);
  const [coords, setCoords] = useState({ top: null, left: null });
  const [isSheet, setIsSheet] = useState(false);
  const modalRef = useRef(null);
  const firstBtnRef = useRef(null);
  const lastBtnRef  = useRef(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => { onClose(); setIsClosing(false); }, 200);
  };

  // ESC закрывает
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Клик вне — закрыть
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) handleClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isOpen]);

  // Лочим скролл body
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('scroll-lock');
    return () => document.body.classList.remove('scroll-lock');
  }, [isOpen]);

  // Трап фокуса
  useEffect(() => {
    if (!isOpen) return;
    const a = firstBtnRef.current, b = lastBtnRef.current;
    a && a.focus();
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = [a, b].filter(Boolean);
      if (!focusable.length) return;
      const active = document.activeElement;
      if (e.shiftKey && active === a){ e.preventDefault(); b && b.focus(); }
      else if (!e.shiftKey && active === b){ e.preventDefault(); a && a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Вычисляем позицию: рядом с кнопкой, иначе — центр/шит
  const recomputePosition = useCallback(() => {
    if (!isOpen) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 10; // отступы от краёв
    const lowHeight = vh < 520 || window.matchMedia('(orientation: landscape)').matches && vh < 560;

    // переключаемся в режим шита на низких/узких
    setIsSheet(lowHeight);

    // Если шит — координаты выставляет CSS, просто центр по X
    if (lowHeight){
      setCoords({ top: null, left: vw / 2 });
      return;
    }

    // Анкер по переданной позиции
    const anchorTop  = position?.top ?? vh / 2;
    const anchorLeft = position?.left ?? vw / 2;

    // После рендера измерим реальные размеры модалки
    requestAnimationFrame(() => {
      const el = modalRef.current;
      const mw = el?.offsetWidth ?? Math.min(380, vw - 24);
      const mh = el?.offsetHeight ?? 160;

      // Попытка: справа от кнопки (anchorLeft — уже «правее» у тебя)
      let left = anchorLeft;
      let top  = Math.max(gap, Math.min(anchorTop, vh - mh - gap));

      // В кадре?
      const leftEdge  = left - mw / 2;
      const rightEdge = left + mw / 2;

      if (leftEdge < gap){ left = mw / 2 + gap; }
      if (rightEdge > vw - gap){ left = vw - mw / 2 - gap; }

      setCoords({ top, left });
    });
  }, [isOpen, position]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    recomputePosition();
  }, [isOpen, recomputePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => recomputePosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [isOpen, recomputePosition]);

  if (!isOpen) return null;

  const containerClassName = [
    'logout-modal-container',
    isSheet ? 'is-sheet' : '',
    isClosing ? 'is-closing' : '',
  ].filter(Boolean).join(' ');

  const modalStyle = {
    top:  coords.top  == null ? undefined : `${coords.top}px`,
    left: coords.left == null ? undefined : `${coords.left}px`,
  };

  const handleConfirmAction = () => { onConfirm(); handleClose(); };

  // Бэкдроп и модалка (портал)
  return ReactDOM.createPortal(
    <>
      <div className={`modal-backdrop ${isClosing ? 'is-closing' : ''}`} />
      <div
        ref={modalRef}
        className={containerClassName}
        style={modalStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
      >
        <div className="logout-modal-header">
          <h2 id="logout-modal-title">{t('logout.confirmationTitle')}</h2>
        </div>
        <div className="logout-modal-body">
          <p>{t('logout.confirmationMessage')}</p>
        </div>
        <div className="logout-modal-footer">
          <button
            ref={firstBtnRef}
            className="logout-modal-button neutral"
            onClick={handleClose}
            onMouseMove={handleMouseMoveForEffect}
            onMouseLeave={handleButtonLeave}
          >
            <span>{t('logout.cancel')}</span>
          </button>
          <button
            ref={lastBtnRef}
            className="logout-modal-button reject"
            onClick={handleConfirmAction}
            onMouseMove={handleMouseMoveForEffect}
            onMouseLeave={handleButtonLeave}
          >
            <span>{t('logout.confirm')}</span>
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

export default LogoutConfirmation;
