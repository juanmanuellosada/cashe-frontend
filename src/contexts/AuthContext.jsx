import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, SESSION_CONFIG } from '../config/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiring, setSessionExpiring] = useState(false);

  // Refs for tracking activity
  const lastActivityRef = useRef(Date.now());
  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const sessionCheckIntervalRef = useRef(null);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSessionExpiring(false);
  }, []);

  // Check if session is still valid
  const validateSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        // Session invalid, sign out
        console.log('Session invalid or expired');
        await signOutInternal();
        return false;
      }

      // Check if token is about to expire (within 5 minutes)
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expiresIn = expiresAt * 1000 - Date.now();
        if (expiresIn < 5 * 60 * 1000) {
          // Try to refresh the token
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('Failed to refresh session:', refreshError);
            await signOutInternal();
            return false;
          }
        }
      }

      return true;
    } catch (err) {
      console.error('Error validating session:', err);
      return false;
    }
  }, []);

  // Internal sign out (without external calls)
  const signOutInternal = async () => {
    setUser(null);
    setProfile(null);
    setSessionExpiring(false);
    clearTimers();

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error in signOutInternal:', err);
    }
  };

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = null;
    }
  }, []);

  // Setup inactivity tracking
  const setupInactivityTracking = useCallback(() => {
    clearTimers();

    // Warning timer (shows warning before logout)
    const warningTime = SESSION_CONFIG.INACTIVITY_TIMEOUT - SESSION_CONFIG.WARNING_BEFORE_LOGOUT;
    warningTimerRef.current = setTimeout(() => {
      setSessionExpiring(true);
    }, warningTime);

    // Logout timer
    inactivityTimerRef.current = setTimeout(async () => {
      console.log('Session expired due to inactivity');
      await signOutInternal();
    }, SESSION_CONFIG.INACTIVITY_TIMEOUT);

    // Periodic session validation
    sessionCheckIntervalRef.current = setInterval(async () => {
      if (user) {
        await validateSession();
      }
    }, SESSION_CONFIG.SESSION_CHECK_INTERVAL);
  }, [user, validateSession, clearTimers]);

  // Reset inactivity timer on user activity
  const resetInactivityTimer = useCallback(() => {
    if (user) {
      updateActivity();
      setupInactivityTracking();
    }
  }, [user, updateActivity, setupInactivityTracking]);

  // Setup activity listeners
  useEffect(() => {
    if (!user) {
      clearTimers();
      return;
    }

    // Events that indicate user activity
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Handle visibility change (user returns to tab)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user) {
        // Validate session when user returns to tab
        const isValid = await validateSession();
        if (isValid) {
          resetInactivityTimer();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle window focus
    const handleFocus = async () => {
      if (user) {
        const isValid = await validateSession();
        if (isValid) {
          resetInactivityTimer();
        }
      }
    };
    window.addEventListener('focus', handleFocus);

    // Initial setup
    setupInactivityTracking();

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearTimers();
    };
  }, [user, resetInactivityTimer, validateSession, setupInactivityTracking, clearTimers]);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          setProfile(null);
        } else {
          setUser(session?.user ?? null);
          if (session?.user) {
            // Fetch profile in background, don't block
            fetchProfile(session.user.id);
          }
        }
      } catch (err) {
        console.error('Error in getSession:', err);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Handle specific auth events
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        } else if (event === 'SIGNED_OUT') {
          clearTimers();
        }

        setUser(session?.user ?? null);
        if (session?.user) {
          // Fetch profile in background, don't block
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        // Only set loading false if it was a sign in/out event
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clearTimers]);

  const fetchProfile = async (userId) => {
    try {
      // Get user metadata for avatar
      const { data: userData } = await supabase.auth.getUser();
      const avatarUrl = userData?.user?.user_metadata?.avatar_url || userData?.user?.user_metadata?.picture;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist yet, create it
        const newProfile = {
          id: userId,
          full_name: userData?.user?.user_metadata?.full_name || userData?.user?.email?.split('@')[0] || 'Usuario',
          email: userData?.user?.email,
          avatar_url: avatarUrl
        };
        
        const { data: createdProfile } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        
        // Add avatar from user metadata if not in profile
        setProfile({ ...createdProfile, avatar_url: avatarUrl });
      } else if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        // Add avatar from user metadata if not in profile
        setProfile({ ...data, avatar_url: data.avatar_url || avatarUrl });
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      setProfile(null);
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, fullName) => {
    const redirectUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: redirectUrl,
      },
    });
    return { data, error };
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    return { data, error };
  };

  // Sign out
  const signOut = async () => {
    try {
      // Clear timers first
      clearTimers();

      // Clear local state
      setUser(null);
      setProfile(null);
      setSessionExpiring(false);

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      return { error };
    } catch (err) {
      console.error('Error in signOut:', err);
      return { error: err };
    }
  };

  // Extend session (when user clicks "stay logged in")
  const extendSession = useCallback(() => {
    updateActivity();
    setupInactivityTracking();
    setSessionExpiring(false);
  }, [updateActivity, setupInactivityTracking]);

  // Reset password
  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  };

  const value = {
    user,
    profile,
    loading,
    sessionExpiring,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    extendSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
