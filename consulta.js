// Convierte consulta.md en { titulo, instrucciones, preguntas, registro, pasos }. El formato está explicado en el README.
export function leerConsulta(md) {
  const c = { titulo: '', instrucciones: '', preguntas: [], registro: null, pasos: [] };
  const ids = new Set();
  let lista = null; // a dónde van los "- ítems" que siguen
  let agregar = texto => texto;
  for (const l of md.split('\n').map(l => l.trim())) {
    if (!l || l.startsWith('<!--')) continue;
    if (l.startsWith('### ')) {
      if (!c.registro || lista !== c.registro.opciones) continue; // "###" solo vale una vez, dentro del registro
      c.registro.tituloCampos = l.slice(4).trim();
      lista = c.registro.campos;
      agregar = campo;
    } else if (l.startsWith('## ')) {
      const texto = l.slice(3).trim();
      const registro = texto.match(/^registro:\s*(.*)/i);
      agregar = t => t;
      if (registro) {
        c.registro = { titulo: registro[1] || 'Registrate', opciones: [], tituloCampos: '', campos: [] };
        lista = c.registro.opciones;
        c.pasos.push('registro');
        continue;
      }
      // El id sale del título: los votos quedan atados a él, así que no conviene renombrar una pregunta ya votada.
      let id = slug(texto);
      for (let n = 2; ids.has(id); n++) id = `${slug(texto)}-${n}`;
      ids.add(id);
      c.preguntas.push({ id, texto, temas: [] });
      c.pasos.push(id);
      lista = c.preguntas.at(-1).temas;
    } else if (l.startsWith('# ')) {
      c.titulo = l.slice(2).trim();
    } else if (/^[-*] /.test(l)) {
      lista?.push(agregar(l.slice(2).trim()));
    } else if (!lista) {
      c.instrucciones += (c.instrucciones ? ' ' : '') + l;
    }
  }
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
