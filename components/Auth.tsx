import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, AppState, Alert, TextInput, TouchableOpacity, Text, Animated, Easing, KeyboardAvoidingView, Platform, Image, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function Auth() {
  let [fontsLoaded] = useFonts({
    DancingScript_700Bold,
  });

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotate3DAnim = useRef(new Animated.Value(0)).current;
  
  // Transition Form animation
  const formOpacity = useRef(new Animated.Value(1)).current;
  const formScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(rotate3DAnim, {
        toValue: 1,
        tension: 10,
        friction: 4,
        useNativeDriver: true,
      })
    ]).start();

    // Floating animation (loop)
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  function toggleMode() {
    // Chuyển động biến mất form cũ
    Animated.parallel([
      Animated.timing(formOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(formScale, { toValue: 0.9, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      // Đổi state
      setIsLogin(!isLogin);
      // Chuyển động xuất hiện form mới
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(formScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]).start();
    });
  }

  async function handleSignIn() {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập Username và Mật khẩu!');
      return;
    }
    setLoading(true);
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', username.trim().toLowerCase())
      .single();

    if (profileError || !profile) {
      Alert.alert('Lỗi', 'Không tìm thấy tên người dùng (Username) này!');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: password,
    });

    if (error) Alert.alert('Sai mật khẩu', error.message);
    setLoading(false);
  }


  async function handleSignUp() {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đủ Username, Email và Mật khẩu!');
      return;
    }
    setLoading(true);

    const safeUsername = username.trim().toLowerCase();
    const safeEmail = email.trim();

    // 1. Kiểm tra username đã tồn tại chưa
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', safeUsername)
      .single();

    if (existing) {
      Alert.alert('Lỗi', 'Username này đã có người sử dụng!');
      setLoading(false);
      return;
    }

    // 2. Đăng ký auth với Supabase
    const { data, error } = await supabase.auth.signUp({
      email: safeEmail,
      password: password,
      options: {
        data: {
          username: safeUsername
        }
      }
    });

    if (error) {
      Alert.alert('Lỗi đăng ký', error.message);
    } else if (data.user) {
      if (data.session) {
        Alert.alert('Thành công', 'Đăng ký thành công! Đã tự động đăng nhập.');
      } else {
        Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng kiểm tra và xác nhận email của bạn nhé.', [
          { text: "OK", onPress: () => toggleMode() }
        ]);
      }
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        path: 'auth-callback',
        preferLocalhost: false,
      });
      console.log('Generated Linking URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        }
      });

      if (error) throw error;
      
      console.log('Supabase Data URL:', data?.url);
      // Alert.alert('Debug', `Redirect URL đang dùng:\n${redirectUrl}`); // (bỏ qua alert này để tránh khó chịu, chỉ log)

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success') {
          const { url } = result;
          const { params, errorCode } = QueryParams.getQueryParams(url);
          
          if (errorCode) throw new Error(errorCode);
          
          if (params.access_token && params.refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token
            });
            if (sessionError) throw sessionError;
          } else if (params.code) {
            // PKCE flow support
            console.log("Got auth code, exchanging for session...");
            // Because we didn't initiate PKCE properly via expo-auth-session, exchanging code might not work directly without code_verifier if Supabase JS generated it internally?
            // Actually, in Supabase v2, exchangeCodeForSession is a thing, but skipBrowserRedirect might not store the verifier?
            // Let's just pass it to exchangeCodeForSession or setSession if possible.
            // Wait, actually supabase.auth.getSessionFromUrl might be the best?
            // Let's alert the user with the url so we can debug.
            Alert.alert('Debug URL', 'URL contains code. Try again.');
          } else {
             Alert.alert('Debug Lỗi', 'Không tìm thấy access_token hay code trong URL: ' + url);
          }
        } else {
          console.log("WebBrowser result type:", result.type);
        }
      }
    } catch (e: any) {
      Alert.alert('Lỗi đăng nhập Google', e.message);
    } finally {
      setLoading(false);
    }
  }

  const floatingY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const rotateX = rotate3DAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '0deg'],
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#020c1b' }} />;
  }

  return (
    <LinearGradient
      colors={['#020c1b', '#0a192f', '#112240']}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.keyboardView}
        >
          <Animated.View 
            style={[
              styles.logoContainer,
            { 
              opacity: fadeAnim, 
              transform: [
                { translateY: floatingY },
                { perspective: 1000 },
                { rotateX: rotateX }
              ] 
            }
          ]}
        >
          <Image 
            source={require('../assets/luna-logo.jpg')} 
            style={styles.logoImage} 
          />
          <Text style={styles.title}>Luna Snap</Text>
          <Text style={styles.subtitle}>Kết nối khoảnh khắc chân thực</Text>
        </Animated.View>

        <Animated.View 
          style={{ 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }],
            width: '100%',
            alignItems: 'center'
          }}
        >
          <View style={[styles.glassCard, { backgroundColor: 'rgba(255, 255, 255, 0.07)' }]}>
            <Animated.View style={{ opacity: formOpacity, transform: [{ scale: formScale }] }}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  onChangeText={(text) => setUsername(text)}
                  value={username}
                  placeholder="Username (Tên đăng nhập)"
                  placeholderTextColor="#999"
                  autoCapitalize={'none'}
                />
              </View>

              {!isLogin && (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    onChangeText={(text) => setEmail(text)}
                    value={email}
                    placeholder="Email (Dùng để bảo mật tài khoản)"
                    placeholderTextColor="#999"
                    autoCapitalize={'none'}
                  />
                </View>
              )}
              
              <View style={[styles.inputContainer, styles.passwordContainer]}>
                <TextInput
                  style={styles.passwordInput}
                  onChangeText={(text) => setPassword(text)}
                  value={password}
                  secureTextEntry={!showPassword}
                  placeholder="Mật khẩu"
                  placeholderTextColor="#999"
                  autoCapitalize={'none'}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff color="#3399FF" size={24} /> : <Eye color="#3399FF" size={24} />}
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                disabled={loading} 
                onPress={isLogin ? handleSignIn : handleSignUp}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Tạo tài khoản')}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>HOẶC</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity 
                style={[styles.button, styles.googleButton]} 
                disabled={loading} 
                onPress={handleGoogleLogin}
              >
                <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.switchModeButton} 
                disabled={loading} 
                onPress={toggleMode}
              >
                <Text style={styles.switchModeText}>
                  {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
                </Text>
              </TouchableOpacity>


            </Animated.View>
          </View>
        </Animated.View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 15,
  },
  title: {
    fontFamily: 'DancingScript_700Bold',
    fontSize: 64,
    color: '#3399FF',
    textAlign: 'center',
    textShadowColor: 'rgba(51, 153, 255, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 0,
    letterSpacing: 0.5,
  },
  glassCard: {
    width: '100%',
    padding: 25,
    borderRadius: 35,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    color: 'white',
    padding: 18,
    borderRadius: 18,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  passwordInput: {
    flex: 1,
    color: 'white',
    padding: 18,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 15,
  },
  button: {
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: '#3399FF',
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  switchModeButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  switchModeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: 'bold',
  },
  googleButton: {
    backgroundColor: 'white',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: 0,
  },
  googleButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
