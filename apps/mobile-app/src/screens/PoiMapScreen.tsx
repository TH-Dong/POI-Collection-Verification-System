import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { fetchMyPois, fetchVerifierPendingPois } from '../api/poi';
import { EXPO_PUBLIC_AMAP_SECURITY_JSCODE, EXPO_PUBLIC_AMAP_WEB_KEY, getPublicEnvDiagnostics } from '../config/env';
import type { PoiSummary } from '../types/poi';
import type { RootStackParamList } from '../types/navigation';
import {
  getPoiNavigationUrl,
  getPoiRegionLabel,
  getPoiStatusMeta,
  hasPoiCoordinates,
  isProblemPoi,
} from '../utils/poi';

type Props = NativeStackScreenProps<RootStackParamList, 'PoiMap'>;

type ScopeMode = 'mine' | 'verifier';

type FilteredPoi = PoiSummary & {
  regionLabel: string;
};

const AMAP_WEB_KEY = EXPO_PUBLIC_AMAP_WEB_KEY;
const AMAP_SECURITY_JSCODE = EXPO_PUBLIC_AMAP_SECURITY_JSCODE;

export default function PoiMapScreen({ navigation, route }: Props) {
  const webViewRef = useRef<WebView>(null);
  const scope: ScopeMode = route.params?.scope === 'verifier' ? 'verifier' : 'mine';
  const [pois, setPois] = useState<PoiSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [selectedPoiId, setSelectedPoiId] = useState<number | null>(route.params?.poiId ?? null);
  const [pageScrollEnabled, setPageScrollEnabled] = useState(true);
  const [mapRenderError, setMapRenderError] = useState('');
  const envDiagnostics = getPublicEnvDiagnostics();

  const loadPois = async () => {
    try {
      setLoading(true);
      setErrorText('');
      const data = scope === 'verifier' ? await fetchVerifierPendingPois() : await fetchMyPois();
      setPois(data);
    } catch (_error) {
      setErrorText('获取地图数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      void loadPois();
    });
    void loadPois();
    return unsubscribe;
  }, [navigation, scope]);

  useEffect(() => {
    if (route.params?.poiId != null) {
      setSelectedPoiId(route.params.poiId);
    }
  }, [route.params?.poiId]);

  const enrichedPois = useMemo<FilteredPoi[]>(() => {
    return pois.map((item) => ({
      ...item,
      regionLabel: getPoiRegionLabel(item.addressText, item.longitude, item.latitude),
    }));
  }, [pois]);

  const categoryOptions = useMemo(() => ['ALL', ...new Set(enrichedPois.map((item) => item.categoryName).filter(Boolean) as string[])], [enrichedPois]);
  const statusOptions = useMemo(() => ['ALL', ...new Set(enrichedPois.map((item) => item.status))], [enrichedPois]);
  const regionOptions = useMemo(() => ['ALL', ...new Set(enrichedPois.map((item) => item.regionLabel))], [enrichedPois]);

  const filteredPois = useMemo(() => {
    return enrichedPois.filter((item) => {
      const matchesCategory = categoryFilter === 'ALL' || item.categoryName === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchesRegion = regionFilter === 'ALL' || item.regionLabel === regionFilter;
      return matchesCategory && matchesStatus && matchesRegion;
    });
  }, [categoryFilter, enrichedPois, regionFilter, statusFilter]);

  useEffect(() => {
    if (!filteredPois.length) {
      setSelectedPoiId(null);
      return;
    }
    if (!selectedPoiId || !filteredPois.some((item) => item.id === selectedPoiId)) {
      setSelectedPoiId(filteredPois[0].id);
    }
  }, [filteredPois, selectedPoiId]);

  const locatedPois = useMemo(() => filteredPois.filter(hasPoiCoordinates), [filteredPois]);
  const unlocatedCount = filteredPois.length - locatedPois.length;
  const issueCount = filteredPois.filter(isProblemPoi).length;

  const selectedPoi = useMemo(() => {
    if (selectedPoiId == null) {
      return null;
    }
    return filteredPois.find((item) => item.id === selectedPoiId) ?? null;
  }, [filteredPois, selectedPoiId]);

  const htmlContent = useMemo(() => {
    const mapPoints = locatedPois.map((item) => ({
      id: item.id,
      poiName: item.poiName,
      categoryName: item.categoryName ?? '未分类',
      regionLabel: item.regionLabel,
      longitude: item.longitude,
      latitude: item.latitude,
      color: getPoiStatusMeta(item.status).badgeText,
      problem: isProblemPoi(item),
      active: item.id === selectedPoiId,
      statusLabel: getPoiStatusMeta(item.status).label,
    }));

    return buildAmapHtml({
      amapKey: AMAP_WEB_KEY,
      securityJsCode: AMAP_SECURITY_JSCODE,
      points: mapPoints,
      selectedPoiId,
    });
  }, [locatedPois, selectedPoiId]);

  useEffect(() => {
    setMapRenderError('');
  }, [htmlContent]);

  const handleMapMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type: string; poiId?: number; message?: string };
      if (payload.type === 'selectPoi' && payload.poiId) {
        setSelectedPoiId(payload.poiId);
        return;
      }
      if (payload.type === 'mapReady') {
        setMapRenderError('');
        return;
      }
      if (payload.type === 'mapError' && payload.message) {
        setMapRenderError(payload.message);
      }
    } catch (_error) {
      // ignore malformed bridge message
    }
  };

  const zoomMap = (action: 'in' | 'out') => {
    const script = action === 'in'
      ? 'window.__poiZoomIn && window.__poiZoomIn(); true;'
      : 'window.__poiZoomOut && window.__poiZoomOut(); true;';
    webViewRef.current?.injectJavaScript(script);
  };

  const openNavigation = async () => {
    if (!selectedPoi) {
      return;
    }
    const url = getPoiNavigationUrl(selectedPoi);
    if (!url) {
      Alert.alert('当前记录缺少坐标，暂无法进入导航。');
      return;
    }
    await Linking.openURL(url);
  };

  const openPoiDetail = () => {
    if (!selectedPoi) {
      return;
    }
    if (scope === 'verifier') {
      navigation.navigate('VerifierPoiDetail', { poiId: selectedPoi.id });
      return;
    }
    navigation.navigate('PoiDetail', { poiId: selectedPoi.id });
  };

  const title = scope === 'verifier' ? '空间核验' : '我的地图';
  const subtitle = scope === 'verifier' ? '用高德底图快速查看待核验点位和问题分布。' : '查看我提交记录的空间分布、问题标记和处理状态。';

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#3F3F46" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} scrollEnabled={pageScrollEnabled}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        </View>

        <View style={styles.toolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricStrip}>
            <MetricPill label="当前点位" value={String(filteredPois.length)} />
            <MetricPill label="地图已定位" value={String(locatedPois.length)} />
            <MetricPill label="问题点位" value={String(issueCount)} />
            <MetricPill label="缺少坐标" value={String(unlocatedCount)} />
          </ScrollView>

          <FilterGroup
            label="分类"
            value={categoryFilter}
            options={categoryOptions}
            onChange={setCategoryFilter}
            formatter={(option) => (option === 'ALL' ? '全部分类' : option)}
          />
          <FilterGroup
            label="状态"
            value={statusFilter}
            options={statusOptions}
            onChange={setStatusFilter}
            formatter={(option) => (option === 'ALL' ? '全部状态' : getPoiStatusMeta(option as PoiSummary['status']).label)}
          />
          <FilterGroup
            label="区域"
            value={regionFilter}
            options={regionOptions}
            onChange={setRegionFilter}
            formatter={(option) => (option === 'ALL' ? '全部区域' : option)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>地图分布</Text>
          <View
            style={styles.mapShell}
            onTouchStart={() => setPageScrollEnabled(false)}
            onTouchEnd={() => setPageScrollEnabled(true)}
            onTouchCancel={() => setPageScrollEnabled(true)}
          >
            {!AMAP_WEB_KEY ? (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderTitle}>缺少高德 Web Key</Text>
                <Text style={styles.placeholderText}>
                  当前运行时未读取到 `EXPO_PUBLIC_AMAP_WEB_KEY`。请确认 `apps/mobile-app/.env` 已配置，并执行 `npx expo start -c` 重新启动。
                </Text>
                <Text style={styles.debugText}>
                  运行时状态：key={envDiagnostics.amapWebKeyPresent ? 'ok' : 'missing'} / jscode=
                  {envDiagnostics.amapSecurityJscodePresent ? 'ok' : 'missing'}
                </Text>
              </View>
            ) : mapRenderError ? (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderTitle}>地图加载失败</Text>
                <Text style={styles.placeholderText}>{mapRenderError}</Text>
              </View>
            ) : !locatedPois.length ? (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderTitle}>当前没有可渲染点位</Text>
                <Text style={styles.placeholderText}>请切换筛选条件，或先补齐坐标数据。</Text>
              </View>
            ) : (
              <>
                <View style={styles.mapOverlayTop}>
                  <View style={styles.legendPanel}>
                    <LegendChip color="#3B6FF5" label="待处理点位" />
                    <LegendChip color="#F09A5A" label="问题点位" diamond />
                    <LegendChip color="#277C68" label="争议或裁定" />
                    <LegendChip color="#4F9C78" label="已最终确认" />
                  </View>
                  <View style={styles.zoomControlGroup}>
                    <Pressable style={styles.zoomButton} onPress={() => zoomMap('in')}>
                      <Text style={styles.zoomButtonText}>+</Text>
                    </Pressable>
                    <Pressable style={styles.zoomButton} onPress={() => zoomMap('out')}>
                      <Text style={styles.zoomButtonText}>-</Text>
                    </Pressable>
                  </View>
                  {unlocatedCount ? (
                    <View style={styles.overlayNotice}>
                      <Text style={styles.overlayNoticeText}>{unlocatedCount} 条记录缺少坐标</Text>
                    </View>
                  ) : null}
                </View>
                <WebView
                  ref={webViewRef}
                  originWhitelist={['*']}
                  source={{ html: htmlContent }}
                  onMessage={handleMapMessage}
                  onError={() => setMapRenderError('WebView 渲染失败，请重新加载 Expo，并检查高德 key / jscode 是否有效。')}
                  javaScriptEnabled
                  domStorageEnabled
                  startInLoadingState
                  nestedScrollEnabled
                  style={styles.webview}
                  renderLoading={() => (
                    <View style={styles.mapLoading}>
                      <ActivityIndicator size="small" color="#3F3F46" />
                    </View>
                  )}
                />
              </>
            )}
          </View>
        </View>

        {selectedPoi ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>点位详情</Text>
            <View style={styles.detailCard}>
              <View style={styles.detailTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>{selectedPoi.poiName}</Text>
                  <Text style={styles.detailMeta}>{selectedPoi.categoryName || '未分类'} · {selectedPoi.regionLabel}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getPoiStatusMeta(selectedPoi.status).badgeBg }]}>
                  <Text style={[styles.statusText, { color: getPoiStatusMeta(selectedPoi.status).badgeText }]}>
                    {getPoiStatusMeta(selectedPoi.status).label}
                  </Text>
                </View>
              </View>

              <InfoRow label="采集者" value={selectedPoi.collectorName} />
              <InfoRow label="坐标" value={hasPoiCoordinates(selectedPoi) ? `${selectedPoi.longitude!.toFixed(6)}, ${selectedPoi.latitude!.toFixed(6)}` : '无坐标'} />
              <InfoRow label="最新进展" value={selectedPoi.latestReviewComment || '等待处理动作'} />

              {selectedPoi.latestIssueLabels.length ? (
                <View style={styles.issueSection}>
                  <Text style={styles.infoLabel}>问题标记</Text>
                  <View style={styles.issueWrap}>
                    {selectedPoi.latestIssueLabels.map((item) => (
                      <View key={item} style={styles.issueChip}>
                        <Text style={styles.issueChipText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.actionRow}>
                <Pressable style={styles.secondaryButton} onPress={openPoiDetail}>
                  <Text style={styles.secondaryButtonText}>查看详情</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => void openNavigation()}>
                  <Text style={styles.secondaryButtonText}>导航入口</Text>
                </Pressable>
                <Pressable style={styles.primaryButton} onPress={() => Alert.alert('路径规划能力已预留，后续可接高德规划接口。')}>
                  <Text style={styles.primaryButtonText}>路径规划预留</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricPillValue}>{value}</Text>
      <Text style={styles.metricPillLabel}>{label}</Text>
    </View>
  );
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
  formatter,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  formatter: (value: string) => string;
}) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {options.map((option) => {
          const active = option === value;
          return (
            <Pressable key={option} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => onChange(option)}>
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{formatter(option)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function LegendChip({ color, label, diamond = false }: { color: string; label: string; diamond?: boolean }) {
  return (
    <View style={styles.legendChip}>
      <View style={[styles.legendDot, { backgroundColor: color }, diamond && styles.legendDotDiamond]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function buildAmapHtml({
  amapKey,
  securityJsCode,
  points,
  selectedPoiId,
}: {
  amapKey: string;
  securityJsCode: string;
  points: Array<{
    id: number;
    poiName: string;
    categoryName: string;
    regionLabel: string;
    longitude: number | null;
    latitude: number | null;
    color: string;
    problem: boolean;
    active: boolean;
    statusLabel: string;
  }>;
  selectedPoiId: number | null;
}) {
  const serializedPoints = JSON.stringify(points);
  const serializedSelectedPoiId = JSON.stringify(selectedPoiId);
  const serializedSecurityJsCode = JSON.stringify(securityJsCode);
  const serializedHasKey = JSON.stringify(Boolean(amapKey));
  const serializedHasSecurityJsCode = JSON.stringify(Boolean(securityJsCode));
  const serializedAmapKey = JSON.stringify(amapKey);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, width=device-width" />
    <style>
      html, body, #container {
        margin: 0; padding: 0; width: 100%; height: 100%;
        background: #FBFCFD; overflow: hidden;
      }
      .amap-logo, .amap-copyright { opacity: 0 !important; display: none !important; }
      .marker {
        width: 7px; height: 7px;
        border: 1px solid #FFFFFF;
        border-radius: 999px;
        background-color: #000;
        box-shadow: 0 2px 6px rgba(47, 64, 86, 0.16);
        transition: transform 0.16s ease, box-shadow 0.16s ease;
      }
      .marker.problem { transform: rotate(45deg); border-radius: 2px; background-color: #F09A5A !important; }
      .marker.active {
        transform: scale(1.26);
        border: 1px solid rgba(47, 158, 143, 0.92);
        box-shadow: 0 0 0 4px rgba(47, 158, 143, 0.14), 0 5px 12px rgba(47, 64, 86, 0.18);
      }
      .marker.problem.active { transform: scale(1.22) rotate(45deg); }
      .info { padding: 4px; color: #3F3F46; }
      .info-title { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
      .info-desc { font-size: 12px; color: #71717A; font-family: monospace; }
    </style>
  </head>
  <body>
    <div id="container"></div>
    <script>
      const points = ${serializedPoints};
      const selectedPoiId = ${serializedSelectedPoiId};
      const hasKey = ${serializedHasKey};
      const hasSecurityJsCode = ${serializedHasSecurityJsCode};
      let mapRef = null;

      function postMessage(data) {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }

      function reportError(message) { postMessage({ type: 'mapError', message: message }); }
      window.__poiZoomIn = function() { if (mapRef) mapRef.zoomIn(); };
      window.__poiZoomOut = function() { if (mapRef) mapRef.zoomOut(); };

      function buildMarker(point) {
        const classes = ['marker'];
        if (point.problem) classes.push('problem');
        if (point.id === selectedPoiId) classes.push('active');
        return '<div class="' + classes.join(' ') + '" style="background:' + point.color + '"></div>';
      }

      function buildInfo(point) {
        return '<div class="info">' +
          '<div class="info-title">' + point.poiName + '</div>' +
          '<div class="info-desc">' + point.categoryName + ' | ' + point.regionLabel + '</div>' +
        '</div>';
      }

      function loadAmapScript() {
        return new Promise(function(resolve, reject) {
          if (!hasKey) { reject(new Error('未配置高德 Web Key。')); return; }
          if (window.AMap) { resolve(window.AMap); return; }
          if (hasSecurityJsCode) window._AMapSecurityConfig = { securityJsCode: ${serializedSecurityJsCode} };
          const script = document.createElement('script');
          script.src = 'https://webapi.amap.com/maps?v=2.0&key=' + ${serializedAmapKey};
          script.async = true;
          script.onload = function() {
            if (window.AMap) { resolve(window.AMap); return; }
            reject(new Error('地图引擎初始化失败。'));
          };
          script.onerror = function() { reject(new Error('地图引擎加载失败。')); };
          document.head.appendChild(script);
        });
      }

      function initMap(AMap) {
        if (!points.length) { reportError('当前筛选条件下无坐标分布。'); return; }
        const map = new AMap.Map('container', {
          zoom: points.length > 1 ? 11 : 15,
          center: [points[0].longitude, points[0].latitude],
          mapStyle: 'amap://styles/whitesmoke',
          viewMode: '2D',
        });
        mapRef = map;
        map.on('complete', function() { postMessage({ type: 'mapReady' }); });
        map.on('error', function() { reportError('地图核心引擎渲染异常。'); });

        const markers = [];
        const infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -12) });

        points.forEach((point) => {
          const marker = new AMap.Marker({
            position: [point.longitude, point.latitude],
            anchor: 'center',
            content: buildMarker(point),
          });
          marker.on('click', () => {
            infoWindow.setContent(buildInfo(point));
            infoWindow.open(map, marker.getPosition());
            map.setCenter(marker.getPosition());
            postMessage({ type: 'selectPoi', poiId: point.id });
          });
          marker.setMap(map);
          markers.push(marker);

          if (point.id === selectedPoiId) {
            infoWindow.setContent(buildInfo(point));
            infoWindow.open(map, marker.getPosition());
            map.setCenter(marker.getPosition());
          }
        });
        if (markers.length > 1) {
          map.setFitView(markers, false, [56, 56, 56, 56]);
        } else if (markers.length === 1) {
          map.setCenter(markers[0].getPosition());
          map.setZoom(15);
        }
      }
      window.onerror = function(message) { reportError(String(message)); };
      loadAmapScript().then(initMap).catch(function(error) { reportError(error && error.message ? error.message : '地图拉取失败。'); });
    </script>
  </body>
</html>`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FBFCFD' },
  content: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#16324F', letterSpacing: -1 },
  subtitle: { marginTop: 6, fontSize: 13, color: '#6C7A89', lineHeight: 20 },
  errorText: { marginTop: 12, fontSize: 13, color: '#E5484D' },
  toolbar: { paddingHorizontal: 24, paddingBottom: 16 },
  section: { marginTop: 12, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#71717A', marginBottom: 8, letterSpacing: 0.5 },
  metricStrip: { gap: 16, paddingRight: 24, marginBottom: 16 },
  metricPill: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#A9C6E8', paddingBottom: 4, gap: 12 },
  metricPillLabel: { fontSize: 11, color: '#6C7A89', textTransform: 'uppercase' },
  metricPillValue: { fontSize: 16, fontWeight: '800', fontFamily: 'Courier', color: '#16324F' },
  mapShell: { height: 420, borderWidth: 1, borderColor: '#D7E2F0', borderRadius: 22, backgroundColor: '#FFFFFF', position: 'relative', overflow: 'hidden' },
  filterGroup: { marginBottom: 16 },
  filterLabel: { fontSize: 11, color: '#6C7A89', marginBottom: 6, textTransform: 'uppercase' },
  filterScroll: { paddingRight: 24, gap: 12 },
  filterChip: { paddingHorizontal: 0, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  filterChipActive: { borderBottomColor: '#3B6FF5' },
  filterChipText: { fontSize: 13, color: '#6C7A89' },
  filterChipTextActive: { color: '#16324F', fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D7E2F0', borderRadius: 18, padding: 16 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendChip: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendDot: { width: 8, height: 8, marginRight: 6, borderWidth: 1, borderColor: 'rgba(71, 85, 105, 0.14)', borderRadius: 999 },
  legendDotDiamond: { transform: [{ rotate: '45deg' }] },
  legendText: { fontSize: 11, color: '#71717A' },
  webview: { flex: 1, backgroundColor: '#FBFCFD' },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBFCFD' },
  placeholderBox: { backgroundColor: '#FBFCFD', padding: 24, flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderTitle: { fontSize: 14, fontWeight: '700', color: '#16324F' },
  placeholderText: { marginTop: 8, fontSize: 13, color: '#6C7A89', textAlign: 'center', lineHeight: 20 },
  debugText: { marginTop: 12, fontSize: 11, fontFamily: 'Courier', color: '#71717A', textAlign: 'center' },
  mapOverlayTop: { position: 'absolute', top: 12, left: 12, right: 12, zIndex: 3, gap: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  legendPanel: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 1, borderColor: '#D7E2F0', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'column', gap: 4, maxWidth: '72%' },
  zoomControlGroup: { gap: 8 },
  zoomButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 1, borderColor: '#D7E2F0', alignItems: 'center', justifyContent: 'center', shadowColor: '#8EA8C8', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  zoomButtonText: { fontSize: 22, lineHeight: 24, color: '#2F5D8C', fontWeight: '700' },
  overlayNotice: { alignSelf: 'flex-end', backgroundColor: 'rgba(34, 87, 122, 0.88)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  overlayNoticeText: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  detailCard: { backgroundColor: '#FFFFFF', padding: 20, borderWidth: 1, borderColor: '#D7E2F0', borderRadius: 18, marginTop: 8 },
  detailTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E8EEF6', paddingBottom: 16 },
  detailTitle: { fontSize: 18, fontWeight: '800', color: '#16324F', letterSpacing: -0.5 },
  detailMeta: { marginTop: 4, fontSize: 12, color: '#6C7A89', fontFamily: 'Courier' },
  statusBadge: { borderWidth: 1, borderColor: '#D7E2F0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E9F2' },
  infoLabel: { fontSize: 12, color: '#6C7A89' },
  infoValue: { flex: 1, fontSize: 12, color: '#16324F', textAlign: 'right', fontFamily: 'Courier' },
  issueSection: { marginTop: 16 },
  issueWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  issueChip: { backgroundColor: '#FFF3E8', borderWidth: 1, borderColor: '#F4C79D', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  issueChipText: { fontSize: 11, color: '#CB6B2E', fontWeight: '700' },
  actionRow: { flexDirection: 'column', gap: 8, marginTop: 24 },
  secondaryButton: { borderWidth: 1, borderColor: '#D7E2F0', borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FBFCFD' },
  secondaryButtonText: { fontSize: 13, fontWeight: '700', color: '#355C7D' },
  primaryButton: { backgroundColor: '#2F7FA3', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  bottomSpacer: { height: 24 },
});
