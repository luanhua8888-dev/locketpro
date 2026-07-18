import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { ArrowLeft, UserPlus, UserMinus, Check, X, Search, User } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import Toast from 'react-native-toast-message';

export default function FriendsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const navigation = useNavigation<any>();

  const isFocused = useIsFocused();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isFocused) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          const { data: myProfile } = await supabase.from('profiles').select('app_background').eq('id', session.user.id).single();
          DeviceEventEmitter.emit('updateAppBackground', myProfile?.app_background || null);
        }
      });
    }
  }, [isFocused]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setCurrentUser(session.user);
    fetchFriends(session.user.id);
    fetchPendingRequests(session.user.id);
    fetchSentRequests(session.user.id);
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

  async function fetchSentRequests(userId: string) {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, receiver_id')
        .eq('requester_id', userId)
        .eq('status', 'pending');

      if (error) throw error;
      setSentRequests(data || []);
    } catch (e) {
      console.log('Error fetching sent requests:', e);
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
        console.log('Error inserting friendship:', error);
        if (error.code === '23505') {
          Toast.show({ type: 'error', text1: 'Đã gửi lời mời hoặc đã là bạn bè.' });
        } else {
          Toast.show({ type: 'error', text1: `Lỗi: ${error.message}` });
        }
      } else {
        Toast.show({ type: 'success', text1: 'Đã gửi lời mời kết bạn!' });
        fetchData();
      }
    } catch (e: any) {
      console.log('Exception in sendFriendRequest:', e);
      Toast.show({ type: 'error', text1: `Lỗi hệ thống: ${e.message}` });
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
      Toast.show({ type: 'success', text1: action === 'accepted' ? 'Đã chấp nhận kết bạn!' : 'Đã từ chối kết bạn.' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Không thể thao tác.' });
    }
  }

  function confirmCancelRequest(receiverId: string) {
    Alert.alert(
      'Hủy lời mời',
      'Bạn có chắc chắn muốn hủy lời mời kết bạn này?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Có', onPress: () => cancelFriendRequest(receiverId), style: 'destructive' }
      ]
    );
  }

  async function cancelFriendRequest(receiverId: string) {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('requester_id', currentUser.id)
        .eq('receiver_id', receiverId)
        .eq('status', 'pending');
        
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'Đã hủy lời mời kết bạn.' });
      fetchData();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Không thể hủy lời mời.' });
    }
  }

  const confirmUnfriend = (friendId: string) => {
    Alert.alert(
      'Xóa bạn bè', 
      'Bạn có chắc chắn muốn hủy kết bạn với người này không?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Hủy kết bạn', style: 'destructive', onPress: () => handleUnfriend(friendId) }
      ]
    );
  };

  const handleUnfriend = async (friendId: string) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(requester_id.eq.${friendId},receiver_id.eq.${currentUser.id})`);
        
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'Đã hủy kết bạn.' });
      fetchData();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Không thể hủy kết bạn.' });
    }
  };

  const renderUserItem = ({ item, isSearch = false, isRequest = false }: any) => {
    const isSent = sentRequests.find(req => req.receiver_id === item.id);
    const isFriend = friends.find(f => f.id === item.id);
    const isPendingMe = pendingRequests.find(req => req.requester && req.requester.id === item.id);

    return (
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
          isFriend ? (
            <Text style={{color: '#888'}}>Bạn bè</Text>
          ) : isPendingMe ? (
            <Text style={{color: '#888'}}>Đã gửi bạn</Text>
          ) : isSent ? (
            <TouchableOpacity style={styles.actionBtn} onPress={() => confirmCancelRequest(item.id)}>
              <UserMinus color="black" size={20} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionBtn} onPress={() => sendFriendRequest(item.id)}>
              <UserPlus color="black" size={20} />
            </TouchableOpacity>
          )
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
        
        {!isSearch && !isRequest && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#555' }]} onPress={() => confirmUnfriend(item.id)}>
            <UserMinus color="#888" size={16} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
  container: { flex: 1, backgroundColor: 'transparent' },
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
