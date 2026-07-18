import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock3, KeyRound, Search, User } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

type ProfileSummary = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type TemporaryAccess = {
  code: string;
  expiresAt: string;
  username: string;
};

export default function AdminTemporaryAccessScreen() {
  const navigation = useNavigation<any>();
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [temporaryAccess, setTemporaryAccess] = useState<TemporaryAccess | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    let active = true;

    const loadProfiles = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        navigation.goBack();
        return;
      }

      const [roleResult, profilesResult] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
        supabase.from('profiles').select('id, username, avatar_url').order('username').limit(250),
      ]);

      if (!active) return;
      if (roleResult.data?.role?.toLowerCase().trim() !== 'admin') {
        Alert.alert('Không có quyền', 'Chức năng này chỉ dành cho quản trị viên.');
        navigation.goBack();
        return;
      }

      if (profilesResult.error) {
        Alert.alert('Lỗi', profilesResult.error.message);
      } else {
        setProfiles(profilesResult.data ?? []);
      }
      setLoading(false);
    };

    loadProfiles();
    return () => {
      active = false;
    };
  }, [navigation]);

  useEffect(() => {
    if (!temporaryAccess) {
      setSecondsLeft(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((new Date(temporaryAccess.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 250);
    return () => clearInterval(timer);
  }, [temporaryAccess]);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return profiles;
    return profiles.filter((profile) => profile.username?.toLowerCase().includes(query));
  }, [profiles, search]);

  const createTemporaryAccess = async (profile: ProfileSummary) => {
    setCreatingFor(profile.id);
    const { data, error } = await supabase.functions.invoke<TemporaryAccess>('create-admin-login-code', {
      body: { targetUserId: profile.id },
    });
    setCreatingFor(null);

    if (error || !data?.code) {
      Alert.alert('Không thể tạo mã', 'Kiểm tra migration và Edge Function đã được triển khai.');
      return;
    }
    setTemporaryAccess(data);
  };

  const renderProfile = ({ item }: { item: ProfileSummary }) => (
    <View style={styles.userRow}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <User color="#FFFFFF" size={22} />
        </View>
      )}
      <Text style={styles.username} numberOfLines={1}>{item.username || 'Chưa đặt username'}</Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => createTemporaryAccess(item)}
        disabled={creatingFor !== null}
      >
        {creatingFor === item.id ? (
          <ActivityIndicator color="#091B42" size="small" />
        ) : (
          <KeyRound color="#091B42" size={19} />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft color="#FFFFFF" size={30} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo password 60 giây</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBox}>
        <Search color="#8B93A7" size={20} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm username"
          placeholderTextColor="#8B93A7"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <ActivityIndicator color="#EFE8DD" size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredProfiles}
          keyExtractor={(item) => item.id}
          renderItem={renderProfile}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.emptyText}>Không tìm thấy tài khoản.</Text>}
        />
      )}

      <Modal visible={temporaryAccess !== null} transparent animationType="fade" onRequestClose={() => setTemporaryAccess(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <KeyRound color="#EFE8DD" size={34} />
            <Text style={styles.modalTitle}>Password đăng nhập một lần</Text>
            <Text style={styles.modalUsername}>@{temporaryAccess?.username}</Text>
            <Text selectable style={[styles.code, secondsLeft === 0 && styles.expiredCode]}>
              {temporaryAccess?.code}
            </Text>
            <View style={styles.countdownRow}>
              <Clock3 color={secondsLeft > 0 ? '#EFE8DD' : '#FF6B6B'} size={18} />
              <Text style={[styles.countdown, secondsLeft === 0 && styles.expiredText]}>
                {secondsLeft > 0 ? `Còn ${secondsLeft} giây` : 'Đã hết hạn'}
              </Text>
            </View>
            <Text style={styles.modalHint}>Mã chỉ dùng được một lần và không đổi mật khẩu thật.</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setTemporaryAccess(null)}>
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#091B42' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  backButton: { padding: 4 },
  headerTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  headerSpacer: { width: 38 },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 16 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 16, paddingVertical: 14, marginLeft: 8 },
  loader: { marginTop: 48 },
  listContent: { padding: 20, paddingBottom: 40 },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: 12, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { backgroundColor: '#26385C', alignItems: 'center', justifyContent: 'center' },
  username: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginHorizontal: 12 },
  createButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFE8DD', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#8B93A7', textAlign: 'center', marginTop: 40 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: '#13264D', borderRadius: 28, padding: 26, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  modalTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', marginTop: 14 },
  modalUsername: { color: '#AAB2C5', fontSize: 16, marginTop: 6 },
  code: { color: '#EFE8DD', fontSize: 24, fontWeight: '900', letterSpacing: 1.5, marginVertical: 24 },
  expiredCode: { color: '#778097', textDecorationLine: 'line-through' },
  countdownRow: { flexDirection: 'row', alignItems: 'center' },
  countdown: { color: '#EFE8DD', fontWeight: '800', marginLeft: 7 },
  expiredText: { color: '#FF6B6B' },
  modalHint: { color: '#AAB2C5', textAlign: 'center', lineHeight: 20, marginTop: 14 },
  closeButton: { width: '100%', backgroundColor: '#EFE8DD', borderRadius: 24, alignItems: 'center', padding: 15, marginTop: 24 },
  closeButtonText: { color: '#091B42', fontWeight: '900', fontSize: 16 },
});

