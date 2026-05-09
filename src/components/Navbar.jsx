
import React, { useState, useEffect, useCallback } from 'react';
import { useAnimeData } from '../hooks/useAnimeData';

export default function Navbar() {
  const { currentTab, setCurrentTab, setCurrentWatchId } = useAnimeData();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    // Always show at the very top
    if (currentScrollY < 50) {
      setIsVisible(true);
    } else {
      // Hide if scrolling down more than 10px, show if scrolling up more than 10px
      if (currentScrollY > lastScrollY + 10) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY - 10) {
        setIsVisible(true);
      }
    }
    
    // Only update lastScrollY if we scrolled enough, to prevent micro-jitters
    if (Math.abs(currentScrollY - lastScrollY) > 10) {
      setLastScrollY(currentScrollY);
    }
  }, [lastScrollY]);

  useEffect(() => {
    let lastTick = 0;
    const throttledScroll = () => {
      const now = Date.now();
      if (now - lastTick < 50) return; // 20fps throttle for scroll direction is plenty
      lastTick = now;
      handleScroll();
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [handleScroll]);


  const handleTabClick = (tab) => {
    setCurrentTab(tab);
    setCurrentWatchId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className={`nav ${isVisible ? '' : 'is-hidden'}`} id="navbar">
      <div className="nav__inner">
        <a href="#" className="nav__brand" onClick={(e) => { e.preventDefault(); handleTabClick('home'); }}>
          <svg className="nav__logo" viewBox="0 0 30 30" fill="none">
            <path d="M15 3C12 8 9 12 9 16C9 19.3 11.7 22 15 22C18.3 22 21 19.3 21 16C21 12 18 8 15 3Z" fill="url(#logoGrad)" opacity="0.9"/>
            <path d="M15 7C13 10.5 11.5 13.5 11.5 16C11.5 18 13 19.5 15 19.5C17 19.5 18.5 18 18.5 16C18.5 13.5 17 10.5 15 7Z" fill="#fff" opacity="0.3"/>
            <polygon points="13.5,11 13.5,18 18.5,14.5" fill="#fff" opacity="0.8"/>
            <defs>
              <linearGradient id="logoGrad" x1="9" y1="3" x2="21" y2="22">
                <stop stopColor="#7c3aed"/>
                <stop offset="1" stopColor="#f59e0b"/>
              </linearGradient>
            </defs>
          </svg>
          <span className="nav__name">Ember</span>
        </a>
        <div className="nav__links" id="navCenter">
          {['home', 'browse', 'seasonal', 'library', 'stats'].map(tab => (
            <button 
              key={tab}
              className={`nav__link ${currentTab === tab ? 'is-active' : ''}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="nav__actions">
          <button 
            className={`nav__search-icon-btn ${currentTab === 'search' ? 'is-active' : ''}`} 
            onClick={() => handleTabClick('search')}
            aria-label="Search"
          >
            <svg className="nav__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
