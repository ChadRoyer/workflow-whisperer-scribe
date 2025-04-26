
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface UserInfo {
  email: string;
  companyName: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signIn: (email: string, companyName: string) => Promise<void>;
  signOut: () => Promise<void>;
  userInfo: UserInfo | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log("AuthProvider initializing");
    
    // Check local storage for user info first
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsedInfo = JSON.parse(storedUserInfo);
        console.log("Found stored user info:", parsedInfo);
        setUserInfo(parsedInfo);
      } catch (error) {
        console.error("Error parsing stored user info:", error);
        localStorage.removeItem('userInfo');
      }
    }
    
    // Handle auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.email);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Got existing session:", currentSession?.user?.email);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, companyName: string) => {
    console.log("Storing user info:", email, companyName);
    
    // Store user info in local storage
    const userInfoData = { email, companyName };
    localStorage.setItem('userInfo', JSON.stringify(userInfoData));
    setUserInfo(userInfoData);
    
    try {
      // Try to retrieve existing user data from profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (existingProfile) {
        console.log("Found existing profile:", existingProfile);
      } else {
        console.log("No existing profile found, creating new one if possible");
        
        // Create a new profile if it doesn't exist
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            email: email,
            company_name: companyName,
            // Generate a random UUID for id as we don't have a real user id
            id: crypto.randomUUID()
          });
          
        if (insertError) {
          console.error("Error creating profile:", insertError);
          // Continue anyway - this is non-critical
        }
      }
      
      // If we have a session, store profile info
      if (session?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            email: email,
            company_name: companyName
          });
          
        if (profileError) {
          console.error("Error storing user profile:", profileError);
          // Continue anyway, non-critical
        } else {
          console.log("Successfully stored profile");
        }
      } else {
        console.log("No session available, skipping profile storage in database");
      }
      
      console.log("Sign-in process completed successfully");
    } catch (e) {
      console.error("Error during sign-in process:", e);
      // Don't throw an error, just log it
    }
  };

  const signOut = async () => {
    // Clear local storage
    localStorage.removeItem('userInfo');
    setUserInfo(null);
    
    // Also sign out from Supabase if we have a session
    if (session) {
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, signIn, signOut, userInfo }}>
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
