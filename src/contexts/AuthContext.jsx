import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { clear as clearDataListeners } from '../services/dataEvents';

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

  // Validate and refresh session proactively
  const validateSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        return false;
      }

      // Always try to refresh the token to extend the refresh token lifetime
      // This keeps the session alive as long as the user is using the app
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expiresIn = expiresAt * 1000 - Date.now();
        // Refresh if token expires within 30 minutes (more aggressive refresh)
        if (expiresIn < 30 * 60 * 1000) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('Failed to refresh session:', refreshError);
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

  // Handle visibility change (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user) {
        await validateSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, validateSession]);

  // Periodically refresh session to keep it alive (every 30 minutes)
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn('Periodic session refresh failed:', error.message);
        }
      } catch (err) {
        console.warn('Error in periodic session refresh:', err);
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

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
  }, []);

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
      // Clear local state
      setUser(null);
      setProfile(null);

      // Clear all data event listeners
      clearDataListeners();

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
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
