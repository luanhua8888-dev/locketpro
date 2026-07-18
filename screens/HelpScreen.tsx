import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MessageSquare, FileText, Globe } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function HelpScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color="white" size={32} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trợ giúp & Hỗ trợ</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liên hệ với chúng tôi</Text>
          <TouchableOpacity style={styles.item} onPress={() => Linking.openURL('mailto:support@locketpro.com')}>
            <MessageSquare color="white" size={24} style={styles.icon} />
            <Text style={styles.itemText}>Gửi email hỗ trợ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={() => Linking.openURL('https://locketpro.com')}>
            <Globe color="white" size={24} style={styles.icon} />
            <Text style={styles.itemText}>Trang web Locket Pro</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chính sách & Điều khoản</Text>
          <TouchableOpacity style={styles.item}>
            <FileText color="white" size={24} style={styles.icon} />
            <Text style={styles.itemText}>Điều khoản dịch vụ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item}>
            <FileText color="white" size={24} style={styles.icon} />
            <Text style={styles.itemText}>Chính sách bảo mật</Text>
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  icon: { marginRight: 15 },
  itemText: { color: 'white', fontSize: 16, fontWeight: '600' }
});
