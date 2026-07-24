/**
 * MME supports direct HTTP access on trusted LANs and HTTPS through a reverse
 * proxy. Relative assets already inherit HTTPS when the page itself is HTTPS,
 * so forcing an HTTP page's subresources to HTTPS breaks direct LAN installs.
 */
export function createSecurityHeaderOptions() {
  return {
    contentSecurityPolicy: {
      directives: {
        upgradeInsecureRequests: null,
      },
    },
    // These isolation headers are ignored on non-trustworthy HTTP IP origins
    // and only add browser errors; MME does not require either feature.
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
  };
}
