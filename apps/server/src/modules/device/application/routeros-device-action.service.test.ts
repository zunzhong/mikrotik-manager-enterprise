import { describe, expect, it } from 'vitest';
import { parseRouterOsApiCommand } from './routeros-device-action.service.js';

describe('RouterOS web terminal command parser', () => {
  it('turns a RouterOS menu such as /log into a print command', () => {
    expect(parseRouterOsApiCommand('/log')).toEqual({ path: '/log/print', params: {} });
  });

  it('supports CLI menu words separated by spaces', () => {
    expect(parseRouterOsApiCommand('/ip address print .proplist=address,interface')).toEqual({
      path: '/ip/address/print',
      params: { '.proplist': 'address,interface' },
    });
  });

  it('preserves spaces and quotes inside parameter values', () => {
    expect(parseRouterOsApiCommand('/system identity set name="Core Router Ha Noi"')).toEqual({
      path: '/system/identity/set',
      params: { name: 'Core Router Ha Noi' },
    });
  });

  it('supports empty CLI values used by monitor once', () => {
    expect(parseRouterOsApiCommand('/interface/lte/monitor numbers=0 once=""')).toEqual({
      path: '/interface/lte/monitor',
      params: { numbers: '0', once: '' },
    });
  });
});
