import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '../api/file';
import { SafeAreaView } from 'react-native-safe-area-context';

type UploadPreview = { uri: string; name: string; type: string; };

export default function UploadTestScreen() {
  const [selected, setSelected] = useState<UploadPreview | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resultText, setResultText] = useState('');

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setResultText('警告：相册权限被拒绝'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    setSelected({ uri: asset.uri, name: asset.fileName || `upload-${Date.now()}.jpg`, type: asset.mimeType || 'image/jpeg' });
    setResultText('');
  };

  const handleUpload = async () => {
    if (!selected) { setResultText('提示：请先选择系统内的一张图片'); return; }
    try {
      setUploading(true);
      const uploadResult = await uploadFile(selected);
      setResultText(`测试成功\n对象名称: ${uploadResult.objectName}\n访问链接: ${uploadResult.url}`);
    } catch (error) {
      setResultText('错误：与存储服务的连接失败，请检查网络或代理');
    } finally { setUploading(false); }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>上传测试</Text>
            <Text style={styles.subtitle}>诊断与存储服务器的连通性</Text>
        </View>

        <View style={styles.section}>
          <Pressable style={styles.cardBtn} onPress={handlePickImage} disabled={uploading}>
             <Text style={styles.cardBtnText}>从设备中选择测试图片</Text>
          </Pressable>

          {selected && (
            <View style={styles.card}>
               <Text style={styles.previewName}>{selected.name}</Text>
               <Image source={{ uri: selected.uri }} style={styles.previewImage} />
            </View>
          )}

          <Pressable style={[styles.submitBtn, !selected && styles.btnDisabled]} onPress={handleUpload} disabled={uploading || !selected}>
             {uploading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitBtnText}>开始上传</Text>}
          </Pressable>
        </View>

        {resultText ? (
           <View style={styles.resultBox}>
             <Text style={styles.resultText}>{resultText}</Text>
           </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FBFCFD' },
  container: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 36, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#3F3F46', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#71717A', marginTop: 6 },
  section: { paddingHorizontal: 20, marginTop: 24, gap: 16 },
  cardBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E9F2', borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  cardBtnText: { fontSize: 15, fontWeight: '600', color: '#52525B' },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E9F2', borderRadius: 12, padding: 16, gap: 12 },
  previewName: { fontSize: 13, color: '#71717A', fontFamily: 'Courier' },
  previewImage: { width: '100%', height: 200, resizeMode: 'contain' },
  submitBtn: { backgroundColor: '#3B6FF5', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  btnDisabled: { opacity: 0.5 },
  resultBox: { marginHorizontal: 20, marginTop: 24, backgroundColor: '#EDF4FF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#BFD8FF' },
  resultText: { fontSize: 14, color: '#2446A6', fontFamily: 'Courier', lineHeight: 22 },
});
