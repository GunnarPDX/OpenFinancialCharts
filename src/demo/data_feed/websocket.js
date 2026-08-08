// Unusual Whales live price socket. Chart-agnostic transport: the chart only
// ever sees the PriceSocket interface, so any provider can implement it and
// be passed in as a prop:
//
//   <ChartContext price_socket={mySocket}>
//
// PriceSocket interface:
//   { name: string, subscribe(ticker, onTick) => unsubscribe() }
//
// onTick receives a Tick:
//   { price: number, time: Date, volume: number }
//   (volume is the cumulative session volume as of the tick)
//
// UW protocol (docs/operations/PublicApi.SocketController.price):
//   connect  wss://api.unusualwhales.com/socket?token=<TOKEN>
//   join     {"channel":"price:SPY","msg_type":"join"}
//   receive  ["price:SPY",{"close":"562.82","time":1726670327692,"vol":6015555}]

const SOCKET_URL = 'wss://api.unusualwhales.com/socket';

// token may be a string or a () => string getter, same as uw_client
const createUWPriceSocket = ({ token, url = SOCKET_URL } = {}) => {
  const listeners = new Map(); // ticker -> Set<onTick>
  let ws = null;
  let reconnectTimer = null;
  let staleTimer = null; // polls for a silent (half-open) connection
  let lastMsgAt = 0;
  const STALE_MS = 45000;

  const joinMsg = (ticker) => JSON.stringify({ channel: `price:${ticker}`, msg_type: 'join' });

  const clearStaleTimer = () => { clearInterval(staleTimer); staleTimer = null; };

  const scheduleRetry = () => {
    if (listeners.size && !reconnectTimer) {
      reconnectTimer = setTimeout(() => { reconnectTimer = null; ensureOpen(); }, 5000);
    }
  };

  const ensureOpen = () => {
    if (ws) return;
    const t = typeof token === 'function' ? token() : token;
    if (!t) {
      // the token may land later (localStorage, async config): keep retrying
      // instead of permanently killing the subscription
      console.warn('[uw_socket] no API token; retrying in 5s');
      scheduleRetry();
      return;
    }
    ws = new WebSocket(`${url}?token=${encodeURIComponent(t)}`);
    lastMsgAt = Date.now();
    clearStaleTimer();
    staleTimer = setInterval(() => {
      if (Date.now() - lastMsgAt < STALE_MS) return;
      // nothing heard for a while: assume a half-open socket (sleep/network
      // drop) and force a reconnect; clear onclose so this close doesn't also
      // schedule the 5s retry path
      clearStaleTimer();
      const dead = ws;
      ws = null;
      if (dead) { dead.onclose = null; dead.close(); }
      if (listeners.size) ensureOpen();
    }, 15000);
    ws.onopen = () => listeners.forEach((_, ticker) => ws.send(joinMsg(ticker)));
    ws.onmessage = (ev) => {
      lastMsgAt = Date.now();
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      const [channel, payload] = Array.isArray(msg) ? msg : [];
      if (typeof channel !== 'string' || !channel.startsWith('price:')) return;
      const fns = listeners.get(channel.slice('price:'.length));
      if (!fns) return;
      (Array.isArray(payload) ? payload : [payload]).forEach(p => {
        const tick = { price: +p?.close, time: new Date(+p?.time), volume: +p?.vol || 0 };
        if (isFinite(tick.price) && !Number.isNaN(+tick.time)) fns.forEach(fn => fn(tick));
      });
    };
    ws.onclose = () => {
      ws = null;
      clearStaleTimer();
      // ponytail: fixed 5s retry forever; add backoff/cap if UW rejects reconnect storms
      scheduleRetry();
    };
    ws.onerror = () => {}; // onclose fires next; reconnect handles it
  };

  return {
    name: 'unusualwhales-price',
    subscribe(ticker, onTick) {
      const isNewTicker = !listeners.has(ticker);
      if (isNewTicker) listeners.set(ticker, new Set());
      listeners.get(ticker).add(onTick);
      if (isNewTicker && ws?.readyState === WebSocket.OPEN) ws.send(joinMsg(ticker));
      ensureOpen();
      return () => {
        const fns = listeners.get(ticker);
        if (fns) {
          fns.delete(onTick);
          if (!fns.size) listeners.delete(ticker);
        }
        // the API documents no leave message: when nothing is subscribed,
        // drop the connection; the next subscribe opens a fresh socket that
        // joins only the channels still wanted
        if (!listeners.size) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
          clearStaleTimer();
          if (ws) { ws.onclose = null; ws.close(); ws = null; }
        }
      };
    },
  };
};

export default createUWPriceSocket;
