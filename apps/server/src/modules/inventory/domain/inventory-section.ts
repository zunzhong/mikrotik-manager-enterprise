export interface InventorySectionDefinition {
  key: string;
  category: string;
  label: string;
  path: string;
  enabledByDefault: boolean;
}

export const inventorySections: InventorySectionDefinition[] = [
  // System
  { key: 'system.identity', category: 'system', label: 'Identity', path: '/system/identity/print', enabledByDefault: true },
  { key: 'system.resource', category: 'system', label: 'Resource', path: '/system/resource/print', enabledByDefault: true },
  { key: 'system.license', category: 'system', label: 'License', path: '/system/license/print', enabledByDefault: true },
  { key: 'system.packages', category: 'system', label: 'Packages', path: '/system/package/print', enabledByDefault: true },
  { key: 'system.clock', category: 'system', label: 'Clock', path: '/system/clock/print', enabledByDefault: true },
  { key: 'system.users', category: 'system', label: 'Users', path: '/user/print', enabledByDefault: true },
  { key: 'system.files', category: 'system', label: 'Files', path: '/file/print', enabledByDefault: true },
  { key: 'system.logs', category: 'system', label: 'Logs', path: '/log/print', enabledByDefault: false },
  { key: 'system.health', category: 'system', label: 'Health', path: '/system/health/print', enabledByDefault: true },
  { key: 'system.routerboard', category: 'system', label: 'RouterBOARD', path: '/system/routerboard/print', enabledByDefault: true },

  // Interfaces
  { key: 'interfaces.all', category: 'interfaces', label: 'Interfaces', path: '/interface/print', enabledByDefault: true },
  { key: 'interfaces.bridge', category: 'interfaces', label: 'Bridge', path: '/interface/bridge/print', enabledByDefault: true },
  { key: 'interfaces.vlan', category: 'interfaces', label: 'VLAN', path: '/interface/vlan/print', enabledByDefault: true },
  { key: 'interfaces.wireguard', category: 'interfaces', label: 'WireGuard', path: '/interface/wireguard/print', enabledByDefault: true },
  { key: 'interfaces.list', category: 'interfaces', label: 'Interface Lists', path: '/interface/list/print', enabledByDefault: true },

  // IP
  { key: 'ip.address', category: 'ip', label: 'IP Address', path: '/ip/address/print', enabledByDefault: true },
  { key: 'ip.dhcp-client', category: 'ip', label: 'DHCP Client', path: '/ip/dhcp-client/print', enabledByDefault: true },
  { key: 'ip.dhcp-server', category: 'ip', label: 'DHCP Server', path: '/ip/dhcp-server/print', enabledByDefault: true },
  { key: 'ip.dhcp-lease', category: 'ip', label: 'DHCP Lease', path: '/ip/dhcp-server/lease/print', enabledByDefault: true },
  { key: 'ip.pool', category: 'ip', label: 'Pool', path: '/ip/pool/print', enabledByDefault: true },
  { key: 'ip.arp', category: 'ip', label: 'ARP', path: '/ip/arp/print', enabledByDefault: true },
  { key: 'ip.dns', category: 'ip', label: 'DNS', path: '/ip/dns/print', enabledByDefault: true },
  { key: 'ip.neighbor', category: 'ip', label: 'Neighbors', path: '/ip/neighbor/print', enabledByDefault: true },

  // Routing
  { key: 'routing.routes', category: 'routing', label: 'Route List', path: '/ip/route/print', enabledByDefault: true },
  { key: 'routing.tables', category: 'routing', label: 'Routing Tables', path: '/routing/table/print', enabledByDefault: true },
  { key: 'routing.rules', category: 'routing', label: 'Routing Rules', path: '/routing/rule/print', enabledByDefault: true },
  { key: 'routing.ospf', category: 'routing', label: 'OSPF', path: '/routing/ospf/instance/print', enabledByDefault: false },
  { key: 'routing.bgp', category: 'routing', label: 'BGP', path: '/routing/bgp/connection/print', enabledByDefault: false },
  { key: 'routing.vrf', category: 'routing', label: 'VRF', path: '/ip/vrf/print', enabledByDefault: false },

  // Firewall
  { key: 'firewall.filter', category: 'firewall', label: 'Filter', path: '/ip/firewall/filter/print', enabledByDefault: true },
  { key: 'firewall.nat', category: 'firewall', label: 'NAT', path: '/ip/firewall/nat/print', enabledByDefault: true },
  { key: 'firewall.mangle', category: 'firewall', label: 'Mangle', path: '/ip/firewall/mangle/print', enabledByDefault: true },
  { key: 'firewall.raw', category: 'firewall', label: 'Raw', path: '/ip/firewall/raw/print', enabledByDefault: true },
  { key: 'firewall.address-list', category: 'firewall', label: 'Address Lists', path: '/ip/firewall/address-list/print', enabledByDefault: true },
  { key: 'firewall.connections', category: 'firewall', label: 'Connections', path: '/ip/firewall/connection/print', enabledByDefault: false },

  // Services
  { key: 'services.hotspot', category: 'services', label: 'Hotspot', path: '/ip/hotspot/print', enabledByDefault: true },
  { key: 'services.ppp-secret', category: 'services', label: 'PPP Secrets', path: '/ppp/secret/print', enabledByDefault: true },
  { key: 'services.pppoe-server', category: 'services', label: 'PPPoE Server', path: '/interface/pppoe-server/server/print', enabledByDefault: true },
  { key: 'services.l2tp', category: 'services', label: 'L2TP', path: '/interface/l2tp-server/server/print', enabledByDefault: true },
  { key: 'services.pptp', category: 'services', label: 'PPTP', path: '/interface/pptp-server/server/print', enabledByDefault: true },
  { key: 'services.sstp', category: 'services', label: 'SSTP', path: '/interface/sstp-server/server/print', enabledByDefault: true },
  { key: 'services.ovpn', category: 'services', label: 'OpenVPN', path: '/interface/ovpn-server/server/print', enabledByDefault: true },
  { key: 'services.ipsec', category: 'services', label: 'IPsec', path: '/ip/ipsec/profile/print', enabledByDefault: true },
  { key: 'services.radius', category: 'services', label: 'RADIUS', path: '/radius/print', enabledByDefault: true },
  { key: 'services.user-manager', category: 'services', label: 'User Manager', path: '/tool/user-manager/user/print', enabledByDefault: false },
  { key: 'services.ip-service', category: 'services', label: 'IP Services', path: '/ip/service/print', enabledByDefault: true },

  // Automation
  { key: 'automation.scripts', category: 'automation', label: 'Scripts', path: '/system/script/print', enabledByDefault: true },
  { key: 'automation.scheduler', category: 'automation', label: 'Scheduler', path: '/system/scheduler/print', enabledByDefault: true },
  { key: 'automation.netwatch', category: 'automation', label: 'Netwatch', path: '/tool/netwatch/print', enabledByDefault: true },

  // QoS
  { key: 'qos.simple-queue', category: 'qos', label: 'Simple Queue', path: '/queue/simple/print', enabledByDefault: true },
  { key: 'qos.queue-tree', category: 'qos', label: 'Queue Tree', path: '/queue/tree/print', enabledByDefault: true },
  { key: 'qos.queue-type', category: 'qos', label: 'Queue Types', path: '/queue/type/print', enabledByDefault: true },

  // Containers
  { key: 'containers.list', category: 'containers', label: 'Containers', path: '/container/print', enabledByDefault: false },
  { key: 'containers.envs', category: 'containers', label: 'Container Envs', path: '/container/envs/print', enabledByDefault: false },
  { key: 'containers.mounts', category: 'containers', label: 'Container Mounts', path: '/container/mounts/print', enabledByDefault: false },
];
