import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import {
  topologyApi,
  type TopologyConfidence,
  type TopologyData,
  type TopologyHistoryItem,
  type TopologyLink,
  type TopologyNode,
} from '../topology.api';

interface Point {
  x: number;
  y: number;
}

interface DragState {
  nodeId: string;
  offset: Point;
}

interface PanState {
  start: Point;
  origin: Point;
}

const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 700;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function automaticLayout(nodes: TopologyNode[], links: TopologyLink[]): Record<string, Point> {
  const managed = nodes.filter((node) => node.managed);
  const external = nodes.filter((node) => !node.managed);
  const result: Record<string, Point> = {};
  const center = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 };
  const managedRadius = Math.min(245, Math.max(130, managed.length * 42));
  managed.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, managed.length) - Math.PI / 2;
    result[node.id] = {
      x: center.x + Math.cos(angle) * managedRadius,
      y: center.y + Math.sin(angle) * managedRadius,
    };
  });

  const grouped = new Map<string, TopologyNode[]>();
  for (const node of external) {
    const related = links.find((link) => link.source === node.id || link.target === node.id);
    const anchor = related
      ? related.source === node.id
        ? related.target
        : related.source
      : 'unassigned';
    const group = grouped.get(anchor) ?? [];
    group.push(node);
    grouped.set(anchor, group);
  }
  for (const [anchorId, group] of grouped) {
    const anchor = result[anchorId] ?? center;
    group.forEach((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, group.length) + Math.PI / 4;
      const ring = 105 + Math.floor(index / 10) * 55;
      result[node.id] = {
        x: clamp(anchor.x + Math.cos(angle) * ring, 45, VIEW_WIDTH - 45),
        y: clamp(anchor.y + Math.sin(angle) * ring, 45, VIEW_HEIGHT - 45),
      };
    });
  }
  return result;
}

function nodeIcon(type: string): string {
  const icons: Record<string, string> = {
    router: 'R',
    switch: 'S',
    'access-point': 'AP',
    camera: 'C',
    computer: 'PC',
    phone: 'M',
    client: 'CL',
    neighbor: 'N',
    unknown: '?',
  };
  return icons[type] ?? '?';
}

function formatBitRate(value: number | undefined): string {
  if (value === undefined) return '—';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} Gbps`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} Mbps`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} Kbps`;
  return `${Math.round(value)} bps`;
}

function evidenceTelemetry(details: Record<string, string>): string {
  return [
    details['signal-strength'] ? `Signal ${details['signal-strength']}` : '',
    details['tx-rate'] ? `TX ${details['tx-rate']}` : '',
    details['rx-rate'] ? `RX ${details['rx-rate']}` : '',
    details.uptime ? `Uptime ${details.uptime}` : '',
    details.ssid ? `SSID ${details.ssid}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

export function TopologyView() {
  const { formatDateTime, tr } = useLanguage();
  const [data, setData] = useState<TopologyData | null>(null);
  const [history, setHistory] = useState<TopologyHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState('all');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [layout, setLayout] = useState<Record<string, Point>>({});
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [panning, setPanning] = useState<PanState | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'connections' | 'history'>('overview');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | TopologyConfidence>('all');
  const [showUnresolved, setShowUnresolved] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [manualTarget, setManualTarget] = useState('');
  const [manualLabel, setManualLabel] = useState('');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mapPanelRef = useRef<HTMLElement | null>(null);

  const selectedDeviceId = scope === 'all' ? undefined : scope;

  const loadHistory = useCallback(async (deviceId?: string) => {
    try {
      setHistory(await topologyApi.history(deviceId));
    } catch {
      setHistory([]);
    }
  }, []);

  const load = useCallback(
    async (deviceId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const next = await topologyApi.get(deviceId);
        setData(next);
        setLayout({ ...automaticLayout(next.nodes, next.links), ...next.layout });
        setLayoutDirty(false);
        setSelectedNodeId((current) =>
          current && next.nodes.some((node) => node.id === current) ? current : null,
        );
        await loadHistory(deviceId);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : tr('Không tải được sơ đồ mạng.', 'Unable to load topology.'),
        );
      } finally {
        setLoading(false);
      }
    },
    [loadHistory, tr],
  );

  useEffect(() => {
    void load(selectedDeviceId);
  }, [load, selectedDeviceId]);

  useEffect(() => {
    const handleFullscreen = () =>
      setIsFullscreen(document.fullscreenElement === mapPanelRef.current);
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => document.removeEventListener('fullscreenchange', handleFullscreen);
  }, []);

  const managedNodes = data?.managedDevices ?? [];
  const nodeTypes = useMemo(
    () => [...new Set((data?.nodes ?? []).map((node) => node.type))].sort(),
    [data?.nodes],
  );
  const matchingNodeIds = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return new Set(
      (data?.nodes ?? [])
        .filter((node) => {
          if (typeFilter !== 'all' && node.type !== typeFilter) return false;
          if (statusFilter !== 'all' && node.status !== statusFilter) return false;
          if (!query) return true;
          return [node.label, node.host, node.ipAddress, node.macAddress, node.model]
            .filter(Boolean)
            .some((field) => String(field).toLocaleLowerCase().includes(query));
        })
        .map((node) => node.id),
    );
  }, [data?.nodes, search, statusFilter, typeFilter]);
  const graphNodes = useMemo(
    () => (data?.nodes ?? []).filter((node) => matchingNodeIds.has(node.id)),
    [data?.nodes, matchingNodeIds],
  );
  const graphLinks = useMemo(
    () =>
      (data?.links ?? []).filter(
        (link) =>
          matchingNodeIds.has(link.source) &&
          matchingNodeIds.has(link.target) &&
          (showUnresolved || link.confidence !== 'unresolved') &&
          (confidenceFilter === 'all' || link.confidence === confidenceFilter),
      ),
    [confidenceFilter, data?.links, matchingNodeIds, showUnresolved],
  );
  const positionById = useMemo(
    () =>
      new Map(
        graphNodes.map((node) => [node.id, { node, ...(layout[node.id] ?? { x: 0, y: 0 }) }]),
      ),
    [graphNodes, layout],
  );
  const selectedNode = data?.nodes.find((node) => node.id === selectedNodeId);
  const selectedLink = data?.links.find((link) => link.id === selectedLinkId);
  const selectedNodeLinks = (data?.links ?? []).filter(
    (link) => link.source === selectedNodeId || link.target === selectedNodeId,
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const next = selectedDeviceId
        ? await topologyApi.refreshDevice(selectedDeviceId)
        : await topologyApi.refresh();
      setData(next);
      setLayout({ ...automaticLayout(next.nodes, next.links), ...next.layout });
      setLayoutDirty(false);
      await loadHistory(selectedDeviceId);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : tr('Không thể quét lại Inventory.', 'Unable to refresh inventory.'),
      );
    } finally {
      setRefreshing(false);
    }
  }, [loadHistory, selectedDeviceId, tr]);

  function pointerToView(event: { clientX: number; clientY: number }): Point | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * VIEW_WIDTH) / rect.width,
      y: ((event.clientY - rect.top) * VIEW_HEIGHT) / rect.height,
    };
  }

  function pointerToGraph(event: { clientX: number; clientY: number }): Point | null {
    const point = pointerToView(event);
    return point ? { x: (point.x - pan.x) / zoom, y: (point.y - pan.y) / zoom } : null;
  }

  function movePointer(event: ReactPointerEvent<SVGSVGElement>) {
    if (dragging) {
      const point = pointerToGraph(event);
      if (!point) return;
      setLayout((current) => ({
        ...current,
        [dragging.nodeId]: {
          x: clamp(point.x + dragging.offset.x, -10000, 10000),
          y: clamp(point.y + dragging.offset.y, -10000, 10000),
        },
      }));
      setLayoutDirty(true);
      return;
    }
    if (panning) {
      const point = pointerToView(event);
      if (!point) return;
      setPan({
        x: panning.origin.x + point.x - panning.start.x,
        y: panning.origin.y + point.y - panning.start.y,
      });
    }
  }

  function finishPointer() {
    setDragging(null);
    setPanning(null);
  }

  function resetLayout() {
    setLayout(automaticLayout(data?.nodes ?? [], data?.links ?? []));
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setLayoutDirty(true);
  }

  function fitGraph() {
    const points = graphNodes.map((node) => layout[node.id]).filter(Boolean);
    if (points.length === 0) return;
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const nextZoom = clamp(
      Math.min(
        (VIEW_WIDTH - 170) / Math.max(180, maxX - minX),
        (VIEW_HEIGHT - 150) / Math.max(150, maxY - minY),
      ),
      0.45,
      2.2,
    );
    setZoom(nextZoom);
    setPan({
      x: VIEW_WIDTH / 2 - ((minX + maxX) / 2) * nextZoom,
      y: VIEW_HEIGHT / 2 - ((minY + maxY) / 2) * nextZoom,
    });
  }

  async function saveLayout() {
    setSavingLayout(true);
    setError(null);
    try {
      await topologyApi.saveLayout(selectedDeviceId, layout);
      setLayoutDirty(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : tr('Không lưu được bố cục.', 'Unable to save layout.'),
      );
    } finally {
      setSavingLayout(false);
    }
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await mapPanelRef.current?.requestFullscreen();
  }

  async function addManualLink() {
    if (!selectedNode || !manualTarget) return;
    setError(null);
    try {
      await topologyApi.createManualLink({
        sourceNodeId: selectedNode.id,
        targetNodeId: manualTarget,
        label: manualLabel.trim() || undefined,
      });
      setManualTarget('');
      setManualLabel('');
      await load(selectedDeviceId);
    } catch (manualError) {
      setError(
        manualError instanceof Error
          ? manualError.message
          : tr('Không tạo được liên kết.', 'Unable to create link.'),
      );
    }
  }

  async function removeManualLink(link: TopologyLink) {
    const manualEvidence = link.evidence.find((evidence) => evidence.source === 'manual');
    const id = manualEvidence?.details.id;
    if (!id) return;
    await topologyApi.deleteManualLink(id);
    setSelectedLinkId(null);
    await load(selectedDeviceId);
  }

  const statusLabel = (status: string) => {
    const labels: Record<string, [string, string]> = {
      online: ['Trực tuyến', 'Online'],
      offline: ['Ngoại tuyến', 'Offline'],
      degraded: ['Suy giảm', 'Degraded'],
      discovered: ['Đã phát hiện', 'Discovered'],
      manual: ['Thủ công', 'Manual'],
      unknown: ['Chưa rõ', 'Unknown'],
    };
    const label = labels[status];
    return label ? tr(label[0], label[1]) : status;
  };
  const confidenceLabel = (confidence: TopologyConfidence) => {
    const labels: Record<TopologyConfidence, [string, string]> = {
      confirmed: ['Đã xác nhận', 'Confirmed'],
      inferred: ['Suy luận có bằng chứng', 'Evidence-based'],
      unresolved: ['Chưa đủ căn cứ', 'Unresolved'],
      manual: ['Khóa thủ công', 'Manual lock'],
    };
    return tr(...labels[confidence]);
  };

  return (
    <div className="topology-view topology-enterprise">
      <div className="topology-toolbar">
        <div>
          <strong>
            {tr(
              'Topology Enterprise · Inventory tự động 30 phút',
              'Enterprise topology · 30-minute automatic inventory',
            )}
          </strong>
          <span>
            {data?.inventoryScheduler.lastRunAt
              ? `${tr('Lần gần nhất', 'Last run')}: ${formatDateTime(data.inventoryScheduler.lastRunAt)}`
              : tr('Chưa có lần thu thập hoàn tất.', 'No completed collection yet.')}
            {data?.inventoryScheduler.nextRunAt
              ? ` · ${tr('Lần kế tiếp', 'Next run')}: ${formatDateTime(data.inventoryScheduler.nextRunAt)}`
              : ''}
          </span>
        </div>
        <div className="topology-scan-actions">
          <label>
            {tr('Phạm vi kiểm tra', 'Topology scope')}
            <select value={scope} onChange={(event) => setScope(event.target.value)}>
              <option value="all">{tr('Dashboard tổng thể', 'Overall dashboard')}</option>
              {managedNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label} — {node.host}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary-button"
            type="button"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            {refreshing
              ? tr('Đang thu thập...', 'Collecting...')
              : selectedDeviceId
                ? tr('Quét thiết bị này', 'Scan this device')
                : tr('Quét toàn bộ ngay', 'Scan all now')}
          </button>
        </div>
      </div>

      <div className="topology-summary topology-summary-enterprise">
        <div className="summary-card">
          <span>{tr('Thiết bị MME', 'MME devices')}</span>
          <strong>{data?.summary.devices ?? 0}</strong>
          <small>{tr('được quản lý', 'managed')}</small>
        </div>
        <div className="summary-card">
          <span>{tr('Đã xác nhận', 'Confirmed')}</span>
          <strong>{data?.summary.confirmedLinks ?? 0}</strong>
          <small>{tr('liên kết chắc chắn', 'high-confidence links')}</small>
        </div>
        <div className="summary-card">
          <span>{tr('Có bằng chứng', 'Inferred')}</span>
          <strong>{data?.summary.inferredLinks ?? 0}</strong>
          <small>{tr('liên kết suy luận', 'evidence-based links')}</small>
        </div>
        <div className="summary-card">
          <span>{tr('Chưa đủ căn cứ', 'Unresolved')}</span>
          <strong>{data?.summary.unresolvedLinks ?? 0}</strong>
          <small>{tr('không tính là kết nối', 'not counted as connected')}</small>
        </div>
        <div className="summary-card">
          <span>{tr('Chưa liên kết', 'Isolated')}</span>
          <strong>{data?.summary.isolatedDevices ?? 0}</strong>
          <small>{tr('thiết bị MME', 'MME devices')}</small>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <section
        ref={mapPanelRef}
        className={`topology-panel topology-map-panel enterprise-map-panel ${isFullscreen ? 'is-fullscreen' : ''}`}
      >
        <div className="topology-map-heading enterprise-map-toolbar">
          <div>
            <h3>{tr('Sơ đồ mạng trực quan', 'Interactive network map')}</h3>
            <span>
              {tr(
                'Kéo node, kéo nền để di chuyển, cuộn để zoom; click node hoặc link để xem bằng chứng.',
                'Drag nodes, pan the canvas and scroll to zoom; select a node or link to inspect evidence.',
              )}
            </span>
          </div>
          <div className="topology-zoom-controls">
            <button
              type="button"
              title={tr('Thu nhỏ', 'Zoom out')}
              onClick={() => setZoom((value) => clamp(value - 0.15, 0.35, 3))}
            >
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              title={tr('Phóng to', 'Zoom in')}
              onClick={() => setZoom((value) => clamp(value + 0.15, 0.35, 3))}
            >
              +
            </button>
            <button type="button" onClick={fitGraph}>
              {tr('Vừa khung', 'Fit')}
            </button>
            <button type="button" onClick={resetLayout}>
              {tr('Xếp lại', 'Arrange')}
            </button>
            <button
              type="button"
              disabled={!layoutDirty || savingLayout}
              onClick={() => void saveLayout()}
            >
              {savingLayout ? tr('Đang lưu...', 'Saving...') : tr('Lưu bố cục', 'Save layout')}
            </button>
            <button type="button" onClick={() => void toggleFullscreen()}>
              {isFullscreen
                ? tr('Thoát toàn màn hình', 'Exit fullscreen')
                : tr('Toàn màn hình', 'Fullscreen')}
            </button>
          </div>
        </div>

        <div className="topology-filter-bar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={tr('Tìm theo tên, IP, MAC, model...', 'Search name, IP, MAC or model...')}
          />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">{tr('Mọi loại thiết bị', 'All device types')}</option>
            {nodeTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">{tr('Mọi trạng thái', 'All statuses')}</option>
            <option value="online">{tr('Trực tuyến', 'Online')}</option>
            <option value="offline">{tr('Ngoại tuyến', 'Offline')}</option>
            <option value="degraded">{tr('Suy giảm', 'Degraded')}</option>
            <option value="discovered">{tr('Đã phát hiện', 'Discovered')}</option>
          </select>
          <select
            value={confidenceFilter}
            onChange={(event) =>
              setConfidenceFilter(event.target.value as 'all' | TopologyConfidence)
            }
          >
            <option value="all">{tr('Mọi độ tin cậy', 'All confidence levels')}</option>
            <option value="confirmed">{tr('Đã xác nhận', 'Confirmed')}</option>
            <option value="inferred">{tr('Suy luận có bằng chứng', 'Evidence-based')}</option>
            <option value="unresolved">{tr('Chưa đủ căn cứ', 'Unresolved')}</option>
            <option value="manual">{tr('Thủ công', 'Manual')}</option>
          </select>
          <label className="topology-check">
            <input
              type="checkbox"
              checked={showUnresolved}
              onChange={(event) => setShowUnresolved(event.target.checked)}
            />
            {tr('Hiện liên kết chưa đủ căn cứ', 'Show unresolved links')}
          </label>
        </div>

        <div className="topology-workspace">
          <div className="topology-map-scroll">
            {graphNodes.length > 0 ? (
              <svg
                ref={svgRef}
                className="topology-map enterprise-topology-map"
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                role="img"
                aria-label={tr('Sơ đồ mạng RouterOS', 'RouterOS topology graph')}
                onPointerMove={movePointer}
                onPointerUp={finishPointer}
                onPointerCancel={finishPointer}
                onPointerLeave={finishPointer}
                onWheel={(event) => {
                  event.preventDefault();
                  setZoom((value) => clamp(value + (event.deltaY < 0 ? 0.1 : -0.1), 0.35, 3));
                }}
              >
                <rect
                  className="topology-canvas-background"
                  width={VIEW_WIDTH}
                  height={VIEW_HEIGHT}
                  onPointerDown={(event) => {
                    const point = pointerToView(event);
                    if (point) setPanning({ start: point, origin: pan });
                  }}
                />
                <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                  {graphLinks.map((link) => {
                    const source = positionById.get(link.source);
                    const target = positionById.get(link.target);
                    if (!source || !target) return null;
                    return (
                      <g
                        key={link.id}
                        className={`topology-link topology-link-${link.confidence} topology-link-${link.type} ${selectedLinkId === link.id ? 'is-selected' : ''}`}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => {
                          setSelectedLinkId(link.id);
                          setSelectedNodeId(null);
                          setDetailTab('connections');
                        }}
                      >
                        <line
                          className="topology-link-hit"
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                        />
                        <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
                        <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 7}>
                          {link.label} · {link.confidenceScore}%
                        </text>
                      </g>
                    );
                  })}
                  {graphNodes.map((node) => {
                    const position = layout[node.id];
                    if (!position) return null;
                    return (
                      <g
                        className={`topology-map-node topology-map-node-${node.type} status-${node.status} ${node.managed ? 'is-managed' : ''} ${selectedNodeId === node.id ? 'is-selected' : ''} ${dragging?.nodeId === node.id ? 'is-dragging' : ''}`}
                        key={node.id}
                        transform={`translate(${position.x} ${position.y})`}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          const graphPoint = pointerToGraph(event);
                          if (!graphPoint) return;
                          setDragging({
                            nodeId: node.id,
                            offset: { x: position.x - graphPoint.x, y: position.y - graphPoint.y },
                          });
                          setSelectedNodeId(node.id);
                          setSelectedLinkId(null);
                          setDetailTab('overview');
                        }}
                      >
                        <circle r={node.managed ? 32 : 24} />
                        <text className="topology-map-icon" textAnchor="middle" y="5">
                          {nodeIcon(node.type)}
                        </text>
                        <text
                          className="topology-map-label"
                          textAnchor="middle"
                          y={node.managed ? 50 : 42}
                        >
                          {node.label}
                        </text>
                        <text
                          className="topology-map-sublabel"
                          textAnchor="middle"
                          y={node.managed ? 64 : 56}
                        >
                          {node.ipAddress ?? node.macAddress ?? ''}
                        </text>
                        <title>{`${node.label} · ${node.host ?? node.id} · ${node.status}`}</title>
                      </g>
                    );
                  })}
                </g>
              </svg>
            ) : (
              <div className="empty-state topology-map-empty">
                {loading
                  ? tr('Đang tải...', 'Loading...')
                  : tr('Không có node phù hợp bộ lọc.', 'No nodes match the filters.')}
              </div>
            )}
          </div>

          {selectedNode || selectedLink ? (
            <aside className="topology-detail-drawer">
              <div className="topology-drawer-title">
                <strong>{selectedNode?.label ?? tr('Chi tiết liên kết', 'Link details')}</strong>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNodeId(null);
                    setSelectedLinkId(null);
                  }}
                >
                  ×
                </button>
              </div>
              <div className="topology-detail-tabs">
                <button
                  className={detailTab === 'overview' ? 'is-active' : ''}
                  type="button"
                  onClick={() => setDetailTab('overview')}
                >
                  {tr('Tổng quan', 'Overview')}
                </button>
                <button
                  className={detailTab === 'connections' ? 'is-active' : ''}
                  type="button"
                  onClick={() => setDetailTab('connections')}
                >
                  {tr('Liên kết', 'Links')}
                </button>
                <button
                  className={detailTab === 'history' ? 'is-active' : ''}
                  type="button"
                  onClick={() => setDetailTab('history')}
                >
                  {tr('Lịch sử', 'History')}
                </button>
              </div>

              {detailTab === 'overview' && selectedNode ? (
                <div className="topology-detail-content">
                  <div className="topology-node-identity">
                    <span className={`topology-large-icon status-${selectedNode.status}`}>
                      {nodeIcon(selectedNode.type)}
                    </span>
                    <div>
                      <strong>{selectedNode.identity ?? selectedNode.label}</strong>
                      <span>
                        {statusLabel(selectedNode.status)} · {selectedNode.type}
                      </span>
                    </div>
                  </div>
                  <div className="topology-metric-grid">
                    <div>
                      <span>CPU</span>
                      <strong>
                        {selectedNode.metrics?.cpuLoadPercent ?? '—'}
                        {selectedNode.metrics?.cpuLoadPercent !== undefined ? '%' : ''}
                      </strong>
                    </div>
                    <div>
                      <span>RAM</span>
                      <strong>
                        {selectedNode.metrics?.memoryUsagePercent ?? '—'}
                        {selectedNode.metrics?.memoryUsagePercent !== undefined ? '%' : ''}
                      </strong>
                    </div>
                    <div>
                      <span>{tr('Nhiệt độ', 'Temperature')}</span>
                      <strong>
                        {selectedNode.metrics?.temperatureCelsius ?? '—'}
                        {selectedNode.metrics?.temperatureCelsius !== undefined ? '°C' : ''}
                      </strong>
                    </div>
                    <div>
                      <span>{tr('Liên kết', 'Links')}</span>
                      <strong>{selectedNodeLinks.length}</strong>
                    </div>
                    <div>
                      <span>RX · {selectedNode.metrics?.trafficInterface ?? '—'}</span>
                      <strong>{formatBitRate(selectedNode.metrics?.rxBps)}</strong>
                    </div>
                    <div>
                      <span>TX · {selectedNode.metrics?.trafficInterface ?? '—'}</span>
                      <strong>{formatBitRate(selectedNode.metrics?.txBps)}</strong>
                    </div>
                  </div>
                  <dl className="topology-facts">
                    <div>
                      <dt>IP</dt>
                      <dd>{selectedNode.ipAddress ?? selectedNode.host ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>MAC</dt>
                      <dd>{selectedNode.macAddress ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Model</dt>
                      <dd>{selectedNode.model ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Platform</dt>
                      <dd>{selectedNode.platform ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>RouterOS</dt>
                      <dd>{selectedNode.version ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Uptime</dt>
                      <dd>{selectedNode.metrics?.uptime ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Serial</dt>
                      <dd>{selectedNode.serialNumber ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>{tr('Lần thấy cuối', 'Last seen')}</dt>
                      <dd>
                        {selectedNode.lastSeenAt ? formatDateTime(selectedNode.lastSeenAt) : '—'}
                      </dd>
                    </div>
                  </dl>
                  <div className="topology-manual-link">
                    <strong>{tr('Khóa liên kết thủ công', 'Create manual locked link')}</strong>
                    <select
                      value={manualTarget}
                      onChange={(event) => setManualTarget(event.target.value)}
                    >
                      <option value="">{tr('Chọn node đích', 'Select target node')}</option>
                      {(data?.nodes ?? [])
                        .filter((node) => node.id !== selectedNode.id)
                        .map((node) => (
                          <option key={node.id} value={node.id}>
                            {node.label}
                          </option>
                        ))}
                    </select>
                    <input
                      value={manualLabel}
                      onChange={(event) => setManualLabel(event.target.value)}
                      placeholder={tr('Nhãn liên kết (tùy chọn)', 'Link label (optional)')}
                    />
                    <button
                      className="primary-button"
                      type="button"
                      disabled={!manualTarget}
                      onClick={() => void addManualLink()}
                    >
                      {tr('Tạo và khóa', 'Create and lock')}
                    </button>
                  </div>
                </div>
              ) : null}

              {detailTab === 'connections' ? (
                <div className="topology-detail-content topology-connection-list">
                  {(selectedLink ? [selectedLink] : selectedNodeLinks).map((link) => {
                    const otherId = selectedNodeId
                      ? link.source === selectedNodeId
                        ? link.target
                        : link.source
                      : undefined;
                    const other = data?.nodes.find((node) => node.id === otherId);
                    return (
                      <article
                        key={link.id}
                        className={`topology-evidence-card confidence-${link.confidence}`}
                      >
                        <div>
                          <strong>{other?.label ?? link.label}</strong>
                          <span>
                            {confidenceLabel(link.confidence)} · {link.confidenceScore}%
                          </span>
                        </div>
                        <small>
                          {link.type} · {link.status} · {formatDateTime(link.lastObservedAt)}
                        </small>
                        <ul>
                          {link.evidence.map((evidence, index) => (
                            <li key={`${evidence.source}-${index}`}>
                              <b>{evidence.source}</b> · {evidence.localInterface ?? evidence.path}{' '}
                              · {evidence.weight}%
                              {evidenceTelemetry(evidence.details) ? (
                                <small>{evidenceTelemetry(evidence.details)}</small>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        {link.confidence === 'manual' ? (
                          <button
                            className="danger-button"
                            type="button"
                            onClick={() => void removeManualLink(link)}
                          >
                            {tr('Xóa liên kết thủ công', 'Delete manual link')}
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                  {!selectedLink && selectedNodeLinks.length === 0 ? (
                    <div className="empty-state">
                      {tr('Node này chưa có liên kết.', 'This node has no links.')}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {detailTab === 'history' ? (
                <div className="topology-detail-content topology-history-list">
                  {history.map((item) => (
                    <article key={item.id}>
                      <strong>{formatDateTime(item.collectedAt)}</strong>
                      <span>
                        {item.summary.nodes} nodes · {item.summary.links} links
                      </span>
                      <small>{item.graphHash.slice(0, 12)}</small>
                    </article>
                  ))}
                  {history.length === 0 ? (
                    <div className="empty-state">
                      {tr(
                        'Chưa có thay đổi topology được lưu.',
                        'No topology changes have been recorded.',
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </aside>
          ) : null}
        </div>

        <div className="topology-legend">
          <span className="legend-confirmed">● {tr('Đã xác nhận', 'Confirmed')}</span>
          <span className="legend-inferred">
            ● {tr('Suy luận có bằng chứng', 'Evidence-based')}
          </span>
          <span className="legend-unresolved">● {tr('Chưa đủ căn cứ', 'Unresolved')}</span>
          <span className="legend-manual">● {tr('Khóa thủ công', 'Manual lock')}</span>
          <span>
            {tr(
              `${data?.summary.evidenceSources ?? 0} bằng chứng đang dùng`,
              `${data?.summary.evidenceSources ?? 0} evidence records`,
            )}
          </span>
        </div>
      </section>
    </div>
  );
}
