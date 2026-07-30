import { describe, expect, it } from 'vitest';
import { recommendedSyslogServerAddresses } from './syslog.service.js';

describe('recommended Syslog server addresses', () => {
  it('returns routable IPv4 addresses and excludes loopback/link-local interfaces', () => {
    expect(
      recommendedSyslogServerAddresses({
        Loopback: [
          {
            address: '127.0.0.1',
            netmask: '255.0.0.0',
            family: 'IPv4',
            mac: '',
            internal: true,
            cidr: '127.0.0.1/8',
          },
        ],
        Ethernet: [
          {
            address: '10.0.0.11',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: '',
            internal: false,
            cidr: '10.0.0.11/24',
          },
          {
            address: '169.254.1.2',
            netmask: '255.255.0.0',
            family: 'IPv4',
            mac: '',
            internal: false,
            cidr: '169.254.1.2/16',
          },
        ],
        Docker: [
          {
            address: '172.17.0.1',
            netmask: '255.255.0.0',
            family: 'IPv4',
            mac: '',
            internal: false,
            cidr: '172.17.0.1/16',
          },
        ],
      }),
    ).toEqual(['10.0.0.11', '172.17.0.1']);
  });

  it('prefers the interface in the same subnet as managed RouterOS devices', () => {
    expect(
      recommendedSyslogServerAddresses(
        {
          Docker: [
            {
              address: '172.17.0.1',
              netmask: '255.255.0.0',
              family: 'IPv4',
              mac: '',
              internal: false,
              cidr: '172.17.0.1/16',
            },
          ],
          Ethernet: [
            {
              address: '10.0.0.11',
              netmask: '255.255.255.0',
              family: 'IPv4',
              mac: '',
              internal: false,
              cidr: '10.0.0.11/24',
            },
          ],
        },
        ['10.0.0.2'],
      ),
    ).toEqual(['10.0.0.11', '172.17.0.1']);
  });
});
