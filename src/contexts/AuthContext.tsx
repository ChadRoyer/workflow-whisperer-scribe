
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
    // Use default values if inputs are empty
    const userEmail = email.trim() || 'guest@workflowsleuth.com';
    const userCompany = companyName.trim() || 'Guest Company';
    
    let signInSuccess = false;
    
    // First attempt: Try to sign in directly
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: 'workflowsleuth2025!'
      });
      
      if (!error && data.session) {
        signInSuccess = true;
        return; // Successfully signed in
      }
    } catch (e) {
      console.log("First sign-in attempt failed, continuing to sign-up");
    }
    
    // If we're here, sign-in failed, try to sign up
    if (!signInSuccess) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: userEmail,
          password: 'workflowsleuth2025!',
          options: {
            data: { company_name: userCompany }
          }
        });
        
        if (!error && data.session) {
          signInSuccess = true;
          return; // Successfully signed up and auto-signed in
        }
      } catch (e) {
        console.log("Sign-up attempt failed, continuing to final sign-in");
      }
    }
    
    // Final fallback: Force sign-in again
    if (!signInSuccess) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: 'workflowsleuth2025!'
        });
        
        if (error) {
          console.error("All authentication attempts failed");
          // Instead of throwing error, we'll create an anonymous session
          const { error: anonError } = await supabase.auth.signInWithPassword({
            email: 'guest@workflowsleuth.com',
            password: 'workflowsleuth2025!'
          });
          
          if (anonError) {
            console.error("Even anonymous auth failed:", anonError);
          }
        }
      } catch (e) {
        console.error("Fatal authentication error:", e);
      }
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
