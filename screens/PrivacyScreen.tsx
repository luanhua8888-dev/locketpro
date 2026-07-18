import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, EyeOff, UserX } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export default function PrivacyScreen() {
  const navigation = useNavigation<any>();
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    fetchPrivacySettings();
  }, []);

  const fetchPrivacySettings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from('profiles').select('is_private').eq('id', session.user.id).single();
    if (data) {
      setIsPrivate(data.is_private);
    }
  };

  const togglePrivate = async (value: boolean) => {
    setIsPrivate(value);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('profiles').update({ is_private: value }).eq('id', session.user.id);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color="white" size={32} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quyền riêng tư</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hiển thị</Text>
          <View style={styles.item}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <EyeOff color="white" size={24} style={styles.icon} />
              <Text style={styles.itemText}>Tài khoản riêng tư</Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={togglePrivate}
              trackColor={{ false: '#767577', true: '#EFE8DD' }}
              thumbColor={'#f4f3f4'}
            />
          </View>
          <Text style={styles.hint}>Khi bật, chỉ những người bạn đồng ý mới có thể xem ảnh của bạn trên Feed.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tương tác</Text>
          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('BlockedUsers')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <UserX color="white" size={24} style={styles.icon} />
              <Text style={styles.itemText}>Danh sách đã chặn</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: 20,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center'
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { color: '#aaa', fontSize: 14, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 5,
  },
  icon: { marginRight: 15 },
  itemText: { color: 'white', fontSize: 16, fontWeight: '600' },
  hint: { color: '#888', fontSize: 12, marginTop: 5, paddingHorizontal: 5 }
});
