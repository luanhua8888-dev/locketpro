import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { User, ChevronLeft, MessageCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';

export default function MessagesScreen() {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchInbox();
    }
  }, [isFocused]);

  async function fetchInbox() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    setCurrentUserId(session.user.id);

    // Fetch accepted friendships
    const { data: friendData } = await supabase
      .from('friendships')
      .select(`
        requester_id, 
        receiver_id,
        requester:profiles!requester_id(id, username, avatar_url),
        receiver:profiles!receiver_id(id, username, avatar_url)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`);
      
    if (friendData) {
      // Fetch unread messages
      const { data: unreadData } = await supabase
        .from('chat_messages')
        .select('sender_id')
        .eq('receiver_id', session.user.id)
        .eq('is_read', false);
        
      const unreadMap: Record<string, number> = {};
      if (unreadData) {
        unreadData.forEach((msg: any) => {
          unreadMap[msg.sender_id] = (unreadMap[msg.sender_id] || 0) + 1;
        });
      }

      const formattedFriends = friendData.map((f: any) => {
        const friend = f.requester_id === session.user.id ? f.receiver : f.requester;
        return {
          ...friend,
          unreadCount: unreadMap[friend.id] || 0
        };
      });
      // Optionally fetch last message here, but for now just list friends
      // Sort so friends with unread messages are at the top
      formattedFriends.sort((a, b) => b.unreadCount - a.unreadCount);
      setFriends(formattedFriends);
    }
    setLoading(false);
  }

  const renderFriend = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.chatRow} 
      onPress={() => navigation.navigate('Chat', { friend: item, currentUserId })}
      activeOpacity={0.7}
    >
      <BlurView intensity={80} tint="dark" style={styles.chatBlur}>
        <View style={styles.avatarPlaceholder}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={{ width: 50, height: 50, borderRadius: 25 }} contentFit="cover" />
          ) : (
            <User color="white" size={24} />
          )}
        </View>
        <View style={styles.chatInfo}>
          <Text style={[styles.username, item.unreadCount > 0 && { fontWeight: '900' }]}>{item.username}</Text>
          <Text style={[styles.lastMessage, item.unreadCount > 0 && { color: 'white', fontWeight: '600' }]} numberOfLines={1}>
            {item.unreadCount > 0 ? `Bạn có ${item.unreadCount} tin nhắn mới!` : 'Nhấn để bắt đầu trò chuyện...'}
          </Text>
        </View>
        {item.unreadCount > 0 ? (
          <View style={{ backgroundColor: '#FF5555', borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 }}>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
          </View>
        ) : (
          <MessageCircle color="#EFE8DD" size={24} style={{ opacity: 0.8 }} />
        )}
      </BlurView>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color="white" size={32} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#EFE8DD" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={renderFriend}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Chưa có bạn bè nào để trò chuyện!</Text>
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
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 },
  chatRow: { marginBottom: 15, borderRadius: 25, overflow: 'hidden' },
  chatBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarPlaceholder: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15,
  },
  chatInfo: { flex: 1 },
  username: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  lastMessage: { color: '#ccc', fontSize: 14 },
  emptyText: { color: 'white', textAlign: 'center', marginTop: 50, fontSize: 16, opacity: 0.7 }
});
