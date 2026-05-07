import type { PoiReviewDecision, PoiSummary, PoiStatus } from '../types/poi';

export function getPoiStatusMeta(status: PoiStatus) {
  switch (status) {
    case 'DRAFT':
      return { label: '草稿', badgeBg: '#F3F4F6', badgeText: '#4B5563' };
    case 'SUBMITTED':
      return { label: '已提交待核验', badgeBg: '#DBEAFE', badgeText: '#2563EB' };
    case 'APPROVED':
      return { label: '核验通过', badgeBg: '#DCFCE7', badgeText: '#166534' };
    case 'REJECTED':
      return { label: '待整改', badgeBg: '#FEF3C7', badgeText: '#B45309' };
    case 'RESUBMITTED':
      return { label: '整改后待复核', badgeBg: '#EDE9FE', badgeText: '#6D28D9' };
    case 'DISPUTING':
      return { label: '争议处理中', badgeBg: '#FEF3C7', badgeText: '#B45309' };
    case 'ARBITRATING':
      return { label: '最终裁定中', badgeBg: '#DBEAFE', badgeText: '#1D4ED8' };
    case 'FINALIZED':
      return { label: '已最终确认', badgeBg: '#DCFCE7', badgeText: '#166534' };
    default:
      return { label: status, badgeBg: '#F3F4F6', badgeText: '#4B5563' };
  }
}

export function canEditPoi(status: PoiStatus) {
  return status === 'DRAFT' || status === 'REJECTED';
}

export function getPoiStatusStep(status: PoiStatus, reviewCount: number) {
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

export function getReviewDecisionLabel(decision: PoiReviewDecision) {
  return decision === 'APPROVED' ? '核验通过' : '驳回整改';
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
  return `https://uri.amap.com/navigation?to=${poi.longitude},${poi.latitude},${name}&mode=car&policy=1&src=poi-mobile&coordinate=gaode&callnative=0`;
}

export const REVIEW_ISSUE_OPTIONS = [
  { code: 'NAME_ERROR', label: '名称错误' },
  { code: 'CATEGORY_ERROR', label: '分类错误' },
  { code: 'LOCATION_ERROR', label: '定位错误' },
  { code: 'ADDRESS_ERROR', label: '地址信息不完整' },
  { code: 'PHOTO_ERROR', label: '图片不清晰或缺失' },
  { code: 'DESCRIPTION_ERROR', label: '描述信息不足' },
  { code: 'DUPLICATE_SUSPECTED', label: '疑似重复点位' },
  { code: 'OTHER', label: '其他问题' },
];
