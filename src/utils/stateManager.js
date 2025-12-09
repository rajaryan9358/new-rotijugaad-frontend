const STORAGE_KEYS = {
  EXPANDED_MENU: 'app_expanded_menu',
  SCROLL_POSITION: 'app_scroll_position',
  SIDEBAR_OPEN: 'app_sidebar_open',
  ACTIVE_PAGE: 'app_active_page',
};

export const saveMenuState = (menuId) => {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPANDED_MENU, menuId);
  } catch (e) {
    console.error('Failed to save menu state:', e);
  }
};

export const getMenuState = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.EXPANDED_MENU);
  } catch (e) {
    console.error('Failed to get menu state:', e);
    return null;
  }
};

export const saveSidebarState = (isOpen) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, JSON.stringify(isOpen));
  } catch (e) {
    console.error('Failed to save sidebar state:', e);
  }
};

export const getSidebarState = () => {
  try {
    const state = localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN);
    return state !== null ? JSON.parse(state) : true;
  } catch (e) {
    console.error('Failed to get sidebar state:', e);
    return true;
  }
};

export const saveScrollPosition = (elementId, position) => {
  try {
    const scrollData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCROLL_POSITION) || '{}');
    scrollData[elementId] = position;
    localStorage.setItem(STORAGE_KEYS.SCROLL_POSITION, JSON.stringify(scrollData));
  } catch (e) {
    console.error('Failed to save scroll position:', e);
  }
};

export const getScrollPosition = (elementId) => {
  try {
    const scrollData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCROLL_POSITION) || '{}');
    return scrollData[elementId] || 0;
  } catch (e) {
    console.error('Failed to get scroll position:', e);
    return 0;
  }
};

export const saveActivePage = (pageName) => {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PAGE, pageName);
  } catch (e) {
    console.error('Failed to save active page:', e);
  }
};

export const getActivePage = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_PAGE);
  } catch (e) {
    console.error('Failed to get active page:', e);
    return null;
  }
};

export const clearAllState = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.error('Failed to clear state:', e);
  }
};

export const saveSidebarScrollPosition = (position) => {
  localStorage.setItem('app_sidebar_scroll', position.toString());
};

export const getSidebarScrollPosition = () => {
  const position = localStorage.getItem('app_sidebar_scroll');
  return position ? parseInt(position, 10) : 0;
};
