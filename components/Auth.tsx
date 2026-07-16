import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, AppState, Alert, TextInput, TouchableOpacity, Text, Animated, Easing, KeyboardAvoidingView, Platform, Image, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFonts, DancingScript_700Bold } from '@expo-google-fonts/dancing-script';

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

  async function handleResendConfirm() {
    if (!username.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập Username của bạn vào ô trên để gửi lại email!');
      return;
    }
    setLoading(true);
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', username.trim().toLowerCase())
      .single();

    if (profileError || !profile) {
      Alert.alert('Lỗi', 'Không tìm thấy tài khoản (Username) này!');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: profile.email,
    });

    if (error) {
      Alert.alert('Lỗi gửi email', error.message);
    } else {
      Alert.alert('Thành công', 'Đã gửi lại link xác nhận. Vui lòng kiểm tra Hộp thư (kể cả mục Spam)!');
    }
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
        Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng kiểm tra và xác nhận (confirm) email của bạn nhé.');
      }
    }
    setLoading(false);
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
          <BlurView intensity={50} tint="dark" style={styles.glassCard}>
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
              
              <TouchableOpacity 
                style={styles.switchModeButton} 
                disabled={loading} 
                onPress={toggleMode}
              >
                <Text style={styles.switchModeText}>
                  {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
                </Text>
              </TouchableOpacity>

              {isLogin && (
                <TouchableOpacity 
                  style={{ alignItems: 'center', marginTop: 5 }} 
                  disabled={loading} 
                  onPress={handleResendConfirm}
                >
                  <Text style={[styles.switchModeText, { color: '#3399FF', fontSize: 14, textDecorationLine: 'none' }]}>
                    Chưa nhận được mail xác nhận? Nhấn để gửi lại
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          </BlurView>
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
});
