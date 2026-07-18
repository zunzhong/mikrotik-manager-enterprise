import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import { topologyApi, type TopologyData, type TopologyNode } from '../topology.api';

interface Point {
  x: number;
  y: number;
}

interface GraphPosition extends Point {
  node: TopologyNode;
}

const VIEW_WIDTH = 720;
const VIEW_HEIGHT = 500;
const LAYOUT_KEY = 'mme-topology-layout-v1';

function defaultPoint(index: number, total: number): Point {
  const radius = Math.min(190, Math.max(105, total * 28));
  const angle = (Math.PI * 2 * index) / Math.max(1, total) - Math.PI / 2;
  return {
    x: VIEW_WIDTH / 2 + Math.cos(angle) * radius,
    y: VIEW_HEIGHT / 2 + Math.sin(angle) * radius,
  };
}

export function TopologyView() {
  const { formatDateTime, tr } = useLanguage();
  const [data, setData] = useState<TopologyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState('all');
  const [zoom, setZoom] = useState(1);
  const [layout, setLayout] = useState<Record<string, Point>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await topologyApi.get());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : tr('Không tải được sơ đồ mạng.', 'Unable to load topology.'),
      );
    } finally {
      setLoading(false);
    }
  }, [tr]);

  useEffect(() => {
    void load();
    try {
      const saved = window.localStorage.getItem(LAYOUT_KEY);
      if (saved) setLayout(JSON.parse(saved) as Record<string, Point>);
    } catch {
      window.localStorage.removeItem(LAYOUT_KEY);
    }
  }, [load]);

  useEffect(() => {
    if (Object.keys(layout).length > 0) {
      window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    }
  }, [layout]);

  const managedNodes = useMemo(
    () => (data?.nodes ?? []).filter((node) => node.type === 'routeros'),
    [data?.nodes],
  );
  const graphLinks = useMemo(() => {
    if (scope === 'all') return data?.links ?? [];
    return (data?.links ?? []).filter((link) => link.source === scope || link.target === scope);
  }, [data?.links, scope]);
  const graphNodes = useMemo(() => {
    if (scope === 'all') return data?.nodes ?? [];
    const visibleIds = new Set([scope]);
    graphLinks.forEach((link) => {
      visibleIds.add(link.source);
      visibleIds.add(link.target);
    });
    return (data?.nodes ?? []).filter((node) => visibleIds.has(node.id));
  }, [data?.nodes, graphLinks, scope]);
  const selectedDevice = managedNodes.find((node) => node.id === scope);
  const selectedManagedLinks = graphLinks.filter((link) => link.managed).length;

  const positions = useMemo<GraphPosition[]>(
    () =>
      graphNodes.map((node, index) => ({
        node,
        ...(layout[node.id] ?? defaultPoint(index, graphNodes.length)),
      })),
    [graphNodes, layout],
  );
  const positionById = useMemo(
    () => new Map(positions.map((position) => [position.node.id, position])),
    [positions],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      setData(
        scope === 'all' ? await topologyApi.refresh() : await topologyApi.refreshDevice(scope),
      );
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : tr('Không thể quét lại Inventory.', 'Unable to refresh inventory.'),
      );
    } finally {
      setRefreshing(false);
    }
  }, [scope, tr]);

  const saveLayout = useCallback((nextLayout: Record<string, Point>) => {
    setLayout(nextLayout);
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(nextLayout));
  }, []);

  function resetLayout() {
    const next = Object.fromEntries(
      graphNodes.map((node, index) => [node.id, defaultPoint(index, graphNodes.length)]),
    );
    saveLayout({ ...layout, ...next });
    setZoom(1);
  }

  function pointerToGraph(event: ReactPointerEvent<SVGSVGElement>): Point | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const rawX = ((event.clientX - rect.left) * VIEW_WIDTH) / rect.width;
    const rawY = ((event.clientY - rect.top) * VIEW_HEIGHT) / rect.height;
    return {
      x: VIEW_WIDTH / 2 + (rawX - VIEW_WIDTH / 2) / zoom,
      y: VIEW_HEIGHT / 2 + (rawY - VIEW_HEIGHT / 2) / zoom,
    };
  }

  function moveNode(event: ReactPointerEvent<SVGSVGElement>) {
    if (!draggingId) return;
    const point = pointerToGraph(event);
    if (!point) return;
    setLayout((current) => ({ ...current, [draggingId]: point }));
  }

  function finishDragging() {
    if (!draggingId) return;
    setDraggingId(null);
  }

  const typeLabel = (type: string) =>
    type === 'neighbor' ? tr('hàng xóm', 'neighbor') : 'RouterOS';
  const statusLabel = (status: string) => {
    const labels: Record<string, [string, string]> = {
      online: ['trực tuyến', 'online'],
      offline: ['ngoại tuyến', 'offline'],
      degraded: ['suy giảm', 'degraded'],
      discovered: ['đã phát hiện', 'discovered'],
      unknown: ['chưa rõ', 'unknown'],
    };
    const label = labels[status];
    return label ? tr(label[0], label[1]) : status;
  };

  return (
    <div className="topology-view">
      <div className="topology-toolbar">
        <div>
          <strong>
            {tr(
              'Thu thập Inventory tự động mỗi 30 phút',
              'Automatic inventory collection every 30 minutes',
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
              ? tr('Đang quét...', 'Scanning...')
              : scope === 'all'
                ? tr('Quét toàn bộ ngay', 'Scan all now')
                : tr('Kiểm tra thiết bị này', 'Check this device')}
          </button>
        </div>
      </div>

      <div className="topology-summary">
        <div className="summary-card">
          <span>{tr('Thiết bị MME', 'MME devices')}</span>
          <strong>{data?.summary.devices ?? 0}</strong>
          <small>{tr('thiết bị đang quản lý', 'managed devices')}</small>
        </div>
        <div className="summary-card">
          <span>{tr('Đã liên kết', 'Connected')}</span>
          <strong>{data?.summary.connectedDevices ?? 0}</strong>
          <small>{tr('thiết bị có liên kết MME', 'devices linked to MME peers')}</small>
        </div>
        <div className="summary-card">
          <span>{tr('Chưa liên kết', 'Isolated')}</span>
          <strong>{data?.summary.isolatedDevices ?? 0}</strong>
          <small>{tr('thiết bị chưa thấy MME khác', 'devices without an MME peer')}</small>
        </div>
        <div className="summary-card">
          <span>{tr('Liên kết MME', 'MME links')}</span>
          <strong>{data?.summary.managedLinks ?? 0}</strong>
          <small>{tr('quan hệ giữa thiết bị quản lý', 'managed device relationships')}</small>
        </div>
      </div>

      {selectedDevice ? (
        <div
          className={`topology-device-result ${selectedManagedLinks > 0 ? 'is-linked' : 'is-isolated'}`}
        >
          <strong>{selectedDevice.label}</strong>
          <span>
            {selectedManagedLinks > 0
              ? tr(
                  `Đã phát hiện ${selectedManagedLinks} liên kết với thiết bị khác trong MME.`,
                  `${selectedManagedLinks} link(s) to another MME device detected.`,
                )
              : tr(
                  'Chưa phát hiện liên kết với thiết bị khác trong MME.',
                  'No link to another MME device has been detected.',
                )}
          </span>
        </div>
      ) : null}

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="topology-panel topology-map-panel">
        <div className="topology-panel-heading topology-map-heading">
          <div>
            <h3>{tr('Sơ đồ liên kết trực quan', 'Interactive network graph')}</h3>
            <span>
              {tr(
                'Kéo node để bố trí lại; dùng cuộn chuột hoặc nút +/- để phóng to, thu nhỏ.',
                'Drag nodes to rearrange; use the mouse wheel or +/- buttons to zoom.',
              )}
            </span>
          </div>
          <div className="topology-zoom-controls">
            <button type="button" onClick={() => setZoom((value) => Math.max(0.55, value - 0.15))}>
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(2.5, value + 0.15))}>
              +
            </button>
            <button type="button" onClick={resetLayout}>
              {tr('Đặt lại', 'Reset')}
            </button>
          </div>
        </div>
        {positions.length > 0 ? (
          <div className="topology-map-scroll">
            <svg
              ref={svgRef}
              className="topology-map"
              viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
              role="img"
              aria-label={tr('Sơ đồ mạng RouterOS', 'RouterOS topology graph')}
              onPointerMove={moveNode}
              onPointerUp={finishDragging}
              onPointerCancel={finishDragging}
              onPointerLeave={finishDragging}
              onWheel={(event) => {
                event.preventDefault();
                setZoom((value) =>
                  Math.min(2.5, Math.max(0.55, value + (event.deltaY < 0 ? 0.1 : -0.1))),
                );
              }}
            >
              <g
                transform={`translate(${VIEW_WIDTH / 2} ${VIEW_HEIGHT / 2}) scale(${zoom}) translate(${-VIEW_WIDTH / 2} ${-VIEW_HEIGHT / 2})`}
              >
                {graphLinks.map((link) => {
                  const source = positionById.get(link.source);
                  const target = positionById.get(link.target);
                  if (!source || !target) return null;
                  return (
                    <g key={link.id} className={link.managed ? 'topology-managed-link' : undefined}>
                      <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
                      <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 6}>
                        {link.label}
                      </text>
                    </g>
                  );
                })}
                {positions.map(({ node, x, y }) => (
                  <g
                    className={`topology-map-node topology-map-node-${node.type} ${draggingId === node.id ? 'is-dragging' : ''}`}
                    key={node.id}
                    transform={`translate(${x} ${y})`}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setDraggingId(node.id);
                    }}
                  >
                    <circle r="34" />
                    <text className="topology-map-icon" textAnchor="middle" y="5">
                      {node.type === 'routeros' ? 'R' : 'N'}
                    </text>
                    <text className="topology-map-label" textAnchor="middle" y="54">
                      {node.label}
                    </text>
                    <title>{`${node.label} · ${node.host ?? node.id} · ${node.status}`}</title>
                  </g>
                ))}
              </g>
            </svg>
          </div>
        ) : (
          <div className="empty-state">
            {loading ? tr('Đang tải...', 'Loading...') : tr('Chưa có thiết bị.', 'No devices yet.')}
          </div>
        )}
      </section>

      <div className="topology-grid">
        <section className="topology-panel">
          <h3>{tr('Nút mạng trong phạm vi', 'Nodes in scope')}</h3>
          <div className="topology-list">
            {graphNodes.map((node) => (
              <article className="topology-item" key={node.id}>
                <div>
                  <h4>{node.label}</h4>
                  <p>{node.host ?? node.id}</p>
                </div>
                <span className={`status-badge status-${node.status}`}>
                  {typeLabel(node.type)} • {statusLabel(node.status)}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="topology-panel">
          <h3>{tr('Liên kết trong phạm vi', 'Links in scope')}</h3>
          <div className="topology-list">
            {graphLinks.map((link) => (
              <article className="topology-item" key={link.id}>
                <div>
                  <h4>{positionById.get(link.source)?.node.label ?? link.source}</h4>
                  <p>→ {positionById.get(link.target)?.node.label ?? link.target}</p>
                </div>
                <span className={`status-badge ${link.managed ? 'status-online' : ''}`}>
                  {link.label ?? 'link'}
                </span>
              </article>
            ))}
            {!loading && graphLinks.length === 0 ? (
              <div className="empty-state">
                <strong>{tr('Chưa phát hiện liên kết', 'No links yet')}</strong>
                <p>
                  {tr(
                    'Hãy bật MNDP/LLDP/CDP trên RouterOS rồi quét lại thiết bị.',
                    'Enable MNDP/LLDP/CDP on RouterOS and scan the device again.',
                  )}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
