import { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { login, weChatLogin } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen() {
  const [username, setUsername] = useState('collector');
  const [password, setPassword] = useState('123456');
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [rememberAccount, setRememberAccount] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async () => {
    try {
      setSubmitting(true);
      setErrorText('');
      const result = await login({ username, password });
      setAuth({
        token: result.accessToken,
        user: result.user,
      });
    } catch (error: any) {
      if (!error?.response) {
        setErrorText('后端服务不可达，请先确认 8080 后端已启动');
      } else if (error.response.status === 401) {
        setErrorText('账号或密码错误');
      } else {
        setErrorText(error?.response?.data?.message || '登录失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleWeChatLogin = async () => {
    const normalizedUsername = username.trim().toLowerCase();
    const authCode =
      normalizedUsername === 'verifier'
        ? 'wx-verifier2'
        : normalizedUsername === 'admin'
          ? 'wx-admin'
          : 'wx-collector2';

    try {
      setSubmitting(true);
      setErrorText('');
      const result = await weChatLogin({ authCode });
      setAuth({
        token: result.accessToken,
        user: result.user,
      });
    } catch (error: any) {
      if (!error?.response) {
        setErrorText('后端服务不可达，请先确认 8080 后端已启动');
      } else {
        setErrorText(error?.response?.data?.message || '微信登录失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    setErrorText('请联系管理员重置密码');
  };

  return (
    <SafeAreaView style={styles.root}>
      <View pointerEvents="none" style={styles.bgDecorWrap}>
        <View style={styles.bgDecorLarge} />
        <View style={styles.bgDecorSmall} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="map-outline" size={34} color="#F5FAFF" />
          </View>
          <Text style={styles.title}>欢迎登录</Text>
          <Text style={styles.subtitle}>POI 数据采集检验系统</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>账号</Text>
          <View style={styles.fieldRow}>
            <Feather name="user" size={22} color="#536486" />
            <TextInput
              style={styles.fieldInput}
              value={username}
              onChangeText={setUsername}
              placeholder="请输入您的账号"
              placeholderTextColor="#9EAACA"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>密码</Text>
          <View style={styles.fieldRow}>
            <Feather name="lock" size={22} color="#536486" />
            <TextInput
              style={styles.fieldInput}
              value={password}
              onChangeText={setPassword}
              placeholder="请输入您的密码"
              placeholderTextColor="#9EAACA"
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={styles.eyeBtn}
              hitSlop={8}
              onPress={() => setPasswordVisible((prev) => !prev)}
            >
              <Ionicons
                name={passwordVisible ? 'eye' : 'eye-off'}
                size={22}
                color="#BAC2D4"
              />
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.actionRow}>
            <Pressable
              style={styles.rememberWrap}
              onPress={() => setRememberAccount((prev) => !prev)}
              hitSlop={8}
            >
              <View style={[styles.checkbox, rememberAccount && styles.checkboxChecked]}>
                {rememberAccount ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
              </View>
              <Text style={styles.rememberText}>记住账号</Text>
            </Pressable>

            <Pressable hitSlop={8} onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>忘记密码?</Text>
            </Pressable>
          </View>

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.loginBtn,
              pressed && styles.loginBtnPressed,
              submitting && styles.btnDisabled,
            ]}
            onPress={() => void handleLogin()}
            disabled={submitting}
          >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.loginBtnText}>登录</Text>
              <Ionicons name="arrow-forward" size={26} color="#ECF3FF" />
            </>
          )}
        </Pressable>
        </View>

        <View style={styles.separatorRow}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>或使用快捷登录</Text>
          <View style={styles.separatorLine} />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.wechatCard,
            pressed && styles.wechatCardPressed,
            submitting && styles.btnDisabled,
          ]}
          onPress={() => void handleWeChatLogin()}
          disabled={submitting}
        >
          <View style={styles.wechatLeft}>
            <Ionicons name="logo-wechat" size={34} color="#22C55E" />
            <View>
              <Text style={styles.wechatTitle}>微信快捷登录</Text>
              <Text style={styles.wechatDesc}>安全便捷，快速登录</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#7685A5" />
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>测试账号： collector / 123456   verifier / 123456</Text>
          <Text style={styles.footerText}>微信演示码： wx-collector2 / wx-verifier2 / wx-admin</Text>
          <Text style={styles.copyright}>© 2024 POI 数据采集检验系统</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EFF3FA',
  },
  bgDecorWrap: {
    position: 'absolute',
    top: -170,
    right: -170,
    width: 460,
    height: 460,
    borderRadius: 230,
    overflow: 'hidden',
    backgroundColor: '#EAF1FD',
  },
  bgDecorLarge: {
    position: 'absolute',
    top: 10,
    right: 0,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: '#DBE8FA',
  },
  bgDecorSmall: {
    position: 'absolute',
    top: 62,
    left: 40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#EDF4FF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 34,
  },
  header: {
    marginTop: 8,
    marginBottom: 28,
  },
  logoBox: {
    width: 82,
    height: 82,
    borderRadius: 20,
    backgroundColor: '#2F7BE0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D67D3',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    marginBottom: 18,
  },
  title: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '800',
    color: '#0E1D45',
    letterSpacing: -1.4,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#5F6E8C',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: '#F9FBFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#DDE5F4',
    shadowColor: '#34538A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  fieldLabel: {
    color: '#627093',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  fieldRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  fieldInput: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    color: '#0F204A',
    fontWeight: '700',
    padding: 0,
  },
  eyeBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#DCE3F0',
    marginVertical: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rememberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#9DAAD0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: '#4C7EF4',
    backgroundColor: '#4C7EF4',
  },
  rememberText: {
    fontSize: 14,
    color: '#5F6E8C',
    fontWeight: '600',
  },
  forgotText: {
    fontSize: 14,
    color: '#4C7EF4',
    fontWeight: '600',
  },
  errorText: {
    color: '#D03A43',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  loginBtn: {
    minHeight: 68,
    borderRadius: 18,
    backgroundColor: '#4B7EF2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    marginTop: 4,
    shadowColor: '#2D5ED2',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  loginBtnPressed: {
    backgroundColor: '#396DE8',
  },
  btnDisabled: {
    opacity: 0.55,
  },
  loginBtnText: {
    color: '#F6FAFF',
    fontSize: 18,
    letterSpacing: 1,
    fontWeight: '700',
  },
  separatorRow: {
    marginTop: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#D4DCEB',
  },
  separatorText: {
    fontSize: 14,
    color: '#4A5878',
    fontWeight: '500',
  },
  wechatCard: {
    minHeight: 92,
    borderRadius: 16,
    backgroundColor: '#F9FBFF',
    borderWidth: 1,
    borderColor: '#DDE5F4',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wechatCardPressed: {
    backgroundColor: '#F1F6FF',
  },
  wechatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wechatTitle: {
    fontSize: 18,
    color: '#15264F',
    fontWeight: '800',
    marginBottom: 2,
  },
  wechatDesc: {
    fontSize: 13,
    color: '#6D7D9E',
    fontWeight: '500',
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#838FA8',
    textAlign: 'center',
    fontWeight: '500',
  },
  copyright: {
    marginTop: 8,
    fontSize: 12,
    color: '#A0AABE',
    fontWeight: '500',
  },
});
