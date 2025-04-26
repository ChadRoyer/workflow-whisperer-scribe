
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
    // Always sign in, ignore errors as the account might not exist yet
    await supabase.auth.signInWithPassword({
      email: email,
      password: 'workflowsleuth2025!'
    }).catch(() => {
      // Silently fail - we'll try to sign up next
    });
    
    // Try to sign up - this might fail if the user already exists, which is fine
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: 'workflowsleuth2025!',
      options: {
        data: { company_name: companyName }
      }
    }).catch(() => {
      // Silently fail and continue
      return { error: null };
    });
    
    // Final attempt to sign in (this should work in all cases, either the account 
    // existed before or was just created)
    const { error: finalSignInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'workflowsleuth2025!'
    });
    
    if (finalSignInError) {
      console.error('Final sign-in error:', finalSignInError);
      throw new Error('Unable to sign in. Please try again later.');
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
