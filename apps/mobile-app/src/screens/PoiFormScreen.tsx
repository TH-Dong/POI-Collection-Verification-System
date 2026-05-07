import { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, SafeAreaView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { createPoi, fetchMyPoiDetail, fetchPoiCategories, updatePoi } from '../api/poi';
import { recognizeImageOcr, uploadFile, type OcrResult, type UploadResult } from '../api/file';
import { EXPO_PUBLIC_AMAP_SECURITY_JSCODE, EXPO_PUBLIC_AMAP_WEB_KEY } from '../config/env';
import type { PoiCategoryOption, PoiUpsertPayload } from '../types/poi';
import type { RootStackParamList } from '../types/navigation';
import { canEditPoi } from '../utils/poi';

type Props = NativeStackScreenProps<RootStackParamList, 'PoiForm'>;

type LocalImageAsset = { uri: string; name: string; type: string; };

type FormState = {
  poiName: string;
  categoryCode: string | null;
  description: string;
  longitude: number | null;
  latitude: number | null;
  addressText: string | null;
};

const initialFormState: FormState = {
  poiName: '', categoryCode: null, description: '', longitude: null, latitude: null, addressText: null,
};

type LocationFailureContext = {
  providerStatus?: Awaited<ReturnType<typeof Location.getProviderStatusAsync>> | null;
  attemptErrors: string[];
};

function inferImageMimeType(fileName?: string | null, mimeType?: string | null) {
  if (mimeType && mimeType.trim()) {
    return mimeType.trim();
  }
  const lowerName = fileName?.toLowerCase() ?? '';
  if (lowerName.endsWith('.png')) {
    return 'image/png';
  }
  if (lowerName.endsWith('.webp')) {
    return 'image/webp';
  }
  if (lowerName.endsWith('.gif')) {
    return 'image/gif';
  }
  if (lowerName.endsWith('.heic')) {
    return 'image/heic';
  }
  if (lowerName.endsWith('.heif')) {
    return 'image/heif';
  }
  return 'image/jpeg';
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function watchSingleLocation(timeoutMs: number) {
  return new Promise<Location.LocationObject>((resolve, reject) => {
    let settled = false;
    let subscription: Location.LocationSubscription | null = null;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      subscription?.remove();
      reject(new Error('watch_timeout'));
    }, timeoutMs);

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
        timeInterval: 1000,
        distanceInterval: 0,
      },
      (position) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        subscription?.remove();
        resolve(position);
      },
      (reason) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        subscription?.remove();
        reject(new Error(reason));
      },
    )
      .then((nextSubscription) => {
        subscription = nextSubscription;
      })
      .catch((error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
  });
}

function normalizeLocationError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error) {
    return error;
  }
  return 'unknown_error';
}

function buildLocationFailureMessage({ providerStatus, attemptErrors }: LocationFailureContext) {
  const providerNotes: string[] = [];
  if (Platform.OS === 'android' && providerStatus) {
    providerNotes.push(`GPS:${providerStatus.gpsAvailable ? '开' : '关'}`);
    providerNotes.push(`网络定位:${providerStatus.networkAvailable ? '开' : '关'}`);
  }

  const providerSummary = providerNotes.length ? `当前设备状态 ${providerNotes.join(' / ')}。` : '';
  const attemptSummary = attemptErrors.length ? `已尝试 ${attemptErrors.join('；')}。` : '';

  return `${providerSummary}${attemptSummary}请先到室外或靠近窗边等待几秒，再重试；如果浏览器能定位而 App 不能，通常是当前 GPS 尚未锁定，建议先打开系统地图 App 激活一次定位后再返回。`;
}

function buildAmapLocatorHtml(amapKey: string, securityJsCode: string) {
  const serializedAmapKey = JSON.stringify(amapKey);
  const serializedSecurityJsCode = JSON.stringify(securityJsCode);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      html, body, #container {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #f8fafc;
        overflow: hidden;
      }
      .status {
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: 12px;
        z-index: 2;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(17, 24, 39, 0.88);
        color: #fff;
        font-size: 13px;
        line-height: 1.45;
      }
    </style>
  </head>
  <body>
    <div id="container"></div>
    <div class="status" id="status">正在尝试高德辅助定位...</div>
    <script>
      const statusElement = document.getElementById('status');

      function postMessage(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function setStatus(text) {
        if (statusElement) {
          statusElement.textContent = text;
        }
      }

      function loadScript() {
        return new Promise(function(resolve, reject) {
          if (${serializedSecurityJsCode}) {
            window._AMapSecurityConfig = { securityJsCode: ${serializedSecurityJsCode} };
          }

          const script = document.createElement('script');
          script.src = 'https://webapi.amap.com/maps?v=2.0&key=' + ${serializedAmapKey} + '&plugin=AMap.Geolocation';
          script.async = true;
          script.onload = function() {
            if (window.AMap) {
              resolve(window.AMap);
              return;
            }
            reject(new Error('高德 JSAPI 未初始化成功'));
          };
          script.onerror = function() {
            reject(new Error('高德 JSAPI 加载失败'));
          };
          document.head.appendChild(script);
        });
      }

      function locate(AMap) {
        const map = new AMap.Map('container', {
          zoom: 15,
          mapStyle: 'amap://styles/whitesmoke',
          viewMode: '2D',
        });

        AMap.plugin('AMap.Geolocation', function() {
          const geolocation = new AMap.Geolocation({
            enableHighAccuracy: true,
            timeout: 15000,
            convert: true,
            showButton: false,
            showMarker: true,
            showCircle: true,
          });

          map.addControl(geolocation);
          setStatus('正在获取当前位置...');

          geolocation.getCurrentPosition(function(status, result) {
            if (status === 'complete' && result && result.position) {
              const longitude = result.position.lng;
              const latitude = result.position.lat;
              const addressText =
                result.formattedAddress ||
                [result.addressComponent?.province, result.addressComponent?.city, result.addressComponent?.district, result.addressComponent?.street, result.addressComponent?.streetNumber]
                  .filter(Boolean)
                  .join(' ') ||
                longitude.toFixed(6) + ', ' + latitude.toFixed(6);

              setStatus('定位成功，正在回填表单...');
              postMessage({
                type: 'locationSuccess',
                longitude: longitude,
                latitude: latitude,
                addressText: addressText,
              });
              return;
            }

            const message = result?.message || result?.info || '高德辅助定位失败，请检查设备定位与网络状态。';
            setStatus(message);
            postMessage({ type: 'locationError', message: message });
          });
        });
      }

      window.onerror = function(message) {
        const text = String(message || '高德辅助定位运行失败');
        setStatus(text);
        postMessage({ type: 'locationError', message: text });
      };

      loadScript()
        .then(locate)
        .catch(function(error) {
          const text = error && error.message ? error.message : '高德辅助定位初始化失败';
          setStatus(text);
          postMessage({ type: 'locationError', message: text });
        });
    </script>
  </body>
</html>`;
}

export default function PoiFormScreen({ navigation, route }: Props) {
  const poiId = route.params?.poiId;
  const [categories, setCategories] = useState<PoiCategoryOption[]>([]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [editingStatus, setEditingStatus] = useState<'DRAFT' | 'REJECTED'>('DRAFT');
  const [rectificationIssues, setRectificationIssues] = useState<string[]>([]);
  const [rectificationComment, setRectificationComment] = useState('');
  const [loading, setLoading] = useState(Boolean(poiId));
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [h5Locating, setH5Locating] = useState(false);
  const [h5LocatorVisible, setH5LocatorVisible] = useState(false);
  const [h5LocatorError, setH5LocatorError] = useState('');
  const [h5LocatorKey, setH5LocatorKey] = useState(0);
  const [imageAsset, setImageAsset] = useState<LocalImageAsset | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadResult | null>(null);
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    let active = true;
    fetchPoiCategories().then((data) => { if (active) setCategories(data); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!poiId) {
      setForm(initialFormState);
      setEditingStatus('DRAFT');
      setRectificationIssues([]);
      setRectificationComment('');
      setImageAsset(null); setUploadedImage(null); setImagePreviewUri(null);
      setImageUploadError('');
      setOcrResult(null);
      return;
    }
    let active = true;
    setLoading(true);
    fetchMyPoiDetail(poiId)
      .then((data) => {
        if (!active) return;
        if (!canEditPoi(data.status)) {
          setErrorText('当前记录正在核验中或已通过，暂不可编辑');
          navigation.replace('PoiDetail', { poiId: data.id });
          return;
        }
        setForm({
          poiName: data.poiName, categoryCode: data.categoryCode, description: data.description ?? '',
          longitude: data.longitude, latitude: data.latitude, addressText: data.addressText,
        });
        setEditingStatus(data.status);
        const latestRejectRecord = data.reviewRecords.find((item) => item.decision === 'REJECTED');
        setRectificationIssues(latestRejectRecord?.issueLabels ?? []);
        setRectificationComment(latestRejectRecord?.reviewComment ?? '');
        setUploadedImage(data.coverImageUrl ? { objectName: data.coverImageObjectName ?? '', originalFilename: data.poiName, contentType: 'image/jpeg', size: 0, url: data.coverImageUrl, storageMode: 'REMOTE' } : null);
        setImagePreviewUri(data.coverImageUrl);
        setOcrResult(data.ocrText ? {
          extractedText: data.ocrText,
          suggestedPoiName: data.poiName,
          suggestedDescription: data.description ?? null,
          suggestedCategoryCode: data.categoryCode,
          confidence: data.ocrConfidence ?? 0,
          provider: data.ocrProvider ?? 'HISTORY',
        } : null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [poiId]);

  const pickImage = async (source: 'camera' | 'library') => {
    const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    const nextAsset = {
      uri: asset.uri,
      name: asset.fileName || `poi-${Date.now()}.jpg`,
      type: inferImageMimeType(asset.fileName, asset.mimeType),
    };
    setImageAsset(nextAsset);
    setUploadedImage(null);
    setImagePreviewUri(asset.uri);
    setImageUploadError('');
    setOcrResult(null);
    void preUploadImage(nextAsset);
  };

  const preUploadImage = async (asset: LocalImageAsset) => {
    try {
      setImageUploading(true);
      const result = await uploadFile(asset);
      setUploadedImage(result);
    } catch (error: any) {
      setImageUploadError(error?.response?.data?.message || '图片预上传失败，提交时会再次尝试');
    } finally {
      setImageUploading(false);
    }
  };

  const openH5Locator = () => {
    setH5LocatorError('');
    setH5Locating(true);
    setH5LocatorKey((current) => current + 1);
    setH5LocatorVisible(true);
  };

  const showLocationFailureAlert = (message: string) => {
    if (EXPO_PUBLIC_AMAP_WEB_KEY) {
      Alert.alert('定位失败', message, [
        { text: '取消', style: 'cancel' },
        { text: '高德辅助定位', onPress: openH5Locator },
      ]);
      return;
    }

    Alert.alert('定位失败', message);
  };

  const handleH5LocationMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type: 'locationSuccess' | 'locationError';
        longitude?: number;
        latitude?: number;
        addressText?: string;
        message?: string;
      };

      if (payload.type === 'locationSuccess' && payload.longitude != null && payload.latitude != null) {
        const longitude = payload.longitude;
        const latitude = payload.latitude;
        setForm((current) => ({
          ...current,
          longitude,
          latitude,
          addressText:
            payload.addressText ??
            `${longitude.toFixed(6)}, ${latitude.toFixed(6)}`,
        }));
        setH5Locating(false);
        setH5LocatorVisible(false);
        setH5LocatorError('');
        return;
      }

      if (payload.type === 'locationError') {
        setH5Locating(false);
        setH5LocatorError(payload.message || '高德辅助定位失败');
      }
    } catch (_error) {
      setH5Locating(false);
      setH5LocatorError('高德辅助定位返回了无法识别的数据。');
    }
  };

  const fillCurrentLocation = async () => {
    try {
      setLocating(true);
      const providerStatus = await Location.getProviderStatusAsync().catch(() => null);
      const servicesEnabled = providerStatus?.locationServicesEnabled ?? await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert('系统定位未开启', '请先打开手机系统定位服务，再返回应用重新获取位置。', [
          { text: '取消', style: 'cancel' },
          { text: '打开设置', onPress: () => { void Linking.openSettings(); } },
        ]);
        return;
      }

      const existingPermission = await Location.getForegroundPermissionsAsync();
      const permission = existingPermission.granted ? existingPermission : await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('没有定位权限', '请在系统设置中允许当前应用访问位置信息。', [
          { text: '取消', style: 'cancel' },
          { text: '打开设置', onPress: () => { void Linking.openSettings(); } },
        ]);
        return;
      }

      if (Platform.OS === 'android') {
        await Location.enableNetworkProviderAsync().catch(() => undefined);
      }

      const attemptErrors: string[] = [];

      const lastKnownPosition = await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60 * 1000,
      }).catch((error) => {
        attemptErrors.push(`缓存定位失败: ${normalizeLocationError(error)}`);
        return null;
      });

      const balancedPosition = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        }),
        8000,
        'balanced_timeout',
      ).catch((error) => {
        attemptErrors.push(`网络定位失败: ${normalizeLocationError(error)}`);
        return null;
      });

      const highAccuracyPosition = balancedPosition
        ? null
        : await withTimeout(
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
              mayShowUserSettingsDialog: true,
            }),
            12000,
            'high_timeout',
          ).catch((error) => {
            attemptErrors.push(`GPS定位失败: ${normalizeLocationError(error)}`);
            return null;
          });

      const watchedPosition = balancedPosition || highAccuracyPosition
        ? null
        : await watchSingleLocation(12000).catch((error) => {
            attemptErrors.push(`持续监听失败: ${normalizeLocationError(error)}`);
            return null;
          });

      const currentPosition = balancedPosition ?? highAccuracyPosition ?? watchedPosition ?? lastKnownPosition;

      if (!currentPosition) {
        showLocationFailureAlert(buildLocationFailureMessage({ providerStatus, attemptErrors }));
        return;
      }

      const longitude = currentPosition.coords.longitude;
      const latitude = currentPosition.coords.latitude;
      let addressText = `${longitude.toFixed(6)}, ${latitude.toFixed(6)}`;
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({ longitude, latitude });
        if (reverseGeocode.length) {
          const first = reverseGeocode[0];
          const segments = [first.country, first.region, first.city, first.district, first.street, first.name].filter(Boolean);
          if (segments.length) addressText = segments.join(' ');
        }
      } catch (_error) {}
      setForm((current) => ({ ...current, longitude, latitude, addressText }));
    } catch (_error) {
      showLocationFailureAlert('获取位置时发生异常，请稍后重试。');
    } finally { setLocating(false); }
  };

  const ensureUploadedImage = async () => {
    if (!imageAsset) return uploadedImage;
    if (uploadedImage) return uploadedImage;
    const result = await uploadFile(imageAsset);
    setUploadedImage(result); setImageAsset(null);
    return result;
  };

  const applyOcrSuggestion = (result: OcrResult) => {
    setForm((current) => ({
      ...current,
      poiName: result.suggestedPoiName ?? current.poiName,
      description: current.description || result.suggestedDescription || '',
      categoryCode: current.categoryCode ?? result.suggestedCategoryCode ?? null,
    }));
  };

  const handleRecognizeOcr = async () => {
    if (!imageAsset) {
      Alert.alert('请重新选择图片', 'OCR 识别基于当前待提交图片执行。');
      return;
    }
    try {
      setOcrLoading(true);
      const result = await recognizeImageOcr(imageAsset);
      setOcrResult(result);
      if (!form.poiName && result.suggestedPoiName) {
        applyOcrSuggestion(result);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        (error?.code === 'ECONNABORTED' ? 'OCR 识别耗时较长，请稍后重试或换一张更清晰、体积更小的图片。' : null) ||
        '请稍后重试';
      Alert.alert('OCR 识别失败', message);
    } finally {
      setOcrLoading(false);
    }
  };

  const persistPoi = async (status: 'DRAFT' | 'SUBMITTED') => {
    try {
      setSaving(true); setErrorText('');
      const uploaded = await ensureUploadedImage();
      const payload: PoiUpsertPayload = {
        poiName: form.poiName, categoryCode: form.categoryCode, description: form.description || null,
        coverImageObjectName: uploaded?.objectName ?? null, coverImageUrl: uploaded?.url ?? null,
        longitude: form.longitude, latitude: form.latitude, addressText: form.addressText,
        ocrText: ocrResult?.extractedText ?? null, ocrConfidence: ocrResult?.confidence ?? null, ocrProvider: ocrResult?.provider ?? null,
        status,
      };
      const nextPoi = poiId ? await updatePoi(poiId, payload) : await createPoi(payload);
      navigation.replace('PoiDetail', { poiId: nextPoi.id });
    } catch (error: any) {
      setErrorText(error?.response?.data?.message || '保存失败');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}><ActivityIndicator size="small" color="#3F3F46" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
            <Text style={styles.title}>{poiId ? (editingStatus === 'REJECTED' ? '整改记录' : '编辑记录') : '新建 POI'}</Text>
            <Text style={styles.subtitle}>{editingStatus === 'REJECTED' ? '根据核验意见修改并重新提交' : '完善位置与描述信息'}</Text>
        </View>

        {editingStatus === 'REJECTED' ? (
          <View style={styles.section}>
            <Text style={styles.label}>整改意见</Text>
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>最近一次核验要求整改</Text>
              {rectificationIssues.length ? (
                <Text style={styles.warningIssues}>{rectificationIssues.join(' / ')}</Text>
              ) : null}
              <Text style={styles.warningText}>{rectificationComment || '未填写整改说明'}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.label}>名称</Text>
          <TextInput
            style={styles.input}
            placeholder="填写地点名称"
            placeholderTextColor="#71717A"
            value={form.poiName}
            onChangeText={(v) => setForm((curr) => ({ ...curr, poiName: v }))}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>分类</Text>
          <View style={styles.chipWrap}>
            {categories.map((item) => {
              const active = item.code === form.categoryCode;
              return (
                <Pressable
                  key={item.code}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setForm((curr) => ({ ...curr, categoryCode: item.code }))}
                >
                   <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{item.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.label}>位置定位</Text>
            <Pressable style={styles.actionBtnLight} onPress={() => void fillCurrentLocation()} disabled={locating}>
               {locating ? <ActivityIndicator size="small" color="#52525B" /> : <Text style={styles.actionBtnTextLight}>自动获取位置</Text>}
            </Pressable>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.locationAddressText}>{form.addressText ?? '未获取位置信息'}</Text>
            {form.longitude != null && form.latitude != null && (
              <Text style={styles.locationCoordsText}>{form.longitude.toFixed(6)}, {form.latitude.toFixed(6)}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>描述 (可选)</Text>
          <TextInput
            style={[styles.input, styles.inputArea]}
            placeholder="补充地点相关描述..."
            placeholderTextColor="#71717A"
            value={form.description}
            multiline textAlignVertical="top"
            onChangeText={(v) => setForm((curr) => ({ ...curr, description: v }))}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.label}>实景照片</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={styles.actionBtnLight} onPress={() => void pickImage('camera')}>
                 <Text style={styles.actionBtnTextLight}>拍照</Text>
              </Pressable>
              <Pressable style={styles.actionBtnLight} onPress={() => void pickImage('library')}>
                 <Text style={styles.actionBtnTextLight}>相册</Text>
              </Pressable>
            </View>
          </View>

          {imagePreviewUri ? (
            <View style={styles.imagePreviewBox}>
              <Image source={{ uri: imagePreviewUri }} style={styles.heroImage} />
              <Pressable style={styles.imageRemoveBtn} onPress={() => { setImagePreviewUri(null); setUploadedImage(null); setImageAsset(null); setImageUploadError(''); setOcrResult(null); }}>
                 <Text style={styles.imageRemoveText}>移除</Text>
              </Pressable>
            </View>
          ) : (
             <Pressable style={styles.heroEmpty} onPress={() => void pickImage('camera')}>
               <Text style={styles.heroEmptyText}>添加照片以记录现场环境</Text>
             </Pressable>
          )}

          {imagePreviewUri ? (
            <View style={styles.metaCard}>
              <Text style={styles.metaTitle}>图片状态</Text>
              <Text style={styles.metaText}>
                {imageUploading
                  ? '正在后台预上传图片，提交时会更快。'
                  : uploadedImage
                    ? `图片已预上传，存储位置：${uploadedImage.storageMode}`
                    : '当前图片尚未上传。'}
              </Text>
              {imageUploadError ? <Text style={styles.metaError}>{imageUploadError}</Text> : null}
              <View style={styles.ocrActionRow}>
                <Pressable style={styles.actionBtnLight} onPress={() => void handleRecognizeOcr()} disabled={ocrLoading}>
                  {ocrLoading ? <ActivityIndicator size="small" color="#52525B" /> : <Text style={styles.actionBtnTextLight}>识别招牌文字</Text>}
                </Pressable>
                {ocrResult ? (
                  <Pressable style={styles.actionBtnLight} onPress={() => applyOcrSuggestion(ocrResult)}>
                    <Text style={styles.actionBtnTextLight}>一键回填</Text>
                  </Pressable>
                ) : null}
              </View>
              {ocrResult ? (
                <View style={styles.ocrCard}>
                  <Text style={styles.metaTitle}>OCR 建议</Text>
                  <Text style={styles.metaText}>识别文字：{ocrResult.extractedText}</Text>
                  <Text style={styles.metaText}>建议名称：{ocrResult.suggestedPoiName ?? '无'}</Text>
                  <Text style={styles.metaText}>建议分类：{ocrResult.suggestedCategoryCode ?? '无'}</Text>
                  <Text style={styles.metaText}>置信度：{Math.round(ocrResult.confidence * 100)}%</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

      </ScrollView>

      <Modal visible={h5LocatorVisible} animationType="slide" onRequestClose={() => setH5LocatorVisible(false)}>
        <SafeAreaView style={styles.root}>
          <View style={styles.locatorHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.locatorTitle}>高德辅助定位</Text>
              <Text style={styles.locatorSubtitle}>原生定位失败时，改用高德 H5 定位兜底。</Text>
            </View>
            <Pressable style={styles.locatorCloseButton} onPress={() => setH5LocatorVisible(false)}>
              <Text style={styles.locatorCloseButtonText}>关闭</Text>
            </Pressable>
          </View>

          <View style={styles.locatorMapShell}>
            <WebView
              key={h5LocatorKey}
              originWhitelist={['*']}
              source={{ html: buildAmapLocatorHtml(EXPO_PUBLIC_AMAP_WEB_KEY, EXPO_PUBLIC_AMAP_SECURITY_JSCODE) }}
              onMessage={handleH5LocationMessage}
              onError={() => {
                setH5Locating(false);
                setH5LocatorError('高德辅助定位页面加载失败，请检查 key / jscode 或网络。');
              }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              style={styles.locatorWebview}
              renderLoading={() => (
                <View style={styles.centered}>
                  <ActivityIndicator size="small" color="#3F3F46" />
                </View>
              )}
            />
          </View>

          <View style={styles.locatorFooter}>
            <Text style={styles.locatorHint}>
              {h5LocatorError || (h5Locating ? '正在尝试高德辅助定位...' : '定位成功后会自动回填到当前表单。')}
            </Text>
            <Pressable style={styles.actionBtnLight} onPress={openH5Locator}>
              <Text style={styles.actionBtnTextLight}>重新尝试</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {errorText ? (
         <View style={styles.errorBox}>
           <Text style={styles.errorText}>{errorText}</Text>
         </View>
      ) : null}

      <View style={styles.footerRow}>
         <Pressable style={styles.btnSecondary} onPress={() => void persistPoi('DRAFT')} disabled={saving || loading}>
           <Text style={styles.btnSecondaryText}>{editingStatus === 'REJECTED' ? '保存整改' : '存为草稿'}</Text>
         </Pressable>
         <Pressable style={styles.btnPrimary} onPress={() => void persistPoi('SUBMITTED')} disabled={saving || loading}>
           {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.btnPrimaryText}>{editingStatus === 'REJECTED' ? '重新提交' : '提交记录'}</Text>}
         </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FBFCFD' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  locatorHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locatorTitle: { fontSize: 20, fontWeight: '700', color: '#3F3F46' },
  locatorSubtitle: { marginTop: 4, fontSize: 13, color: '#71717A', lineHeight: 19 },
  locatorCloseButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F5F9',
  },
  locatorCloseButtonText: { color: '#52525B', fontSize: 13, fontWeight: '600' },
  locatorMapShell: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E9F2',
    backgroundColor: '#FFFFFF',
  },
  locatorWebview: { flex: 1, backgroundColor: '#FBFCFD' },
  locatorFooter: { paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  locatorHint: { fontSize: 13, color: '#71717A', lineHeight: 20 },
  scrollContainer: { paddingBottom: 64 },
  header: { paddingHorizontal: 20, paddingTop: 36, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#3F3F46', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#71717A', marginTop: 6 },
  
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#52525B', marginBottom: 8, marginLeft: 4 },
  warningCard: {
    backgroundColor: '#FFF8E8',
    borderWidth: 1,
    borderColor: '#FFE3A3',
    borderRadius: 12,
    padding: 16,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B56A19',
  },
  warningIssues: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#B56A19',
  },
  warningText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#B56A19',
  },
  
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E9F2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#3F3F46',
  },
  inputArea: {
    height: 100,
    paddingTop: 16,
    lineHeight: 22,
  },
  
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: { 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1, 
    borderColor: '#E5E9F2', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 10 
  },
  categoryChipActive: { 
    backgroundColor: '#EDF4FF', 
    borderColor: '#3B6FF5' 
  },
  categoryChipText: { fontSize: 14, fontWeight: '500', color: '#71717A' },
  categoryChipTextActive: { color: '#2759D8', fontWeight: '600' },
  
  actionBtnLight: { 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1, 
    borderColor: '#E5E9F2', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextLight: { fontSize: 13, fontWeight: '600', color: '#52525B' },
  
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E9F2',
    borderRadius: 12,
    padding: 16,
  },
  locationAddressText: { fontSize: 15, color: '#3F3F46', fontWeight: '500', lineHeight: 22 },
  locationCoordsText: { fontSize: 13, color: '#71717A', marginTop: 6, fontFamily: 'Courier' },
  
  heroEmpty: { 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1, 
    borderColor: '#E5E9F2', 
    borderStyle: 'dashed',
    borderRadius: 12, 
    height: 120, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  heroEmptyText: { fontSize: 14, fontWeight: '500', color: '#71717A' },
  
  imagePreviewBox: { 
    position: 'relative', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#E5E9F2', 
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: 200, resizeMode: 'cover' },
  imageRemoveBtn: { 
    position: 'absolute', 
    top: 12, 
    right: 12, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16 
  },
  imageRemoveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  metaCard: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E9F2',
    padding: 14,
    gap: 8,
  },
  metaTitle: { fontSize: 13, fontWeight: '700', color: '#52525B' },
  metaText: { fontSize: 13, lineHeight: 20, color: '#71717A' },
  metaError: { fontSize: 13, lineHeight: 20, color: '#B4232A' },
  ocrActionRow: { flexDirection: 'row', gap: 8 },
  ocrCard: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F5F9',
    gap: 4,
  },
  
  errorBox: { padding: 12, backgroundColor: '#FFF0F0', marginHorizontal: 20, marginTop: 24, borderRadius: 8, borderWidth: 1, borderColor: '#FFF0F0' },
  errorText: { color: '#E5484D', fontSize: 14, textAlign: 'center' },
  
  footerRow: { 
    flexDirection: 'row', 
    borderTopWidth: 1, 
    borderTopColor: '#E5E9F2', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    backgroundColor: '#FFFFFF', 
    gap: 12 
  },
  btnSecondary: { 
    flex: 1, 
    flexBasis: '35%',
    backgroundColor: '#F3F5F9',
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  btnSecondaryText: { fontSize: 15, fontWeight: '600', color: '#52525B' },
  btnPrimary: { 
    flex: 2, 
    flexBasis: '65%',
    height: 50, 
    backgroundColor: '#3B6FF5', 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  btnPrimaryText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
