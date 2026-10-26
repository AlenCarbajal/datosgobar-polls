import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contraste, colorTextoSobre, resolverEstetica, ESTETICA_DEFECTO } from '../js/tema.js';

test('contraste', () => {
  assert.equal(Math.round(contraste('#FFFFFF', '#000000')), 21);
  assert.ok(contraste('#232D4F', '#FFFFFF') > 12);
  assert.equal(contraste('#ffffff', '#FFFFFF'), 1);
});

test('colorTextoSobre', () => {
  assert.equal(colorTextoSobre('#232D4F'), '#FFFFFF');
  assert.equal(colorTextoSobre('#F5C518'), '#1A1A1A');
});

test('resolverEstetica: defecto, preset, valores vacíos e inválidos', () => {
  assert.deepEqual(resolverEstetica({}), ESTETICA_DEFECTO);
  const gob = resolverEstetica({ preset: 'datos-gob-ar' });
  assert.equal(gob.colorPrincipal, '#232D4F');
  assert.equal(gob.tipografia, 'Montserrat');
  assert.equal(resolverEstetica({ preset: 'datos-gob-ar', colorAcento: '#F5C518' }).colorAcento, '#F5C518');
  assert.equal(resolverEstetica({ preset: '../../x' }).preset, 'neutro');
  assert.equal(resolverEstetica({ colorPrincipal: '', colorAcento: 'rojo' }).colorAcento, ESTETICA_DEFECTO.colorAcento);
  assert.equal(resolverEstetica({ colorPrincipal: '' }).colorPrincipal, ESTETICA_DEFECTO.colorPrincipal);
  assert.equal(resolverEstetica({ esquinas: 'raras' }).esquinas, 'suaves');
});
