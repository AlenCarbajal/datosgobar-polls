// Acceso a datos: Supabase o demo (almacén local). Importable desde node: no toca window/document.

const SOLO_SUPABASE = () => new Error('El formulario de administración necesita Supabase');
const PANTALLA = 'pantalla-';
const PAGINA = 1000; // tope de filas por consulta de Supabase

const ok = ({ data, error }) => { if (error) throw error; return data; }; // conserva err.code ('23505', etc.)

function conteosDe(rs) {
  const c = {};
  for (const r of rs) {
    c[r.pregunta_id] = (c[r.pregunta_id] || 0) + 1;
    if (r.opcion_id) { const k = `${r.pregunta_id}:${r.opcion_id}`; c[k] = (c[k] || 0) + 1; }
  }
  return c;
}

export function crearApi({ supabase, almacen, sesionEjemplo }) {
  return supabase ? apiSupabase(supabase) : apiDemo(almacen, sesionEjemplo);
}

function apiSupabase(sb) {
  const tabla = async (t, sesionId, columnas = '*', orden = 'id') => {
    const todo = [];
    for (let desde = 0; ; desde += PAGINA) {
      const filas = ok(await sb.from(t).select(columnas).eq('sesion_id', sesionId)
        .order(orden).range(desde, desde + PAGINA - 1));
      todo.push(...filas);
      if (filas.length < PAGINA) return todo;
    }
  };
  return {
    async sesionPorCodigo(codigo) {
      return ok(await sb.from('sesiones').select('*').eq('codigo', codigo).maybeSingle()) ?? null;
    },
    escuchar(sesionId, { alSesion, alRespuesta, alPresentes, comoPantalla, participante } = {}) {
      const pid = participante || globalThis.crypto.randomUUID();
      // Supabase solo manda la lista de presentes a quien también se anuncia: la pantalla se anuncia con otra clave y no se cuenta.
      const clave = comoPantalla ? PANTALLA + pid : pid;
      const canal = sb.channel('sesion:' + sesionId, { config: { presence: { key: clave } } });
      if (alSesion) canal.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sesiones', filter: 'id=eq.' + sesionId }, x => alSesion(x.new));
      if (alRespuesta) canal.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'respuestas', filter: 'sesion_id=eq.' + sesionId }, x => alRespuesta(x.new));
      if (alPresentes) canal.on('presence', { event: 'sync' }, () =>
        alPresentes(Object.keys(canal.presenceState()).filter(k => !k.startsWith(PANTALLA)).length));
      canal.subscribe(estado => { if (estado === 'SUBSCRIBED') canal.track({}); });
      return () => { sb.removeChannel(canal); };
    },
    // Sin .select(): anon no puede leer inscripciones y los permisos de columna no incluyen id ni creado.
    async responder(r) { ok(await sb.from('respuestas').insert(r)); },
    async inscribir(i) { ok(await sb.from('inscripciones').insert(i)); },
    respuestas: (id) => tabla('respuestas', id),
    async resumenInscripciones(id) { return ok(await sb.rpc('resumen_inscripciones', { p_sesion: id })); },

    async entrar(email, clave) { ok(await sb.auth.signInWithPassword({ email, password: clave })); },
    async salir() { const { error } = await sb.auth.signOut(); if (error) throw error; },
    async usuario() {
      const { data } = await sb.auth.getUser(); // sin sesión devuelve error: es "no hay usuario"
      return data?.user ? { email: data.user.email } : null;
    },
    async esAdmin() { return ok(await sb.rpc('es_admin')) === true; },
    async listarSesiones() { return ok(await sb.from('sesiones').select('*').order('creado', { ascending: false })); },
    async crearSesion(codigo, config) { return ok(await sb.from('sesiones').insert({ codigo, config }).select().single()); },
    async guardarConfig(id, config) { ok(await sb.from('sesiones').update({ config }).eq('id', id)); },
    async archivar(id, archivada) { ok(await sb.from('sesiones').update({ archivada }).eq('id', id)); },
    async cambiarPaso(id, paso) { ok(await sb.from('sesiones').update({ paso }).eq('id', id)); },
    async reiniciar(id) { ok(await sb.rpc('reiniciar_sesion', { p_sesion: id })); },
    inscripciones: (id) => tabla('inscripciones', id),
    async conteos(id) { return conteosDe(await tabla('respuestas', id, 'id,pregunta_id,opcion_id')); },
    async admins() { return ok(await sb.from('admins').select('email').order('email')).map(a => a.email); },
    async agregarAdmin(email) { ok(await sb.from('admins').insert({ email: email.trim().toLowerCase() })); },
    async quitarAdmin(email) { ok(await sb.from('admins').delete().eq('email', email.trim().toLowerCase())); },
  };
}

function apiDemo(almacen, ejemplo) {
  const leer = (k, def) => { const v = almacen.getItem('demo:' + k); return v == null ? def : JSON.parse(v); };
  const guardar = (k, v) => { almacen.setItem('demo:' + k, JSON.stringify(v)); avisar(k); };
  const oyentes = new Set(); // suscriptores de esta pestaña; las otras se enteran por el evento `storage`
  const avisar = (k) => oyentes.forEach(f => f(k));
  const sesion = () => leer('sesion', ejemplo);
  const ya = () => Object.assign(new Error('Ya existe'), { code: '23505' });
  const admin = () => { throw SOLO_SUPABASE(); };
  const bloqueado = async () => admin();

  return {
    async sesionPorCodigo(codigo) { const s = sesion(); return s.codigo === codigo ? s : null; },
    // Contrato de escuchar (igual en ambos backends): alSesion(sesion) en cada cambio; alRespuesta(fila) en Supabase,
    // pero en demo alRespuesta() llega SIN argumento y significa "algo cambió, volvé a pedir respuestas()".
    // alPresentes no se dispara nunca en demo: las vistas ocultan el contador hasta que llegue.
    escuchar(sesionId, { alSesion, alRespuesta } = {}) {
      const al = (k) => {
        if (k === 'sesion') alSesion?.(sesion());
        if (k === 'respuestas') alRespuesta?.(); // sin argumento: "algo cambió, volvé a pedir todo" (los eventos storage se pueden juntar)
      };
      const deOtraPestana = (e) => { if (e.key?.startsWith('demo:')) al(e.key.slice(5)); };
      oyentes.add(al);
      globalThis.addEventListener?.('storage', deOtraPestana);
      return () => { oyentes.delete(al); globalThis.removeEventListener?.('storage', deOtraPestana); };
    },
    async responder(r) {
      const rs = leer('respuestas', []);
      if (rs.some(x => x.pregunta_id === r.pregunta_id && x.participante === r.participante)) throw ya();
      guardar('respuestas', [...rs, { id: rs.length + 1, ...r, creado: new Date().toISOString() }]);
    },
    async inscribir(i) {
      const is = leer('inscripciones', []);
      if (is.some(x => x.participante === i.participante)) throw ya();
      guardar('inscripciones', [...is, { ...i, creado: new Date().toISOString() }]);
    },
    async respuestas() { return leer('respuestas', []); },
    async resumenInscripciones() { return { total: leer('inscripciones', []).length }; },
    async cambiarPaso(id, paso) { guardar('sesion', { ...sesion(), paso }); },
    async reiniciar() {
      almacen.setItem('demo:respuestas', '[]');
      almacen.setItem('demo:inscripciones', '[]');
      guardar('sesion', { ...sesion(), paso: 'inicio', ronda: sesion().ronda + 1 });
      avisar('respuestas');
    },
    entrar: bloqueado, salir: bloqueado, usuario: bloqueado, esAdmin: bloqueado, listarSesiones: bloqueado,
    crearSesion: bloqueado, guardarConfig: bloqueado, archivar: bloqueado, inscripciones: bloqueado,
    conteos: bloqueado, admins: bloqueado, agregarAdmin: bloqueado, quitarAdmin: bloqueado,
  };
}
