export type PoiStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | 'DISPUTING' | 'ARBITRATING' | 'FINALIZED';
export type PoiReviewDecision = 'APPROVED' | 'REJECTED';

export interface PoiCategoryOption {
  code: string;
  name: string;
}

export interface PoiSummary {
  id: number;
  poiName: string;
  categoryCode: string | null;
  categoryName: string | null;
  description: string | null;
  coverImageUrl: string | null;
  status: PoiStatus;
  longitude: number | null;
  latitude: number | null;
  addressText: string | null;
  collectorId: number;
  collectorName: string;
  updatedAt: string;
  submittedAt: string | null;
  latestReviewedAt: string | null;
  latestReviewerName: string | null;
  latestReviewComment: string | null;
  latestIssueCodes: string[];
  latestIssueLabels: string[];
  reviewCount: number;
}

export interface PoiReviewRecord {
  id: number;
  round: number;
  decision: PoiReviewDecision;
  reviewerName: string;
  issueCodes: string[];
  issueLabels: string[];
  reviewComment: string | null;
  createdAt: string;
}

export interface PoiDetail extends PoiSummary {
  coverImageObjectName: string | null;
  ocrText: string | null;
  ocrConfidence: number | null;
  ocrProvider: string | null;
  createdAt: string;
  reviewRecords: PoiReviewRecord[];
}

export interface PoiReviewPayload {
  decision: PoiReviewDecision;
  issueCodes: string[];
  reviewComment: string | null;
}

export interface PoiUpsertPayload {
  poiName: string;
  categoryCode: string | null;
  description: string | null;
  coverImageObjectName: string | null;
  coverImageUrl: string | null;
  longitude: number | null;
  latitude: number | null;
  addressText: string | null;
  ocrText: string | null;
  ocrConfidence: number | null;
  ocrProvider: string | null;
  status: 'DRAFT' | 'SUBMITTED';
}
