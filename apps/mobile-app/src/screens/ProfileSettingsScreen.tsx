import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from '../api/auth';
import { uploadFile } from '../api/file';
import { useAuthStore } from '../store/authStore';
import { resolveMobileFileUrl } from '../utils/fileUrl';

type UploadPreview = { uri: string; name: string; type: string };

export default function ProfileSettingsScreen() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [displayName, setDisplayName] = useState(user?.displayName ?? user?.realName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? null);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState(resolveMobileFileUrl(user?.avatarUrl) ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('无法选择头像', '请先允许访问相册。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const asset = result.assets[0];
    const selected: UploadPreview = {
      uri: asset.uri,
      name: asset.fileName || `avatar-${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    };

    try {
      setUploading(true);
      setAvatarPreviewUri(asset.uri);
      const uploaded = await uploadFile(selected);
      setAvatarUrl(uploaded.url);
      setAvatarPreviewUri(resolveMobileFileUrl(uploaded.url) ?? asset.uri);
    } catch {
      setAvatarPreviewUri(resolveMobileFileUrl(avatarUrl) ?? null);
      Alert.alert('上传失败', '头像上传失败，请稍后重试。');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }
    const normalizedDisplayName = displayName.trim();
    if (!normalizedDisplayName) {
      Alert.alert('无法保存', '昵称不能为空。');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateProfile({
        displayName: normalizedDisplayName,
        avatarUrl,
      });
      setUser(updated);
      Alert.alert('保存成功', '个人资料已更新。');
    } catch (error: any) {
      Alert.alert('保存失败', error?.response?.data?.message || '请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>个人资料</Text>
          <Text style={styles.subtitle}>设置聊天展示昵称和头像，协作会话会优先展示这里的内容。</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>头像</Text>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              {avatarPreviewUri ? (
                <Image source={{ uri: avatarPreviewUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarFallback}>{(displayName || user?.realName || user?.username || 'U').slice(0, 1).toUpperCase()}</Text>
              )}
            </View>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed, uploading && styles.buttonDisabled]} onPress={() => void handlePickAvatar()} disabled={uploading}>
              {uploading ? <ActivityIndicator size="small" color="#2446A6" /> : <Text style={styles.secondaryButtonText}>更换头像</Text>}
            </Pressable>
          </View>

          <Text style={styles.label}>昵称</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="请输入你的昵称"
            placeholderTextColor="#93A1BE"
            maxLength={64}
          />

          <Text style={styles.helperText}>登录账号 {user?.username} 和真实姓名不会被修改，聊天和协作页会优先展示你的昵称。</Text>

          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, saving && styles.buttonDisabled]} onPress={() => void handleSave()} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>保存资料</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F8FD' },
  content: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 14 },
  title: { fontSize: 28, fontWeight: '700', color: '#1C2642' },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 21, color: '#6E7B96' },
  card: { marginHorizontal: 20, marginTop: 8, padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E8F5', gap: 14 },
  label: { fontSize: 14, fontWeight: '700', color: '#55627E' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 4 },
  avatarWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#E7EEFB', borderWidth: 1, borderColor: '#D5E1F7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { fontSize: 28, fontWeight: '800', color: '#3B6FF5' },
  input: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: '#D8E2F2', backgroundColor: '#F8FBFF', paddingHorizontal: 14, fontSize: 16, color: '#20304F' },
  helperText: { fontSize: 13, lineHeight: 20, color: '#73809B' },
  primaryButton: { minHeight: 50, borderRadius: 14, backgroundColor: '#3B6FF5', alignItems: 'center', justifyContent: 'center' },
  primaryButtonPressed: { backgroundColor: '#2759D8' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: { minWidth: 104, minHeight: 42, borderRadius: 12, backgroundColor: '#EEF4FF', borderWidth: 1, borderColor: '#D6E2F8', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  secondaryButtonPressed: { backgroundColor: '#E3ECFF' },
  secondaryButtonText: { color: '#2446A6', fontSize: 14, fontWeight: '700' },
  buttonDisabled: { opacity: 0.7 },
});
