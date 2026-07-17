import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, Modal, Animated } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { User, MessageCircle, ChevronDown, Camera, X, Music, Play, Pause } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Audio, Video, ResizeMode } from 'expo-av';

const { width, height } = Dimensions.get('window');
const SPACING = 10;
const ITEM_SIZE = (width - SPACING * 4) / 3;

const AnimatedFeedItem = ({ item, index, onPress, styles }: any) => {
  const isVideo = item.image_url?.endsWith('.mp4');
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

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity 
        style={styles.photoContainer}
        onPress={() => onPress(item)}
      >
        {isVideo ? (
          <Video
            source={{ uri: item.image_url }}
            style={styles.photo}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isMuted={true}
          />
        ) : (
          <Image source={{ uri: item.image_url }} style={styles.photo} contentFit="cover" transition={200} cachePolicy="memory-disk" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function FeedScreen() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const soundRef = React.useRef<Audio.Sound | null>(null);
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchPhotos();
    }
  }, [isFocused]);

  useEffect(() => {
    async function handleMusic() {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (selectedPost?.song_preview_url) {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });

          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: selectedPost.song_preview_url },
            { shouldPlay: true, isLooping: true }
          );
          soundRef.current = newSound;
          await newSound.playAsync();
          setIsMusicPlaying(true);
        } catch (error) {
          console.log("Error playing song:", error);
        }
      }
    }
    
    handleMusic();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [selectedPost]);

  const toggleMusic = async () => {
    if (soundRef.current) {
      if (isMusicPlaying) {
        await soundRef.current.pauseAsync();
        setIsMusicPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsMusicPlaying(true);
      }
    }
  };

  async function fetchPhotos() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    
    // Fetch friends
    const { data: friendData } = await supabase
      .from('friendships')
      .select('requester_id, receiver_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`);
      
    const friendIds = new Set<string>();
    friendIds.add(session.user.id); // User can see their own photos
    if (friendData) {
      friendData.forEach(f => {
        friendIds.add(f.requester_id);
        friendIds.add(f.receiver_id);
      });
    }

    const allowedIds = Array.from(friendIds);

    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .in('user_id', allowedIds)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPhotos(data);
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
      <TouchableOpacity style={styles.everyoneBtn}>
        <Text style={styles.everyoneText}>Mọi người</Text>
        <ChevronDown color="white" size={20} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerIconBtn}>
        <MessageCircle color="white" size={24} />
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
                <TouchableOpacity 
                  style={styles.closeBtn} 
                  onPress={() => setSelectedPost(null)}
                >
                  <X color="white" size={32} />
                </TouchableOpacity>
              </View>

              <View style={[styles.modalContent, { flex: 1, borderRadius: 30, overflow: 'hidden', backgroundColor: '#111', marginTop: 10, marginBottom: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20 }]}>
                {selectedPost?.image_url?.endsWith('.mp4') ? (
                  <Video
                    source={{ uri: selectedPost.image_url }}
                    style={styles.fullMedia}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                    isLooping
                  />
                ) : (
                  <Image 
                    source={{ uri: selectedPost?.image_url }} 
                    style={styles.fullMedia}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                )}
                
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
            </View>
          </SafeAreaView>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#091B42',
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
});
