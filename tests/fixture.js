export const cfg = () => ({
  titulo: 'T', instrucciones: '', estetica: {}, final: { titulo: 'Gracias', texto: '' },
  pasos: [
    { id: 'r1', tipo: 'registro', titulo: 'R', obligatorio: true,
      campos: [{ id: 'c1', etiqueta: 'Nombre', tipo: 'texto', obligatorio: true }] },
    { id: 'l1', tipo: 'lista', titulo: 'L',
      opciones: [{ id: 'o1', texto: 'Ok' }, { id: 'o2', texto: 'No' }, { id: 'o3', texto: 'Comentar', pideTexto: 'obligatorio' }],
      preguntas: [{ id: 'q1', texto: 'A' }, { id: 'q2', texto: 'B' }] },
    { id: 'g1', tipo: 'pregunta', pregunta: { id: 'q3', texto: '¿Algo?' }, opciones: [] },
  ],
});
