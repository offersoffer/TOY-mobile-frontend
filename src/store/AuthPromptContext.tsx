import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

/**
 * Guest-to-customer conversion on mobile (Guest Browsing §7, §21, §28, §29).
 *
 * A guest browses the whole app. The moment they reach for something that
 * belongs to an account - saving, following, claiming, booking - this raises a
 * bottom sheet over the screen they are on rather than throwing them into a
 * login stack. Dismissing it returns them to exactly what they were doing.
 *
 * `resume` is the §7 requirement that is easy to miss: after signing in, the
 * action the guest started must complete on its own.
 *
 *   Guest taps Save -> sheet -> login -> offer saved, no second tap
 *
 * The closure is held in a ref rather than in state so that replaying it does
 * not depend on a render happening first, and so a stale intent cannot survive
 * into the next session.
 */

export type AuthIntentKind =
  | 'save-offer'
  | 'save-service'
  | 'follow-shop'
  | 'claim-offer'
  | 'book-service'
  | 'enquire-service'
  | 'notifications'
  | 'saved-tab'
  | 'profile-tab'
  | 'generic';

export interface AuthPromptCopy {
  icon: string;
  title: string;
  message: string;
}

/** §28: say what login buys *for this action*, not "you must log in". */
const COPY: Record<AuthIntentKind, AuthPromptCopy> = {
  'save-offer': {
    icon: 'heart-outline',
    title: 'Save this offer',
    message: 'Log in or create a free account to save offers and get expiry reminders.',
  },
  'save-service': {
    icon: 'bookmark-outline',
    title: 'Save this service',
    message: 'Log in or create a free account to save services and hear when they go on offer.',
  },
  'follow-shop': {
    icon: 'storefront-outline',
    title: 'Follow this shop',
    message: 'Log in to follow shops and be first to see their new offers.',
  },
  'claim-offer': {
    icon: 'ticket-outline',
    title: 'Claim this deal',
    message: 'Log in to claim the offer and track your redemptions.',
  },
  'book-service': {
    icon: 'calendar-outline',
    title: 'Book this service',
    message: 'Log in to book, then manage your bookings from your profile.',
  },
  'enquire-service': {
    icon: 'chatbubble-ellipses-outline',
    title: 'Send an enquiry',
    message: 'Log in so the shop can reply to you and you can track your enquiry.',
  },
  notifications: {
    icon: 'notifications-outline',
    title: 'Turn on notifications',
    message: 'Log in to get expiry reminders for the offers you save.',
  },
  'saved-tab': {
    icon: 'heart-outline',
    title: 'Save your favorite offers',
    message: 'Log in or sign up to save offers, services and receive expiry reminders.',
  },
  'profile-tab': {
    icon: 'person-outline',
    title: 'Welcome to OffersOffer',
    message: 'Discover offers and services near you. Log in to make it personal.',
  },
  generic: {
    icon: 'sparkles-outline',
    title: 'Make OffersOffer personal',
    message: 'Get recommendations based on what you like, and save offers before they expire.',
  },
};

interface AuthPromptValue {
  /** The intent being prompted for, or null when the sheet is closed. */
  intent: AuthIntentKind | null;
  copy: AuthPromptCopy | null;
  /**
   * Gate for every account-required action (§21).
   *
   * Returns true when the caller may proceed. Returns false after raising the
   * sheet, in which case `resume` is what eventually runs.
   */
  require: (kind: AuthIntentKind, resume?: () => void) => boolean;
  /** Raises the sheet unconditionally, e.g. from a "Log In" button. */
  open: (kind?: AuthIntentKind) => void;
  dismiss: () => void;
  /** Replays the held action. Called once a session exists. */
  resumePending: () => void;
  clearPending: () => void;
  hasPending: boolean;
  pendingCopy: AuthPromptCopy | null;
}

const AuthPromptContext = createContext<AuthPromptValue | undefined>(undefined);

export function AuthPromptProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [intent, setIntent] = useState<AuthIntentKind | null>(null);
  const [pendingKind, setPendingKind] = useState<AuthIntentKind | null>(null);
  const pendingResume = useRef<(() => void) | null>(null);

  /**
   * Live view of the session for `require`.
   *
   * A resume closure is captured while the visitor is still a guest, and it
   * calls `require` again when it replays - that is what makes a handler like
   * `() => onToggleSave(offer)` reusable as both the first attempt and the
   * replay. If `require` closed over `isAuthenticated`, the replay would run
   * against the value captured at guest time, decide nobody is signed in, and
   * re-arm the prompt instead of performing the action.
   *
   * Assigned during render rather than in an effect so it is already correct
   * before any effect - including the resume effect below - can observe it.
   */
  const isAuthedRef = useRef(isAuthenticated);
  isAuthedRef.current = isAuthenticated;

  const require = useCallback((kind: AuthIntentKind, resume?: () => void) => {
    if (isAuthedRef.current) return true;
    pendingResume.current = resume ?? null;
    setPendingKind(kind);
    setIntent(kind);
    return false;
  }, []);

  const open = useCallback((kind: AuthIntentKind = 'generic') => {
    pendingResume.current = null;
    setPendingKind(kind);
    setIntent(kind);
  }, []);

  /** Closes the sheet but keeps the intent: the login screen still shows it. */
  const dismiss = useCallback(() => setIntent(null), []);

  const clearPending = useCallback(() => {
    pendingResume.current = null;
    setPendingKind(null);
  }, []);

  const resumePending = useCallback(() => {
    const resume = pendingResume.current;
    pendingResume.current = null;
    setPendingKind(null);
    setIntent(null);
    resume?.();
  }, []);

  /**
   * §7/§29 fallback: "After successful authentication, return the user to the
   * original action."
   *
   * The auth screens replay explicitly, because they also have to pop
   * themselves first and the two have to happen in that order. This effect
   * covers every other route to a session - a token restored on launch, or a
   * sign-in from somewhere that is not one of those screens. `resumePending`
   * nulls the intent, so whichever fires first wins and the other is a no-op.
   */
  useEffect(() => {
    if (isAuthenticated && pendingResume.current) resumePending();
  }, [isAuthenticated, resumePending]);

  const value = useMemo<AuthPromptValue>(
    () => ({
      intent,
      copy: intent ? COPY[intent] : null,
      require,
      open,
      dismiss,
      resumePending,
      clearPending,
      hasPending: pendingKind !== null,
      pendingCopy: pendingKind ? COPY[pendingKind] : null,
    }),
    [intent, pendingKind, require, open, dismiss, resumePending, clearPending],
  );

  return <AuthPromptContext.Provider value={value}>{children}</AuthPromptContext.Provider>;
}

export function useAuthPrompt(): AuthPromptValue {
  const ctx = useContext(AuthPromptContext);
  if (!ctx) throw new Error('useAuthPrompt must be used within AuthPromptProvider');
  return ctx;
}
