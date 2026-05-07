import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import AccountSecurityScreen from '../screens/AccountSecurityScreen';
import ConversationDetailScreen from '../screens/ConversationDetailScreen';
import ConversationListScreen from '../screens/ConversationListScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import NoticeCenterScreen from '../screens/NoticeCenterScreen';
import DisputeSubmitScreen from '../screens/DisputeSubmitScreen';
import PoiDetailScreen from '../screens/PoiDetailScreen';
import PoiFormScreen from '../screens/PoiFormScreen';
import PoiListScreen from '../screens/PoiListScreen';
import PoiMapScreen from '../screens/PoiMapScreen';
import TaskCenterScreen from '../screens/TaskCenterScreen';
import UploadTestScreen from '../screens/UploadTestScreen';
import VerifierDisputeDetailScreen from '../screens/VerifierDisputeDetailScreen';
import VerifierDisputeListScreen from '../screens/VerifierDisputeListScreen';
import VerifierPoiDetailScreen from '../screens/VerifierPoiDetailScreen';
import VerifierPoiListScreen from '../screens/VerifierPoiListScreen';
import { appTheme } from '../components/appTheme';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const token = useAuthStore((state) => state.token);

  const screenOptions = useMemo(
    () => ({
      headerStyle: {
        backgroundColor: appTheme.muted,
      },
      headerTitleStyle: {
        fontWeight: '700' as const,
        color: appTheme.foreground,
      },
      headerTintColor: appTheme.foreground,
      headerShadowVisible: false,
      headerBackTitleVisible: false,
    }),
    [],
  );

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!token ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: '工作台' }} />
          <Stack.Screen name="AccountSecurity" component={AccountSecurityScreen} options={{ title: '账号安全' }} />
          <Stack.Screen name="TaskCenter" component={TaskCenterScreen} options={{ title: '任务中心' }} />
          <Stack.Screen name="NoticeCenter" component={NoticeCenterScreen} options={{ title: '通知中心' }} />
          <Stack.Screen name="ConversationList" component={ConversationListScreen} options={{ title: '协作会话' }} />
          <Stack.Screen name="ConversationDetail" component={ConversationDetailScreen} options={{ title: '聊天详情' }} />
          <Stack.Screen name="PoiForm" component={PoiFormScreen} options={{ title: '编辑点位' }} />
          <Stack.Screen name="PoiList" component={PoiListScreen} options={{ title: '我的记录' }} />
          <Stack.Screen name="PoiDetail" component={PoiDetailScreen} options={{ title: '记录详情' }} />
          <Stack.Screen name="DisputeSubmit" component={DisputeSubmitScreen} options={{ title: '发起异议' }} />
          <Stack.Screen name="PoiMap" component={PoiMapScreen} options={{ title: '地图查看' }} />
          <Stack.Screen name="VerifierPoiList" component={VerifierPoiListScreen} options={{ title: '待核验队列' }} />
          <Stack.Screen name="VerifierPoiDetail" component={VerifierPoiDetailScreen} options={{ title: '核验详情' }} />
          <Stack.Screen name="VerifierDisputeList" component={VerifierDisputeListScreen} options={{ title: '争议处理' }} />
          <Stack.Screen name="VerifierDisputeDetail" component={VerifierDisputeDetailScreen} options={{ title: '争议详情' }} />
          <Stack.Screen name="UploadTest" component={UploadTestScreen} options={{ title: '上传联调' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
