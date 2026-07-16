import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { NavigationContainer } from '@react-navigation/native';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import MainTabs from './navigation/MainTabs';
import Toast from 'react-native-toast-message';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Bắt link redirect từ Google trả về (kể cả khi app bị mở lại thành instance mới)
    const handleDeepLink = async (event: { url: string }) => {
      if (!event.url) return;
      
      // Import động để tránh lỗi lúc load ban đầu
      const QueryParams = require('expo-auth-session/build/QueryParams');
      const { params } = QueryParams.getQueryParams(event.url);
      
      if (params?.access_token && params?.refresh_token) {
        await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token
        });
      }
    };

    const Linking = require('expo-linking');
    Linking.getInitialURL().then((url: string | null) => { 
      if (url) handleDeepLink({ url }); 
    });
    const linkSub = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  if (!session) {
    return <Auth />;
  }

  return (
    <>
      <NavigationContainer>
        <MainTabs session={session} />
      </NavigationContainer>
      <Toast />
    </>
  );
}
