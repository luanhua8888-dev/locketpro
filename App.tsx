import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, LogBox } from 'react-native';
import { BlurView } from 'expo-blur';
import { Session } from '@supabase/supabase-js';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { supabase } from './lib/supabase';
import { DeviceEventEmitter } from 'react-native';
import Auth from './components/Auth';
import MainTabs from './navigation/MainTabs';
import Toast from 'react-native-toast-message';
import ShootingStars from './components/ShootingStars';
import { Image } from 'expo-image';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './utils/pushNotifications';
import ResetPassword from './components/ResetPassword';

type PasswordResetReason = 'recovery' | 'temporary';

const getTemporaryResetReason = (session: Session | null): PasswordResetReason | null =>
  session?.user?.app_metadata?.temporary_password_reset_required === true ? 'temporary' : null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Ẩn cảnh báo expo-av không cần thiết trong môi trường dev
LogBox.ignoreLogs(['[expo-av]', 'expo-notifications']);

const toastConfig = {
  success: (props: any) => (
    <View style={{ width: '85%', borderRadius: 30, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}>
      <BlurView intensity={90} tint="dark" style={{ paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(50, 50, 50, 0.4)' }}>
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>{props.text1}</Text>
      </BlurView>
    </View>
  ),
  error: (props: any) => (
    <View style={{ width: '85%', borderRadius: 30, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}>
      <BlurView intensity={90} tint="dark" style={{ paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 50, 50, 0.3)' }}>
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>{props.text1}</Text>
      </BlurView>
    </View>
  )
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [appBg, setAppBg] = useState<string | null>(null);
  const [passwordResetReason, setPasswordResetReason] = useState<PasswordResetReason | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setPasswordResetReason(getTemporaryResetReason(session));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordResetReason('recovery');
      } else {
        setPasswordResetReason(getTemporaryResetReason(session));
      }
      if (session?.user?.user_metadata?.app_background) {
        setAppBg(session.user.user_metadata.app_background);
      }
      if (session) {
        registerForPushNotificationsAsync().then(token => {
          if (token) {
            supabase.from('profiles').update({ expo_push_token: token }).eq('id', session.user.id).then();
          }
        });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.user_metadata?.app_background) {
        setAppBg(session.user.user_metadata.app_background);
      }
    });

    const bgSub = DeviceEventEmitter.addListener('updateAppBackground', (url) => {
      setAppBg(url);
    });

    // Bắt link redirect từ Google trả về (kể cả khi app bị mở lại thành instance mới)
    const handleDeepLink = async (event: { url: string }) => {
      if (!event.url) return;
      
      // Import động để tránh lỗi lúc load ban đầu
      const QueryParams = require('expo-auth-session/build/QueryParams');
      const { params, errorCode } = QueryParams.getQueryParams(event.url);

      if (errorCode) {
        console.error('Auth deep link error:', errorCode);
        return;
      }

      const isRecoveryLink = params?.type === 'recovery' || event.url.includes('reset-password');
      if (isRecoveryLink) {
        setPasswordResetReason('recovery');
      }
      
      if (params?.access_token && params?.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token
        });
        if (error) console.error('Could not restore recovery session:', error.message);
      } else if (params?.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) console.error('Could not exchange recovery code:', error.message);
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
      bgSub.remove();
    };
  }, []);

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: 'transparent',
    },
  };

  if (passwordResetReason) {
    return (
      <ResetPassword
        reason={passwordResetReason}
        onComplete={() => setPasswordResetReason(null)}
        onCancel={async () => {
          await supabase.auth.signOut();
          setPasswordResetReason(null);
        }}
      />
    );
  }

  if (!session) {
    return (
      <>
        <Auth />
        <ShootingStars />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#091B42' }}>
      {appBg && (
        <View style={StyleSheet.absoluteFill}>
          <Image source={{ uri: appBg }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
        </View>
      )}
      <NavigationContainer theme={navTheme}>
        <MainTabs session={session} />
      </NavigationContainer>
      <ShootingStars />
      <Toast config={toastConfig} />
    </View>
  );
}

// Quick import for expo-image since it wasn't at the top
import * as import_expo_image from 'expo-image';
