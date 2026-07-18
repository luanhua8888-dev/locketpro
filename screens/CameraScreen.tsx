import React, { useState, useRef, useEffect } from 'react'; // force reload
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Modal, ScrollView, Animated, PanResponder, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { LayoutGrid, Upload, Send, Smile, RotateCcw, ImagePlus, Type, X, Plus, Music, RefreshCcw, GalleryHorizontal, User, MessageCircle, ChevronDown, Search, Play, Pause, Users } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { BlurView } from 'expo-blur';
import ViewShot from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';

type GradientColors = readonly [string, string, ...string[]];

const GRADIENTS: Record<string, GradientColors> = {
  'grad_sunset': ['#FF512F', '#F09819'],
  'grad_cyberpunk': ['#f83600', '#f9d423'],
  'grad_pastel': ['#ffecd2', '#fcb69f'],
  'grad_purple': ['#B39DDB', '#C4B5FD'],
  'anim_rainbow': ['#ff0f7b', '#f89b29', '#ff0f7b'],
  'anim_ocean': ['#4FACFE', '#00F2FE', '#4FACFE'],
};

const GradientBg = ({ bgId }: { bgId: string }) => {
  const isAnim = bgId?.startsWith('anim_');
  const colors = GRADIENTS[bgId] || (['transparent', 'transparent'] as const);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAnim) {
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isAnim]);

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (!bgId?.startsWith('grad_') && !isAnim) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: 10, overflow: 'hidden' }]}>
      {isAnim ? (
         <Animated.View style={{ width: '200%', height: '200%', top: '-50%', left: '-50%', transform: [{ rotate }] }}>
            <LinearGradient colors={colors} style={{ flex: 1 }} />
         </Animated.View>
      ) : (
         <LinearGradient colors={colors} start={{x:0, y:0}} end={{x:1, y:1}} style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
};

const AutoPlayVideo = ({ source, muted = false }: { source: string; muted?: boolean }) => {
  const player = useVideoPlayer(source, instance => {
    instance.loop = true;
    instance.muted = muted;
    instance.play();
  });

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      surfaceType="textureView"
    />
  );
};

const DraggableSticker = ({ id, emoji, type, x, y, scale: initialScale, rotation: initialRotation, fontFamily, bgColor, textColor, isActive, onTap, onDelete, onUpdatePos, onUpdateScale, onUpdateRotation }: any) => {
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
        baseScale.current = (scale as any)._value;
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

  const isGradient = bgColor?.startsWith('grad_') || bgColor?.startsWith('anim_');
  const isImageBg = bgColor?.startsWith('http');
  const stickerStyle: any = type === 'text' 
    ? [styles.textSticker, { 
        fontFamily: fontFamily || 'System', 
        backgroundColor: (isGradient || isImageBg) ? 'transparent' : (bgColor || 'rgba(0,0,0,0.5)'), 
        color: textColor || 'white' 
      }] 
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
           <View style={{ borderRadius: 15, overflow: 'hidden' }}>
             {isGradient && <GradientBg bgId={bgColor} />}
             {isImageBg && <Image source={{ uri: bgColor }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
             <Text style={stickerStyle}>{emoji}</Text>
           </View>
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
  const [isFrontPhoto, setIsFrontPhoto] = useState(false); // track xem ảnh chụp bằng cam trước không
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
  
  // Camera Mode State (Photo vs Video)
  const [cameraMode, setCameraMode] = useState<'picture' | 'video'>('picture');
  const isRecordingIntent = useRef(false);
  
  // Photo Template State
  const [photoTemplate, setPhotoTemplate] = useState<'none' | 'polaroid' | 'film' | 'mac-os' | 'neon'>('none');
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const viewShotRef = useRef<any>(null);

  // Stickers state
  const [stickers, setStickers] = useState<{id: string, emoji: string, type: 'emoji' | 'text' | 'image', x: number, y: number, scale: number, rotation: number, fontFamily?: string, bgColor?: string, textColor?: string}[]>([]);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [stickerText, setStickerText] = useState('');
  
  // Text styling states
  const fonts = [
    'System', 'DancingScript_400Regular', 'DancingScript_700Bold', 
    Platform.OS === 'ios' ? 'Georgia' : 'serif',
    Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    Platform.OS === 'ios' ? 'Palatino' : 'notoserif',
    Platform.OS === 'ios' ? 'Trebuchet MS' : 'sans-serif-condensed',
    Platform.OS === 'ios' ? 'Arial' : 'sans-serif-medium',
    Platform.OS === 'ios' ? 'Futura' : 'sans-serif-light',
    Platform.OS === 'ios' ? 'Baskerville' : 'sans-serif-thin'
  ];
  const bgColors = [
    'transparent', 'rgba(0,0,0,0.5)',
    '#EFE8DD', '#1A1A1A', '#FF007F', '#C4B5FD', 
    '#A8E6CF', '#F4A261', '#6667AB', 
    'grad_sunset', 'grad_cyberpunk', 'grad_pastel', 'grad_purple',
    'anim_rainbow', 'anim_ocean',
    'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=200',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200',
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=200',
    'https://images.unsplash.com/photo-1519750783826-e2420f4d687f?w=200',
  ];
  const textColors = [
    '#FFFFFF', '#1A1A1A', '#FF007F', '#FF69B4', '#B39DDB', '#C4B5FD', 
    '#00FFFF', '#81B29A', '#A8E6CF', '#F4A261', '#FF7E67', '#6667AB', 
    '#E0218A', '#FFCC00', '#4CD964'
  ];
  
  const [currentFontIdx, setCurrentFontIdx] = useState(0);
  const [currentBgIdx, setCurrentBgIdx] = useState(1);
  const [currentTextColorIdx, setCurrentTextColorIdx] = useState(0);
  
  // Comment and Reaction states
  const [commentText, setCommentText] = useState('');
  const [currentVisiblePhoto, setCurrentVisiblePhoto] = useState<any>(null);
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentVisiblePhoto(viewableItems[0].item);
    }
  }).current;
  
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const sendComment = async () => {
    if (!commentText.trim() || !currentVisiblePhoto) return;
    const text = commentText.trim();
    setCommentText('');
    
    const { error } = await supabase.from('chat_messages').insert({
      sender_id: session?.user?.id,
      receiver_id: currentVisiblePhoto.user_id,
      photo_id: currentVisiblePhoto.id,
      content: text
    });
    
    if (error) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: error.message, position: 'top' });
    } else {
      Toast.show({ type: 'success', text1: `Đã gửi tin nhắn cho ${currentVisiblePhoto.username || 'bạn bè'}`, position: 'top' });
    }
  };

  const sendReaction = async (emoji: string) => {
    if (!currentVisiblePhoto) return;
    
    const { error } = await supabase.from('chat_messages').insert({
      sender_id: session?.user?.id,
      receiver_id: currentVisiblePhoto.user_id,
      photo_id: currentVisiblePhoto.id,
      content: emoji
    });

    if (error) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: error.message, position: 'top' });
    } else {
      Toast.show({ type: 'success', text1: `Đã thả ${emoji} cho ${currentVisiblePhoto.username || 'bạn bè'}`, position: 'top' });
    }
  };

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [userRole, setUserRole] = useState('user');
  
  const [filterUser, setFilterUser] = useState<{id: string, name: string}>({id: 'all', name: 'Mọi người'});
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [historyFeedVisible, setHistoryFeedVisible] = useState(false);
  const [historyPhotos, setHistoryPhotos] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    setHistoryFeedVisible(true);
    
    let allowedIds: string[] = [];
    if (filterUser.id === 'all') {
      const { data: friendData } = await supabase
        .from('friendships')
        .select(`requester_id, receiver_id`)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${session?.user?.id},receiver_id.eq.${session?.user?.id}`);
        
      const friendIds = new Set<string>();
      if (session?.user?.id) friendIds.add(session.user.id);
      
      if (friendData) {
        friendData.forEach((f: any) => {
          friendIds.add(f.requester_id);
          friendIds.add(f.receiver_id);
        });
      }
      allowedIds = Array.from(friendIds);
    } else {
      allowedIds = [filterUser.id];
    }
    
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .in('user_id', allowedIds)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.log('Error fetching history:', error);
    }

    setHistoryPhotos(data || []);
    setLoadingHistory(false);
  };

  const historyFeedVisibleRef = useRef(historyFeedVisible);
  const fetchHistoryRef = useRef(fetchHistory);
  const hasMediaRef = useRef(false);

  useEffect(() => {
    historyFeedVisibleRef.current = historyFeedVisible;
    fetchHistoryRef.current = fetchHistory;
  }, [historyFeedVisible, fetchHistory]);

  const hasMedia = !!photo || !!video;
  useEffect(() => {
    hasMediaRef.current = hasMedia;
  }, [hasMedia]);

  const swipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (historyFeedVisibleRef.current || hasMediaRef.current) return false;
        return gestureState.dy < -20 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        if (historyFeedVisibleRef.current || hasMediaRef.current) return false;
        return gestureState.dy < -20 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!historyFeedVisibleRef.current && !hasMediaRef.current && gestureState.dy < -50) {
          fetchHistoryRef.current();
        }
      }
    })
  ).current;

  useEffect(() => {
    if (session?.user?.id) {
      const fetchPendingCount = async () => {
        try {
          const { count, error } = await supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', session.user.id)
            .eq('status', 'pending');
            
          if (!error && count !== null) {
            setPendingRequestsCount(count);
          }
          
          const { data: friendData } = await supabase
            .from('friendships')
            .select(`requester_id, receiver_id, requester:profiles!requester_id(id, username), receiver:profiles!receiver_id(id, username)`)
            .eq('status', 'accepted')
            .or(`requester_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`);
            
          const formattedFriends: any[] = [];
          if (friendData) {
            friendData.forEach((f: any) => {
              const friendProfile = f.requester_id === session.user.id ? f.receiver : f.requester;
              if (friendProfile && !formattedFriends.find(x => x.id === friendProfile.id)) {
                formattedFriends.push(friendProfile);
              }
            });
          }
          setFriendsList(formattedFriends);
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
            
          if (profile?.role) {
            setUserRole(profile.role.toLowerCase().trim());
          }

          const { count: unreadMsgCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', session.user.id)
            .eq('is_read', false);
            
          if (unreadMsgCount !== null) {
            setUnreadCount(unreadMsgCount);
          }
        } catch (e) {
          console.log('Error fetching user details:', e);
        }
      };

      fetchPendingCount();
      const unsubscribe = navigation.addListener('focus', () => {
        fetchPendingCount();
      });
      return unsubscribe;
    }
  }, [session, navigation]);

  // Music state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const previewPlayer = useAudioPlayer(null);
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
    setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
  }, []);

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
        // Lưu lại trạng thái cam trước để lật ảnh khi hiển thị
        setIsFrontPhoto(facing === 'front');
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
    setCameraMode('video');
    isRecordingIntent.current = true;
    setIsRecording(true);
    
    // Đợi 500ms để CameraView kịp chuyển sang chế độ video
    setTimeout(async () => {
      if (cameraRef.current && isRecordingIntent.current) {
        try {
          const videoData = await cameraRef.current.recordAsync({ maxDuration: 60 });
          if (videoData) {
            setVideo({ uri: videoData.uri });
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsRecording(false);
          setCameraMode('picture');
        }
      } else {
        // Nếu người dùng đã thả tay ra trước khi 500ms
        setIsRecording(false);
        setCameraMode('picture');
      }
    }, 500);
  }

  function stopRecording() {
    isRecordingIntent.current = false;
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
    setIsFrontPhoto(false);
    try { if (previewPlayer.isLoaded) previewPlayer.pause(); } catch (e) {}
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
    try { if (previewPlayer.isLoaded) previewPlayer.pause(); } catch (e) {}
    setPlayingPreview(null);
    setMusicModalVisible(false);
  }

  async function playPreview(url: string) {
    if (playingPreview === url) {
      try { if (previewPlayer.isLoaded) previewPlayer.pause(); } catch (e) {}
      setPlayingPreview(null);
      return;
    }
    try {
      if (previewPlayer.isLoaded) previewPlayer.pause();
      previewPlayer.replace(url);
      previewPlayer.play();
    } catch (e) {
      // Native shared object may be stale
    }
    setPlayingPreview(url);
  }

  const pickMainMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
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
          setPhoto({ uri: asset.uri, base64: asset.base64 || undefined });
        }
      } else {
        if (asset.type !== 'video') {
          const newPhotos = [...layoutPhotos, { uri: asset.uri, base64: asset.base64 || undefined }];
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
      mediaTypes: ['images'],
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
      bgColor: bgColors[currentBgIdx],
      textColor: textColors[currentTextColorIdx]
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
    
    const isVideo = !!video;

    // Capture ảnh TRƯỚC khi thay đổi state (để tránh re-render làm ảnh bị đen)
    let uploadData: ArrayBuffer | null = null;
    if (!isVideo && viewShotRef.current) {
      // Ẩn handle sticker trước khi chụp
      setActiveStickerId(null);
      // Chờ render xong
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Dùng tmpfile - ổn định hơn base64 trên Android
      let tmpUri: string = await viewShotRef.current.capture({
        format: 'jpg',
        quality: 0.85,
        result: 'tmpfile',
      });
      
      // Đảm bảo URI có file:// prefix
      if (tmpUri && !tmpUri.startsWith('file://')) {
        tmpUri = `file://${tmpUri}`;
      }
      
      console.log('[CAPTURE] tmpUri =', tmpUri);
      
      // Đọc file bằng FileSystem legacy
      const base64str = await FileSystem.readAsStringAsync(tmpUri, {
        encoding: 'base64' as any,
      });
      
      console.log('[CAPTURE] base64 length =', base64str?.length);
      
      if (!base64str || base64str.length < 1000) {
        throw new Error('Ảnh capture lỗi (quá nhỏ), thử lại!');
      }
      
      uploadData = decode(base64str);
      console.log('[CAPTURE] uploadData bytes =', uploadData?.byteLength);
    }

    setIsUploading(true);

    try {
      const fileExt = isVideo ? 'mp4' : 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;
      
      let finalUri = mediaUri;

      let uploadError: any = null;

      if (isVideo) {
        // Video: XHR blob
        const videoBlob: Blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => resolve(xhr.response);
          xhr.onerror = () => reject(new Error('Không thể đọc video'));
          xhr.responseType = 'blob';
          xhr.open('GET', finalUri, true);
          xhr.send(null);
        });
        const { error } = await supabase.storage
          .from('photos')
          .upload(filePath, videoBlob, { contentType: 'video/mp4', upsert: false });
        uploadError = error;
      } else {
        const { error } = await supabase.storage
          .from('photos')
          .upload(filePath, uploadData!, { contentType: 'image/jpeg', upsert: false });
        uploadError = error;
      }

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      console.log('[POST] publicUrl =', publicUrlData.publicUrl);
      console.log('[POST] uploadData size =', uploadData?.byteLength ?? 'video');

      const insertData: any = {
        user_id: session.user.id,
        image_url: publicUrlData.publicUrl,
        caption: caption || null,
        song_preview_url: selectedMusic?.url || null,
        song_title: selectedMusic?.title || null,
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

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Profile')}>
            <User color="white" size={24} />
          </TouchableOpacity>
          {userRole === 'admin' && (
            <View style={{ overflow: 'hidden', borderRadius: 12, marginLeft: 8 }}>
              <BlurView intensity={90} tint="dark" style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' }}>
                <Text style={{ color: 'white', fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>ADMIN</Text>
              </BlurView>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.everyoneBtn} onPress={() => setFilterModalVisible(true)}>
        <Text style={styles.everyoneText}>{filterUser.name}</Text>
        <ChevronDown color="white" size={20} />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={[styles.headerIconBtn, { marginRight: 10 }]} onPress={() => navigation.navigate('Messages')}>
          <View>
            <MessageCircle color="white" size={24} />
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#FF5555', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Friends')}>
          <View>
            <Users color="white" size={24} />
            {pendingRequestsCount > 0 && (
              <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#FF5555', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
      
      {renderHeader()}

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.mainContent}
        {...swipePanResponder.panHandlers}
      >
        <TouchableWithoutFeedback onPress={() => { setActiveStickerId(null); Keyboard.dismiss(); }} disabled={historyFeedVisible}>
          <View style={styles.cameraShadowContainer} collapsable={false}>
            <View style={styles.cameraWrapper} collapsable={false}>
            {historyFeedVisible ? (
              <View style={{ flex: 1, backgroundColor: 'black' }}>
                <TouchableOpacity style={{ position: 'absolute', top: 15, left: 15, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setHistoryFeedVisible(false)}>
                  <ChevronDown color="white" size={24} />
                </TouchableOpacity>
                {loadingHistory ? (
                  <ActivityIndicator size="large" color="white" style={{ flex: 1 }} />
                ) : historyPhotos.length === 0 ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Không có bài đăng nào hôm nay</Text>
                  </View>
                ) : (
                  <>
                    <View style={{ position: 'absolute', top: 15, right: 15, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 }}>
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>{historyPhotos.length} bài</Text>
                    </View>
                    <FlatList
                      data={historyPhotos}
                      keyExtractor={item => item.id}
                      snapToInterval={width * 0.9 * (4/3)}
                      snapToAlignment="start"
                      decelerationRate="fast"
                      showsVerticalScrollIndicator={false}
                      onViewableItemsChanged={onViewableItemsChanged}
                      viewabilityConfig={viewabilityConfig}
                      getItemLayout={(data, index) => ({ length: width * 0.9 * (4/3), offset: width * 0.9 * (4/3) * index, index })}
                      renderItem={({item}) => {
                        const isVideo = item.image_url.endsWith('.mp4') || item.image_url.endsWith('.mov');
                        const frameWidth = width * 0.9;
                        const frameHeight = frameWidth * (4/3);
                      return (
                        <View style={{ width: frameWidth, height: frameHeight, justifyContent: 'center', alignItems: 'center' }}>
                          {isVideo ? (
                            <AutoPlayVideo source={item.image_url} />
                          ) : (
                            <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                          )}
                          <View style={{ position: 'absolute', bottom: 15, left: 15, right: 15 }}>
                            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 }}>
                              {item.username || 'Người dùng'}
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 }}>
                              {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        </View>
                      );
                    }}
                  />
                  </>
                )}
              </View>
            ) : !hasMedia ? (
              isFocused ? (
                <>
                  <CameraView style={StyleSheet.absoluteFill} facing={facing} ref={cameraRef} mode={cameraMode} />
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
                    <RefreshCcw color="white" size={24} />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'black' }]} />
              )
            ) : (
              <View style={StyleSheet.absoluteFill}>
                <ViewShot 
                  ref={viewShotRef} 
                  options={{ format: 'jpg', quality: 0.9 }} 
                  style={[StyleSheet.absoluteFill, { backgroundColor: 'black' }]}
                >
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
                    photoTemplate === 'polaroid' ? (
                      <View style={{ flex: 1, backgroundColor: '#EFE8DD', padding: 25, justifyContent: 'center' }}>
                        <View style={{ backgroundColor: 'white', padding: 15, paddingBottom: 80, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 }}>
                          <Image source={{ uri: photo.uri }} style={{ width: '100%', aspectRatio: 3/4, backgroundColor: '#000', transform: isFrontPhoto ? [{ scaleX: -1 }] : [] }} />
                        </View>
                      </View>
                    ) : photoTemplate === 'film' ? (
                      <View style={{ flex: 1, backgroundColor: '#111', paddingHorizontal: 40, paddingVertical: 10 }}>
                        <View style={{ position: 'absolute', left: 10, top: 0, bottom: 0, justifyContent: 'space-evenly' }}>
                          {Array(12).fill(0).map((_, i) => <View key={i} style={{ width: 15, height: 20, backgroundColor: '#fff', borderRadius: 2 }} />)}
                        </View>
                        <View style={{ position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'space-evenly' }}>
                          {Array(12).fill(0).map((_, i) => <View key={i} style={{ width: 15, height: 20, backgroundColor: '#fff', borderRadius: 2 }} />)}
                        </View>
                        <Image source={{ uri: photo.uri }} style={{ flex: 1, resizeMode: 'cover', transform: isFrontPhoto ? [{ scaleX: -1 }] : [] }} />
                      </View>
                    ) : photoTemplate === 'mac-os' ? (
                      <View style={{ flex: 1, backgroundColor: '#A2D5F2', padding: 25, justifyContent: 'center' }}>
                        <View style={{ backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, elevation: 15 }}>
                          <View style={{ height: 35, backgroundColor: '#E8E8E8', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 }}>
                            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#FF5F56', marginRight: 8 }} />
                            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFBD2E', marginRight: 8 }} />
                            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#27C93F' }} />
                          </View>
                          <Image source={{ uri: photo.uri }} style={{ width: '100%', aspectRatio: 3/4, transform: isFrontPhoto ? [{ scaleX: -1 }] : [] }} />
                        </View>
                      </View>
                    ) : photoTemplate === 'neon' ? (
                      <View style={{ flex: 1, backgroundColor: '#091B42', padding: 25, justifyContent: 'center' }}>
                        <View style={{ borderWidth: 5, borderColor: '#00E5FF', borderRadius: 20, padding: 5, shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 25 }}>
                          <Image source={{ uri: photo.uri }} style={{ width: '100%', aspectRatio: 3/4, borderRadius: 15, transform: isFrontPhoto ? [{ scaleX: -1 }] : [] }} />
                        </View>
                      </View>
                    ) : (
                      <Image source={{ uri: photo.uri }} style={[StyleSheet.absoluteFill, isFrontPhoto ? { transform: [{ scaleX: -1 }] } : {}]} />
                    )
                  )
                ) : (
                  <AutoPlayVideo source={video!.uri} />
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
                </ViewShot>

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
                  <TouchableOpacity style={styles.toolBtn} onPress={() => setTemplateModalVisible(true)}>
                    <GalleryHorizontal color="white" size={26} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolBtn} onPress={() => setMusicModalVisible(true)}>
                    <Music color="white" size={28} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolBtn} onPress={() => setIconModalVisible(true)}>
                    <Smile color="white" size={26} />
                  </TouchableOpacity>
                </View>

                {/* Caption Input */}
                <TextInput
                  style={[styles.captionInput, { bottom: keyboardHeight > 0 ? keyboardHeight + 10 : 20 }]}
                  placeholder="Thêm chú thích..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={200}
                />
              </View>
            )}
            </View>
          </View>
        </TouchableWithoutFeedback>

        {/* Bottom controls */}
        {!historyFeedVisible && (
          <View style={styles.bottomNav}>
            {/* Gallery Picker */}
            <TouchableOpacity style={styles.navBtn} onPress={pickMainMedia}>
              <Upload color="white" size={28} />
            </TouchableOpacity>

            {/* Capture Button */}
            {hasMedia ? (
              <TouchableOpacity
                style={[styles.captureBtnWrapper, { borderColor: isUploading ? '#aaa' : '#EFE8DD' }]}
                onPress={sendMedia}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="white" size="large" />
                ) : (
                  <View style={[styles.captureBtnInner, { backgroundColor: '#EFE8DD' }]}>
                    <Send color="#091B42" size={28} style={{ marginLeft: 4 }} />
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.captureBtnWrapper}
                onPress={takePicture}
                onLongPress={recordVideo}
                onPressOut={stopRecording}
                delayLongPress={300}
                disabled={isRecording && !isRecordingIntent.current}
              >
                <View style={[styles.captureBtnInner, isRecording ? { backgroundColor: '#FF4444', borderRadius: 8 } : {}]} />
              </TouchableOpacity>
            )}

            {/* Emoji / Sticker button */}
            <TouchableOpacity style={styles.navBtn} onPress={() => setIconModalVisible(true)}>
              <Smile color="white" size={28} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} animationType="fade" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Xem bài của ai?</Text>
              <ScrollView>
                {[{id: 'all', name: 'Mọi người'}, ...friendsList.map(f => ({id: f.id, name: f.username}))].map(user => (
                  <TouchableOpacity
                    key={user.id}
                    style={{ paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    onPress={() => { setFilterUser(user); setFilterModalVisible(false); }}
                  >
                    <Text style={{ color: 'white', fontSize: 16 }}>{user.name}</Text>
                    {filterUser.id === user.id && <Text style={{ color: '#EFE8DD' }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Music Modal */}
      <Modal visible={musicModalVisible} animationType="slide" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMusicModal}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>Chọn nhạc nền</Text>
              <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm bài hát..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              {isSearching ? (
                <ActivityIndicator color="white" size="large" style={{ marginVertical: 20 }} />
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {searchResults.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.musicItem}
                      onPress={() => {
                        if (item.previewUrl) {
                          setSelectedMusic({ title: `${item.trackName} - ${item.artistName}`, url: item.previewUrl });
                          closeMusicModal();
                        }
                      }}
                    >
                      <TouchableOpacity style={styles.playBtn} onPress={() => item.previewUrl && playPreview(item.previewUrl)}>
                        {playingPreview === item.previewUrl ? <Pause color="white" size={20} /> : <Play color="white" size={20} />}
                      </TouchableOpacity>
                      <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.musicTrackText} numberOfLines={1}>{item.trackName}</Text>
                        <Text style={styles.musicArtistText} numberOfLines={1}>{item.artistName}</Text>
                      </View>
                      {selectedMusic?.url === item.previewUrl && (
                        <Text style={{ color: '#EFE8DD', fontWeight: 'bold' }}>✓</Text>
                      )}
                    </TouchableOpacity>
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

      {/* Icon/Sticker Modal */}
      <Modal visible={iconModalVisible} animationType="slide" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIconModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '70%' }]}>
              <Text style={styles.modalTitle}>Chọn Sticker</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, paddingHorizontal: 15 }}>
                <Search color="white" size={20} />
                <TextInput
                  style={{ flex: 1, color: 'white', padding: 10, fontSize: 16 }}
                  placeholder="Tìm sticker..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={stickerSearch}
                  onChangeText={setStickerSearch}
                />
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.iconGrid}>
                  {STICKER_DB
                    .filter(s => !stickerSearch || s.k.toLowerCase().includes(stickerSearch.toLowerCase()) || s.e.includes(stickerSearch))
                    .map((item, idx) => (
                    <TouchableOpacity key={idx} style={styles.iconGridItem} onPress={() => addSticker(item.e, 'emoji')}>
                      <Text style={styles.iconText}>{item.e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Template Modal */}
      <Modal visible={templateModalVisible} animationType="fade" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTemplateModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { alignItems: 'center' }]}>
              <Text style={styles.modalTitle}>Chọn Khung Ảnh</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15, paddingBottom: 20 }}>
                {(['none', 'polaroid', 'film', 'mac-os', 'neon'] as const).map(tpl => (
                  <TouchableOpacity 
                    key={tpl}
                    style={{ width: 80, height: 80, borderRadius: 15, backgroundColor: photoTemplate === tpl ? '#EFE8DD' : 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => { setPhotoTemplate(tpl); setTemplateModalVisible(false); }}
                  >
                    <Text style={{ color: photoTemplate === tpl ? 'black' : 'white', fontSize: 11, fontWeight: 'bold', textAlign: 'center' }}>
                      {tpl === 'none' ? 'Bình thường' : tpl === 'polaroid' ? 'Polaroid' : tpl === 'film' ? 'Phim' : tpl === 'mac-os' ? 'Mac OS' : 'Neon'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Text Sticker Modal */}
      <Modal visible={textModalVisible} animationType="slide" transparent={true} onRequestClose={() => setTextModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTextModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>Thêm chữ</Text>
              <View style={{ width: '100%', alignItems: 'center' }}>
                
                {/* Text Color Picker */}
                <View style={{ width: '100%', marginBottom: 15 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
                    {textColors.map((color, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        onPress={() => setCurrentTextColorIdx(idx)}
                        style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: color, borderWidth: currentTextColorIdx === idx ? 3 : 1, borderColor: 'white' }} 
                      />
                    ))}
                  </ScrollView>
                </View>

                {/* Background Color Picker */}
                <View style={{ width: '100%', marginBottom: 15 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 15, paddingHorizontal: 20 }}>
                    {bgColors.map((color, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        onPress={() => setCurrentBgIdx(idx)}
                        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: color === 'transparent' ? '#333' : (color.startsWith('grad_') || color.startsWith('anim_') || color.startsWith('http')) ? '#888' : color, borderWidth: currentBgIdx === idx ? 2 : 1, borderColor: 'white', justifyContent: 'center', alignItems: 'center' }} 
                      >
                        {color === 'transparent' && <Text style={{color:'white', fontSize: 10}}>Rỗng</Text>}
                        {(color.startsWith('grad_') || color.startsWith('anim_')) && <Text style={{color:'white', fontSize: 8}}>GR</Text>}
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
                  style={[styles.textStickerInput, { fontFamily: fonts[currentFontIdx], backgroundColor: bgColors[currentBgIdx], color: textColors[currentTextColorIdx] }]}
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
                {(['1', '4', '6', '8'] as const).map(mode => (
                  <TouchableOpacity 
                    key={mode}
                    style={{ width: 80, height: 80, borderRadius: 15, backgroundColor: layoutMode === mode ? '#EFE8DD' : 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => { setLayoutMode(mode); setLayoutPhotos([]); setLayoutModalVisible(false); }}
                  >
                    <Text style={{ color: layoutMode === mode ? 'black' : 'white', fontSize: 24, fontWeight: 'bold' }}>{mode}</Text>
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

  bottomNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 40, paddingTop: 20 },
  navBtn: { padding: 10 },
  captureBtnWrapper: { width: 85, height: 85, borderRadius: 42.5, borderWidth: 4, borderColor: '#EFE8DD', justifyContent: 'center', alignItems: 'center', shadowColor: '#EFE8DD', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 15 },
  captureBtnInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  
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
