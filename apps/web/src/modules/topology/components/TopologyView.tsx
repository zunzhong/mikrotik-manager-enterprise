import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import { topologyApi, type TopologyData, type TopologyNode } from '../topology.api';

interface GraphPosition {
  node: TopologyNode;
  x: number;
  y: number;
}

export function TopologyView() {
  const { formatDateTime, tr } = useLanguage();
  const [data, setData] = useState<TopologyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      setData(await topologyApi.refresh());
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : tr('Không thể quét lại Inventory.', 'Unable to refresh inventory.'),
      );
    } finally {
      setRefreshing(false);
    }
  }, [tr]);

  const positions = useMemo<GraphPosition[]>(() => {
    const nodes = data?.nodes ?? [];
    if (nodes.length === 0) return [];
    const radius = Math.min(250, Math.max(120, nodes.length * 34));
    return nodes.map((node, index) => {
      const angle = (Math.PI * 2 * index) / nodes.length - Math.PI / 2;
      return { node, x: 360 + Math.cos(angle) * radius, y: 250 + Math.sin(angle) * radius };
    });
  }, [data?.nodes]);
  const positionById = useMemo(
    () => new Map(positions.map((position) => [position.node.id, position])),
    [positions],
  );
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
        <button
          className="primary-button"
          type="button"
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          {refreshing
            ? tr('Đang quét...', 'Scanning...')
            : tr('Quét Inventory ngay', 'Scan inventory now')}
        </button>
      </div>

      <div className="topology-summary">
        <div className="summary-card">
          <span>{tr('Nút mạng', 'Nodes')}</span>
          <strong>{data?.summary.nodes ?? 0}</strong>
          <small>{tr('thiết bị và hàng xóm', 'devices and neighbors')}</small>
        </div>
        <div className="summary-card">
          <span>{tr('Liên kết', 'Links')}</span>
          <strong>{data?.summary.links ?? 0}</strong>
          <small>{tr('quan hệ đã phát hiện', 'discovered relationships')}</small>
        </div>
        <div className="summary-card">
          <span>{tr('Thiết bị đang quản lý', 'Managed devices')}</span>
          <strong>{data?.summary.devices ?? 0}</strong>
          <small>{tr('thiết bị RouterOS', 'RouterOS devices')}</small>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="topology-panel topology-map-panel">
        <div className="topology-panel-heading">
          <h3>{tr('Sơ đồ liên kết', 'Network graph')}</h3>
          <span>
            {tr(
              'Dữ liệu lấy từ RouterOS Neighbor Discovery',
              'Data from RouterOS Neighbor Discovery',
            )}
          </span>
        </div>
        {positions.length > 0 ? (
          <div className="topology-map-scroll">
            <svg
              className="topology-map"
              viewBox="0 0 720 500"
              role="img"
              aria-label={tr('Sơ đồ mạng RouterOS', 'RouterOS topology graph')}
            >
              {(data?.links ?? []).map((link) => {
                const source = positionById.get(link.source);
                const target = positionById.get(link.target);
                if (!source || !target) return null;
                return (
                  <g key={link.id}>
                    <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
                    <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 6}>
                      {link.label}
                    </text>
                  </g>
                );
              })}
              {positions.map(({ node, x, y }) => (
                <g
                  className={`topology-map-node topology-map-node-${node.type}`}
                  key={node.id}
                  transform={`translate(${x} ${y})`}
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
          <h3>{tr('Nút mạng', 'Nodes')}</h3>
          <div className="topology-list">
            {(data?.nodes ?? []).map((node) => (
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
          <h3>{tr('Liên kết', 'Links')}</h3>
          <div className="topology-list">
            {(data?.links ?? []).map((link) => (
              <article className="topology-item" key={link.id}>
                <div>
                  <h4>{positionById.get(link.source)?.node.label ?? link.source}</h4>
                  <p>→ {positionById.get(link.target)?.node.label ?? link.target}</p>
                </div>
                <span className="status-badge">{link.label ?? 'link'}</span>
              </article>
            ))}
            {!loading && (data?.links.length ?? 0) === 0 ? (
              <div className="empty-state">
                <strong>{tr('Chưa phát hiện liên kết', 'No links yet')}</strong>
                <p>
                  {tr(
                    'Hãy bật MNDP/LLDP/CDP trên các RouterOS cùng lớp mạng L2 rồi bấm “Quét Inventory ngay”.',
                    'Enable MNDP/LLDP/CDP on RouterOS devices in the same L2 network, then scan inventory.',
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
