import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Dimensions, ActivityIndicator, SafeAreaView } from 'react-native';
import { User, MessageCircle, ChevronDown, Camera } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';

const { width } = Dimensions.get('window');
const SPACING = 10;
const ITEM_SIZE = (width - SPACING * 4) / 3;

export default function FeedScreen() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchPhotos();
    }
  }, [isFocused]);

  async function fetchPhotos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPhotos(data);
    }
    setLoading(false);
  }

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

  const renderItem = ({ item }: { item: any }) => {
    const isVideo = item.image_url?.endsWith('.mp4');
    return (
      <View style={styles.photoContainer}>
        {isVideo ? (
          <Video
            source={{ uri: item.image_url }}
            style={styles.photo}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted={true}
          />
        ) : (
          <Image source={{ uri: item.image_url }} style={styles.photo} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {renderHeader()}
      
      {loading ? (
        <ActivityIndicator size="large" color="#fca311" style={{ marginTop: 50 }} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282522',
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
    backgroundColor: '#fca311', // Locket yellow
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  }
});
