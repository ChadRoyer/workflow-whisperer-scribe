
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
    
    console.log("Attempting simplified sign-in with:", userEmail);
    
    try {
      // Simple sign in - always use guest account
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'guest@workflowsleuth.com',
        password: 'workflowsleuth2025!'
      });
      
      if (error) {
        console.error("Guest login failed:", error);
        throw new Error("Unable to access the system");
      }
      
      // User is now logged in as guest, but we store their provided info
      if (data.session && userEmail !== 'guest@workflowsleuth.com') {
        // Store the user's actual email and company name in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: userEmail,
            company_name: userCompany
          });
          
        if (profileError) {
          console.error("Error storing user profile:", profileError);
          // Continue anyway, this is non-critical
        }
      }
      
      console.log("Successfully signed in");
      
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
