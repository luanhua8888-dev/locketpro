import React, { useState, useRef, useEffect } from 'react'; // force reload
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Modal, ScrollView, Animated, PanResponder, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { LayoutGrid, Upload, User, MessageCircle, ChevronDown, X, Send, Music, Smile, Search, Play, Pause, FlipHorizontal, RotateCcw, Type, ImagePlus, Users } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Audio, Video, ResizeMode } from 'expo-av';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { BlurView } from 'expo-blur';
import ViewShot from 'react-native-view-shot';

const DraggableSticker = ({ id, emoji, type, x, y, scale: initialScale, rotation: initialRotation, fontFamily, bgColor, isActive, onTap, onDelete, onUpdatePos, onUpdateScale, onUpdateRotation }: any) => {
  const pan = useRef(new Animated.ValueXY({ x: x, y: y })).current;
  const scale = useRef(new Animated.Value(initialScale || 1)).current;
  const baseScale = useRef(initialScale || 1);
  const rotation = useRef(new Animated.Value(initialRotation || 0)).current;
  const baseRotation = useRef(initialRotation || 0);
  const initialDistance = useRef<number | null>(null);
  const lastTap = useRef(0);

  const getDistance = (touches: any) => {
    if (touches.length < 2) return null;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const deletePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
         if (onDelete) onDelete(id);
      }
    })
  ).current;

  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gesture) => {
         const deltaScale = (gesture.dx + gesture.dy) * 0.005;
         scale.setValue(Math.max(0.2, baseScale.current + deltaScale));
      },
      onPanResponderRelease: (e, gesture) => {
         baseScale.current = (scale as any)._value;
         if (onUpdateScale) onUpdateScale(id, baseScale.current);
      }
    })
  ).current;

  const rotatePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gesture) => {
         const deltaRotation = - (gesture.dx + gesture.dy);
         rotation.setValue(baseRotation.current + deltaRotation);
      },
      onPanResponderRelease: (e, gesture) => {
         baseRotation.current = (rotation as any)._value;
         if (onUpdateRotation) onUpdateRotation(id, baseRotation.current);
      }
    })
  ).current;

  const rotationStr = rotation.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg']
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
        const touches = e.nativeEvent.touches;
        if (touches.length >= 2) {
          initialDistance.current = getDistance(touches);
        }
      },
      onPanResponderMove: (e, gesture) => {
        const touches = e.nativeEvent.touches;
        if (touches.length >= 2) {
           const currentDistance = getDistance(touches);
           if (!initialDistance.current) {
              initialDistance.current = currentDistance;
           } else if (currentDistance) {
              const scaleFactor = currentDistance / initialDistance.current;
              scale.setValue(Math.max(0.2, baseScale.current * scaleFactor));
           }
        } else if (touches.length === 1) {
           if (initialDistance.current) {
              initialDistance.current = null;
              baseScale.current = (scale as any)._value;
              pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
              pan.setValue({ x: 0, y: 0 });
           } else {
              pan.setValue({ x: gesture.dx, y: gesture.dy });
           }
        }
      },
      onPanResponderRelease: (e, gesture) => {
        pan.flattenOffset();
        baseScale.current = (scale as any)._value; // save the new base scale
        if (onUpdatePos) {
          onUpdatePos(id, (pan.x as any)._value, (pan.y as any)._value);
        }
        if (onUpdateScale) {
          onUpdateScale(id, baseScale.current);
        }
        
        if (Math.abs(gesture.dx) < 5 && Math.abs(gesture.dy) < 5 && e.nativeEvent.touches.length === 0) {
          const now = Date.now();
          onTap(id);
          lastTap.current = now;
        }
        initialDistance.current = null;
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
        { position: 'absolute', zIndex: isActive ? 30 : 20, transform: [{ scale: scale }, { rotate: rotationStr }] }
      ]}
    >
      <View style={isActive ? { borderWidth: 2, borderColor: 'white', borderStyle: 'dashed', padding: 5, borderRadius: 10 } : {}}>
        {isActive && (
          <View 
            {...deletePanResponder.panHandlers}
            style={{ position: 'absolute', top: -15, left: -15, width: 30, height: 30, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', zIndex: 100, elevation: 10 }}
          >
            <X color="white" size={18} />
          </View>
        )}
        {type === 'image' ? (
           <Image source={{ uri: emoji }} style={{ width: 120, height: 120 }} resizeMode="contain" />
        ) : (
           <Text style={stickerStyle}>{emoji}</Text>
        )}
        {isActive && (
          <>
            <View 
              {...handlePanResponder.panHandlers}
              style={{ position: 'absolute', bottom: -15, right: -15, width: 34, height: 34, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 17, justifyContent: 'center', alignItems: 'center', zIndex: 100, elevation: 10 }}
            >
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>⤡</Text>
            </View>
            <View 
              {...rotatePanResponder.panHandlers}
              style={{ position: 'absolute', bottom: -15, left: -15, width: 34, height: 34, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 17, justifyContent: 'center', alignItems: 'center', zIndex: 100, elevation: 10 }}
            >
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>↻</Text>
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
};


const STICKER_DB = [
  { e: '😀', k: 'cuoi vui smile happy' },
  { e: '😂', k: 'cuoi to laugh haha' },
  { e: '😭', k: 'khoc cry buon sad' },
  { e: '🥺', k: 'nan ni please cute' },
  { e: '🥰', k: 'yeu thuong thich love' },
  { e: '😎', k: 'ngau cool kinh' },
  { e: '😡', k: 'gian tuc mad angry' },
  { e: '😱', k: 'so hai OMG scared' },
  { e: '🤔', k: 'suy nghi think' },
  { e: '😴', k: 'ngu buon ngu sleep' },
  { e: '❤️', k: 'tim trai tim heart love yeu' },
  { e: '💔', k: 'vo tim broken heart' },
  { e: '🔥', k: 'lua fire hot chay' },
  { e: '✨', k: 'lap lanh lấp lánh sao star sparkle' },
  { e: '👍', k: 'like thich tot ok' },
  { e: '👎', k: 'dislike che no' },
  { e: '✌️', k: 'peace hi chao hai' },
  { e: '🙏', k: 'cau nguyen cam on pray thanks' },
  { e: '💪', k: 'khoe co bap strong' },
  { e: '🎉', k: 'chuc mung party tung bung' },
  { e: '🎁', k: 'qua tang gift present' },
  { e: '🎂', k: 'banh sinh nhat cake birthday food' },
  { e: '🐶', k: 'cho dog cun animal' },
  { e: '🐱', k: 'meo cat animal' },
  { e: '🐷', k: 'heo pig lon animal' },
  { e: '🐸', k: 'ech frog pepe' },
  { e: '🚗', k: 'xe oto car vehicle' },
  { e: '⚽', k: 'bong da the thao football soccer sport' },
  { e: '🎮', k: 'game choi play' },
  { e: '🍕', k: 'pizza do an food' },
  { e: '☕', k: 'cafe coffee uong' },
  { e: '🍺', k: 'bia bia beer uong' },
  { e: '💯', k: '100 diem tuyet doi perfect' },
  { e: '🎵', k: 'nhac am nhac music' },
  { e: '🌞', k: 'mat troi nang sun' },
  { e: '🌧️', k: 'mua rain' },
  { e: '🌈', k: 'cau vong rainbow' },
  { e: '🌸', k: 'hoa bong hoa flower' },
  { e: '💸', k: 'tien money bay' },
];

const { width, height } = Dimensions.get('window');

export default function CameraScreen({ session }: { session: Session | null }) {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
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
  const [stickerSearch, setStickerSearch] = useState('');
  
  // Layout State
  const [layoutMode, setLayoutMode] = useState<'1' | '4' | '6' | '8'>('1');
  const [layoutPhotos, setLayoutPhotos] = useState<{uri: string, base64?: string}[]>([]);
  const [layoutModalVisible, setLayoutModalVisible] = useState(false);
  const viewShotRef = useRef<any>(null);

  // Stickers state
  const [stickers, setStickers] = useState<{id: string, emoji: string, type: 'emoji' | 'text', x: number, y: number, scale: number, fontFamily?: string, bgColor?: string}[]>([]);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [stickerText, setStickerText] = useState('');
  
  // Text styling states
  const fonts = ['System', 'DancingScript_400Regular', 'DancingScript_700Bold'];
  const bgColors = ['transparent', 'rgba(0,0,0,0.5)', 'rgba(255,255,255,0.5)', '#EFE8DD'];
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
        if (layoutMode === '1') {
          setPhoto({ uri: photoData.uri, base64: photoData.base64 });
        } else {
          const newPhotos = [...layoutPhotos, { uri: photoData.uri, base64: photoData.base64 }];
          setLayoutPhotos(newPhotos);
          if (newPhotos.length === parseInt(layoutMode, 10)) {
            setPhoto({ uri: 'collage' });
          }
        }
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
    setLayoutPhotos([]);
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
      if (!res.ok) throw new Error("API limit");
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (e) {
      console.log('Music API Error:', e);
      // Fallback data if rate limited
      setSearchResults([
        {
          trackName: 'Hello',
          artistName: 'Adele',
          previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/93/22/22/93222271-8d55-d923-e0ff-b2964a5abefe/mzaf_3513742103157153222.plus.aac.p.m4a'
        },
        {
          trackName: 'Little Saint Nick',
          artistName: 'The Beach Boys',
          previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/af/7f/38/af7f383f-fb9c-cad4-365f-1f8e07827fdc/mzaf_1413445486911572153.plus.aac.p.m4a'
        },
        {
          trackName: 'Lỗi iTunes API (Rate Limit)',
          artistName: 'Thử lại sau 1 phút',
          previewUrl: ''
        }
      ]);
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

  const pickMainMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (layoutMode === '1') {
        if (asset.type === 'video') {
          setVideo({ uri: asset.uri });
        } else {
          setPhoto({ uri: asset.uri, base64: asset.base64 });
        }
      } else {
        if (asset.type !== 'video') {
          const newPhotos = [...layoutPhotos, { uri: asset.uri, base64: asset.base64 }];
          setLayoutPhotos(newPhotos);
          if (newPhotos.length === parseInt(layoutMode, 10)) {
            setPhoto({ uri: 'collage' });
          }
        } else {
          Toast.show({ type: 'error', text1: 'Không hỗ trợ', text2: 'Video không thể dùng trong chế độ bố cục.' });
        }
      }
    }
  };

  const pickImageSticker = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      const newSticker = {
        id: Date.now().toString(),
        emoji: uri,
        type: 'image' as any,
        x: width / 2 - 50,
        y: height / 2 - 50,
        scale: 1,
        rotation: 0,
      };
      setStickers([...stickers, newSticker]);
      setActiveStickerId(newSticker.id);
    }
  };

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
      rotation: 0,
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

  const updateStickerScaleAbsolute = (id: string, newScale: number) => {
    setStickers(s => s.map(st => st.id === id ? { ...st, scale: newScale } : st));
  };

  const updateStickerRotation = (id: string, newRotation: number) => {
    setStickers(s => s.map(st => st.id === id ? { ...st, rotation: newRotation } : st));
  };

  const updateStickerPos = (id: string, x: number, y: number) => {
    setStickers(prev => prev.map(s => s.id === id ? { ...s, x, y } : s));
  };

  async function sendMedia() {
    const mediaUri = photo?.uri || video?.uri;
    if (!mediaUri || !session?.user) return;
    
    // Deselect sticker to hide handles
    setActiveStickerId(null);
    setIsUploading(true);

    // Wait a brief moment for state to update and re-render without handles
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const isVideo = !!video;
      const ext = isVideo ? 'mp4' : 'jpg';
      const filePath = `${session.user.id}/${Date.now()}.${ext}`;
      
      let finalUri = mediaUri;

      if (!isVideo) {
        if (viewShotRef.current) {
          // Lấy ảnh đã ghép từ ViewShot dưới dạng file tạm
          let capturedUri = await viewShotRef.current.capture({ format: 'jpg', quality: 0.6, result: 'tmpfile' });
          if (capturedUri.startsWith('/')) capturedUri = `file://${capturedUri}`;
          finalUri = capturedUri;
        } else if (photo?.uri === 'collage') {
          throw new Error('Không thể gộp ảnh, thử lại sau');
        }
      }

      // Dùng fetch để lấy định dạng Blob (chuẩn và ít lỗi Network nhất trên React Native)
      const response = await fetch(finalUri);
      const blob = await response.blob();

      const { error: storageError } = await supabase.storage
        .from('photos')
        .upload(filePath, blob, {
          contentType: isVideo ? 'video/mp4' : 'image/jpeg',
        });

      if (storageError) throw storageError;

      const { data: publicUrlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      const insertData: any = {
        user_id: session.user.id,
        image_url: publicUrlData.publicUrl,
        caption: caption || null,
        song_preview_url: selectedMusic?.url || null,
        song_title: selectedMusic?.title || null,
        stickers_json: stickers.length > 0 ? stickers : null,
      };

      // Fetch username to save into photos table
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .maybeSingle();
        
      if (profile?.username) {
        insertData.username = profile.username;
      }

      const { error: dbError } = await supabase
        .from('photos')
        .insert(insertData);

      if (dbError) throw dbError;

      Toast.show({
        type: 'success',
        text1: 'Đăng bài thành công!',
        position: 'top',
        topOffset: 60,
      });
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
      <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Profile')}>
        <User color="white" size={24} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.everyoneBtn}>
        <Text style={styles.everyoneText}>Mọi người</Text>
        <ChevronDown color="white" size={20} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Friends')}>
        <Users color="white" size={24} />
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
        <TouchableWithoutFeedback onPress={() => { setActiveStickerId(null); Keyboard.dismiss(); }}>
          <View style={styles.cameraShadowContainer} collapsable={false}>
            <View style={styles.cameraWrapper} collapsable={false}>
            {!hasMedia ? (
              isFocused ? (
                <>
                  <CameraView style={StyleSheet.absoluteFillObject} facing={facing} ref={cameraRef} mode="video" />
                  {layoutMode !== '1' && (
                     <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap', padding: 5 }} pointerEvents="none">
                       {Array.from({ length: parseInt(layoutMode, 10) }).map((_, idx) => (
                         <View key={idx} style={{ width: '50%', height: `${100 / (parseInt(layoutMode, 10) / 2)}%`, padding: 5 }}>
                           <View style={{ flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: idx === layoutPhotos.length ? 4 : 0, borderColor: '#EFE8DD' }}>
                             {layoutPhotos[idx] ? (
                               <Image source={{ uri: layoutPhotos[idx].uri }} style={{ flex: 1, resizeMode: 'cover' }} />
                             ) : (
                               <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} />
                             )}
                           </View>
                         </View>
                       ))}
                     </View>
                  )}
                  <TouchableOpacity 
                    style={[styles.flipCameraBtn, { top: 80, bottom: 'auto' }]}
                    onPress={() => setLayoutModalVisible(true)}
                  >
                    <LayoutGrid color="white" size={24} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.flipCameraBtn}
                    onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
                  >
                    <FlipHorizontal color="white" size={24} />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'black' }]} />
              )
            ) : (
              <ViewShot ref={viewShotRef} collapsable={false} options={{ format: 'jpg', quality: 0.9 }} style={StyleSheet.absoluteFillObject}>
                {photo ? (
                  photo.uri === 'collage' ? (
                     <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#091B42', padding: 5 }}>
                       {layoutPhotos.map((p, idx) => (
                         <View key={idx} style={{ width: '50%', height: `${100 / (parseInt(layoutMode, 10) / 2)}%`, padding: 5 }}>
                           <Image source={{ uri: p.uri }} style={{ flex: 1, borderRadius: 20, resizeMode: 'cover' }} />
                         </View>
                       ))}
                     </View>
                  ) : (
                    <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFillObject} />
                  )
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
                       setActiveStickerId(id);
                    }}
                    onDelete={(id: string) => {
                       setStickers(s => s.filter(st => st.id !== id));
                       setActiveStickerId(null);
                    }}
                    onUpdatePos={updateStickerPos}
                    onUpdateScale={updateStickerScaleAbsolute}
                    onUpdateRotation={updateStickerRotation}
                  />
                ))}

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
                  <TouchableOpacity style={styles.toolBtn} onPress={pickImageSticker}>
                    <ImagePlus color="white" size={26} />
                  </TouchableOpacity>
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
              </ViewShot>
            )}
            </View>
          </View>
        </TouchableWithoutFeedback>

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
          <TouchableOpacity style={[styles.captureBtnWrapper, { borderColor: '#EFE8DD', backgroundColor: '#EFE8DD' }]} onPress={sendMedia} disabled={isUploading}>
            {isUploading ? <ActivityIndicator color="black" size="large" /> : <Send color="black" size={36} style={{ marginLeft: 5 }} />}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.navBtn} onPress={pickMainMedia}>
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

              {isSearching ? <ActivityIndicator size="large" color="#EFE8DD" /> : (
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
                        onPress={() => {
                          setSelectedMusic({ title: item.trackName + ' - ' + item.artistName, url: item.previewUrl });
                          closeMusicModal();
                        }}
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
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={{ flex: 1, justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setIconModalVisible(false)}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { height: '80%', backgroundColor: 'rgba(40,37,34,0.9)', borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: 20 }]}>
                {/* Drag handle */}
                <View style={{ width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, alignSelf: 'center', marginVertical: 15 }} />
                
                {/* Search Bar */}
                <View style={{ flexDirection: 'row', marginBottom: 20, alignItems: 'center' }}>
                  <TextInput 
                    style={[styles.searchInput, { flex: 1, padding: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' }]}
                    placeholder="Tìm kiếm Sticker..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={stickerSearch}
                    onChangeText={setStickerSearch}
                  />
                  {stickerSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setStickerSearch('')} style={{ position: 'absolute', right: 15 }}>
                      <X color="white" size={20} />
                    </TouchableOpacity>
                  )}
                </View>
                
                <ScrollView 
                  style={{ flex: 1, width: '100%' }} 
                  showsVerticalScrollIndicator={false}
                  onScroll={(e) => {
                    if (e.nativeEvent.contentOffset.y < -80) {
                      setIconModalVisible(false); // Pull down to close
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  <View style={styles.iconGrid}>
                    {STICKER_DB.filter(item => item.k.toLowerCase().includes(stickerSearch.toLowerCase())).map((item, i) => (
                      <TouchableOpacity 
                        key={i} 
                        style={styles.iconGridItem} 
                        onPress={() => {
                          addSticker(item.e, 'emoji');
                          setIconModalVisible(false);
                          setStickerSearch('');
                        }}
                        activeOpacity={0.6}
                      >
                        <Text style={styles.iconText}>{item.e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </BlurView>
      </Modal>

      {/* Text Modal */}
      <Modal visible={textModalVisible} animationType="fade" transparent={true}>
        <TouchableOpacity style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]} activeOpacity={1} onPress={() => setTextModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={{ width: '100%', alignItems: 'center' }}>
              
              {/* Styling Controls */}
              <View style={{ width: '100%', marginBottom: 15 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 15, paddingHorizontal: 20 }}>
                  {bgColors.map((color, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      onPress={() => setCurrentBgIdx(idx)}
                      style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: color === 'transparent' ? '#333' : color, borderWidth: currentBgIdx === idx ? 2 : 1, borderColor: 'white', justifyContent: 'center', alignItems: 'center' }} 
                    >
                      {color === 'transparent' && <Text style={{color:'white', fontSize: 10}}>Rỗng</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={{ width: '100%', marginBottom: 20 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
                  {fonts.map((f, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      onPress={() => setCurrentFontIdx(idx)}
                      style={{ paddingHorizontal: 15, paddingVertical: 8, backgroundColor: currentFontIdx === idx ? 'white' : 'rgba(255,255,255,0.2)', borderRadius: 15 }} 
                    >
                      <Text style={{ color: currentFontIdx === idx ? 'black' : 'white', fontFamily: f }}>Aa</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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
                  <Text style={{ color: '#EFE8DD', fontSize: 18, fontWeight: 'bold' }}>Thêm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Layout Selection Modal */}
      <Modal visible={layoutModalVisible} animationType="fade" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLayoutModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={styles.modalTitle}>Chọn Bố Cục Lưới</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20, paddingBottom: 20 }}>
                {['1', '4', '6', '8'].map(mode => (
                  <TouchableOpacity 
                    key={mode}
                    style={{ width: 80, height: 80, borderRadius: 15, backgroundColor: layoutMode === mode ? '#EFE8DD' : 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => { setLayoutMode(mode as any); setLayoutPhotos([]); setLayoutModalVisible(false); }}
                  >
                    <Text style={{ color: layoutMode === mode ? 'black' : 'white', fontSize: 24, fontWeight: 'bold' }}>{mode === '1' ? '1' : mode}</Text>
                    <Text style={{ color: layoutMode === mode ? 'black' : 'gray', fontSize: 12 }}>{mode === '1' ? 'Mặc định' : 'Ảnh'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#091B42' },
  permissionButton: { backgroundColor: '#3399FF', padding: 15, borderRadius: 30, alignSelf: 'center', marginTop: 10 },
  permissionText: { fontWeight: 'bold', fontSize: 16, color: 'white' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  headerIconBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  everyoneBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30 },
  everyoneText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginRight: 5 },

  mainContent: { flex: 1, alignItems: 'center' },
  cameraShadowContainer: { width: '90%', aspectRatio: 3 / 4, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  cameraWrapper: { flex: 1, borderRadius: 45, overflow: 'hidden', backgroundColor: 'black', position: 'relative' },
  
  musicPill: { position: 'absolute', top: 20, alignSelf: 'center', flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, alignItems: 'center', maxWidth: '60%', zIndex: 10 },
  musicPillText: { color: 'white', fontWeight: 'bold' },

  infoContainer: { alignItems: 'center', marginTop: 20 },
  infoTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  infoDate: { color: '#a0a0a0', fontWeight: 'normal' },
  activityBtn: { marginTop: 15, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  activityText: { color: '#a0a0a0', fontSize: 16, fontWeight: 'bold' },

  bottomNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 40, paddingTop: 20 },
  navBtn: { padding: 10 },
  captureBtnWrapper: { width: 85, height: 85, borderRadius: 42.5, borderWidth: 4, borderColor: '#EFE8DD', justifyContent: 'center', alignItems: 'center', shadowColor: '#EFE8DD', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 15 },
  captureBtnInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.9)' },
  
  toolsContainer: { position: 'absolute', right: 15, top: 80, alignItems: 'center', gap: 20, zIndex: 999, elevation: 999 },
  toolBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  
  captionInput: { position: 'absolute', bottom: 20, alignSelf: 'center', minWidth: '50%', maxWidth: '90%', minHeight: 50, maxHeight: 120, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 25, color: 'white', fontSize: 18, fontWeight: '500', paddingHorizontal: 20, paddingVertical: 15, textAlign: 'center', zIndex: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#091B42', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, maxHeight: '60%' },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  
  searchInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', padding: 15, borderRadius: 15, fontSize: 16 },
  searchBtn: { backgroundColor: '#EFE8DD', padding: 15, borderRadius: 15, marginLeft: 10, justifyContent: 'center', alignItems: 'center' },
  
  musicItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  musicTrackText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  musicArtistText: { color: '#a0a0a0', fontSize: 14, marginTop: 4 },
  
  modalCloseBtn: { marginTop: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, alignItems: 'center' },
  modalCloseText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  iconGridItem: { width: '22%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  iconText: { fontSize: 35 },
  
  flipCameraBtn: { position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  textSticker: { color: 'white', fontSize: 28, fontWeight: 'bold', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, overflow: 'hidden' },
  selectMusicBtn: { backgroundColor: '#EFE8DD', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, marginLeft: 10 },
  textStickerInput: { color: 'white', fontSize: 30, textAlign: 'center', borderRadius: 20, padding: 20, minWidth: '60%' },
  
  scaleControls: { position: 'absolute', bottom: 150, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 30, paddingHorizontal: 15, paddingVertical: 10, gap: 15, zIndex: 50 },
  scaleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  scaleBtnText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: -2 },
  styleBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
});