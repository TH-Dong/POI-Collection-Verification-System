import type { PoiReviewDecision, PoiSummary, PoiStatus } from '../types/poi';

export const REVIEW_ISSUE_OPTIONS = [
  { label: '名称错误', value: 'NAME_ERROR' },
  { label: '分类错误', value: 'CATEGORY_ERROR' },
  { label: '定位错误', value: 'LOCATION_ERROR' },
  { label: '地址信息不完整', value: 'ADDRESS_ERROR' },
  { label: '图片不清晰或缺失', value: 'PHOTO_ERROR' },
  { label: '描述信息不足', value: 'DESCRIPTION_ERROR' },
  { label: '疑似重复点位', value: 'DUPLICATE_SUSPECTED' },
  { label: '其他问题', value: 'OTHER' },
];

const STATUS_META: Record<PoiStatus, { label: string; color: string; background: string }> = {
  DRAFT: { label: '草稿', color: '#4B5563', background: '#F3F4F6' },
  SUBMITTED: { label: '已提交待核验', color: '#2563EB', background: '#EFF6FF' },
  APPROVED: { label: '核验通过', color: '#047857', background: '#ECFDF5' },
  REJECTED: { label: '核验不通过待整改', color: '#B45309', background: '#FFFBEB' },
  RESUBMITTED: { label: '整改后待复核', color: '#7C3AED', background: '#F5F3FF' },
  DISPUTING: { label: '争议处理中', color: '#B45309', background: '#FEF3C7' },
  ARBITRATING: { label: '最终裁定中', color: '#1D4ED8', background: '#DBEAFE' },
  FINALIZED: { label: '已最终确认', color: '#047857', background: '#DCFCE7' },
};

export function getPoiStatusMeta(status: PoiStatus) {
  return STATUS_META[status];
}

export function isPendingReviewStatus(status: PoiStatus) {
  return status === 'SUBMITTED' || status === 'RESUBMITTED';
}

export function getReviewDecisionLabel(decision: PoiReviewDecision) {
  return decision === 'APPROVED' ? '核验通过' : '核验驳回';
}

export function getStatusStep(status: PoiStatus, reviewCount: number) {
  if (status === 'DRAFT') {
    return 0;
  }
  if (status === 'SUBMITTED') {
    return 1;
  }
  if (status === 'REJECTED') {
    return 2;
  }
  if (status === 'RESUBMITTED') {
    return 3;
  }
  if (status === 'DISPUTING') {
    return 3;
  }
  if (status === 'ARBITRATING' || status === 'FINALIZED') {
    return 4;
  }
  return reviewCount > 1 ? 3 : 2;
}

export function hasPoiCoordinates(poi: Pick<PoiSummary, 'longitude' | 'latitude'>) {
  return poi.longitude != null && poi.latitude != null;
}

export function isProblemPoi(poi: Pick<PoiSummary, 'status' | 'latestIssueCodes'>) {
  return poi.status === 'REJECTED' || poi.latestIssueCodes.length > 0;
}

export function getPoiRegionLabel(addressText: string | null, longitude: number | null, latitude: number | null) {
  if (addressText?.trim()) {
    const normalized = addressText.trim();
    const matches = normalized.match(/.+?(省|市|区|县|州)/g);
    if (matches?.length) {
      return matches.slice(0, 2).join('');
    }

    const segments = normalized.split(/[,\s/]+/).filter(Boolean);
    if (segments.length >= 2) {
      return `${segments[0]} ${segments[1]}`;
    }
    return segments[0] || normalized;
  }

  if (longitude != null && latitude != null) {
    return `经纬区域 ${longitude.toFixed(1)}, ${latitude.toFixed(1)}`;
  }

  return '未标注区域';
}

export function getPoiNavigationUrl(poi: Pick<PoiSummary, 'poiName' | 'longitude' | 'latitude'>) {
  if (!hasPoiCoordinates(poi)) {
    return null;
  }

  const name = encodeURIComponent(poi.poiName);
  return `https://uri.amap.com/navigation?to=${poi.longitude},${poi.latitude},${name}&mode=car&policy=1&src=poi-system&coordinate=gaode&callnative=0`;
}
