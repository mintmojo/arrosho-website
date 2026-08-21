// Jest Fest — client configuration.
//
// ============================================================================
// THE ONE LINE TO EDIT AFTER THE RELAY IS DEPLOYED TO CLOUDFLARE:
//
//   Set RELAY_URL_PROD below to the deployed relay's wss:// origin.
//   (jestfest-relay/PROTOCOL.md §1, Jest fest-spec.md §8 — something like
//   wss://jestfest-relay.<your-account>.workers.dev, or wss://relay.arrosho.com
//   if it ends up on its own subdomain.) Nothing else in this app needs to
//   change — every module imports RELAY_URL from here.
// ============================================================================
export const RELAY_URL_PROD = 'wss://jestfest-relay.ethanrholbrook14.workers.dev';

// Local-dev fallback. When this client itself is being served from
// localhost/127.0.0.1 (e.g. `python3 -m http.server` in this folder) it
// talks to a relay running locally on :8787 instead of the not-yet-real
// production URL above. This is what lets the whole client be exercised
// end-to-end before anything is deployed — see README.md.
const LOCAL_RELAY_URL = 'ws://localhost:8787';

function isLocalHost() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '' || location.protocol === 'file:';
}

export const RELAY_URL = isLocalHost() ? LOCAL_RELAY_URL : RELAY_URL_PROD;
