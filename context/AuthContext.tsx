import { Session } from '@supabase/supabase-js';
import React, { createContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/database.types';

const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isLoggedIn: boolean;
  sendOTP: (phone: string) => Promise<boolean>;
  login: (phone: string, otp: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isLoggedIn: false,
  sendOTP: async () => false,
  login: async () => false,
  logout: async () => {},
  updateUser: async () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUser(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUser(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async (phone: string): Promise<boolean> => {
    try {
      // Development mode bypass
      if (DEV_MODE) {
        console.log('🚀 DEV MODE: Bypassing OTP send for phone:', phone);
        return true;
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
      });

      if (error) {
        console.error('OTP Error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Send OTP Error:', error);
      return false;
    }
  };
  const environment = process.env.EXPO_PUBLIC_ENVIRONMENT;
  const login = async (phone: string, otp: string): Promise<boolean> => {
    try {
      // Development mode bypass
      if (DEV_MODE) {
        console.log('🚀 DEV MODE: Bypassing OTP verification for phone:', phone, 'OTP:', otp);
        
        // Create a mock user for development
        const mockUser = {
          id: `dev_user_${phone}`,
          name: 'Dev User',
          phone: phone,
          email: '',
          language: 'english' as const,
          delivery_preference: 'ring_doorbell' as const,
          created_at: new Date().toISOString(),
        };
        
        setUser(mockUser);
        setSession({ user: { id: mockUser.id } } as any);
        return true;
      }

      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: otp,
        type: 'sms',
      });

      if (error) {
        console.error('Login Error:', error);
        return false;
      }

      if (data.user) {
        // Check if user exists in users table
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        // If user doesn't exist, create them
        if (!existingUser) {
          const newUser = {
            id: data.user.id,
            name: 'User',
            phone: phone,
            email: data.user.email || '',
            language: 'english',
            delivery_preference: 'ring_doorbell',
          };

          await supabase.from('users').insert([newUser]);

          // Create wallet for new user
          await supabase.from('wallets').insert([
            {
              user_id: data.user.id,
              balance: 0,
              auto_pay_enabled: true,
              auto_pay_threshold: 200,
              low_balance_alert: 300,
            },
          ]);
        }

        await fetchUser(data.user.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login Error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  const updateUser = async (updates: Partial<User>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, ...updates });
      return true;
    } catch (error) {
      console.error('Update User Error:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isLoggedIn: !!session && !!user,
        sendOTP,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
