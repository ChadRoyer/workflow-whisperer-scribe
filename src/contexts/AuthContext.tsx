
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
        console.log("Auth state changed:", event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Got existing session:", session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, companyName: string) => {
    // Use default values if inputs are empty
    const userEmail = email.trim() || 'guest@workflowsleuth.com';
    const userCompany = companyName.trim() || 'Guest Company';
    
    console.log("Attempting to sign in with:", userEmail);
    
    try {
      // First attempt: Try with the provided email
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: 'workflowsleuth2025!'
      });
      
      if (!error && data.session) {
        console.log("Successfully signed in as:", userEmail);
        return; // Successfully signed in
      }
      
      console.log("Sign-in failed, attempting sign-up");
      
      // If sign-in failed, try to sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: userEmail,
        password: 'workflowsleuth2025!',
        options: {
          data: { company_name: userCompany }
        }
      });
      
      if (!signUpError && signUpData.session) {
        console.log("Successfully signed up and auto-signed in as:", userEmail);
        return; // Successfully signed up and auto-signed in
      }
      
      console.log("Sign-up failed or user already exists, trying final sign-in");
      
      // Try sign-in one more time (in case the user already exists)
      const { error: finalError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: 'workflowsleuth2025!'
      });
      
      if (!finalError) {
        console.log("Final sign-in attempt succeeded as:", userEmail);
        return;
      }
      
      // Last resort: Sign in as guest
      console.log("All attempts failed, using guest account");
      const { error: guestError } = await supabase.auth.signInWithPassword({
        email: 'guest@workflowsleuth.com',
        password: 'workflowsleuth2025!'
      });
      
      if (guestError) {
        console.error("Even guest login failed:", guestError);
        throw new Error("Authentication failed completely");
      }
      
    } catch (e) {
      console.error("Authentication error:", e);
      throw e;
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
