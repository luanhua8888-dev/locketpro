import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { supabase } from '../lib/supabase';
import { LogOut, User, Settings, Shield, CircleHelp } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hồ sơ của bạn</Text>
      </View>

      <View style={styles.profileInfo}>
        <View style={styles.avatarContainer}>
          <User color="white" size={60} />
        </View>
        <Text style={styles.nameText}>Người dùng Locket</Text>
        <Text style={styles.emailText}>Đã kết nối</Text>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: 'center',
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
  }
});
