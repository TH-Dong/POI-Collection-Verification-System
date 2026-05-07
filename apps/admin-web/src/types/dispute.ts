import type { PoiDetail, PoiReviewDecision, PoiStatus } from './poi';

export type DisputeStatus = 'DISPUTING' | 'ARBITRATING' | 'FINALIZED';
export type DisputeCommentType = 'USER' | 'SYSTEM';

export interface DisputeSummary {
  id: number;
  poiId: number;
  poiName: string;
  poiStatus: PoiStatus;
  disputeStatus: DisputeStatus;
  initiatorId: number;
  initiatorName: string;
  createdAt: string;
  updatedAt: string;
  escalatedAt: string | null;
  finalizedAt: string | null;
  finalDecision: PoiReviewDecision | null;
  latestComment: string | null;
}

export interface DisputeComment {
  id: number;
  senderName: string;
  senderRoles: string[];
  commentType: DisputeCommentType;
  content: string;
  createdAt: string;
}

export interface ArbitrationRecord {
  id: number;
  reviewerName: string;
  finalDecision: PoiReviewDecision;
  description: string;
  reviewedAt: string;
}

export interface DisputeDetail {
  summary: DisputeSummary;
  poi: PoiDetail;
  comments: DisputeComment[];
  arbitration: ArbitrationRecord | null;
}
