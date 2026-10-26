// Uso único: node herramientas/importar-consulta.js consulta.md > sesion.json
import { readFileSync } from 'node:fs';
import { leerConsulta } from '../consulta.js';
import { nuevoId } from '../js/sesion.js';

const c = leerConsulta(readFileSync(process.argv[2], 'utf8'));
const pasos = [];
if (c.registro) {
  pasos.push({
    id: nuevoId('r'), tipo: 'registro', titulo: c.registro.titulo, descripcion: c.registro.descripcion,
    obligatorio: true,
    campos: c.registro.campos.map(f => ({
      id: nuevoId('c'), etiqueta: f.nombre, tipo: f.tipo === 'email' ? 'email' : 'texto', obligatorio: !!f.obligatorio,
    })),
  });
  if (c.registro.opciones?.length) console.error('Aviso: se descartaron las opciones del registro.');
}
pasos.push({
  id: nuevoId('l'), tipo: 'lista', titulo: c.titulo,
  opciones: [
    { id: nuevoId('o'), texto: 'Ok' },
    { id: nuevoId('o'), texto: 'No' },
    { id: nuevoId('o'), texto: 'Comentar', pideTexto: 'obligatorio' },
  ],
  preguntas: c.preguntas.map(p => ({ id: nuevoId('q'), texto: p.texto, descripcion: p.descripcion, etiquetas: p.temas })),
});
console.log(JSON.stringify({
  titulo: c.titulo, instrucciones: c.instrucciones,
  estetica: {
    preset: 'datos-gob-ar', organismo: 'datos.gob.ar', logo: 'img/logo-datos-gob-ar-blanco.png', encabezado: '',
    colorPrincipal: '#232D4F', colorAcento: '#393793', tipografia: 'Montserrat', esquinas: 'suaves', firma: true,
  },
  pasos, final: { titulo: '¡Gracias por participar!', texto: '' },
}, null, 2));
