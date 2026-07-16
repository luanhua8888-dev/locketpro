import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { LogOut, User, Settings, Shield, CircleHelp, ArrowLeft, Save } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const [username, setUsername] = useState('Đang tải...');
  const [email, setEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setEmail(session.user.email || 'Đã kết nối');
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();
      
      if (data && data.username) {
        setUsername(data.username);
      }
    }
  }

  async function handleSave() {
    if (!username.trim()) return;
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: session.user.id, username: username.trim(), email: session.user.email });
      
      if (error) {
        Alert.alert('Lỗi', 'Không thể cập nhật tên!');
      } else {
        setIsEditing(false);
        Alert.alert('Thành công', 'Đã cập nhật tên của bạn!');
      }
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ của bạn</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.profileInfo}>
        <View style={styles.avatarContainer}>
          <User color="white" size={60} />
        </View>
        
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput 
              style={styles.nameInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Nhập tên của bạn"
              placeholderTextColor="#888"
              autoFocus
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color="black" size="small" /> : <Save color="black" size={20} />}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.nameDisplay} onPress={() => setIsEditing(true)}>
            <Text style={styles.nameText}>{username}</Text>
            <View style={styles.editIconPill}>
              <Text style={{fontSize: 12}}>✏️</Text>
            </View>
          </TouchableOpacity>
        )}
        
        <Text style={styles.emailText}>{email}</Text>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
          <Settings color="white" size={24} style={styles.menuIcon} />
          <Text style={styles.menuText}>Cài đặt tài khoản</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Shield color="white" size={24} style={styles.menuIcon} />
          <Text style={styles.menuText}>Quyền riêng tư</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <CircleHelp color="white" size={24} style={styles.menuIcon} />
          <Text style={styles.menuText}>Trợ giúp & Hỗ trợ</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={() => supabase.auth.signOut()}>
        <LogOut color="black" size={24} style={{ marginRight: 10 }} />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282522', // Match Locket dark theme
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#fca311', // Locket yellow
  },
  nameText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  emailText: {
    color: '#a0a0a0',
    fontSize: 16,
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  menuIcon: {
    marginRight: 15,
  },
  menuText: {
    color: 'white',
    fontSize: 18,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#fca311', // Locket yellow
    marginHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 30,
  },
  logoutText: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
    width: '100%',
    paddingHorizontal: 40,
    position: 'relative',
  },
  nameInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    fontSize: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    textAlign: 'center',
    paddingRight: 50, // Space for the absolute button
  },
  saveBtn: {
    position: 'absolute',
    right: 42,
    backgroundColor: '#fca311',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: '#fca311',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  nameDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  editIconPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 6,
    borderRadius: 15,
    marginLeft: 8,
  }
});
