export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  AccountSecurity: undefined;
  TaskCenter: undefined;
  NoticeCenter: undefined;
  ConversationList: undefined;
  ConversationDetail: { conversationId: number };
  PoiForm: { poiId?: number } | undefined;
  PoiList: undefined;
  PoiDetail: { poiId: number };
  DisputeSubmit: { poiId: number };
  PoiMap: { poiId?: number; scope?: 'mine' | 'verifier' } | undefined;
  VerifierPoiList: undefined;
  VerifierPoiDetail: { poiId: number };
  VerifierDisputeList: undefined;
  VerifierDisputeDetail: { disputeId: number };
  UploadTest: undefined;
};
