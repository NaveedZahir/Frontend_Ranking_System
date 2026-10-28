
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const fetchProfile = async (authUser) => {
  if (!authUser) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      'Your account has no profile. Ask an administrator to check your account.'
    );
  }

  const validRoles = ['admin', 'manager_teacher', 'student_employee'];

  if (!validRoles.includes(data.role)) {
    throw new Error('Your account has an invalid role.');
  }

  return {
    id: data.id,
    email: authUser.email ?? '',
    name: data.full_name ?? '',
    full_name: data.full_name ?? '',
    role: data.role,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null);
      return null;
    }

    const profile = await fetchProfile(authUser);
    setUser(profile);
    return profile;
  }, []);

  useEffect(() => {
    let active = true;

    const initialise = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (active) {
          await refreshProfile(data.session?.user ?? null);
        }
      } catch (error) {
        console.error('Unable to load account:', error.message);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void initialise();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(async () => {
        if (!active) return;

        try {
          await refreshProfile(session?.user ?? null);
        } catch (error) {
          console.error('Unable to load profile:', error.message);
          if (active) setUser(null);
        } finally {
          if (active) setLoading(false);
        }
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    try {
      return await refreshProfile(data.user);
    } catch (profileError) {
      await supabase.auth.signOut();
      throw profileError;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};
