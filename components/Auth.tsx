import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, AppState, Alert, TextInput, TouchableOpacity, Text, Animated, Easing, KeyboardAvoidingView, Platform, Image, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Eye, EyeOff, Star } from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
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
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  
  const logoWanderX = useRef(new Animated.Value(0)).current;
  const logoWanderY = useRef(new Animated.Value(0)).current;
  const logoWanderRotate = useRef(new Animated.Value(0)).current;
  
  // Clones
  const clonesCount = 6;
  const cloneAnims = useRef(
    Array.from({ length: clonesCount }).map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rot: new Animated.Value(0),
      op: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  // Transition Form animation
  const formOpacity = useRef(new Animated.Value(1)).current;
  const formScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      })
    ]).start();

    // Logo wandering idle animation
    const logoWanderAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(5000), // wait 5 seconds before starting to wander
        Animated.parallel([
          Animated.timing(logoWanderX, { toValue: 80, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoWanderY, { toValue: -60, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoWanderRotate, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(logoWanderX, { toValue: -80, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoWanderY, { toValue: 60, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoWanderRotate, { toValue: -1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(logoWanderX, { toValue: -40, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoWanderY, { toValue: -40, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoWanderRotate, { toValue: 0.5, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(logoWanderX, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoWanderY, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoWanderRotate, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    );
    logoWanderAnimation.start();

    // Clones crazy animation
    const cloneAnimations = cloneAnims.map((clone, i) => {
      const angle = (i * (360 / clonesCount)) * (Math.PI / 180);
      const radius = 120;
      
      const explode = Animated.parallel([
        Animated.timing(clone.op, { toValue: 0.6, duration: 500, useNativeDriver: true }),
        Animated.spring(clone.scale, { toValue: 0.6, friction: 4, useNativeDriver: true }),
        Animated.spring(clone.x, { toValue: Math.cos(angle) * radius, friction: 4, useNativeDriver: true }),
        Animated.spring(clone.y, { toValue: Math.sin(angle) * radius, friction: 4, useNativeDriver: true }),
      ]);
      
      const pt1x = (Math.random() - 0.5) * 400;
      const pt1y = (Math.random() - 0.5) * 800;
      const pt2x = (Math.random() - 0.5) * 400;
      const pt2y = (Math.random() - 0.5) * 800;
      const rot1 = Math.random() * 4 - 2;
      const rot2 = Math.random() * 4 - 2;

      const crazyWander = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(clone.x, { toValue: pt1x, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(clone.y, { toValue: pt1y, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(clone.rot, { toValue: rot1, duration: 2000, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(clone.x, { toValue: pt2x, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(clone.y, { toValue: pt2y, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(clone.rot, { toValue: rot2, duration: 2000, useNativeDriver: true }),
          ])
        ])
      );

      return Animated.sequence([Animated.delay(5000), explode, crazyWander]);
    });

    Animated.parallel(cloneAnimations).start();

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

    if (password.trim().toUpperCase().startsWith('TMP-')) {
      const { data: temporaryData, error: temporaryError } = await supabase.functions.invoke<{ tokenHash: string }>(
        'redeem-admin-login-code',
        { body: { username: username.trim(), code: password.trim() } }
      );

      if (temporaryError || !temporaryData?.tokenHash) {
        Alert.alert('Không thể đăng nhập', 'Password tạm không đúng, đã dùng hoặc đã hết hạn.');
        setLoading(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: temporaryData.tokenHash,
        type: 'magiclink',
      });
      if (verifyError) {
        Alert.alert('Không thể đăng nhập', verifyError.message);
      }
      setLoading(false);
      return;
    }
    
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

  async function handleResetPassword() {
    const safeEmail = resetEmail.trim().toLowerCase();
    if (!safeEmail) {
      Alert.alert('Lỗi', 'Vui lòng nhập email của tài khoản.');
      return;
    }

    setLoading(true);
    const redirectTo = Linking.createURL('reset-password', { scheme: 'locketclone' });
    const { error } = await supabase.auth.resetPasswordForEmail(safeEmail, { redirectTo });
    setLoading(false);

    if (error) {
      Alert.alert('Không thể gửi email', error.message);
      return;
    }

    Alert.alert(
      'Kiểm tra email',
      'Nếu email thuộc một tài khoản, bạn sẽ nhận được liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư rác.'
    );
    setIsForgotPassword(false);
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
    outputRange: [0, -15],
  });

  const logoSpin = logoWanderRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-30deg', '0deg', '30deg']
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#020c1b' }} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: '#091B42' }]}>
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
                { scale: scaleAnim },
                { translateY: floatingY }
              ] 
            }
          ]}
        >
          {/* Shadow Clones */}
          {cloneAnims.map((clone, i) => {
            const cloneSpin = clone.rot.interpolate({
              inputRange: [-2, 0, 2],
              outputRange: ['-360deg', '0deg', '360deg']
            });
            return (
              <Animated.Image 
                key={i}
                source={require('../assets/logo1_nobg.png')} 
                style={[
                  styles.logoImage, 
                  { 
                    position: 'absolute',
                    opacity: clone.op,
                    transform: [
                      { translateX: clone.x }, 
                      { translateY: clone.y }, 
                      { scale: clone.scale },
                      { rotate: cloneSpin }
                    ] 
                  }
                ]} 
                resizeMode="contain"
              />
            );
          })}

          <Animated.Image 
            source={require('../assets/logo1_nobg.png')} 
            style={[
              styles.logoImage, 
              { transform: [{ translateX: logoWanderX }, { translateY: logoWanderY }, { rotate: logoSpin }] }
            ]} 
            resizeMode="contain"
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
          <View style={[styles.glassCard, { backgroundColor: 'transparent' }]}>
            <Animated.View style={{ opacity: formOpacity, transform: [{ scale: formScale }] }}>
              {!isForgotPassword && <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  onChangeText={(text) => setUsername(text)}
                  value={username}
                  placeholder="Username (Tên đăng nhập)"
                  placeholderTextColor="#A0A0A0"
                  autoCapitalize={'none'}
                />
              </View>}

              {(!isLogin || isForgotPassword) && (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    onChangeText={isForgotPassword ? setResetEmail : setEmail}
                    value={isForgotPassword ? resetEmail : email}
                    placeholder={isForgotPassword ? 'Email khôi phục tài khoản' : 'Email (Dùng để bảo mật tài khoản)'}
                    placeholderTextColor="#A0A0A0"
                    keyboardType="email-address"
                    autoCapitalize={'none'}
                    autoCorrect={false}
                  />
                </View>
              )}
              
              {!isForgotPassword && <View style={[styles.inputContainer, styles.passwordContainer]}>
                <TextInput
                  style={styles.passwordInput}
                  onChangeText={(text) => setPassword(text)}
                  value={password}
                  secureTextEntry={!showPassword}
                  placeholder="Mật khẩu"
                  placeholderTextColor="#A0A0A0"
                  autoCapitalize={'none'}
                />
                {password.length > 0 && (
                  <TouchableOpacity 
                    style={styles.eyeIcon} 
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff color="#EFE8DD" size={24} /> : <Eye color="#999" size={24} />}
                  </TouchableOpacity>
                )}
              </View>}

              {isLogin && !isForgotPassword && (
                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  disabled={loading}
                  onPress={() => setIsForgotPassword(true)}
                >
                  <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                disabled={loading} 
                onPress={isForgotPassword ? handleResetPassword : (isLogin ? handleSignIn : handleSignUp)}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Đang xử lý...' : (isForgotPassword ? 'Gửi email khôi phục' : (isLogin ? 'Đăng nhập' : 'Tạo tài khoản'))}
                </Text>
              </TouchableOpacity>
              
              {!isForgotPassword && <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>HOẶC</Text>
                <View style={styles.divider} />
              </View>}

              {!isForgotPassword && <View style={styles.socialButtonsContainer}>
                <TouchableOpacity 
                  style={styles.socialButton} 
                  disabled={loading} 
                  onPress={handleGoogleLogin}
                >
                  <FontAwesome name="google" size={28} color="#FFFFFF" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.socialButton} 
                  disabled={loading}
                >
                  <FontAwesome name="apple" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>}

              <TouchableOpacity 
                style={styles.switchModeButton} 
                disabled={loading} 
                onPress={() => {
                  if (isForgotPassword) {
                    setIsForgotPassword(false);
                  } else {
                    toggleMode();
                  }
                }}
              >
                <Text style={styles.switchModeText}>
                  {isForgotPassword ? 'Quay lại đăng nhập' : (isLogin ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập')}
                </Text>
              </TouchableOpacity>


            </Animated.View>
          </View>
        </Animated.View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
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
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 140,
    height: 140,
    marginBottom: 10,
  },
  title: {
    width: '100%',
    fontFamily: 'DancingScript_700Bold',
    fontSize: 68,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 30,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    marginTop: 5,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  glassCard: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#FFFFFF',
    padding: 20,
    borderRadius: 24,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
  },
  passwordInput: {
    flex: 1,
    color: '#FFFFFF',
    padding: 20,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 15,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  forgotPasswordText: {
    color: '#EFE8DD',
    fontSize: 14,
    fontWeight: '700',
  },
  button: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  primaryButton: {
    backgroundColor: '#EFE8DD',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  switchModeButton: {
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  switchModeText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#333333',
  },
  dividerText: {
    color: '#666666',
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: 'bold',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
  },
  socialButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
