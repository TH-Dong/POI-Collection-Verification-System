import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { bindWeChat, fetchWeChatBinding, unbindWeChat } from '../api/auth';
import { requestWeChatAuthCode } from '../services/wechatAuth';
import { useAuthStore } from '../store/authStore';

export default function AccountSecurityScreen() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [binding, setBinding] = useState<{ bound: boolean; openIdMasked: string | null; nickname: string | null; boundAt: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWeChatBinding()
      .then(setBinding)
      .finally(() => setLoading(false));
  }, []);

  const handleBind = async () => {
    try {
      setSubmitting(true);
      const authCode = await requestWeChatAuthCode();
      const result = await bindWeChat({ authCode });
      setBinding(result);
      if (user) {
        setUser({
          ...user,
          wechatBound: result.bound,
          wechatNickname: result.nickname,
          wechatBoundAt: result.boundAt,
        });
      }
      Alert.alert('绑定成功', '当前账号已完成微信绑定。');
    } catch (error: any) {
      Alert.alert('绑定失败', error?.response?.data?.message ?? error?.message ?? '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnbind = () => {
    Alert.alert('解绑微信', '解绑后将不能使用当前微信快捷登录。', [
      { text: '取消', style: 'cancel' },
      {
        text: '确认解绑',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setSubmitting(true);
              const result = await unbindWeChat();
              setBinding(result);
              if (user) {
                setUser({
                  ...user,
                  wechatBound: false,
                  wechatNickname: null,
                  wechatBoundAt: null,
                });
              }
            } catch (error: any) {
              Alert.alert('解绑失败', error?.response?.data?.message ?? '请稍后重试');
            } finally {
              setSubmitting(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <Text style={styles.title}>微信绑定</Text>
        <Text style={styles.subtitle}>当前页面将直接拉起微信授权，首次绑定成功后即可使用微信快捷登录。</Text>

        <View style={styles.card}>
          <Text style={styles.label}>当前绑定状态</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#3F3F46" />
          ) : (
            <>
              <Text style={styles.value}>{binding?.bound ? '已绑定' : '未绑定'}</Text>
              {binding?.nickname ? <Text style={styles.meta}>昵称：{binding.nickname}</Text> : null}
              {binding?.openIdMasked ? <Text style={styles.meta}>OpenID：{binding.openIdMasked}</Text> : null}
              {binding?.boundAt ? <Text style={styles.meta}>绑定时间：{binding.boundAt}</Text> : null}
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>绑定说明</Text>
          <Text style={styles.hint}>点击下方按钮后会跳转微信完成授权。若当前运行在 Expo Go，请改用 development build 或正式安装包。</Text>
        </View>

        <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed, submitting && styles.disabledBtn]} onPress={() => void handleBind()} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>绑定当前账号</Text>}
        </Pressable>

        {binding?.bound ? (
          <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed, submitting && styles.disabledBtn]} onPress={handleUnbind} disabled={submitting}>
            <Text style={styles.secondaryBtnText}>解除绑定</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FBFCFD',
  },
  container: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3F3F46',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#71717A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#52525B',
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3F3F46',
  },
  meta: {
    fontSize: 13,
    color: '#71717A',
  },
  hint: {
    fontSize: 13,
    lineHeight: 21,
    color: '#71717A',
  },
  primaryBtn: {
    borderRadius: 14,
    backgroundColor: '#3B6FF5',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnPressed: {
    backgroundColor: '#2759D8',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderRadius: 14,
    backgroundColor: '#FFF0F0',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnPressed: {
    backgroundColor: '#FFDADA',
  },
  secondaryBtnText: {
    color: '#B4232A',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
