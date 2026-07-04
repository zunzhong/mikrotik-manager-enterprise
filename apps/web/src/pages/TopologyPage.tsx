import { TopologyView } from '../modules/topology/components/TopologyView';

export function TopologyPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Topology</h2>
        <p>Visualize managed devices and discovered RouterOS neighbors.</p>
      </div>

      <TopologyView />
    </div>
  );
}
