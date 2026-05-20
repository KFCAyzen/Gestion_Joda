/**
 * Smoke test du wrapper offline-first (intercepteur Supabase JS).
 *
 * Simule `window.jodaDesktop` côté Node avec un mock IPC table-aware, puis
 * vérifie que les méthodes chaînées Supabase JS sont interceptées et redirigées.
 *
 * Réimplémente inline la logique de src/app/lib/desktop/offline-client.ts
 * (contrat comportemental) — doit rester synchronisé avec ce fichier.
 */

globalThis.window = {};

const callLog = [];

// Données mock par table (ids alignés avec les assertions).
const TABLES = {
  students: [
    { id: 'student-1', nom: 'Doe', prenom: 'John', is_active: true },
    { id: 'student-2', nom: 'Smith', prenom: 'Jane', is_active: false },
  ],
  payments: [
    { id: 'p1', student_id: 'student-1', montant: 100 },
    { id: 'p2', student_id: 'student-2', montant: 200 },
  ],
  notifications: [
    { id: 'n1', user_id: 'u1', read: false },
    { id: 'n2', user_id: 'u1', read: false },
  ],
};

function applyFilters(rows, filters) {
  let out = rows.slice();
  for (const f of filters ?? []) {
    if (f.op === 'eq') out = out.filter((r) => r[f.column] === f.value);
    else if (f.op === 'in') out = out.filter((r) => f.value.includes(r[f.column]));
  }
  return out;
}

const mockDesktop = {
  isDesktop: true,
  db: {
    async select(table, opts) {
      callLog.push({ op: 'select', table, opts });
      const rows = applyFilters(TABLES[table] ?? [], opts?.filters);
      const count = opts?.count ? rows.length : null;
      return { rows: opts?.head ? [] : rows.map((r) => ({ ...r })), count };
    },
    async insert(table, payload) {
      callLog.push({ op: 'insert', table, payload });
      return { ...payload, id: payload.id ?? 'generated-123', created_at: '2026-01-01T00:00:00Z' };
    },
    async update(table, id, patch) {
      callLog.push({ op: 'update', table, id, patch });
      return { id, ...patch, updated_at: '2026-01-01T00:00:00Z' };
    },
    async updateWhere(table, filters, patch) {
      callLog.push({ op: 'updateWhere', table, filters, patch });
      const rows = applyFilters(TABLES[table] ?? [], filters);
      return rows.map((r) => ({ ...r, ...patch }));
    },
    async delete(table, id) {
      callLog.push({ op: 'delete', table, id });
      return { ok: true };
    },
    async deleteWhere(table, filters) {
      callLog.push({ op: 'deleteWhere', table, filters });
      return { ok: true, count: applyFilters(TABLES[table] ?? [], filters).length };
    },
  },
};
globalThis.window.jodaDesktop = mockDesktop;

const OFFLINE_TABLES = new Set([
  'users', 'students', 'universities', 'documents',
  'dossier_bourses', 'dossier_history', 'payments', 'cours_langues',
  'entrees_comptables', 'sorties_comptables', 'notifications', 'messages',
]);

const CMP_OPS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is']);

function splitTopLevel(s) {
  const out = [];
  let depth = 0, buf = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(buf); buf = ''; }
    else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

function parseOrString(orStr) {
  const clauses = [];
  for (const token of splitTopLevel(orStr)) {
    const i1 = token.indexOf('.');
    if (i1 < 0) continue;
    const column = token.slice(0, i1);
    const rest = token.slice(i1 + 1);
    const i2 = rest.indexOf('.');
    if (i2 < 0) continue;
    const rawOp = rest.slice(0, i2);
    let value = rest.slice(i2 + 1);
    const op = CMP_OPS.has(rawOp) ? rawOp : 'eq';
    if (op === 'is' && value === 'null') value = null;
    clauses.push({ op, column, value });
  }
  return clauses;
}

function idFromFilters(filters) {
  for (const f of filters) if (f.op === 'eq' && f.column === 'id') return f.value;
  return undefined;
}

function singularFk(rel) {
  let base = rel;
  if (/ies$/.test(base)) base = base.replace(/ies$/, 'y');
  else if (/s$/.test(base)) base = base.replace(/s$/, '');
  return base + '_id';
}

async function resolveEmbeds(rows, selectStr, api) {
  if (!selectStr || !selectStr.includes('(') || rows.length === 0) return rows;
  const embedRe = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^()]*)\)/g;
  const relations = [];
  let m;
  while ((m = embedRe.exec(selectStr))) relations.push(m[1]);
  for (const rel of relations) {
    if (!OFFLINE_TABLES.has(rel)) continue;
    const fk = singularFk(rel);
    if (rows[0][fk] === undefined) continue;
    const ids = [...new Set(rows.map((r) => r[fk]).filter((v) => v != null))];
    if (ids.length === 0) { for (const r of rows) r[rel] = null; continue; }
    const { rows: related } = await api.db.select(rel, { filters: [{ op: 'in', column: 'id', value: ids }] });
    const map = new Map(related.map((r) => [r.id, r]));
    for (const r of rows) r[rel] = map.get(r[fk]) ?? null;
  }
  return rows;
}

function buildTableProxy(table) {
  const state = { table, filters: [], orderBy: null, limitN: null, offsetN: null, singleMode: 'none', countMode: false, headMode: false, selectStr: '*' };
  let pendingAction = 'select';
  let pendingPayload;

  const wrap = (rows, count = null) => {
    if (state.headMode) return { data: null, count, error: null };
    if (state.singleMode === 'single') return rows.length === 0 ? { data: null, count, error: { message: 'No rows' } } : { data: rows[0], count, error: null };
    if (state.singleMode === 'maybeSingle') return { data: rows[0] ?? null, count, error: null };
    return { data: rows, count, error: null };
  };

  const exec = async () => {
    const api = globalThis.window.jodaDesktop;
    if (pendingAction === 'select') {
      const { rows, count } = await api.db.select(state.table, {
        filters: state.filters, limit: state.limitN ?? undefined, offset: state.offsetN ?? undefined,
        orderBy: state.orderBy ?? undefined, count: state.countMode || state.headMode, head: state.headMode,
      });
      const resolved = state.headMode ? rows : await resolveEmbeds(rows, state.selectStr, api);
      return wrap(resolved, count);
    }
    if (pendingAction === 'insert' || pendingAction === 'upsert') {
      const items = Array.isArray(pendingPayload) ? pendingPayload : [pendingPayload];
      const out = [];
      for (const item of items) out.push(await api.db.insert(state.table, item));
      return wrap(out);
    }
    if (pendingAction === 'update') {
      const id = idFromFilters(state.filters);
      if (id) return wrap([await api.db.update(state.table, id, pendingPayload)]);
      return wrap(await api.db.updateWhere(state.table, state.filters, pendingPayload));
    }
    if (pendingAction === 'delete') {
      const id = idFromFilters(state.filters);
      if (id) { await api.db.delete(state.table, id); return wrap([]); }
      await api.db.deleteWhere(state.table, state.filters);
      return wrap([]);
    }
  };

  const pushCmp = (op, column, value) => { state.filters.push({ op, column, value }); return chain; };

  const chain = {
    select(cols, opts) { if (typeof cols === 'string' && cols.trim()) state.selectStr = cols; if (opts?.count) state.countMode = true; if (opts?.head) state.headMode = true; return chain; },
    insert(p) { pendingAction = 'insert'; pendingPayload = p; return chain; },
    update(p) { pendingAction = 'update'; pendingPayload = p; return chain; },
    upsert(p) { pendingAction = 'upsert'; pendingPayload = p; return chain; },
    delete() { pendingAction = 'delete'; return chain; },
    eq(c, v) { return pushCmp('eq', c, v); },
    neq(c, v) { return pushCmp('neq', c, v); },
    gt(c, v) { return pushCmp('gt', c, v); },
    gte(c, v) { return pushCmp('gte', c, v); },
    lt(c, v) { return pushCmp('lt', c, v); },
    lte(c, v) { return pushCmp('lte', c, v); },
    like(c, v) { return pushCmp('like', c, v); },
    ilike(c, v) { return pushCmp('ilike', c, v); },
    is(c, v) { return pushCmp('is', c, v); },
    in(c, v) { state.filters.push({ op: 'in', column: c, value: v }); return chain; },
    or(s) { state.filters.push({ op: 'or', clauses: parseOrString(s) }); return chain; },
    order(c, opts) { state.orderBy = { column: c, direction: opts?.ascending === false ? 'desc' : 'asc' }; return chain; },
    limit(n) { state.limitN = n; return chain; },
    range(from, to) { state.offsetN = from; state.limitN = to - from + 1; return chain; },
    single() { state.singleMode = 'single'; return exec(); },
    maybeSingle() { state.singleMode = 'maybeSingle'; return exec(); },
    then(resolve, reject) { return exec().then(resolve, reject); },
  };
  return chain;
}

const client = {
  from(table) {
    if (!OFFLINE_TABLES.has(table)) throw new Error(`Table ${table} non offline`);
    return buildTableProxy(table);
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

async function test(label, fn) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (e) {
    console.error(`  ✗ ${label} — ${e.message}`);
    process.exit(1);
  }
}

console.log('Test wrapper offline-first (avec mock IPC) :');

await test('select all students', async () => {
  callLog.length = 0;
  const { data } = await client.from('students').select('*');
  if (data.length !== 2) throw new Error(`expected 2 rows, got ${data.length}`);
  if (callLog[0].op !== 'select') throw new Error('IPC select not called');
});

await test('select with eq filter', async () => {
  callLog.length = 0;
  const { data } = await client.from('students').select('*').eq('id', 'student-1').single();
  if (data?.nom !== 'Doe') throw new Error(`expected Doe, got ${data?.nom}`);
  const f = callLog[0].opts?.filters?.[0];
  if (f?.op !== 'eq' || f?.column !== 'id' || f?.value !== 'student-1') throw new Error('eq filter not propagated');
});

await test('select with order + limit', async () => {
  callLog.length = 0;
  await client.from('students').select('*').order('nom', { ascending: false }).limit(10);
  const opts = callLog[0].opts;
  if (opts.orderBy?.column !== 'nom' || opts.orderBy?.direction !== 'desc') throw new Error('order not propagated');
  if (opts.limit !== 10) throw new Error('limit not propagated');
});

await test('count + head returns count and no data', async () => {
  callLog.length = 0;
  const { data, count } = await client.from('students').select('*', { count: 'exact', head: true });
  if (data !== null) throw new Error('head:true should yield null data');
  if (count !== 2) throw new Error(`expected count 2, got ${count}`);
  if (callLog[0].opts?.head !== true) throw new Error('head flag not propagated');
});

await test('CRITICAL: insert().select().single() still inserts', async () => {
  callLog.length = 0;
  const { data, error } = await client.from('students').insert({ nom: 'Test', prenom: 'New' }).select().single();
  if (error) throw new Error(`unexpected error: ${error.message}`);
  if (callLog[0].op !== 'insert') throw new Error(`expected insert, got ${callLog[0].op} — .select() must NOT downgrade to SELECT`);
  if (data?.nom !== 'Test') throw new Error('inserted row not returned');
  if (data?.id !== 'generated-123') throw new Error('generated id not merged');
});

await test('CRITICAL: update().eq(id).select().single() still updates', async () => {
  callLog.length = 0;
  const { data, error } = await client.from('students').update({ nom: 'Updated' }).eq('id', 'student-1').select().single();
  if (error) throw new Error(`unexpected error: ${error.message}`);
  if (callLog[0].op !== 'update') throw new Error(`expected update, got ${callLog[0].op}`);
  if (callLog[0].id !== 'student-1') throw new Error('id not propagated');
  if (data?.nom !== 'Updated') throw new Error('updated row not returned');
});

await test('bulk update by non-id filter routes to updateWhere', async () => {
  callLog.length = 0;
  await client.from('notifications').update({ read: true }).eq('user_id', 'u1').eq('read', false);
  if (callLog[0].op !== 'updateWhere') throw new Error(`expected updateWhere, got ${callLog[0].op}`);
  if (callLog[0].filters.length !== 2) throw new Error('filters not propagated to updateWhere');
});

await test('update by .in(id) routes to updateWhere', async () => {
  callLog.length = 0;
  await client.from('notifications').update({ read: true }).in('id', ['n1', 'n2']);
  if (callLog[0].op !== 'updateWhere') throw new Error(`expected updateWhere (no eq id), got ${callLog[0].op}`);
});

await test('delete with eq(id) uses fast path', async () => {
  callLog.length = 0;
  await client.from('students').delete().eq('id', 'student-1');
  if (callLog[0].op !== 'delete') throw new Error('IPC delete not called');
  if (callLog[0].id !== 'student-1') throw new Error('id not propagated');
});

await test('delete by non-id filter routes to deleteWhere', async () => {
  callLog.length = 0;
  await client.from('notifications').delete().eq('user_id', 'u1');
  if (callLog[0].op !== 'deleteWhere') throw new Error(`expected deleteWhere, got ${callLog[0].op}`);
});

await test('embedded join payments → students(nom) resolved offline', async () => {
  callLog.length = 0;
  const { data } = await client.from('payments').select('*, students(nom, prenom)');
  if (data.length !== 2) throw new Error(`expected 2 payments, got ${data.length}`);
  if (data[0].students?.nom !== 'Doe') throw new Error(`embed not attached: ${JSON.stringify(data[0].students)}`);
  if (data[1].students?.nom !== 'Smith') throw new Error('second embed wrong');
  if (!callLog.some((c) => c.op === 'select' && c.table === 'students')) throw new Error('related students not fetched');
});

await test('or() parses into clause group', async () => {
  callLog.length = 0;
  await client.from('messages').select('*').or('to_user_id.eq.u1,from_user_id.eq.u1');
  const orFilter = callLog[0].opts?.filters?.find((f) => f.op === 'or');
  if (!orFilter) throw new Error('or filter not propagated');
  if (orFilter.clauses.length !== 2) throw new Error(`expected 2 clauses, got ${orFilter.clauses.length}`);
  if (orFilter.clauses[0].column !== 'to_user_id' || orFilter.clauses[0].value !== 'u1') throw new Error('or clause mis-parsed');
});

await test('ilike + range propagated', async () => {
  callLog.length = 0;
  await client.from('students').select('*', { count: 'exact' }).ilike('nom', '%do%').range(0, 9);
  const opts = callLog[0].opts;
  const ilikeF = opts.filters.find((f) => f.op === 'ilike');
  if (!ilikeF || ilikeF.value !== '%do%') throw new Error('ilike not propagated');
  if (opts.offset !== 0 || opts.limit !== 10) throw new Error('range → offset/limit incorrect');
  if (opts.count !== true) throw new Error('count flag not propagated');
});

await test('maybeSingle on empty result', async () => {
  callLog.length = 0;
  const realSelect = globalThis.window.jodaDesktop.db.select;
  globalThis.window.jodaDesktop.db.select = async () => ({ rows: [], count: 0 });
  const { data, error } = await client.from('students').select('*').eq('id', 'unknown').maybeSingle();
  if (data !== null || error) throw new Error(`maybeSingle should return null/null, got ${JSON.stringify({ data, error })}`);
  globalThis.window.jodaDesktop.db.select = realSelect;
});

console.log('\n✅ Tous les tests du wrapper passent.');
