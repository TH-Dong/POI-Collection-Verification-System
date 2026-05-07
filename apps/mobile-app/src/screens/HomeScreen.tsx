import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchMobileWorkbench } from '../api/auth';
import { appTheme } from '../components/appTheme';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type HomeTab = 'home' | 'features' | 'messages' | 'settings';
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
type ActionTone = 'blue' | 'mint' | 'violet' | 'amber';

const FONT_DISPLAY = Platform.select({
  ios: 'AvenirNext-DemiBold',
  android: 'sans-serif-medium',
  default: undefined,
});

const FONT_STRONG = Platform.select({
  ios: 'AvenirNext-Medium',
  android: 'sans-serif',
  default: undefined,
});

export default function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<HomeTab>('home');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [pendingTaskCount, setPendingTaskCount] = useState(0);
  const [urgentTaskCount, setUrgentTaskCount] = useState(0);
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const isCollector = user?.roles.includes('COLLECTOR');
  const isVerifier = user?.roles.includes('VERIFIER');

  useEffect(() => {
    let active = true;

    const loadWorkbench = () => {
      fetchMobileWorkbench()
        .then((data) => {
          if (!active) {
            return;
          }
          setMessage(data.message);
          setPendingTaskCount(data.pendingTaskCount);
          setUrgentTaskCount(data.urgentTaskCount);
          setUnreadNoticeCount(data.unreadNoticeCount);
          setUnreadChatCount(data.unreadChatCount);
        })
        .catch(() => {
          if (active) {
            setMessage('暂无公告');
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    };

    const unsubscribe = navigation.addListener('focus', loadWorkbench);
    loadWorkbench();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigation]);

  const tabs = useMemo(
    () => [
      { key: 'home' as const, label: '首页', icon: 'home-variant-outline' as IconName },
      { key: 'features' as const, label: '功能', icon: 'view-grid-outline' as IconName },
      { key: 'messages' as const, label: '消息', icon: 'message-badge-outline' as IconName, badge: unreadNoticeCount + unreadChatCount },
      { key: 'settings' as const, label: '设置', icon: 'cog-outline' as IconName },
    ],
    [unreadNoticeCount, unreadChatCount],
  );

  return (
    <SafeAreaView style={styles.root}>
      {activeTab === 'home' ? (
        <View pointerEvents="none" style={styles.homeBackdrop}>
          <View style={styles.homeBackdropTop} />
          <View style={styles.homeBackdropSlope} />
        </View>
      ) : null}

      {activeTab === 'features' ? (
        <View pointerEvents="none" style={styles.featureBackdrop}>
          <View style={styles.featureBackdropTop} />
          <View style={styles.featureBackdropWave} />
        </View>
      ) : null}

      {activeTab === 'messages' ? (
        <View pointerEvents="none" style={styles.messageBackdrop}>
          <View style={styles.messageBackdropBallA} />
          <View style={styles.messageBackdropBallB} />
          <View style={styles.messageBackdropDotGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={styles.messageBackdropDot} />
            ))}
          </View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {activeTab === 'home' ? renderHomeHero() : null}
        {activeTab === 'features' ? renderFeatureHero() : null}
        {activeTab === 'messages' ? renderMessageHero() : null}
        {activeTab === 'settings' ? renderSettingsHero() : null}

        {activeTab === 'home' ? renderHomePanel() : null}
        {activeTab === 'features' ? renderFeaturesPanel() : null}
        {activeTab === 'messages' ? renderMessagesPanel() : null}
        {activeTab === 'settings' ? renderSettingsPanel() : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        {tabs.map((item) => {
          const active = activeTab === item.key;
          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [
                styles.tabButton,
                active && styles.tabButtonActive,
                active && item.key === 'messages' && styles.tabButtonActiveMessage,
                pressed && styles.tabButtonPressed,
              ]}
              onPress={() => setActiveTab(item.key)}
            >
              <View style={styles.tabIconWrap}>
                <MaterialCommunityIcons name={item.icon} size={22} color={active ? appTheme.primary : appTheme.mutedForeground} />
                {active && item.key === 'messages' ? <View style={styles.tabMessageActiveDot} /> : null}
                {item.badge ? (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
              {active && item.key !== 'messages' && item.key !== 'settings' ? <View style={styles.tabActiveIndicator} /> : null}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );

  function renderHomeHero() {
    return (
      <View style={styles.homeHero}>
        <View style={styles.homeHeroLeft}>
          <View style={styles.workbenchRow}>
            <View style={styles.workbenchIcon}>
              <MaterialCommunityIcons name="view-grid" size={18} color={appTheme.primary} />
            </View>
            <Text style={styles.workbenchText}>工作台</Text>
          </View>
          <Text style={styles.homeTitle}>首页</Text>
          <Text style={styles.homeSubtitle}>欢迎回来，{user?.realName ?? user?.username}。</Text>
          <Text style={styles.homeSubtitle}>这里是你的今日工作概览</Text>
        </View>
        <HomeHeroOrbit />
      </View>
    );
  }

  function renderFeatureHero() {
    return (
      <View style={styles.hero}>
        <Text style={styles.workbenchTopTitle}>工作台</Text>
        <View style={styles.heroMain}>
          <View style={styles.heroCopy}>
            <View style={styles.heroBadge}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={16} color={appTheme.accentForeground} />
              <Text style={styles.heroBadgeText}>POI Collection</Text>
            </View>
            <Text style={styles.heroTitle}>{getTabTitle(activeTab)}</Text>
            <Text style={styles.heroSubtitle}>{getTabSubtitle(activeTab, user?.realName ?? user?.username)}</Text>
          </View>
          <FeatureHeroCube />
        </View>
      </View>
    );
  }

  function renderMessageHero() {
    return (
      <View style={styles.messageHero}>
        <View style={styles.messageHeroLeft}>
          <Text style={styles.messageHeroTitle}>消息</Text>
          <View style={styles.messageHeroAccent}>
            <View style={styles.messageHeroAccentLine} />
            <View style={styles.messageHeroAccentDot} />
          </View>
          <Text style={styles.messageHeroSubtitle}>通知与协作，一目了然</Text>
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={16} color={appTheme.accentForeground} />
            <Text style={styles.heroBadgeText}>POI Collection</Text>
          </View>
        </View>
        <MessageHeroBubble />
      </View>
    );
  }

  function renderSettingsHero() {
    return (
      <View style={styles.settingsHero}>
        <View style={styles.settingsHeroLeft}>
          <View style={styles.workbenchRow}>
            <View style={styles.workbenchIcon}>
              <MaterialCommunityIcons name="view-grid" size={18} color={appTheme.primary} />
            </View>
            <Text style={styles.workbenchText}>工作台</Text>
          </View>
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={16} color={appTheme.accentForeground} />
            <Text style={styles.heroBadgeText}>POI Collection</Text>
          </View>
          <Text style={styles.settingsHeroTitle}>设置</Text>
          <Text style={styles.settingsHeroSubtitle}>账号安全与调试工具</Text>
        </View>
        <SettingsHeroGlyph />
      </View>
    );
  }

  function renderHomePanel() {
    const roleLabel = user?.roles.length ? getRoleLabel(user.roles[0]) : '用户';
    const noticeText = loading ? '加载中...' : (message || '暂无公告');
    const wechatText = user?.wechatBound ? `已绑定${user.wechatNickname ? ` · ${user.wechatNickname}` : ''}` : '未绑定';

    return (
      <View style={styles.panel}>
        <View style={styles.homeStatusCard}>
          <View style={styles.homeStatusHeader}>
            <View style={styles.homeStatusLabelWrap}>
              <View style={styles.homeStatusDot} />
              <Text style={styles.homeStatusLabel}>当前状态</Text>
            </View>
            <View style={styles.homeStatusRolePill}>
              <Text style={styles.homeStatusRoleText}>{roleLabel}</Text>
            </View>
          </View>
          <Text style={styles.homeStatusName}>{user?.realName ?? user?.username}</Text>

          <View style={styles.homeStatusRows}>
            <HomeStatusRow icon="wechat" iconColor="#33B66F" label="微信状态" value={wechatText} />
            <HomeStatusRow icon="bullhorn-variant-outline" iconColor={appTheme.primary} label="系统公告" value={noticeText} last />
          </View>
        </View>

        <View style={styles.homeMetricGrid}>
          <MetricCard icon="clipboard-check-outline" watermarkIcon="clipboard-text-outline" label="待处理任务" value={pendingTaskCount} tone="blue" />
          <MetricCard icon="alert-decagram-outline" watermarkIcon="shield-alert-outline" label="高优先级任务" value={urgentTaskCount} tone="amber" />
          <MetricCard icon="bell-outline" watermarkIcon="bell-outline" label="未读通知" value={unreadNoticeCount} tone="violet" />
          <MetricCard icon="chat-outline" watermarkIcon="message-text-outline" label="未读会话" value={unreadChatCount} tone="mint" />
        </View>
      </View>
    );
  }

  function renderFeaturesPanel() {
    const useVerifierGrid = isVerifier && !isCollector;

    return (
      <View style={styles.panel}>
        <SectionTitle title="核心功能" description="采集、任务、记录与地图入口集中在这里。" featured />
        <View style={styles.actionGrid}>
          <ActionTile icon="clipboard-check-outline" watermarkIcon="clipboard-check-outline" tone="blue" title="任务中心" desc="查看待办和处理进度" onPress={() => navigation.navigate('TaskCenter')} />
          {useVerifierGrid ? (
            <>
              <ActionTile icon="clipboard-search-outline" watermarkIcon="clipboard-search-outline" tone="mint" title="待核验队列" desc="处理首次核验和整改复核" onPress={() => navigation.navigate('VerifierPoiList')} />
              <ActionTile icon="map-search-outline" watermarkIcon="map-search-outline" tone="violet" title="空间核验" desc="地图查看待处理点位" onPress={() => navigation.navigate('PoiMap', { scope: 'verifier' })} />
              <ActionTile icon="scale-balance" watermarkIcon="scale-balance" tone="amber" title="争议处理" desc="查看异议并补充说明" onPress={() => navigation.navigate('VerifierDisputeList')} />
            </>
          ) : (
            <>
              <ActionTile icon="map-marker-plus-outline" watermarkIcon="map-marker-radius-outline" tone="mint" title="采集 POI" desc="拍照、定位并提交点位" onPress={() => navigation.navigate('PoiForm')} disabled={!isCollector} />
              <ActionTile icon="format-list-bulleted-square" watermarkIcon="format-list-bulleted-square" tone="violet" title="我的记录" desc="草稿、整改和历史提交" onPress={() => navigation.navigate('PoiList')} disabled={!isCollector} />
              <ActionTile icon="map-outline" watermarkIcon="map-outline" tone="amber" title="我的地图" desc="查看个人点位分布" onPress={() => navigation.navigate('PoiMap', { scope: 'mine' })} disabled={!isCollector} />
            </>
          )}
        </View>

        {isVerifier && isCollector ? (
          <>
            <SectionTitle title="核验入口" description="核验者专用工作流。" />
            <View style={styles.card}>
              <ActionRow icon="clipboard-search-outline" title="待核验队列" desc="处理首次核验和整改复核" onPress={() => navigation.navigate('VerifierPoiList')} />
              <ActionRow icon="map-search-outline" title="空间核验" desc="地图查看待处理点位" onPress={() => navigation.navigate('PoiMap', { scope: 'verifier' })} />
              <ActionRow icon="scale-balance" title="争议处理" desc="查看异议并补充说明" onPress={() => navigation.navigate('VerifierDisputeList')} last />
            </View>
          </>
        ) : null}
      </View>
    );
  }

  function renderMessagesPanel() {
    return (
      <View style={styles.messagePanel}>
        <MessageEntryCard icon="bell-outline" title="通知中心" description="任务派发、核验结果、争议裁定" unread={unreadNoticeCount} tone="blue" onPress={() => navigation.navigate('NoticeCenter')} />
        <MessageEntryCard icon="message-reply-text-outline" title="协作会话" description="私聊、群聊和 POI 沟通" unread={unreadChatCount} tone="mint" onPress={() => navigation.navigate('ConversationList')} />
      </View>
    );
  }

  function renderSettingsPanel() {
    return (
      <View style={styles.settingsPanel}>
        <View style={styles.settingsSection}>
          <View style={styles.settingsSectionRow}>
            <View style={styles.settingsSectionBar} />
            <Text style={styles.settingsSectionTitle}>设置</Text>
          </View>
          <Text style={styles.settingsSectionDesc}>账号、安全与调试入口。</Text>
        </View>

        <View style={styles.settingsCard}>
          <SettingsEntryRow icon="shield-account-outline" title="账号安全" desc="管理微信绑定与快捷登录状态" onPress={() => navigation.navigate('AccountSecurity')} />
          <SettingsEntryRow icon="cloud-upload-outline" title="上传联调" desc="验证图片上传和对象存储状态" onPress={() => navigation.navigate('UploadTest')} />
          <SettingsEntryRow icon="logout" title="退出登录" desc="清除本地登录凭据" onPress={logout} danger last />
        </View>
      </View>
    );
  }
}

function HomeStatusRow({
  icon,
  iconColor,
  label,
  value,
  last = false,
}: {
  icon: IconName;
  iconColor: string;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.homeStatusRow, last && styles.rowLast]}>
      <View style={styles.homeStatusRowLeft}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
        <Text style={styles.homeStatusRowLabel}>{label}</Text>
      </View>
      <View style={styles.homeStatusRowRight}>
        <Text style={styles.homeStatusRowValue} numberOfLines={1}>{value}</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color="#7E869A" />
      </View>
    </View>
  );
}

function MetricCard({
  icon,
  watermarkIcon,
  label,
  value,
  tone,
}: {
  icon: IconName;
  watermarkIcon: IconName;
  label: string;
  value: number;
  tone: 'blue' | 'amber' | 'violet' | 'mint';
}) {
  const palette = getMetricTone(tone);

  return (
    <View style={[styles.metricCard, { backgroundColor: palette.cardBg, borderColor: palette.borderColor }]}>
      <View style={styles.metricWatermark}>
        <MaterialCommunityIcons name={watermarkIcon} size={64} color={palette.watermarkColor} />
      </View>
      <View style={styles.metricIcon}>
        <MaterialCommunityIcons name={icon} size={22} color={palette.accent} />
      </View>
      <Text style={[styles.metricValue, { color: palette.accent }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function FeatureHeroCube() {
  return (
    <View style={styles.heroCubeWrap}>
      <View style={styles.heroCubeGlow} />
      <View style={styles.heroCube}>
        <View style={styles.heroCubeGrid}>
          <View style={styles.heroCubeRow}>
            <View style={styles.heroCubeCell}>
              <MaterialCommunityIcons name="map-marker-plus-outline" size={18} color={appTheme.primary} />
            </View>
            <View style={styles.heroCubeCell}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={appTheme.primary} />
            </View>
          </View>
          <View style={styles.heroCubeRow}>
            <View style={styles.heroCubeCell}>
              <MaterialCommunityIcons name="format-list-bulleted-square" size={18} color={appTheme.primary} />
            </View>
            <View style={styles.heroCubeCell}>
              <MaterialCommunityIcons name="map-outline" size={18} color={appTheme.primary} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function HomeHeroOrbit() {
  return (
    <View style={styles.homeHeroOrbitWrap}>
      <View style={styles.homeHeroOrbitGlow} />
      <View style={styles.homeHeroOrbitBack} />
      <View style={styles.homeHeroOrbitFront}>
        <View style={styles.homeHeroOrbitDotRow}>
          <View style={styles.homeHeroOrbitDot} />
          <View style={styles.homeHeroOrbitDot} />
          <View style={styles.homeHeroOrbitDot} />
        </View>
        <View style={styles.homeHeroOrbitLineLg} />
        <View style={styles.homeHeroOrbitLineSm} />
        <View style={styles.homeHeroOrbitLineSm} />
      </View>
    </View>
  );
}

function MessageHeroBubble() {
  return (
    <View style={styles.messageBubbleWrap}>
      <View style={styles.messageBubbleGlow} />
      <View style={styles.messageBubbleCard}>
        <MaterialCommunityIcons name="bell-outline" size={68} color="#EEF5FF" />
      </View>
    </View>
  );
}

function SettingsHeroGlyph() {
  return (
    <View style={styles.settingsGlyphWrap}>
      <View style={styles.settingsGlyphGlow} />
      <View style={styles.settingsGlyphGear}>
        <MaterialCommunityIcons name="cog-outline" size={84} color="#EEF5FF" />
      </View>
      <View style={styles.settingsGlyphShield}>
        <MaterialCommunityIcons name="shield-check-outline" size={26} color="#EEF5FF" />
      </View>
      <View style={styles.settingsGlyphDotA} />
      <View style={styles.settingsGlyphDotB} />
    </View>
  );
}

function SectionTitle({ title, description, featured = false }: { title: string; description: string; featured?: boolean }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionTitleRow}>
        {featured ? <View style={styles.sectionDot} /> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionDesc}>{description}</Text>
    </View>
  );
}

function ActionTile({
  icon,
  watermarkIcon,
  title,
  desc,
  onPress,
  disabled = false,
  tone = 'blue',
}: {
  icon: IconName;
  watermarkIcon?: IconName;
  title: string;
  desc: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: ActionTone;
}) {
  const palette = getActionTone(tone);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionTile,
        { borderColor: palette.borderColor },
        pressed && !disabled && { backgroundColor: palette.pressedBg },
        disabled && styles.actionDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.actionTileWatermark}>
        <MaterialCommunityIcons name={watermarkIcon ?? icon} size={92} color={palette.watermarkColor} />
      </View>

      <View style={[styles.actionIcon, { backgroundColor: palette.iconBg }]}>
        <MaterialCommunityIcons name={icon} size={24} color={disabled ? appTheme.mutedForeground : palette.iconColor} />
      </View>

      <Text style={styles.actionTileTitle}>{title}</Text>
      <Text style={styles.actionTileDesc}>{disabled ? '当前角色不可用' : desc}</Text>

      <View style={styles.actionTileArrow}>
        <MaterialCommunityIcons name="arrow-right" size={22} color={disabled ? appTheme.mutedForeground : '#5C647A'} />
      </View>
    </Pressable>
  );
}

function ActionRow({ icon, title, desc, onPress, danger = false, last = false }: { icon: IconName; title: string; desc: string; onPress: () => void; danger?: boolean; last?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [styles.actionRow, last && styles.rowLast, pressed && styles.actionRowPressed]} onPress={onPress}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <MaterialCommunityIcons name={icon} size={22} color={danger ? appTheme.destructive : appTheme.primary} />
      </View>
      <View style={styles.actionRowContent}>
        <Text style={[styles.actionRowTitle, danger && styles.actionRowTitleDanger]}>{title}</Text>
        <Text style={styles.actionRowDesc}>{desc}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={appTheme.mutedForeground} />
    </Pressable>
  );
}

function MessageEntryCard({
  icon,
  title,
  description,
  unread,
  onPress,
  tone,
}: {
  icon: IconName;
  title: string;
  description: string;
  unread: number;
  onPress: () => void;
  tone: 'blue' | 'mint';
}) {
  const iconBg = tone === 'mint' ? '#DFF3EC' : '#DFE9FA';
  const iconColor = tone === 'mint' ? '#36BC8B' : '#2E75EE';

  return (
    <Pressable style={({ pressed }) => [styles.messageCard, pressed && styles.messageCardPressed]} onPress={onPress}>
      <View style={[styles.messageCardIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={32} color={iconColor} />
        {tone === 'blue' ? <View style={styles.messageCardIconDot} /> : null}
      </View>

      <View style={styles.messageCardBody}>
        <Text style={styles.messageCardTitle}>{title}</Text>
        <Text style={styles.messageCardDesc}>{description}</Text>
        <Text style={styles.messageCardCount}>
          当前未读 <Text style={[styles.messageCardCountStrong, { color: iconColor }]}>{unread}</Text> 条
        </Text>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={26} color="#7B8397" />
      {tone === 'blue' ? <View style={styles.messageCardEdgeDot} /> : null}
    </Pressable>
  );
}

function SettingsEntryRow({
  icon,
  title,
  desc,
  onPress,
  danger = false,
  last = false,
}: {
  icon: IconName;
  title: string;
  desc: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.settingsRow, last && styles.rowLast, pressed && styles.settingsRowPressed]} onPress={onPress}>
      <View style={[styles.settingsRowIconWrap, danger && styles.settingsRowIconWrapDanger]}>
        <MaterialCommunityIcons name={icon} size={28} color={danger ? '#EF4444' : appTheme.primary} />
      </View>
      <View style={styles.settingsRowBody}>
        <Text style={[styles.settingsRowTitle, danger && styles.settingsRowTitleDanger]}>{title}</Text>
        <Text style={styles.settingsRowDesc}>{desc}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#7E869A" />
    </Pressable>
  );
}

function getTabTitle(tab: HomeTab) {
  switch (tab) {
    case 'features':
      return '功能';
    case 'messages':
      return '消息';
    case 'settings':
      return '设置';
    default:
      return '首页';
  }
}

function getTabSubtitle(tab: HomeTab, name?: string) {
  switch (tab) {
    case 'features':
      return '任务、采集、记录和地图入口';
    case 'messages':
      return '通知与协作，一目了然';
    case 'settings':
      return '账号安全与调试工具';
    default:
      return `欢迎回来，${name ?? '用户'}。这里是你的今日工作概览`;
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'COLLECTOR':
      return '采集者';
    case 'VERIFIER':
      return '核验者';
    case 'ADMIN':
      return '管理员';
    default:
      return role;
  }
}

function getMetricTone(tone: 'blue' | 'amber' | 'violet' | 'mint') {
  switch (tone) {
    case 'amber':
      return {
        cardBg: '#FFF8EF',
        borderColor: '#F3E8D9',
        accent: '#D8922D',
        watermarkColor: 'rgba(216, 146, 45, 0.14)',
      };
    case 'violet':
      return {
        cardBg: '#F7F4FF',
        borderColor: '#E9E4F7',
        accent: '#6E5AE7',
        watermarkColor: 'rgba(110, 90, 231, 0.14)',
      };
    case 'mint':
      return {
        cardBg: '#F0FAF6',
        borderColor: '#DDEFE7',
        accent: '#1B9F7A',
        watermarkColor: 'rgba(27, 159, 122, 0.14)',
      };
    default:
      return {
        cardBg: '#F3F8FF',
        borderColor: '#DCE7F7',
        accent: '#2E6FEA',
        watermarkColor: 'rgba(46, 111, 234, 0.14)',
      };
  }
}

function getActionTone(tone: ActionTone) {
  switch (tone) {
    case 'mint':
      return {
        iconBg: '#DFF4EC',
        iconColor: '#0FA97A',
        borderColor: '#DDE9E3',
        pressedBg: '#F3FBF7',
        watermarkColor: 'rgba(15, 169, 122, 0.10)',
      };
    case 'violet':
      return {
        iconBg: '#EBE9FA',
        iconColor: '#6564E8',
        borderColor: '#E4E5EE',
        pressedBg: '#F7F7FD',
        watermarkColor: 'rgba(101, 100, 232, 0.10)',
      };
    case 'amber':
      return {
        iconBg: '#F9EFE3',
        iconColor: '#F39B1A',
        borderColor: '#E9E4DD',
        pressedBg: '#FCF8F2',
        watermarkColor: 'rgba(243, 155, 26, 0.10)',
      };
    default:
      return {
        iconBg: '#E0EAFA',
        iconColor: '#2C72E8',
        borderColor: '#DEE4F2',
        pressedBg: '#F3F7FF',
        watermarkColor: 'rgba(44, 114, 232, 0.10)',
      };
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F6FC',
  },
  container: {
    paddingBottom: 126,
  },

  homeBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
    overflow: 'hidden',
  },
  homeBackdropTop: {
    position: 'absolute',
    top: -220,
    right: -110,
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: '#EAF2FF',
  },
  homeBackdropSlope: {
    position: 'absolute',
    top: 102,
    right: -260,
    width: 720,
    height: 184,
    borderRadius: 140,
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#E1EAF8',
    transform: [{ rotate: '-13deg' }],
  },

  featureBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
    overflow: 'hidden',
  },
  featureBackdropTop: {
    position: 'absolute',
    top: -230,
    right: -120,
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: '#E5EDFB',
  },
  featureBackdropWave: {
    position: 'absolute',
    top: 94,
    right: -240,
    width: 620,
    height: 190,
    borderRadius: 110,
    backgroundColor: '#EAF1FD',
    borderWidth: 1,
    borderColor: '#DFE8F8',
    transform: [{ rotate: '-14deg' }],
  },

  messageBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  messageBackdropBallA: {
    position: 'absolute',
    top: 162,
    right: 82,
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: 'rgba(83, 138, 244, 0.16)',
  },
  messageBackdropBallB: {
    position: 'absolute',
    top: 238,
    right: -38,
    width: 104,
    height: 104,
    borderRadius: 999,
    backgroundColor: 'rgba(105, 215, 171, 0.16)',
  },
  messageBackdropDotGrid: {
    position: 'absolute',
    top: 116,
    right: 26,
    width: 70,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  messageBackdropDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: '#DDE8FA',
  },

  workbenchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  workbenchIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#E3ECFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workbenchText: {
    fontSize: 18,
    color: '#4C5870',
    fontFamily: FONT_STRONG,
  },

  homeHero: {
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  homeHeroLeft: {
    flex: 1,
    paddingTop: 2,
  },
  homeTitle: {
    fontSize: 38,
    lineHeight: 44,
    color: '#101B42',
    fontFamily: FONT_DISPLAY,
    letterSpacing: -1.1,
  },
  homeSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#75819A',
  },
  homeHeroOrbitWrap: {
    width: 170,
    height: 188,
    marginTop: 4,
    marginRight: -2,
    position: 'relative',
  },
  homeHeroOrbitGlow: {
    position: 'absolute',
    right: 12,
    top: 22,
    width: 122,
    height: 136,
    borderRadius: 28,
    backgroundColor: 'rgba(78, 140, 245, 0.26)',
    shadowColor: '#3975E6',
    shadowOpacity: 0.34,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  homeHeroOrbitBack: {
    position: 'absolute',
    top: 8,
    right: -2,
    width: 122,
    height: 128,
    borderRadius: 24,
    backgroundColor: 'rgba(205, 220, 246, 0.9)',
    transform: [{ rotate: '8deg' }],
  },
  homeHeroOrbitFront: {
    position: 'absolute',
    top: 28,
    right: 16,
    width: 136,
    height: 142,
    borderRadius: 26,
    backgroundColor: 'rgba(91, 151, 247, 0.76)',
    borderWidth: 1,
    borderColor: '#DDEAF9',
    padding: 14,
  },
  homeHeroOrbitDotRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 10,
  },
  homeHeroOrbitDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: '#EAF3FF',
    opacity: 0.9,
  },
  homeHeroOrbitLineLg: {
    width: '100%',
    height: 13,
    borderRadius: 99,
    backgroundColor: 'rgba(240, 247, 255, 0.95)',
    marginBottom: 8,
  },
  homeHeroOrbitLineSm: {
    width: '78%',
    height: 9,
    borderRadius: 99,
    backgroundColor: 'rgba(236, 245, 255, 0.85)',
    marginBottom: 7,
  },

  hero: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 14,
  },
  workbenchTopTitle: {
    fontSize: 20,
    color: '#4C5870',
    marginBottom: 12,
    fontFamily: FONT_STRONG,
  },
  heroMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroCopy: {
    flex: 1,
    paddingTop: 2,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#E6EEF9',
    borderWidth: 1,
    borderColor: '#D0DEF2',
    marginBottom: 12,
  },
  heroBadgeText: {
    fontSize: 14,
    color: appTheme.primary,
    fontFamily: FONT_STRONG,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    color: '#0C183E',
    fontFamily: FONT_DISPLAY,
    letterSpacing: -0.9,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#717C96',
  },

  messageHero: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  messageHeroLeft: {
    flex: 1,
    paddingTop: 10,
  },
  messageHeroTitle: {
    fontSize: 34,
    lineHeight: 42,
    color: '#0A173D',
    letterSpacing: -1.0,
    fontFamily: FONT_DISPLAY,
  },
  messageHeroAccent: {
    marginTop: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageHeroAccentLine: {
    width: 70,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#377AF5',
  },
  messageHeroAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#377AF5',
  },
  messageHeroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#667086',
    marginBottom: 14,
  },
  messageBubbleWrap: {
    width: 146,
    height: 160,
    position: 'relative',
    marginTop: 18,
    marginRight: -2,
  },
  messageBubbleGlow: {
    position: 'absolute',
    top: 20,
    right: 10,
    width: 110,
    height: 118,
    borderRadius: 26,
    backgroundColor: 'rgba(65, 131, 246, 0.38)',
    shadowColor: '#3C7FEB',
    shadowOpacity: 0.34,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  messageBubbleCard: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 136,
    height: 146,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(110, 168, 250, 0.64)',
    borderWidth: 1,
    borderColor: '#D7E6FA',
    transform: [{ rotate: '12deg' }],
  },

  settingsHero: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  settingsHeroLeft: {
    flex: 1,
    paddingTop: 2,
  },
  settingsHeroTitle: {
    fontSize: 40,
    lineHeight: 46,
    color: '#101B42',
    letterSpacing: -1.1,
    marginTop: 2,
    fontFamily: FONT_DISPLAY,
  },
  settingsHeroSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: '#75819A',
  },
  settingsGlyphWrap: {
    width: 170,
    height: 192,
    marginTop: 10,
    marginRight: -2,
    position: 'relative',
  },
  settingsGlyphGlow: {
    position: 'absolute',
    top: 26,
    right: 10,
    width: 122,
    height: 132,
    borderRadius: 28,
    backgroundColor: 'rgba(82, 142, 246, 0.28)',
    shadowColor: '#427CEB',
    shadowOpacity: 0.34,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  settingsGlyphGear: {
    position: 'absolute',
    top: 14,
    right: 0,
    width: 146,
    height: 158,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 176, 252, 0.55)',
    borderWidth: 1,
    borderColor: '#DAE9FC',
  },
  settingsGlyphShield: {
    position: 'absolute',
    right: 2,
    bottom: 4,
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(132, 182, 253, 0.45)',
    borderWidth: 1,
    borderColor: '#DCEAFB',
  },
  settingsGlyphDotA: {
    position: 'absolute',
    left: 8,
    top: 100,
    width: 12,
    height: 12,
    borderRadius: 99,
    backgroundColor: 'rgba(132, 190, 248, 0.5)',
  },
  settingsGlyphDotB: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(158, 208, 249, 0.45)',
  },

  heroCubeWrap: {
    width: 146,
    height: 158,
    marginTop: -2,
    position: 'relative',
  },
  heroCubeGlow: {
    position: 'absolute',
    right: 8,
    top: 20,
    width: 112,
    height: 120,
    borderRadius: 22,
    backgroundColor: 'rgba(60, 121, 231, 0.23)',
    shadowColor: '#2B6ED9',
    shadowOpacity: 0.32,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  heroCube: {
    position: 'absolute',
    right: 0,
    top: 8,
    width: 134,
    height: 146,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCE6F7',
    backgroundColor: 'rgba(235, 243, 255, 0.9)',
    padding: 11,
  },
  heroCubeGrid: {
    gap: 8,
  },
  heroCubeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroCubeCell: {
    width: 52,
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE6F6',
    backgroundColor: '#F8FBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  panel: {
    paddingHorizontal: 20,
    gap: 14,
  },
  messagePanel: {
    paddingHorizontal: 20,
    gap: 10,
  },
  settingsPanel: {
    paddingHorizontal: 20,
    gap: 8,
  },

  homeStatusCard: {
    backgroundColor: '#F8FBFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8E4F6',
    padding: 10,
  },
  homeStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  homeStatusLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  homeStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: '#3E80F1',
  },
  homeStatusLabel: {
    fontSize: 14,
    color: '#5D6A86',
    fontFamily: FONT_STRONG,
  },
  homeStatusRolePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#DCE8FB',
  },
  homeStatusRoleText: {
    fontSize: 13,
    color: '#2E6FE9',
    fontFamily: FONT_DISPLAY,
  },
  homeStatusName: {
    fontSize: 19,
    lineHeight: 25,
    color: '#192446',
    fontFamily: FONT_DISPLAY,
    marginBottom: 6,
  },
  homeStatusRows: {
    borderWidth: 1,
    borderColor: '#E2E8F3',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  homeStatusRow: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDF5',
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  homeStatusRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 100,
  },
  homeStatusRowLabel: {
    fontSize: 13,
    color: '#5D6983',
    fontFamily: FONT_STRONG,
  },
  homeStatusRowRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  homeStatusRowValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    color: '#23314F',
    fontFamily: FONT_STRONG,
  },

  homeMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  metricCard: {
    width: '48.2%',
    minHeight: 130,
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  metricWatermark: {
    position: 'absolute',
    right: -14,
    bottom: -10,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  metricValue: {
    marginTop: 12,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -1.0,
    fontFamily: FONT_DISPLAY,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
    color: '#2A3551',
    fontFamily: FONT_STRONG,
  },

  settingsSection: {
    marginTop: 2,
  },
  settingsSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsSectionBar: {
    width: 8,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#3F82F2',
  },
  settingsSectionTitle: {
    fontSize: 17,
    lineHeight: 23,
    color: '#2A3550',
    fontFamily: FONT_DISPLAY,
  },
  settingsSectionDesc: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: '#78839D',
  },
  settingsCard: {
    backgroundColor: '#F8FBFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E7F2',
    overflow: 'hidden',
    paddingVertical: 4,
  },
  settingsRow: {
    minHeight: 92,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EBF5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsRowPressed: {
    backgroundColor: '#F1F6FF',
  },
  settingsRowIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 17,
    backgroundColor: '#E4ECFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowIconWrapDanger: {
    backgroundColor: '#FDECEE',
  },
  settingsRowBody: {
    flex: 1,
    gap: 4,
  },
  settingsRowTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1E2A48',
    fontFamily: FONT_DISPLAY,
  },
  settingsRowTitleDanger: {
    color: '#EF4444',
  },
  settingsRowDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: '#79839A',
  },

  messageCard: {
    backgroundColor: '#F9FBFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E9F4',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 116,
    position: 'relative',
  },
  messageCardPressed: {
    backgroundColor: '#F3F7FF',
  },
  messageCardIcon: {
    width: 62,
    height: 62,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  messageCardIconDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#377AF5',
  },
  messageCardBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  messageCardTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#0E1733',
    fontFamily: FONT_DISPLAY,
  },
  messageCardDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6E768A',
  },
  messageCardCount: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: '#6E768A',
  },
  messageCardCountStrong: {
    fontSize: 14,
    color: '#2E75EE',
    fontFamily: FONT_STRONG,
  },
  messageCardEdgeDot: {
    position: 'absolute',
    right: 36,
    bottom: 22,
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#377AF5',
  },

  sectionHeading: {
    marginTop: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#4F88F8',
    shadowColor: '#4F88F8',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 25,
    color: appTheme.foreground,
    letterSpacing: -0.6,
    fontFamily: FONT_DISPLAY,
  },
  sectionDesc: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: appTheme.mutedForeground,
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  actionTile: {
    width: '48.2%',
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 154,
    backgroundColor: appTheme.card,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  actionDisabled: {
    opacity: 0.45,
  },
  actionTileWatermark: {
    position: 'absolute',
    right: -16,
    bottom: -12,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  actionTileTitle: {
    fontSize: 14,
    lineHeight: 20,
    color: appTheme.foreground,
    letterSpacing: -0.4,
    fontFamily: FONT_DISPLAY,
  },
  actionTileDesc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: appTheme.mutedForeground,
  },
  actionTileArrow: {
    marginTop: 10,
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D2DAE8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FC',
  },

  card: {
    backgroundColor: appTheme.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: appTheme.border,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: appTheme.secondary,
    backgroundColor: appTheme.card,
  },
  actionRowPressed: {
    backgroundColor: appTheme.accent,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.primarySoft,
  },
  rowIconDanger: {
    backgroundColor: appTheme.destructiveSoft,
  },
  actionRowContent: {
    flex: 1,
  },
  actionRowTitle: {
    fontSize: 15,
    color: appTheme.foreground,
    fontFamily: FONT_STRONG,
  },
  actionRowTitleDanger: {
    color: appTheme.destructive,
  },
  actionRowDesc: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: appTheme.mutedForeground,
  },

  rowLast: {
    borderBottomWidth: 0,
  },

  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#DCE3F0',
    backgroundColor: '#F5F8FD',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 24,
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: '#D8E4F7',
  },
  tabButtonActiveMessage: {
    shadowColor: '#487CE6',
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  tabButtonPressed: {
    opacity: 0.78,
  },
  tabIconWrap: {
    position: 'relative',
  },
  tabMessageActiveDot: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: '#2F75EE',
  },
  tabBadge: {
    position: 'absolute',
    top: -8,
    right: -16,
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.destructive,
    borderWidth: 2,
    borderColor: '#F5F8FD',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: appTheme.background,
  },
  tabText: {
    fontSize: 14,
    color: appTheme.mutedForeground,
    fontFamily: FONT_STRONG,
  },
  tabTextActive: {
    color: appTheme.primary,
  },
  tabActiveIndicator: {
    marginTop: 4,
    width: 52,
    height: 5,
    borderRadius: 99,
    backgroundColor: appTheme.primary,
  },
});
