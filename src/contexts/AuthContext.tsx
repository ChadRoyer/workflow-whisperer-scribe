
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signIn: (email: string, companyName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, companyName: string) => {
    try {
      // First try to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: 'workflowsleuth2025!'
      });
      
      // If sign-in fails, try to sign up
      if (signInError) {
        // Create new user
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: 'workflowsleuth2025!',
          options: {
            data: { company_name: companyName }
          }
        });
        
        if (signUpError) {
          // If both sign-in and sign-up fail, try sign-in one more time
          // This can happen if the user exists but password changed
          const { error: finalError } = await supabase.auth.signInWithPassword({
            email: email,
            password: 'workflowsleuth2025!'
          });
          
          if (finalError) throw finalError;
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
