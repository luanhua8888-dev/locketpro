import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, Key, Trash2, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from('profiles').select('push_notifications').eq('id', session.user.id).single();
    if (data) {
      setPushEnabled(data.push_notifications);
    }
  };

  const togglePush = async (value: boolean) => {
    setPushEnabled(value);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('profiles').update({ push_notifications: value }).eq('id', session.user.id);
    }
  };

  const handleUpdatePassword = async () => {
    if (!oldPassword || newPassword.length < 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu cũ và mật khẩu mới (ít nhất 6 ký tự).');
      return;
    }
    setLoading(true);
    
    // Kiểm tra mật khẩu cũ
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      setLoading(false);
      return;
    }
    
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: oldPassword,
    });
    
    if (signInError) {
      setLoading(false);
      Alert.alert('Lỗi', 'Mật khẩu cũ không chính xác.');
      return;
    }

    // Cập nhật mật khẩu mới
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    
    if (error) {
      Alert.alert('Lỗi', error.message);
    } else {
      setModalVisible(false);
      setOldPassword('');
      setNewPassword('');
      Toast.show({ type: 'success', text1: 'Đổi mật khẩu thành công!' });
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Xóa tài khoản', 
      'Bạn có chắc chắn muốn xóa tài khoản vĩnh viễn không? Mọi dữ liệu sẽ bị xóa và không thể khôi phục.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: async () => {
            const { error } = await supabase.rpc('delete_user_account');
            if (error) {
              Alert.alert('Lỗi', 'Không thể xóa tài khoản. ' + error.message);
            } else {
              await supabase.auth.signOut();
            }
        }}
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color="white" size={32} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt tài khoản</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <TouchableOpacity style={styles.item} onPress={() => setModalVisible(true)}>
            <Key color="white" size={24} style={styles.icon} />
            <Text style={styles.itemText}>Đổi mật khẩu</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông báo</Text>
          <View style={styles.item}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Bell color="white" size={24} style={styles.icon} />
              <Text style={styles.itemText}>Thông báo đẩy</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={togglePush}
              trackColor={{ false: '#767577', true: '#EFE8DD' }}
              thumbColor={'#f4f3f4'}
            />
          </View>
        </View>

        <View style={[styles.section, { marginTop: 40 }]}>
          <TouchableOpacity style={styles.item} onPress={handleDeleteAccount}>
            <Trash2 color="#FF5555" size={24} style={styles.icon} />
            <Text style={[styles.itemText, { color: '#FF5555' }]}>Xóa tài khoản</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="white" size={24} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu cũ"
              placeholderTextColor="#888"
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
              placeholderTextColor="#888"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdatePassword} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Cập nhật</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center'
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { color: '#aaa', fontSize: 14, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  icon: { marginRight: 15 },
  itemText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#222', borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', padding: 15, borderRadius: 10, marginBottom: 15 },
  saveBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
