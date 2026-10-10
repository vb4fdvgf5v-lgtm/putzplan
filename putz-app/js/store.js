// Datenhaltung: lokaler Cache in localStorage, optional abgeglichen mit Supabase.
// Alles ist ein "Item" (kind + data). Löschen = data.deleted, damit der Abgleich inkrementell bleibt.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const PAGE = 1000;
const OVERLAP_MS = 60_000; // Puffer gegen Uhren- und Transaktionsversatz beim inkrementellen Abruf

export function createStore(household, { cloud = cloudEnabled } = {}) {
  const key = `putz:data:${household}`;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key)) ?? {}; } catch { /* leerer Start */ }
  const items = new Map((saved.items ?? []).map(i => [i.id, i]));
  let pending = new Set(saved.pending ?? []);
  let lastSync = saved.lastSync ?? null;
  // Noch nie abgeglichen (z. B. vor dem Eintragen von Supabase angelegt): alles Lokale hochladen.
  if (cloud && !lastSync) items.forEach((_, id) => pending.add(id));
  let status = cloud ? 'idle' : 'local';
  let syncing = null, flushTimer = null;
  const listeners = new Set();

  const persist = () => {
    try {
      localStorage.setItem(key, JSON.stringify({ items: [...items.values()], pending: [...pending], lastSync }));
    } catch { /* Speicher voll oder gesperrt: Daten bleiben im Speicher */ }
  };
  const emit = () => listeners.forEach(fn => fn());

  async function api(path, opts = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'x-household': household,
        'Content-Type': 'application/json',
        ...opts.headers,
      },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`.trim());
    return res.status === 204 || opts.method === 'POST' ? null : res.json();
  }

  async function push() {
    if (!pending.size) return;
    const ids = [...pending];
    const rows = ids.map(id => ({ household, id, kind: items.get(id).kind, data: items.get(id).data }));
    await api('items?on_conflict=household,id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });
    ids.forEach(id => pending.delete(id));
  }

  async function pull() {
    // Postgres liefert Mikrosekunden, die Safari beim Parsen nicht immer akzeptiert.
    const parsed = lastSync ? Date.parse(lastSync.replace(/(\.\d{3})\d+/, '$1')) : NaN;
    let since = Number.isFinite(parsed) ? new Date(parsed - OVERLAP_MS).toISOString() : null;
    for (;;) {
      const filter = since ? `&updated_at=gte.${encodeURIComponent(since)}` : '';
      const rows = await api(`items?select=id,kind,data,updated_at&household=eq.${encodeURIComponent(household)}` +
                             `${filter}&order=updated_at.asc&limit=${PAGE}`);
      for (const r of rows) {
        if (!pending.has(r.id)) items.set(r.id, { id: r.id, kind: r.kind, data: r.data });
        if (!lastSync || r.updated_at > lastSync) lastSync = r.updated_at;
      }
      if (rows.length < PAGE) break;
      since = rows[rows.length - 1].updated_at;
    }
  }

  async function sync() {
    if (!cloud) return;
    if (syncing) return syncing;
    status = 'syncing'; emit();
    syncing = (async () => {
      try {
        await push();
        await pull();
        status = 'ok';
      } catch (e) {
        status = navigator.onLine === false ? 'offline' : `error: ${e.message}`;
      } finally {
        persist();
        syncing = null;
        emit();
      }
    })();
    return syncing;
  }

  return {
    get status() { return status; },
    get(id) { return items.get(id)?.data; },
    list(kind) {
      return [...items.values()].filter(i => i.kind === kind && !i.data.deleted).map(i => ({ id: i.id, ...i.data }));
    },
    listAll(kind) { return [...items.values()].filter(i => i.kind === kind).map(i => ({ id: i.id, ...i.data })); },
    put(kind, id, data) {
      items.set(id, { id, kind, data });
      if (cloud) pending.add(id);
      persist();
      emit();
      clearTimeout(flushTimer);
      flushTimer = setTimeout(sync, 400);
    },
    update(id, patch) {
      const it = items.get(id);
      if (it) this.put(it.kind, id, { ...it.data, ...patch });
    },
    sync,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
