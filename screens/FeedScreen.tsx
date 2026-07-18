import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, Modal, Animated, DeviceEventEmitter, KeyboardAvoidingView, ScrollView, TextInput, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { User, MessageCircle, ChevronDown, Camera, X, Music, Play, Pause, Check, Trash, Send } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';
import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

const STICKER_DB = [
  { e: '😀' }, { e: '😂' }, { e: '😭' }, { e: '🥺' }, { e: '🥰' }, { e: '😎' }, { e: '😡' }, { e: '😱' },
  { e: '🤔' }, { e: '😴' }, { e: '❤️' }, { e: '💔' }, { e: '🔥' }, { e: '✨' }, { e: '👍' }, { e: '👎' },
  { e: '✌️' }, { e: '🙏' }, { e: '💪' }, { e: '🎉' }, { e: '🎁' }, { e: '🎂' }, { e: '🐶' }, { e: '🐱' },
  { e: '🐷' }, { e: '🐸' }, { e: '🚗' }, { e: '⚽' }, { e: '🎮' }, { e: '🍕' }, { e: '☕' }, { e: '🍺' },
  { e: '💯' }, { e: '🎵' }, { e: '🌞' }, { e: '🌧️' }, { e: '🌈' }, { e: '🌸' }, { e: '💸' }
];

const { width, height } = Dimensions.get('window');
const SPACING = 10;
const ITEM_SIZE = (width - SPACING * 4) / 3;

const getMediaUrl = (item: any): string | null => {
  const url = item?.image_url;
  return typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
};

const isVideoUrl = (url: string) => /\.mp4(?:\?|$)/i.test(url);

const FeedVideo = ({ source, style, autoPlay = false, muted = false }: any) => {
  const player = useVideoPlayer(source, instance => {
    instance.loop = true;
    instance.muted = muted;
    if (autoPlay) instance.play();
  });

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="cover"
      nativeControls={false}
      surfaceType="textureView"
    />
  );
};

const AnimatedFeedItem = ({ item, index, onPress, styles }: any) => {
  const mediaUrl = getMediaUrl(item);
  const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const delay = (row + col) * 150; // Diagonal stagger effect

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!mediaUrl) return null;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity 
        style={styles.photoContainer}
        onPress={() => onPress(item)}
      >
        {isVideo ? (
          <FeedVideo
            source={mediaUrl}
            style={styles.photo}
            muted
          />
        ) : (
          <Image source={{ uri: mediaUrl }} style={styles.photo} contentFit="cover" transition={200} cachePolicy="memory-disk" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function FeedScreen() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [filterUser, setFilterUser] = useState<{id: string, name: string}>({id: 'all', name: 'Mọi người'});
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const musicPlayer = useAudioPlayer(null);
  const [commentText, setCommentText] = useState('');
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (route.params?.filterUserId && route.params?.filterName) {
      setFilterUser({ id: route.params.filterUserId, name: route.params.filterName });
      navigation.setParams({ filterUserId: undefined, filterName: undefined });
    }
  }, [route.params?.filterUserId]);

  useEffect(() => {
    if (isFocused) {
      fetchPhotos();
    }
  }, [isFocused, filterUser, route.params?.filterDate]);

  useEffect(() => {
    let cancelled = false;
    const previewUrl = selectedPost?.song_preview_url;

    async function handleMusic() {
      if (musicPlayer.isLoaded) musicPlayer.pause();
      setIsMusicPlaying(false);
      if (previewUrl) {
        try {
          await setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: false,
            interruptionMode: 'duckOthers',
          });
          if (cancelled) return;

          musicPlayer.loop = true;
          musicPlayer.replace(previewUrl);
          musicPlayer.play();
          setIsMusicPlaying(true);
        } catch (error) {
          console.log("Error playing song:", error);
        }
      }
    }
    
    handleMusic();

    return () => {
      // useAudioPlayer owns and releases the native object during unmount.
      // Only cancel pending JavaScript work here to avoid touching a released player.
      cancelled = true;
    };
  }, [selectedPost?.song_preview_url, musicPlayer]);

  const toggleMusic = async () => {
    if (isMusicPlaying) {
      if (musicPlayer.isLoaded) musicPlayer.pause();
      setIsMusicPlaying(false);
    } else if (selectedPost?.song_preview_url) {
      musicPlayer.play();
      setIsMusicPlaying(true);
    }
  };

  const sendComment = async () => {
    if (!commentText.trim() || !selectedPost || !currentUserId) return;
    const text = commentText.trim();
    setCommentText('');
    
    const { error } = await supabase.from('chat_messages').insert({
      sender_id: currentUserId,
      receiver_id: selectedPost.user_id,
      photo_id: selectedPost.id,
      content: text
    });
    
    if (error) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: error.message, position: 'top' });
    } else {
      Toast.show({ type: 'success', text1: `Đã gửi tin nhắn cho ${selectedPost.username || 'bạn bè'}`, position: 'top' });
    }
  };

  const sendReaction = async (emoji: string) => {
    if (!selectedPost || !currentUserId) return;
    
    const { error } = await supabase.from('chat_messages').insert({
      sender_id: currentUserId,
      receiver_id: selectedPost.user_id,
      photo_id: selectedPost.id,
      content: emoji
    });

    if (error) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: error.message, position: 'top' });
    } else {
      Toast.show({ type: 'success', text1: `Đã thả ${emoji} cho ${selectedPost.username || 'bạn bè'}`, position: 'top' });
    }
  };

  const handleDeletePost = () => {
    if (!selectedPost) return;
    Alert.alert(
      "Xóa bài đăng",
      "Bạn có chắc chắn muốn xóa bài đăng này không?",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from('photos').delete().eq('id', selectedPost.id);
              if (error) throw error;
              setPhotos(prev => prev.filter(p => p.id !== selectedPost.id));
              setSelectedPost(null);
            } catch (error: any) {
              Alert.alert("Lỗi", "Không thể xóa ảnh: " + error.message);
            }
          }
        }
      ]
    );
  };

  async function fetchPhotos() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    
    setCurrentUserId(session.user.id);
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role) {
      setUserRole(profile.role.toLowerCase().trim());
    }

    let allowedIds: string[] = [];

    if (filterUser.id === 'all') {
      const { data: myProfile } = await supabase.from('profiles').select('app_background').eq('id', session.user.id).single();
      DeviceEventEmitter.emit('updateAppBackground', myProfile?.app_background || null);
      
      const { data: friendData } = await supabase
        .from('friendships')
        .select(`
          requester_id, 
          receiver_id,
          requester:profiles!requester_id(id, username),
          receiver:profiles!receiver_id(id, username)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`);
        
      const friendIds = new Set<string>();
      friendIds.add(session.user.id); 
      
      const formattedFriends: any[] = [];
      
      if (friendData) {
        friendData.forEach((f: any) => {
          friendIds.add(f.requester_id);
          friendIds.add(f.receiver_id);
          const friendProfile = f.requester_id === session.user.id ? f.receiver : f.requester;
          if (friendProfile && !formattedFriends.find(x => x.id === friendProfile.id)) {
            formattedFriends.push(friendProfile);
          }
        });
      }
      setFriendsList(formattedFriends);
      allowedIds = Array.from(friendIds);
    } else {
      allowedIds = [filterUser.id];
      if (filterUser.id === session.user.id) {
         const { data: myProfile } = await supabase.from('profiles').select('app_background').eq('id', session.user.id).single();
         DeviceEventEmitter.emit('updateAppBackground', myProfile?.app_background || null);
      } else {
         const { data: friendProfile } = await supabase.from('profiles').select('app_background').eq('id', filterUser.id).single();
         DeviceEventEmitter.emit('updateAppBackground', friendProfile?.app_background || null);
      }
    }

    // Fetch unread messages count
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', session.user.id)
      .eq('is_read', false);
      
    if (count !== null) {
      setUnreadCount(count);
    }

    let query = supabase
      .from('photos')
      .select('*')
      .in('user_id', allowedIds)
      .order('created_at', { ascending: false });
      
    if (route.params?.filterDate === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      query = query.gte('created_at', startOfDay.toISOString());
    }

    const { data, error } = await query;

    if (!error && data) {
      // Map profiles.username to username to match existing UI
      const formattedData = data
        .filter((item: any) => getMediaUrl(item))
        .map((item: any) => ({
          ...item,
          image_url: getMediaUrl(item),
          username: item.profiles?.username || item.username
        }));
      setPhotos(formattedData);
    } else if (error) {
      console.log('Error fetching photos:', error);
    }
    setLoading(false);
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Profile')}>
        <User color="white" size={24} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.everyoneBtn} onPress={() => setFilterModalVisible(true)}>
        <Text style={styles.everyoneText}>{filterUser.name}</Text>
        <ChevronDown color="white" size={20} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Messages')}>
        <View>
          <MessageCircle color="white" size={24} />
          {unreadCount > 0 && (
            <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#FF5555', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    return <AnimatedFeedItem item={item} index={index} onPress={setSelectedPost} styles={styles} />;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const selectedMediaUrl = getMediaUrl(selectedPost);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {renderHeader()}
      
      {loading ? (
        <ActivityIndicator size="large" color="#EFE8DD" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={photos}
          numColumns={3}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Chưa có bức ảnh nào!</Text>
          }
        />
      )}

      {/* Floating Camera Button to go back to Camera */}
      <TouchableOpacity style={styles.floatingCameraBtn} onPress={() => navigation.navigate('Camera')}>
        <Camera color="black" size={32} />
      </TouchableOpacity>

      {/* Post Detail Modal */}
      <Modal
        visible={!!selectedPost}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPost(null)}
      >
        <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 1, padding: 20 }}>
              
              <View style={styles.modalHeader}>
                <View style={styles.modalUserInfo}>
                  <View style={styles.modalAvatarPlaceholder}>
                    <User color="white" size={24} />
                  </View>
                  <View>
                    <Text style={styles.modalUsername}>
                      {selectedPost?.username || 'Người dùng'}
                    </Text>
                    <Text style={styles.modalTime}>
                      {formatDate(selectedPost?.created_at)}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {(currentUserId === selectedPost?.user_id || userRole === 'admin') && (
                    <TouchableOpacity 
                      style={[styles.closeBtn, { backgroundColor: 'rgba(255, 50, 50, 0.4)', marginRight: 10 }]} 
                      onPress={handleDeletePost}
                    >
                      <Trash color="white" size={20} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={styles.closeBtn} 
                    onPress={() => setSelectedPost(null)}
                  >
                    <X color="white" size={32} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.modalContent, { flex: 1, borderRadius: 30, overflow: 'hidden', backgroundColor: '#111', marginTop: 10, marginBottom: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20 }]}>
                {selectedMediaUrl && isVideoUrl(selectedMediaUrl) ? (
                  <FeedVideo
                    source={selectedMediaUrl}
                    style={styles.fullMedia}
                    autoPlay
                  />
                ) : selectedMediaUrl ? (
                  <Image 
                    source={{ uri: selectedMediaUrl }} 
                    style={styles.fullMedia}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                    onError={(e) => console.warn('[FEED] Image load failed:', selectedMediaUrl, e.error)}
                  />
                ) : null}
                
                {/* Render Stickers Safely */}
                {(() => {
                  if (!selectedPost?.stickers_json) return null;
                  try {
                    let stickers = typeof selectedPost.stickers_json === 'string' 
                      ? JSON.parse(selectedPost.stickers_json) 
                      : selectedPost.stickers_json;
                      
                    if (!Array.isArray(stickers)) return null;

                    return stickers.map((sticker: any) => (
                      <View 
                        key={sticker.id} 
                        style={{ 
                          position: 'absolute', 
                          left: sticker.x, 
                          top: sticker.y, 
                          transform: [{ scale: sticker.scale }],
                          zIndex: 20 
                        }}
                      >
                        <View>
                          <Text style={sticker.type === 'text' ? [styles.textSticker, { fontFamily: sticker.fontFamily || 'System', backgroundColor: sticker.bgColor || 'rgba(0,0,0,0.5)' }] : { fontSize: 60 }}>
                            {sticker.emoji}
                          </Text>
                        </View>
                      </View>
                    ));
                  } catch (e) {
                    return null;
                  }
                })()}

                {/* Gradient and Info Overlay inside the image */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.9)']}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 80 }}
                >
                  {selectedPost?.caption ? (
                    <Text style={{ color: 'white', fontSize: 18, marginBottom: 15, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }}>
                      {selectedPost.caption}
                    </Text>
                  ) : null}
                  
                  {selectedPost?.song_title && (
                    <TouchableOpacity style={styles.modalMusicContainer} onPress={toggleMusic}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFE8DD', justifyContent: 'center', alignItems: 'center', marginRight: 12, shadowColor: '#EFE8DD', shadowOpacity: 0.5, shadowRadius: 10 }}>
                        {isMusicPlaying ? <Pause color="black" size={18} /> : <Play color="black" size={18} style={{ marginLeft: 3 }} />}
                      </View>
                      <View>
                        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                          {selectedPost.song_title}
                        </Text>
                        {selectedPost.song_artist && (
                          <Text style={{ color: '#ccc', fontSize: 12, marginTop: 2 }}>
                            {selectedPost.song_artist}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                </LinearGradient>
              </View>

              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: '100%', paddingBottom: 10 }}>
                {/* Reaction Emojis Row */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 5 }}>
                  {['❤️', '🔥', '😂', '😍', '🥺', '💯', '🚀', '✨', '👑', '🎉', '🤯', '🤩'].map(emoji => (
                     <TouchableOpacity 
                       key={emoji} 
                       onPress={() => sendReaction(emoji)}
                       style={{
                         width: 52, height: 52, borderRadius: 26, 
                         backgroundColor: 'rgba(255,255,255,0.2)',
                         justifyContent: 'center', alignItems: 'center',
                         borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                         shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 5
                       }}
                     >
                       <Text style={{ fontSize: 28, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 }}>{emoji}</Text>
                     </TouchableOpacity>
                  ))}
                  <TouchableOpacity 
                    onPress={() => setReactionPickerVisible(true)}
                    style={{
                      width: 52, height: 52, borderRadius: 26, 
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      justifyContent: 'center', alignItems: 'center',
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                      shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 5
                    }}
                  >
                    <Text style={{ fontSize: 28, color: 'white', fontWeight: 'bold' }}>+</Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Comment Box */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <BlurView intensity={80} tint="dark" style={{ flex: 1, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
                    <TextInput 
                      style={{ paddingHorizontal: 20, paddingVertical: 14, color: 'white', fontSize: 16 }}
                      placeholder="Gắn react hoặc gửi tin nhắn..."
                      placeholderTextColor="#ccc"
                      value={commentText}
                      onChangeText={setCommentText}
                      onSubmitEditing={sendComment}
                    />
                  </BlurView>
                  <TouchableOpacity style={{ marginLeft: 12, backgroundColor: '#EFE8DD', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', shadowColor: '#EFE8DD', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 8 }} onPress={sendComment}>
                     <Send color="black" size={24} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>

            </View>
          </SafeAreaView>
        </BlurView>
      </Modal>

      {/* Reaction Picker Modal */}
      <Modal visible={reactionPickerVisible} transparent={true} animationType="fade" onRequestClose={() => setReactionPickerVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setReactionPickerVisible(false)}>
          <View style={{ padding: 20, width: '90%', maxHeight: '60%', borderRadius: 25, overflow: 'hidden' }}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            <Text style={{ color: 'white', width: '100%', textAlign: 'center', fontWeight: 'bold', marginBottom: 15, fontSize: 18 }}>Chọn React</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
              {STICKER_DB.map(s => (
                <TouchableOpacity key={s.e} style={{ padding: 12, margin: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 25 }} onPress={() => { sendReaction(s.e); setReactionPickerVisible(false); }}>
                  <Text style={{ fontSize: 32 }}>{s.e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Dropdown Modal */}
      <Modal visible={filterModalVisible} transparent={true} animationType="fade" onRequestClose={() => setFilterModalVisible(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setFilterModalVisible(false)}>
          <View style={styles.dropdownContent}>
            <BlurView intensity={90} tint="dark" style={styles.dropdownBlur}>
              <TouchableOpacity style={styles.filterOption} onPress={() => { setFilterUser({id: 'all', name: 'Mọi người'}); setFilterModalVisible(false); }}>
                <Text style={styles.filterOptionText}>Mọi người</Text>
                {filterUser.id === 'all' && <Check color="white" size={20} />}
              </TouchableOpacity>
              
              {currentUserId && (
                <TouchableOpacity style={styles.filterOption} onPress={() => { setFilterUser({id: currentUserId, name: 'Bản thân'}); setFilterModalVisible(false); }}>
                  <Text style={styles.filterOptionText}>Bản thân</Text>
                  {filterUser.id === currentUserId && <Check color="white" size={20} />}
                </TouchableOpacity>
              )}
              <FlatList
                data={friendsList}
                keyExtractor={item => item.id}
                renderItem={({item}) => (
                  <TouchableOpacity style={styles.filterOption} onPress={() => { setFilterUser({id: item.id, name: item.username}); setFilterModalVisible(false); }}>
                    <Text style={styles.filterOptionText}>{item.username}</Text>
                    {filterUser.id === item.id && <Check color="white" size={20} />}
                  </TouchableOpacity>
                )}
                style={{ maxHeight: height * 0.5 }}
              />
            </BlurView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerIconBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  everyoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
  },
  everyoneText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 5,
  },
  listContent: {
    padding: SPACING,
    paddingBottom: 100, // Space for floating button
  },
  photoContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 1.3,
    margin: SPACING / 2,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#3a3a3a',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  thumbnailUsername: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  thumbnailMusic: {
    color: '#ddd',
    fontSize: 10,
    marginTop: 2,
  },
  thumbnailCaption: {
    color: '#ddd',
    fontSize: 10,
    marginTop: 2,
  },
  emptyText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  floatingCameraBtn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EFE8DD', // Locket yellow
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)', // Slightly transparent so the feed is visible
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 30, // Gap on both sides
    height: height * 0.65, // Shorter to make room for header above and caption below
    backgroundColor: '#222',
    borderRadius: 45, // Super rounded corners
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    marginTop: 80, // Push down below header
  },
  modalHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  modalUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalUsername: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  modalTime: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  modalMusicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  modalMusicText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    maxWidth: 160,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  fullMedia: {
    width: '100%',
    height: '100%',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    maxWidth: '85%',
  },
  captionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  textSticker: {
    color: 'white', 
    fontSize: 28, 
    fontWeight: 'bold', 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 15, 
    overflow: 'hidden',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownContent: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    width: 250,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  dropdownBlur: {
    padding: 10,
    backgroundColor: 'rgba(20, 20, 20, 0.3)',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  filterOptionText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
