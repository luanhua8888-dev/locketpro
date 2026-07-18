import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ChevronLeft, Send, User } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function ChatScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { friend, currentUserId } = route.params;

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `sender_id=eq.${friend.id}` // Only listen if friend sends to us (we add our own optimism)
      }, (payload) => {
        if (payload.new.receiver_id === currentUserId) {
           // We could fetch the full message with photo if needed, or just insert
           fetchMessages();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchMessages() {
    const { data } = await supabase
      .from('chat_messages')
      .select(`
        *,
        photo:photos!photo_id(image_url)
      `)
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });
      
    if (data) {
      setMessages(data);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      
      // Mark messages as read
      const unreadMessages = data.filter((m: any) => m.receiver_id === currentUserId && m.is_read === false);
      if (unreadMessages.length > 0) {
        supabase.from('chat_messages').update({ is_read: true }).eq('receiver_id', currentUserId).eq('sender_id', friend.id).then();
      }
    }
  }

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText('');
    
    // Optimistic UI update
    const tempMsg = {
      id: Math.random().toString(),
      sender_id: currentUserId,
      receiver_id: friend.id,
      content: textToSend,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    const { error } = await supabase.from('chat_messages').insert({
      sender_id: currentUserId,
      receiver_id: friend.id,
      content: textToSend
    });
    
    if (error) {
      console.log('Error sending message:', error);
      // Revert in real app, but for now we just log
    } else {
      fetchMessages(); // Refresh to get real ID
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === currentUserId;
    const isEmojiOnly = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+$/gi.test(item.content) && item.content.length <= 6;
    
    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}>
        {!isMe && (
          <View style={styles.smallAvatar}>
            {friend.avatar_url ? (
              <Image source={{ uri: friend.avatar_url }} style={{ width: 28, height: 28, borderRadius: 14 }} contentFit="cover" />
            ) : (
              <User color="white" size={16} />
            )}
          </View>
        )}
        <View style={{ maxWidth: '75%' }}>
          {item.photo && item.photo.image_url && (
            <Image source={{ uri: item.photo.image_url }} style={styles.messagePhoto} contentFit="cover" />
          )}
          <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem, isEmojiOnly && styles.messageBubbleEmoji]}>
            <Text style={[styles.messageText, isEmojiOnly && { fontSize: 40 }, !isMe && { color: 'white' }]}>
              {item.content}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color="white" size={32} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{friend.username}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputContainer}>
          <BlurView intensity={80} tint="dark" style={styles.inputBlur}>
            <TextInput
              style={styles.input}
              placeholder="Nhắn tin..."
              placeholderTextColor="#aaa"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={sendMessage}
            />
          </BlurView>
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Send color="black" size={20} style={{ marginLeft: -2 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center'
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  chatContent: { paddingHorizontal: 15, paddingTop: 20, paddingBottom: 20 },
  messageWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 15 },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperThem: { justifyContent: 'flex-start' },
  smallAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden'
  },
  messageBubbleMe: {
    backgroundColor: '#EFE8DD',
    borderBottomRightRadius: 5
  },
  messageBubbleThem: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderBottomLeftRadius: 5
  },
  messageBubbleEmoji: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  messageText: { fontSize: 16, color: 'black' },
  messagePhoto: { width: width * 0.6, height: width * 0.8, borderRadius: 15, marginBottom: 5 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingBottom: 20
  },
  inputBlur: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: 'white',
    fontSize: 16
  },
  sendBtn: {
    marginLeft: 10,
    width: 45, height: 45,
    borderRadius: 22.5,
    backgroundColor: '#EFE8DD',
    justifyContent: 'center', alignItems: 'center'
  }
});
