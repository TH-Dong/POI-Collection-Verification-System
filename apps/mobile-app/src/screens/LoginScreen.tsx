import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { login, weChatLogin } from '../api/auth';
import { requestWeChatAuthCode, WeChatAuthError } from '../services/wechatAuth';
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
    try {
      setSubmitting(true);
      setErrorText('');
      const authCode = await requestWeChatAuthCode();
      const result = await weChatLogin({ authCode });
      setAuth({
        token: result.accessToken,
        user: result.user,
      });
    } catch (error: any) {
      if (error instanceof WeChatAuthError) {
        setErrorText(error.message);
      } else if (!error?.response) {
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
        <View style={styles.bgDecorHalo} />
        <View style={styles.bgDecorBubble} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Image
              source={require('../../assets/app-icon-108.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
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
              <View style={styles.loginBtnArrowWrap}>
                <Ionicons name="arrow-forward" size={26} color="#ECF3FF" />
              </View>
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
          <Text style={styles.copyright}>© 2026 POI 数据采集检验系统</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F7FF',
  },
  bgDecorWrap: {
    position: 'absolute',
    top: -190,
    right: -150,
    width: 500,
    height: 520,
  },
  bgDecorLarge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(183, 206, 245, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.42)',
  },
  bgDecorSmall: {
    position: 'absolute',
    top: 92,
    right: 56,
    width: 278,
    height: 278,
    borderRadius: 139,
    backgroundColor: 'rgba(229, 239, 255, 0.58)',
  },
  bgDecorHalo: {
    position: 'absolute',
    top: 116,
    right: 140,
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.34)',
  },
  bgDecorBubble: {
    position: 'absolute',
    top: 338,
    right: 92,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.46)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 34,
  },
  header: {
    marginTop: 18,
    marginBottom: 26,
  },
  logoBox: {
    width: 94,
    height: 94,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.68)',
    shadowColor: '#8CA8D7',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
    marginBottom: 16,
  },
  logoImage: {
    width: 78,
    height: 78,
  },
  title: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
    color: '#11245B',
    letterSpacing: -1.8,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 17,
    color: '#5A6C98',
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(207, 220, 245, 0.88)',
    shadowColor: '#8EA5CF',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  fieldLabel: {
    color: '#6B79A1',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  fieldRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(241, 246, 255, 0.88)',
    borderWidth: 1,
    borderColor: '#D6E1F5',
    marginBottom: 16,
    shadowColor: '#D5E0F5',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  fieldInput: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    color: '#15295C',
    fontWeight: '700',
    padding: 0,
  },
  eyeBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  divider: {
    display: 'none',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 14,
  },
  rememberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#A8B9E7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF4FF',
  },
  checkboxChecked: {
    borderColor: '#5B84F3',
    backgroundColor: '#5B84F3',
  },
  rememberText: {
    fontSize: 14,
    color: '#60739C',
    fontWeight: '700',
  },
  forgotText: {
    fontSize: 14,
    color: '#5B84F3',
    fontWeight: '700',
  },
  errorText: {
    color: '#D03A43',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  loginBtn: {
    minHeight: 72,
    borderRadius: 24,
    backgroundColor: '#5D84F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 34,
    paddingRight: 18,
    marginTop: 2,
    shadowColor: '#5D84F2',
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  loginBtnPressed: {
    backgroundColor: '#4F77EA',
  },
  btnDisabled: {
    opacity: 0.55,
  },
  loginBtnText: {
    color: '#F6FAFF',
    fontSize: 19,
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  loginBtnArrowWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  separatorRow: {
    marginTop: 20,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D6DEEE',
  },
  separatorText: {
    fontSize: 14,
    color: '#637398',
    fontWeight: '600',
  },
  wechatCard: {
    minHeight: 98,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(207, 220, 245, 0.88)',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#94A7D1',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  wechatCardPressed: {
    backgroundColor: '#F5F8FF',
  },
  wechatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  wechatTitle: {
    fontSize: 18,
    color: '#152A5F',
    fontWeight: '800',
    marginBottom: 2,
  },
  wechatDesc: {
    fontSize: 13,
    color: '#7483A4',
    fontWeight: '600',
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
    gap: 10,
  },
  footerText: {
    fontSize: 13,
    color: '#8190AF',
    textAlign: 'center',
    fontWeight: '600',
  },
  copyright: {
    marginTop: 2,
    fontSize: 12,
    color: '#9BA8C1',
    fontWeight: '600',
  },
});
