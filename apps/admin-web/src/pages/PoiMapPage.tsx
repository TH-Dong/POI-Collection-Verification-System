import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Input, message } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchAdminPois, fetchVerifierPendingPois } from '../api/poi';
import { useAuthStore } from '../store/authStore';
import type { PoiSummary } from '../types/poi';
import { getPoiNavigationUrl, getPoiRegionLabel, getPoiStatusMeta, hasPoiCoordinates, isProblemPoi } from '../utils/poi';
import { hasRole } from '../utils/role';

type StatusFilter = 'ALL' | PoiSummary['status'];

const AMAP_WEB_KEY = import.meta.env.VITE_AMAP_WEB_KEY ?? '';
const AMAP_SECURITY_JSCODE = import.meta.env.VITE_AMAP_SECURITY_JSCODE ?? '';

declare global {
  interface Window {
    AMap?: any;
    __poiAmapPromise?: Promise<any>;
  }
}

function loadAmapScript(key: string, securityJsCode?: string) {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (window.__poiAmapPromise) return window.__poiAmapPromise;

  window.__poiAmapPromise = new Promise((resolve, reject) => {
    if (securityJsCode) (window as any)._AMapSecurityConfig = { securityJsCode };
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`;
    script.async = true;
    script.onload = () => {
      if (window.AMap) { resolve(window.AMap); return; }
      window.__poiAmapPromise = undefined;
      reject(new Error('amap_unavailable'));
    };
    script.onerror = () => {
      window.__poiAmapPromise = undefined;
      reject(new Error('amap_load_failed'));
    };
    document.head.appendChild(script);
  });

  return window.__poiAmapPromise;
}

function buildMarkerHtml(poi: PoiSummary, active: boolean) {
  const meta = getPoiStatusMeta(poi.status);
  const background = isProblemPoi(poi) ? '#F09A5A' : meta.color;
  const classes = ['poi-map-marker'];
  if (isProblemPoi(poi)) classes.push('problem');
  if (active) classes.push('active');
  return `<div class="${classes.join(' ')}" style="background:${background};"></div>`;
}

function buildInfoWindowHtml(poi: PoiSummary) {
  return `
    <div style="padding:4px; color:#3F3F46;">
      <div style="font-size:13px; font-weight:700; margin-bottom:4px; letter-spacing:-0.02em">${poi.poiName}</div>
      <div style="font-size:12px; color:#71717A; font-family:'Courier', monospace;">${getPoiRegionLabel(poi.addressText, poi.longitude, poi.latitude)}</div>
    </div>
  `;
}

function ensureMarkerStyle() {
  if (document.getElementById('poi-amap-marker-style')) return;
  const style = document.createElement('style');
  style.id = 'poi-amap-marker-style';
  style.innerHTML = `
    .poi-map-marker {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      border: 1.5px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(46, 74, 102, 0.16);
      transition: transform 0.16s ease, box-shadow 0.16s ease;
      cursor: pointer;
    }
    .poi-map-marker.problem {
      transform: rotate(45deg);
      border-radius: 3px;
    }
    .poi-map-marker.active {
      transform: scale(1.26);
      border-width: 1.5px;
      border-color: rgba(47, 158, 143, 0.88);
      box-shadow: 0 0 0 4px rgba(47, 158, 143, 0.12), 0 4px 10px rgba(46, 74, 102, 0.18);
    }
    .poi-map-marker.problem.active {
      transform: scale(1.22) rotate(45deg);
    }
  `;
  document.head.appendChild(style);
}

export default function PoiMapPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const isAdmin = hasRole(user?.roles, 'ADMIN');
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const [keyword, setKeyword] = useState(searchParams.get('keyword') ?? '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') ?? 'ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>((searchParams.get('status') as StatusFilter) ?? 'ALL');
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(searchParams.get('poi'));
  const [mapLoadError, setMapLoadError] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['poi-map', isAdmin ? 'admin' : 'verifier'],
    queryFn: isAdmin ? fetchAdminPois : fetchVerifierPendingPois,
  });

  const enrichedData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      regionLabel: getPoiRegionLabel(item.addressText, item.longitude, item.latitude),
    }));
  }, [data]);

  const categoryOptions = useMemo(() => {
    return ['ALL', ...new Set(enrichedData.map((item) => item.categoryName).filter(Boolean))];
  }, [enrichedData]);

  const filteredPois = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return enrichedData.filter((item) => {
      const matchesKeyword = !normalized || item.poiName.toLowerCase().includes(normalized) || item.collectorName.toLowerCase().includes(normalized) || item.addressText?.toLowerCase().includes(normalized);
      const matchesCategory = categoryFilter === 'ALL' || item.categoryName === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesKeyword && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, enrichedData, keyword, statusFilter]);

  const locatedPois = useMemo(() => filteredPois.filter(hasPoiCoordinates), [filteredPois]);
  const unlocatedPois = useMemo(() => filteredPois.filter((item) => !hasPoiCoordinates(item)), [filteredPois]);

  const selectedPoi = useMemo(() => {
    return filteredPois.find((item) => String(item.id) === selectedPoiId) ?? filteredPois.find((item) => String(item.id) === searchParams.get('poi')) ?? null;
  }, [filteredPois, searchParams, selectedPoiId]);

  useEffect(() => {
    if (!filteredPois.length) { setSelectedPoiId(null); return; }
    if (!selectedPoiId || !filteredPois.some((item) => String(item.id) === selectedPoiId)) {
      setSelectedPoiId(String(filteredPois[0].id));
    }
  }, [filteredPois, selectedPoiId]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (selectedPoiId) next.set('poi', selectedPoiId);
    if (keyword.trim()) next.set('keyword', keyword.trim());
    if (categoryFilter !== 'ALL') next.set('category', categoryFilter);
    if (statusFilter !== 'ALL') next.set('status', statusFilter);
    setSearchParams(next, { replace: true });
  }, [categoryFilter, keyword, selectedPoiId, setSearchParams, statusFilter]);

  useEffect(() => {
    if (!AMAP_WEB_KEY || !mapContainerRef.current || !locatedPois.length) return;
    let canceled = false;
    ensureMarkerStyle();
    setMapLoadError('');

    loadAmapScript(AMAP_WEB_KEY, AMAP_SECURITY_JSCODE).then((AMap) => {
      if (canceled || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new AMap.Map(mapContainerRef.current, {
          zoom: locatedPois.length > 1 ? 11 : 15,
          center: [locatedPois[0].longitude, locatedPois[0].latitude],
          mapStyle: 'amap://styles/whitesmoke',
          viewMode: '2D',
        });
        infoWindowRef.current = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -18) });
      }

      const map = mapInstanceRef.current;
      const infoWindow = infoWindowRef.current;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];

      const markers = locatedPois.map((poi) => {
        const marker = new AMap.Marker({
          position: [poi.longitude, poi.latitude],
          anchor: 'center',
          content: buildMarkerHtml(poi, String(poi.id) === selectedPoiId),
        });
        marker.on('click', () => setSelectedPoiId(String(poi.id)));
        marker.setMap(map);
        return marker;
      });

      markersRef.current = markers;

      if (markers.length > 1) {
        map.setFitView(markers, false, [56, 56, 56, 56]);
      } else if (markers.length === 1) {
        map.setCenter(markers[0].getPosition());
        map.setZoom(15);
      }

      const currentIndex = locatedPois.findIndex((item) => String(item.id) === selectedPoiId);
      if (currentIndex >= 0) {
        const poi = locatedPois[currentIndex];
        const marker = markers[currentIndex];
        infoWindow.setContent(buildInfoWindowHtml(poi));
        infoWindow.open(map, marker.getPosition());
        map.setCenter(marker.getPosition());
      } else {
        infoWindow.close();
      }
    }).catch(() => {
      setMapLoadError('地图配置有误，请检查高德 key 和安全密钥。');
      message.error('地图引擎加载失败');
    });

    return () => { canceled = true; };
  }, [locatedPois, selectedPoiId]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const jumpToNavigation = () => {
    if (!selectedPoi) return;
    const url = getPoiNavigationUrl(selectedPoi);
    if (!url) { message.info('当前记录缺少坐标，无法发起导航'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const statusOpts = isAdmin
    ? [
        { label: '全部状态', val: 'ALL' },
        { label: '草稿', val: 'DRAFT' },
        { label: '待核验', val: 'SUBMITTED' },
        { label: '待整改', val: 'REJECTED' },
        { label: '待复核', val: 'RESUBMITTED' },
        { label: '争议处理中', val: 'DISPUTING' },
        { label: '最终裁定中', val: 'ARBITRATING' },
        { label: '已最终确认', val: 'FINALIZED' },
        { label: '核验通过', val: 'APPROVED' },
      ]
    : [
        { label: '全部状态', val: 'ALL' },
        { label: '待核验', val: 'SUBMITTED' },
        { label: '待复核', val: 'RESUBMITTED' },
      ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>空间分布</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>{isAdmin ? '跨维度点位分布' : '待办队列落位点'}</p>
        </div>
        <Button onClick={() => navigate('/app/pois')} className="restrained-btn">{isAdmin ? '业务列表' : '待处理队列'}</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(340px, 0.8fr)', gap: '16px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
             <Input.Search 
                placeholder="搜索点位、采集者或地址" 
                value={keyword} 
                onChange={(e) => setKeyword(e.target.value)} 
                style={{ width: 280 }} 
              />
              <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', backgroundColor: 'var(--color-bg-base)' }}>
                 {categoryOptions.slice(0, 4).map(opt => (
                   <div 
                      key={opt} 
                      onClick={() => setCategoryFilter(opt!)}
                      style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderRight: opt === categoryOptions[3] ? 'none' : '1px solid var(--color-border)', backgroundColor: categoryFilter === opt ? 'var(--color-text-base)' : 'transparent', color: categoryFilter === opt ? '#fff' : 'var(--color-text-base)' }}
                   >{opt === 'ALL' ? '全部' : opt}</div>
                 ))}
              </div>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
             {statusOpts.map(s => (
                <div 
                  key={s.val} 
                  onClick={() => setStatusFilter(s.val as StatusFilter)}
                  style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: statusFilter === s.val ? 1 : 0.4, borderBottom: statusFilter === s.val ? '1px solid var(--color-text-base)' : '1px solid transparent', paddingBottom: 2 }}
                >{s.label}</div>
             ))}
          </div>

          <div style={{ height: 600, border: '1px solid var(--color-border)', borderRadius: 18, overflow: 'hidden', backgroundColor: '#FBFCFD', position: 'relative' }}>
            {isLoading ? (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 1 }}><span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'Courier' }}>正在预载地图引擎...</span></div>
            ) : !AMAP_WEB_KEY || mapLoadError ? (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24 }}>
                <Empty description={mapLoadError || "未接入高德地图密钥"} />
              </div>
            ) : !locatedPois.length ? (
               <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>当前筛选矩阵内未发现坐标落点。</span>
              </div>
            ) : null}
            <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button shape="circle" size="small" onClick={() => mapInstanceRef.current?.zoomIn?.()} style={{ boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)' }}>+</Button>
              <Button shape="circle" size="small" onClick={() => mapInstanceRef.current?.zoomOut?.()} style={{ boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)' }}>-</Button>
            </div>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
          </div>

          {unlocatedPois.length > 0 && (
             <div style={{ fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 14, padding: 12, backgroundColor: 'var(--color-bg-base)' }}>
                <strong>{unlocatedPois.length} 项跳过了渲染</strong>：
                {unlocatedPois.slice(0, 10).map(p => <span key={p.id} style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>{p.poiName}</span>)}
                {unlocatedPois.length > 10 && ' ...'}
             </div>
          )}
        </div>

        <div style={{ backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 18, position: 'sticky', top: 24 }}>
           <div style={{ borderBottom: '1px solid var(--color-border)', padding: '16px' }}>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>点位信息</div>
              {selectedPoi ? (
                 <>
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{selectedPoi.poiName}</h3>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{selectedPoi.categoryName || '未分类'} · {selectedPoi.collectorName}</div>
                 </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>请先在地图上选中一个点位</div>
              )}
           </div>

           {selectedPoi && (
              <>
                <div style={{ padding: 16 }}>
                  <PropertyRow label="数据 ID" value={`#${selectedPoi.id}`} />
                  <PropertyRow label="处理状态" value={getPoiStatusMeta(selectedPoi.status).label} />
                  <PropertyRow label="要素归类" value={selectedPoi.categoryName || '无记录'} />
                  <PropertyRow label="空间区域" value={getPoiRegionLabel(selectedPoi.addressText, selectedPoi.longitude, selectedPoi.latitude)} />
                  <PropertyRow label="精确坐标" font="Courier, monospace" value={hasPoiCoordinates(selectedPoi) ? `${selectedPoi.longitude!.toFixed(6)}, ${selectedPoi.latitude!.toFixed(6)}` : '缺失'} />
                  <PropertyRow label="异常标签" value={selectedPoi.latestIssueLabels.length ? selectedPoi.latestIssueLabels.join(', ') : '无'} />
                  <PropertyRow label="复核进展" value={selectedPoi.latestReviewComment || '等待人工介入'} />
                </div>
                
                <div style={{ borderTop: '1px solid var(--color-border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>快捷操作</div>
                  <Button style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate(`/pois/${selectedPoi.id}`)}>查看点位详情</Button>
                  <Button style={{ width: '100%', justifyContent: 'flex-start' }} onClick={jumpToNavigation}>发起外部导航</Button>
                </div>
              </>
           )}
        </div>
      </div>
    </div>
  );
}

function PropertyRow({ label, value, font = 'inherit' }: { label: string; value: string; font?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-neutral-100)', padding: '10px 0' }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--color-text-base)', fontFamily: font, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}
