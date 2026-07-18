import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, UserX } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';

export default function BlockedUsersScreen() {
  const navigation = useNavigation();
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data } = await supabase
      .from('blocked_users')
      .select('id, blocked_id, blocked:profiles!blocked_id(id, username, avatar_url)')
      .eq('blocker_id', session.user.id);
      
    if (data) {
      setBlockedUsers(data);
    }
    setLoading(false);
  };

  const handleUnblock = async (blockedId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    await supabase.from('blocked_users').delete().eq('blocker_id', session.user.id).eq('blocked_id', blockedId);
    setBlockedUsers(prev => prev.filter(b => b.blocked_id !== blockedId));
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.row}>
      <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
        <View style={styles.userInfo}>
          {item.blocked?.avatar_url ? (
            <Image source={{ uri: item.blocked.avatar_url }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#444', justifyContent: 'center', alignItems: 'center' }]}>
              <UserX color="white" size={20} />
            </View>
          )}
          <Text style={styles.username}>{item.blocked?.username || 'Người dùng ẩn'}</Text>
        </View>
        <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(item.blocked_id)}>
          <Text style={styles.unblockText}>Bỏ chặn</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color="white" size={32} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Danh sách đã chặn</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#EFE8DD" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <Text style={{ color: '#888', textAlign: 'center', marginTop: 50 }}>Bạn chưa chặn ai.</Text>
          }
        />
      )}
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
  row: { marginBottom: 15, borderRadius: 20, overflow: 'hidden' },
  blurContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
  username: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  unblockBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15 },
  unblockText: { color: 'white', fontWeight: 'bold' }
});
