import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { ArrowLeft, UserPlus, Check, X, Search, User } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';

export default function FriendsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setCurrentUser(session.user);
    fetchFriends(session.user.id);
    fetchPendingRequests(session.user.id);
  }

  async function fetchFriends(userId: string) {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          requester:profiles!requester_id(id, username, avatar_url),
          receiver:profiles!receiver_id(id, username, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

      if (error) throw error;
      
      const formattedFriends = data?.map((f: any) => {
        const friendProfile = f.requester.id === userId ? f.receiver : f.requester;
        return { friendship_id: f.id, ...friendProfile };
      });
      setFriends(formattedFriends || []);
    } catch (e) {
      console.log('Error fetching friends:', e);
    }
  }

  async function fetchPendingRequests(userId: string) {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          requester:profiles!requester_id(id, username, avatar_url)
        `)
        .eq('receiver_id', userId)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (e) {
      console.log('Error fetching requests:', e);
    }
  }

  async function searchUsers() {
    if (!searchQuery.trim() || !currentUser) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchQuery.trim()}%`)
        .neq('id', currentUser.id)
        .limit(10);
        
      if (error) throw error;
      setSearchResults(data || []);
    } catch (e) {
      console.log('Search error', e);
    } finally {
      setLoading(false);
    }
  }

  async function sendFriendRequest(receiverId: string) {
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: currentUser.id,
          receiver_id: receiverId,
          status: 'pending'
        });
        
      if (error) {
        if (error.code === '23505') {
          Alert.alert('Lỗi', 'Bạn đã gửi lời mời hoặc đã kết bạn với người này rồi.');
        } else {
          Alert.alert('Lỗi', 'Không thể gửi lời mời.');
        }
      } else {
        Alert.alert('Thành công', 'Đã gửi lời mời kết bạn!');
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function handleRequest(friendshipId: string, action: 'accepted' | 'declined') {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: action })
        .eq('id', friendshipId);
        
      if (error) throw error;
      fetchData();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể thao tác.');
    }
  }

  const renderUserItem = ({ item, isSearch = false, isRequest = false }: any) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        {item.avatar_url || (item.requester && item.requester.avatar_url) ? (
          <Image source={{ uri: isRequest ? item.requester.avatar_url : item.avatar_url }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#333' }]}>
            <User color="white" size={24} />
          </View>
        )}
        <Text style={styles.username}>{isRequest ? item.requester.username : item.username}</Text>
      </View>
      
      {isSearch && (
        <TouchableOpacity style={styles.actionBtn} onPress={() => sendFriendRequest(item.id)}>
          <UserPlus color="black" size={20} />
        </TouchableOpacity>
      )}
      
      {isRequest && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EFE8DD' }]} onPress={() => handleRequest(item.id, 'accepted')}>
            <Check color="black" size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#333' }]} onPress={() => handleRequest(item.id, 'declined')}>
            <X color="white" size={20} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bạn Bè</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Tìm kiếm bằng Username..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchUsers}
        />
        <TouchableOpacity style={styles.searchIconBtn} onPress={searchUsers}>
          {loading ? <ActivityIndicator color="white" /> : <Search color="white" size={20} />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={[{ id: 'dummy' }]}
        keyExtractor={item => item.id}
        renderItem={() => (
          <View style={styles.contentContainer}>
            
            {searchResults.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Kết quả tìm kiếm</Text>
                {searchResults.map((item) => (
                  <React.Fragment key={item.id}>
                    {renderUserItem({ item, isSearch: true })}
                  </React.Fragment>
                ))}
              </View>
            )}

            {pendingRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Lời mời kết bạn</Text>
                {pendingRequests.map((item) => (
                  <React.Fragment key={item.id}>
                    {renderUserItem({ item, isRequest: true })}
                  </React.Fragment>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bạn bè của bạn ({friends.length})</Text>
              {friends.length === 0 ? (
                <Text style={styles.emptyText}>Bạn chưa có người bạn nào.</Text>
              ) : (
                friends.map((item) => (
                  <React.Fragment key={item.id}>
                    {renderUserItem({ item })}
                  </React.Fragment>
                ))
              )}
            </View>

          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#091B42' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15,
  },
  backBtn: { padding: 5 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  searchContainer: {
    flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20,
  },
  searchInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', color: 'white',
    borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, fontSize: 16,
  },
  searchIconBtn: {
    position: 'absolute', right: 30, top: 12,
  },
  contentContainer: { paddingHorizontal: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { color: '#EFE8DD', fontSize: 16, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase' },
  emptyText: { color: '#888', fontSize: 16, fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  userItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  username: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  actionBtn: {
    backgroundColor: '#EFE8DD', width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  }
});
