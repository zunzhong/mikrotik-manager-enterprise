import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { topologyApi } from '../topology.api';

export function TopologyView() {
  const topology = useAsyncData(useCallback(() => topologyApi.get(), []));

  return (
    <div className="topology-view">
      <div className="topology-summary">
        <div className="summary-card">
          <span>Nodes</span>
          <strong>{topology.data?.summary.nodes ?? 0}</strong>
          <small>devices and neighbors</small>
        </div>
        <div className="summary-card">
          <span>Links</span>
          <strong>{topology.data?.summary.links ?? 0}</strong>
          <small>discovered relationships</small>
        </div>
        <div className="summary-card">
          <span>Managed Devices</span>
          <strong>{topology.data?.summary.devices ?? 0}</strong>
          <small>RouterOS devices</small>
        </div>
      </div>

      {topology.error ? <div className="error-banner">{topology.error}</div> : null}

      <div className="topology-grid">
        <section className="topology-panel">
          <h3>Nodes</h3>
          <div className="topology-list">
            {(topology.data?.nodes ?? []).map((node) => (
              <article className="topology-item" key={node.id}>
                <div>
                  <h4>{node.label}</h4>
                  <p>{node.host ?? node.id}</p>
                </div>
                <span className={`status-badge status-${node.status}`}>{node.type} • {node.status}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="topology-panel">
          <h3>Links</h3>
          <div className="topology-list">
            {(topology.data?.links ?? []).map((link) => (
              <article className="topology-item" key={link.id}>
                <div>
                  <h4>{link.source}</h4>
                  <p>→ {link.target}</p>
                </div>
                <span className="status-badge">{link.label ?? 'link'}</span>
              </article>
            ))}
            {!topology.loading && (topology.data?.links.length ?? 0) === 0 ? (
              <div className="empty-state">
                <strong>No links yet</strong>
                <p>Collect inventory with `/ip/neighbor/print` to discover topology links.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
