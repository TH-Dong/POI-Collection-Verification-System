import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { appTheme } from '../components/appTheme';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const token = useAuthStore((state) => state.token);
  const LoginScreen = require('../screens/LoginScreen').default;

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
          {(() => {
            const HomeScreen = require('../screens/HomeScreen').default;
            const ProfileSettingsScreen = require('../screens/ProfileSettingsScreen').default;
            const AccountSecurityScreen = require('../screens/AccountSecurityScreen').default;
            const TaskCenterScreen = require('../screens/TaskCenterScreen').default;
            const NoticeCenterScreen = require('../screens/NoticeCenterScreen').default;
            const ConversationListScreen = require('../screens/ConversationListScreen').default;
            const ConversationDetailScreen = require('../screens/ConversationDetailScreen').default;
            const PoiFormScreen = require('../screens/PoiFormScreen').default;
            const PoiListScreen = require('../screens/PoiListScreen').default;
            const PoiDetailScreen = require('../screens/PoiDetailScreen').default;
            const DisputeSubmitScreen = require('../screens/DisputeSubmitScreen').default;
            const PoiMapScreen = require('../screens/PoiMapScreen').default;
            const VerifierPoiListScreen = require('../screens/VerifierPoiListScreen').default;
            const VerifierPoiDetailScreen = require('../screens/VerifierPoiDetailScreen').default;
            const VerifierDisputeListScreen = require('../screens/VerifierDisputeListScreen').default;
            const VerifierDisputeDetailScreen = require('../screens/VerifierDisputeDetailScreen').default;
            const UploadTestScreen = require('../screens/UploadTestScreen').default;

            return (
              <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: '工作台' }} />
          <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} options={{ title: '个人资料' }} />
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
            );
          })()}
        </>
      )}
    </Stack.Navigator>
  );
}
