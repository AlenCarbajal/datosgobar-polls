// Carga rápida: texto pegado → preguntas. Puro, sin DOM.
export function leerBloques(texto) {
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lineas.some(l => l.startsWith('## '))) return lineas.map(l => ({ texto: l, descripcion: '', etiquetas: [] }));
  const bloques = [];
  const desc = [];
  let actual = null;
  const cerrar = () => { if (actual) { actual.descripcion = desc.join(' '); bloques.push(actual); } desc.length = 0; };
  for (const l of lineas) {
    if (l.startsWith('## ')) { cerrar(); actual = { texto: l.slice(3).trim(), descripcion: '', etiquetas: [] }; }
    else if (!actual) continue;
    else if (/^[-*] /.test(l)) actual.etiquetas.push(l.slice(2).trim());
    else desc.push(l);
  }
  cerrar();
  return bloques;
}
