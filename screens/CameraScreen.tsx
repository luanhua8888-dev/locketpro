import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, SafeAreaView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Modal, ScrollView, Animated, PanResponder, Dimensions } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { LayoutGrid, Upload, User, MessageCircle, ChevronDown, X, Send, Music, Smile, Search, Play, Pause, FlipHorizontal, RotateCcw, Type } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';
import { useNavigation } from '@react-navigation/native';
import { Audio, Video, ResizeMode } from 'expo-av';
const DraggableSticker = ({ id, emoji, type, x, y, scale, fontFamily, bgColor, isActive, onTap, onUpdatePos }: any) => {
  const pan = useRef(new Animated.ValueXY({ x: x, y: y })).current;
  const lastTap = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gesture) => {
        pan.extractOffset();
        if (onUpdatePos) {
          onUpdatePos(id, (pan.x as any)._value, (pan.y as any)._value);
        }
        if (Math.abs(gesture.dx) < 5 && Math.abs(gesture.dy) < 5) {
          const now = Date.now();
          if (now - lastTap.current < 300) {
            // Double tap to delete is handled by onTap
          }
          onTap(id);
          lastTap.current = now;
        }
      }
    })
  ).current;

  const stickerStyle: any = type === 'text' 
    ? [styles.textSticker, { fontFamily: fontFamily || 'System', backgroundColor: bgColor || 'rgba(0,0,0,0.5)' }] 
    : { fontSize: 60 };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        pan.getLayout(),
        { position: 'absolute', zIndex: isActive ? 30 : 20, transform: [{ scale }] }
      ]}
    >
      <View style={isActive ? { borderWidth: 2, borderColor: 'white', borderStyle: 'dashed', padding: 5, borderRadius: 10 } : {}}>
        <Text style={stickerStyle}>{emoji}</Text>
      </View>
    </Animated.View>
  );
};


const { width, height } = Dimensions.get('window');

export default function CameraScreen({ session }: { session: Session | null }) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  
  const [photo, setPhoto] = useState<{ uri: string, base64?: string } | null>(null);
  const [video, setVideo] = useState<{ uri: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [musicModalVisible, setMusicModalVisible] = useState(false);
  const [iconModalVisible, setIconModalVisible] = useState(false);
  
  // Stickers state
  const [stickers, setStickers] = useState<{id: string, emoji: string, type: 'emoji' | 'text', x: number, y: number, scale: number, fontFamily?: string, bgColor?: string}[]>([]);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [stickerText, setStickerText] = useState('');
  
  // Text styling states
  const fonts = ['System', 'DancingScript_400Regular', 'DancingScript_700Bold'];
  const bgColors = ['transparent', 'rgba(0,0,0,0.5)', 'rgba(255,255,255,0.5)', '#fca311'];
  const [currentFontIdx, setCurrentFontIdx] = useState(0);
  const [currentBgIdx, setCurrentBgIdx] = useState(1);

  // Music state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<{title: string, url: string} | null>(null);
  
  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        searchMusic(searchQuery);
      } else {
        searchMusic('top hits');
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false,
    });
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const cameraRef = useRef<CameraView>(null);
  const navigation = useNavigation<any>();

  if (!permission || !micPermission) return <View />;

  if (!permission.granted || !micPermission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={{ textAlign: 'center', marginBottom: 20, color: 'white', paddingHorizontal: 20 }}>
          Chúng tôi cần quyền truy cập Camera và Micro để bạn có thể chụp ảnh và quay video.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={() => { requestPermission(); requestMicPermission(); }}>
          <Text style={styles.permissionText}>Cấp Quyền Camera & Micro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePicture() {
    if (cameraRef.current && !isRecording) {
      const photoData = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
        exif: false,
      });
      if (photoData && photoData.base64) {
        setPhoto({ uri: photoData.uri, base64: photoData.base64 });
      }
    }
  }

  async function recordVideo() {
    if (cameraRef.current) {
      setIsRecording(true);
      try {
        const videoData = await cameraRef.current.recordAsync({ maxDuration: 60 });
        if (videoData) {
          setVideo({ uri: videoData.uri });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsRecording(false);
      }
    }
  }

  function stopRecording() {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  }

  function cancelPreview() {
    setPhoto(null);
    setVideo(null);
    setCaption('');
    setStickers([]);
    setSelectedMusic(null);
    if (sound) sound.unloadAsync();
  }

  async function searchMusic(query: string = searchQuery) {
    if (!query) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=15`);
      const data = await res.json();
      setSearchResults(data.results);
    } catch (e) {
      console.log(e);
    } finally {
      setIsSearching(false);
    }
  }

  async function closeMusicModal() {
    if (sound) {
      await sound.pauseAsync();
      setPlayingPreview(null);
    }
    setMusicModalVisible(false);
  }

  async function playPreview(url: string) {
    if (playingPreview === url) {
      await sound?.pauseAsync();
      setPlayingPreview(null);
      return;
    }
    if (sound) {
      await sound.unloadAsync();
    }
    const { sound: newSound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
    setSound(newSound);
    setPlayingPreview(url);
  }

  const addSticker = (emoji: string, type: 'emoji' | 'text') => {
    if (type === 'text' && !stickerText.trim()) {
      setTextModalVisible(false);
      return;
    }
    const newSticker = {
      id: Date.now().toString(),
      emoji: type === 'text' ? stickerText : emoji,
      type,
      x: width / 2 - 50,
      y: height / 2 - 50,
      scale: 1,
      fontFamily: fonts[currentFontIdx],
      bgColor: bgColors[currentBgIdx]
    };
    setStickers([...stickers, newSticker]);
    setActiveStickerId(newSticker.id);
    if (type === 'text') {
      setStickerText('');
      setTextModalVisible(false);
    } else {
      setIconModalVisible(false);
    }
  };

  const updateStickerScale = (id: string, delta: number) => {
    setStickers(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, scale: Math.max(0.5, Math.min(5, s.scale + delta)) };
      }
      return s;
    }));
  };

  const updateStickerPos = (id: string, x: number, y: number) => {
    setStickers(prev => prev.map(s => s.id === id ? { ...s, x, y } : s));
  };

  async function sendMedia() {
    const mediaUri = photo?.uri || video?.uri;
    if (!mediaUri || !session?.user) return;
    setIsUploading(true);

    try {
      const isVideo = !!video;
      const ext = isVideo ? 'mp4' : 'jpg';
      const filePath = `${session.user.id}/${Date.now()}.${ext}`;
      
      let uploadData: ArrayBuffer | Blob;
      
      if (photo?.base64) {
        uploadData = decode(photo.base64);
      } else {
        const res = await fetch(mediaUri);
        uploadData = await res.blob();
      }

      const { error: storageError } = await supabase.storage
        .from('photos')
        .upload(filePath, uploadData, {
          contentType: isVideo ? 'video/mp4' : 'image/jpeg',
        });

      if (storageError) throw storageError;

      const { data: publicUrlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      const insertData: any = {
        user_id: session.user.id,
        image_url: publicUrlData.publicUrl,
      };
      
      // Nếu bạn đã chạy SQL thêm cột thì uncomment các dòng này:
      // insertData.caption = caption;
      // insertData.music_url = selectedMusic?.url;
      // insertData.music_title = selectedMusic?.title;
      // insertData.stickers = stickers;

      const { error: dbError } = await supabase
        .from('photos')
        .insert(insertData);

      if (dbError) throw dbError;

      alert('Đăng bài thành công!');
      cancelPreview();
      navigation.navigate('Feed');
    } catch (error: any) {
      alert('Lỗi: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  }

  // Header component
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerIconBtn}>
        <User color="white" size={24} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.everyoneBtn}>
        <Text style={styles.everyoneText}>Everyone</Text>
        <ChevronDown color="white" size={20} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerIconBtn}>
        <MessageCircle color="white" size={24} />
      </TouchableOpacity>
    </View>
  );
  
  const hasMedia = !!photo || !!video;

  return (
    <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
      
      {renderHeader()}

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.mainContent}
      >
        <TouchableWithoutFeedback onPress={() => setActiveStickerId(null)}>
          <View style={styles.cameraWrapper}>
            {!hasMedia ? (
              <>
                <CameraView style={StyleSheet.absoluteFillObject} facing={facing} ref={cameraRef} mode="video" />
                <TouchableOpacity 
                  style={styles.flipCameraBtn}
                  onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
                >
                  <FlipHorizontal color="white" size={24} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                {photo ? (
                  <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFillObject} />
                ) : (
                  <Video
                    source={{ uri: video!.uri }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                    isLooping
                    isMuted={false}
                  />
                )}
                
                {/* Render Stickers */}
                {stickers.map(sticker => (
                  <DraggableSticker 
                    key={sticker.id} 
                    {...sticker} 
                    isActive={activeStickerId === sticker.id}
                    onTap={(id: string) => {
                       if (activeStickerId === id) {
                         setStickers(s => s.filter(st => st.id !== id));
                         setActiveStickerId(null);
                       } else {
                         setActiveStickerId(id);
                       }
                    }}
                    onUpdatePos={updateStickerPos}
                  />
                ))}

                {/* Scale Controls for Active Sticker */}
                {activeStickerId && (
                  <View style={styles.scaleControls}>
                    <TouchableOpacity style={styles.scaleBtn} onPress={() => updateStickerScale(activeStickerId, -0.2)}>
                      <Text style={{color:'white', fontWeight:'bold'}}>-</Text>
                    </TouchableOpacity>
                    <Text style={{color:'white', fontWeight:'bold'}}>Size</Text>
                    <TouchableOpacity style={styles.scaleBtn} onPress={() => updateStickerScale(activeStickerId, 0.2)}>
                      <Text style={{color:'white', fontWeight:'bold'}}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Selected Music Pill */}
                {selectedMusic && (
                  <View style={styles.musicPill}>
                    <Music color="white" size={16} style={{ marginRight: 5 }} />
                    <Text style={styles.musicPillText} numberOfLines={1}>{selectedMusic.title}</Text>
                  </View>
                )}

                {/* Right side tools */}
                <View style={[styles.toolsContainer, { transform: [{ translateY: -keyboardHeight }] }]}>
                  <TouchableOpacity style={styles.toolBtn} onPress={cancelPreview} disabled={isUploading}>
                    <X color="white" size={32} />
                  </TouchableOpacity>
                  {stickers.length > 0 && (
                    <TouchableOpacity style={styles.toolBtn} onPress={() => setStickers(s => s.slice(0, -1))}>
                      <RotateCcw color="white" size={26} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.toolBtn} onPress={() => setTextModalVisible(true)}>
                    <Type color="white" size={26} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolBtn} onPress={() => setMusicModalVisible(true)}>
                    <Music color="white" size={28} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolBtn} onPress={() => setIconModalVisible(true)}>
                    <Smile color="white" size={28} />
                  </TouchableOpacity>
                </View>

                {/* Caption Input */}
                <TextInput
                  style={[styles.captionInput, { bottom: 20 + keyboardHeight }]}
                  placeholder="Thêm mô tả..."
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={100}
                />
              </>
            )}
          </View>
        </TouchableWithoutFeedback>

        {/* Info below photo */}
        {!hasMedia && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>You <Text style={styles.infoDate}>Today</Text></Text>
            <TouchableOpacity style={styles.activityBtn}>
              <Text style={styles.activityText}>✨ No activity yet!</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Feed')}>
          <LayoutGrid color="white" size={32} />
        </TouchableOpacity>
        
        {!hasMedia ? (
          <TouchableOpacity 
            style={[styles.captureBtnWrapper, isRecording && { borderColor: 'red' }]} 
            onPress={takePicture}
            onLongPress={recordVideo}
            onPressOut={stopRecording}
            delayLongPress={300}
          >
            <View style={[styles.captureBtnInner, isRecording && { backgroundColor: 'red', borderRadius: 10, width: 40, height: 40 }]} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.captureBtnWrapper, { borderColor: '#fca311', backgroundColor: '#fca311' }]} onPress={sendMedia} disabled={isUploading}>
            {isUploading ? <ActivityIndicator color="black" size="large" /> : <Send color="black" size={36} style={{ marginLeft: 5 }} />}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.navBtn}>
          <Upload color="white" size={32} />
        </TouchableOpacity>
      </View>

      {/* Music Modal */}
      <Modal visible={musicModalVisible} animationType="slide" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMusicModal}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { height: '80%' }]}>
              <Text style={styles.modalTitle}>Chọn Nhạc từ Apple Music</Text>
              <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                <TextInput 
                  style={styles.searchInput}
                  placeholder="Tìm bài hát..."
                  placeholderTextColor="gray"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => searchMusic()}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={() => searchMusic()}>
                  <Search color="white" size={24} />
                </TouchableOpacity>
              </View>

              {isSearching ? <ActivityIndicator size="large" color="#fca311" /> : (
                <ScrollView>
                  {searchResults.map((item, i) => (
                    <View key={i} style={styles.musicItem}>
                      <TouchableOpacity 
                        style={styles.playBtn}
                        onPress={() => playPreview(item.previewUrl)}
                      >
                        {playingPreview === item.previewUrl ? <Pause color="white" size={20} /> : <Play color="white" size={20} />}
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={{ flex: 1, marginLeft: 15 }}
                        onPress={() => playPreview(item.previewUrl)}
                      >
                        <Text style={styles.musicTrackText} numberOfLines={1}>{item.trackName}</Text>
                        <Text style={styles.musicArtistText} numberOfLines={1}>{item.artistName}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.selectMusicBtn} onPress={() => {
                          setSelectedMusic({ title: item.trackName + ' - ' + item.artistName, url: item.previewUrl });
                          closeMusicModal();
                      }}>
                        <Text style={{color: 'black', fontWeight: 'bold'}}>Chọn</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeMusicModal}>
                <Text style={styles.modalCloseText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Icon Modal */}
      <Modal visible={iconModalVisible} animationType="slide" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIconModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Thêm Sticker</Text>
              <View style={styles.iconGrid}>
                {['😀', '😂', '😍', '🔥', '✨', '🎉', '❤️', '😎', '👻', '👑', '🌈', '🚀'].map((emoji, i) => (
                  <TouchableOpacity key={i} style={styles.iconGridItem} onPress={() => addSticker(emoji, 'emoji')}>
                    <Text style={styles.iconText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIconModalVisible(false)}>
                <Text style={styles.modalCloseText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Text Modal */}
      <Modal visible={textModalVisible} animationType="fade" transparent={true}>
        <TouchableOpacity style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]} activeOpacity={1} onPress={() => setTextModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={{ width: '100%', alignItems: 'center' }}>
              
              {/* Styling Controls */}
              <View style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}>
                <TouchableOpacity style={styles.styleBtn} onPress={() => setCurrentFontIdx((i) => (i + 1) % fonts.length)}>
                  <Text style={{color:'white'}}>Đổi Font</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.styleBtn} onPress={() => setCurrentBgIdx((i) => (i + 1) % bgColors.length)}>
                  <Text style={{color:'white'}}>Đổi Nền</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.textStickerInput, { fontFamily: fonts[currentFontIdx], backgroundColor: bgColors[currentBgIdx] }]}
                placeholder="Nhập chữ..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={stickerText}
                onChangeText={setStickerText}
                autoFocus
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, width: '100%' }}>
                <TouchableOpacity style={{ padding: 15 }} onPress={() => setTextModalVisible(false)}>
                  <Text style={{ color: 'white', fontSize: 18 }}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ padding: 15 }} onPress={() => addSticker(stickerText, 'text')}>
                  <Text style={{ color: '#fca311', fontSize: 18, fontWeight: 'bold' }}>Thêm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#282522' },
  permissionButton: { backgroundColor: '#3399FF', padding: 15, borderRadius: 30, alignSelf: 'center', marginTop: 10 },
  permissionText: { fontWeight: 'bold', fontSize: 16, color: 'white' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  headerIconBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  everyoneBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30 },
  everyoneText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginRight: 5 },

  mainContent: { flex: 1, alignItems: 'center' },
  cameraWrapper: { width: '90%', aspectRatio: 3 / 4, borderRadius: 45, overflow: 'hidden', backgroundColor: 'black', position: 'relative' },
  
  musicPill: { position: 'absolute', top: 20, alignSelf: 'center', flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, alignItems: 'center', maxWidth: '60%', zIndex: 10 },
  musicPillText: { color: 'white', fontWeight: 'bold' },

  infoContainer: { alignItems: 'center', marginTop: 20 },
  infoTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  infoDate: { color: '#a0a0a0', fontWeight: 'normal' },
  activityBtn: { marginTop: 15, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  activityText: { color: '#a0a0a0', fontSize: 16, fontWeight: 'bold' },

  bottomNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 40, paddingTop: 20 },
  navBtn: { padding: 10 },
  captureBtnWrapper: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fca311', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.8)' },
  
  toolsContainer: { position: 'absolute', right: 15, top: 80, alignItems: 'center', gap: 20, zIndex: 10 },
  toolBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  
  captionInput: { position: 'absolute', bottom: 20, alignSelf: 'center', minWidth: '50%', maxWidth: '90%', minHeight: 50, maxHeight: 120, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 25, color: 'white', fontSize: 18, fontWeight: '500', paddingHorizontal: 20, paddingVertical: 15, textAlign: 'center', zIndex: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#282522', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, maxHeight: '60%' },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  
  searchInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', padding: 15, borderRadius: 15, fontSize: 16 },
  searchBtn: { backgroundColor: '#fca311', padding: 15, borderRadius: 15, marginLeft: 10, justifyContent: 'center', alignItems: 'center' },
  
  musicItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  musicTrackText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  musicArtistText: { color: '#a0a0a0', fontSize: 14, marginTop: 4 },
  
  modalCloseBtn: { marginTop: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, alignItems: 'center' },
  modalCloseText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  iconGridItem: { width: '22%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  iconText: { fontSize: 35 },
  
  flipCameraBtn: { position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  textSticker: { color: 'white', fontSize: 28, fontWeight: 'bold', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, overflow: 'hidden' },
  selectMusicBtn: { backgroundColor: '#fca311', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, marginLeft: 10 },
  textStickerInput: { color: 'white', fontSize: 30, textAlign: 'center', borderRadius: 20, padding: 20, minWidth: '60%' },
  
  scaleControls: { position: 'absolute', bottom: 150, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 30, paddingHorizontal: 15, paddingVertical: 10, gap: 15, zIndex: 50 },
  scaleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  scaleBtnText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: -2 },
  styleBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
});