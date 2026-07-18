import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

type ResetPasswordProps = {
  reason: 'recovery' | 'temporary';
  onComplete: () => void;
  onCancel: () => void | Promise<void>;
};

export default function ResetPassword({ reason, onComplete, onCancel }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const updatePassword = async () => {
    if (password.length < 6) {
      Alert.alert('Mật khẩu chưa hợp lệ', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmation) {
      Alert.alert('Mật khẩu không khớp', 'Vui lòng nhập lại đúng mật khẩu mới.');
      return;
    }

    setLoading(true);
    const { error } = reason === 'temporary'
      ? await supabase.functions.invoke('complete-temporary-password-reset', { body: { password } })
      : await supabase.auth.updateUser({ password });

    if (!error && reason === 'temporary') {
      await supabase.auth.refreshSession();
    }
    setLoading(false);

    if (error) {
      Alert.alert('Không thể đổi mật khẩu', error.message);
      return;
    }

    Alert.alert('Thành công', 'Mật khẩu của bạn đã được cập nhật.', [
      { text: 'Tiếp tục', onPress: onComplete },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Text style={styles.title}>
          {reason === 'temporary' ? 'Tạo mật khẩu mới' : 'Đặt lại mật khẩu'}
        </Text>
        <Text style={styles.description}>
          {reason === 'temporary'
            ? 'Bạn đã đăng nhập bằng password tạm. Hãy tạo mật khẩu mới trước khi tiếp tục.'
            : 'Nhập mật khẩu mới cho tài khoản Luna Snap.'}
        </Text>

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Mật khẩu mới"
          placeholderTextColor="#8B93A7"
          secureTextEntry
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="Nhập lại mật khẩu mới"
          placeholderTextColor="#8B93A7"
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.primaryButton} onPress={updatePassword} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#091B42" />
          ) : (
            <Text style={styles.primaryButtonText}>Cập nhật mật khẩu</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={loading}>
          <Text style={styles.cancelButtonText}>Hủy</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#091B42',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  description: {
    color: '#AAB2C5',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 28,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    color: '#FFFFFF',
    fontSize: 16,
    paddingHorizontal: 18,
    paddingVertical: 17,
    marginBottom: 14,
  },
  primaryButton: {
    minHeight: 58,
    backgroundColor: '#EFE8DD',
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#091B42',
    fontSize: 17,
    fontWeight: '900',
  },
  cancelButton: {
    padding: 18,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#AAB2C5',
    fontSize: 16,
    fontWeight: '700',
  },
});
