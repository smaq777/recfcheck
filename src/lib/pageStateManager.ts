/**
 * Page State Manager
 * Handles saving and restoring page state across browser refreshes
 */

const STATE_KEY = 'refcheck_page_state';
const STATE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export interface PageState {
    route: string;
    jobId?: string;
    fileName?: string;
    timestamp: number;
    scrollPosition?: number;
    activeFilter?: 'all' | 'verified' | 'issue' | 'warning';
    selectedRefId?: string;
}

/**
 * Save current page state to sessionStorage
 */
export function savePageState(state: Partial<PageState>): void {
    try {
        const currentState: PageState = {
            route: window.location.pathname,
            timestamp: Date.now(),
            ...state
        };

        sessionStorage.setItem(STATE_KEY, JSON.stringify(currentState));
        console.log('[PageState] Saved:', currentState);
    } catch (error) {
        console.error('[PageState] Failed to save:', error);
    }
}

/**
 * Load page state from sessionStorage
 */
export function loadPageState(): PageState | null {
    try {
        const stored = sessionStorage.getItem(STATE_KEY);
        if (!stored) return null;

        const state: PageState = JSON.parse(stored);

        // Check if state is expired
        const age = Date.now() - state.timestamp;
        if (age > STATE_EXPIRY) {
            console.log('[PageState] State expired, clearing');
            clearPageState();
            return null;
        }

        console.log('[PageState] Loaded:', state);
        return state;
    } catch (error) {
        console.error('[PageState] Failed to load:', error);
        return null;
    }
}

/**
 * Clear saved page state
 */
export function clearPageState(): void {
    try {
        sessionStorage.removeItem(STATE_KEY);
        console.log('[PageState] Cleared');
    } catch (error) {
        console.error('[PageState] Failed to clear:', error);
    }
}

/**
 * Update specific fields in the current state
 */
export function updatePageState(updates: Partial<PageState>): void {
    const current = loadPageState();
    if (current) {
        savePageState({ ...current, ...updates });
    } else {
        savePageState(updates);
    }
}

/**
 * Save scroll position
 */
export function saveScrollPosition(): void {
    const scrollY = window.scrollY;
    updatePageState({ scrollPosition: scrollY });
}

/**
 * Restore scroll position
 */
export function restoreScrollPosition(): void {
    const state = loadPageState();
    if (state?.scrollPosition !== undefined) {
        window.scrollTo(0, state.scrollPosition);
    }
}

/**
 * Auto-save state before page unload
 */
export function setupAutoSave(): void {
    // Save state before page unload
    window.addEventListener('beforeunload', () => {
        saveScrollPosition();
    });

    // Save scroll position periodically
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            saveScrollPosition();
        }, 200);
    });
}
