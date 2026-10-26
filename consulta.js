// Convierte consulta.md en { titulo, instrucciones, modo, preguntas, registro, pasos }. El formato está explicado en el README.
export function leerConsulta(md) {
  const c = { titulo: '', instrucciones: '', modo: 'guiado', preguntas: [], registro: null, pasos: [] };
  const ids = new Set(), orden = [];
  let actual = null; // la sección abierta (una pregunta o el registro): ahí van su descripción y sus "- ítems"
  let lista = null;
  let agregar = texto => texto;
  for (const l of md.split('\n').map(l => l.trim())) {
    if (!l || l.startsWith('<!--')) continue;
    const modo = !actual && l.match(/^modo:\s*(libre|guiado)$/i);
    if (modo) {
      c.modo = modo[1].toLowerCase();
    } else if (l.startsWith('### ')) {
      if (actual !== c.registro || lista !== c.registro.opciones) continue; // "###" solo vale una vez, dentro del registro
      c.registro.tituloCampos = l.slice(4).trim();
      lista = c.registro.campos;
      agregar = campo;
    } else if (l.startsWith('## ')) {
      const texto = l.slice(3).trim();
      const registro = texto.match(/^registro:\s*(.*)/i);
      agregar = t => t;
      if (registro) {
        actual = c.registro = { titulo: registro[1] || 'Registrate', descripcion: '', opciones: [], tituloCampos: '', campos: [] };
        lista = c.registro.opciones;
        orden.push('registro');
        continue;
      }
      // El id sale del título: los votos quedan atados a él, así que no conviene renombrar una pregunta ya votada.
      let id = slug(texto);
      for (let n = 2; ids.has(id); n++) id = `${slug(texto)}-${n}`;
      ids.add(id);
      actual = { id, texto, descripcion: '', temas: [] };
      c.preguntas.push(actual);
      orden.push(id);
      lista = actual.temas;
    } else if (l.startsWith('# ')) {
      c.titulo = l.slice(2).trim();
    } else if (/^[-*] /.test(l)) {
      lista?.push(agregar(l.slice(2).trim()));
    } else if (actual) {
      actual.descripcion += (actual.descripcion ? ' ' : '') + l;
    } else {
      c.instrucciones += (c.instrucciones ? ' ' : '') + l;
    }
  }
  // Modo libre: todas las preguntas son un solo paso ("lista"), en el lugar de la primera.
  c.pasos = c.modo === 'libre' ? [...new Set(orden.map(p => p === 'registro' ? p : 'lista'))] : orden;
  return c;
}

// "- Email *" → { nombre: 'Email', obligatorio: true, tipo: 'email' }
function campo(texto) {
  const obligatorio = texto.endsWith('*');
  const nombre = texto.replace(/\s*\*$/, '');
  return { nombre, obligatorio, tipo: /mail/i.test(nombre) ? 'email' : 'text' };
}

const slug = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'pregunta';
