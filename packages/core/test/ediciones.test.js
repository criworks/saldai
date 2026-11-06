const { test } = require('node:test')
const assert = require('node:assert')

const {
  CAMPOS_EDITABLES,
  LARGO_MAXIMO_NOTAS,
  esFechaIso,
  validarCambioDeMovimiento,
  unirCamposEditados,
  fueEditadoAMano,
} = require('../ediciones')

test('un cambio de monto trae el formateado recalculado', () => {
  const r = validarCambioDeMovimiento({ monto: 50000 })

  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.campos.monto, 50000)
  assert.strictEqual(r.campos.montoFormateado, '$50.000')
  assert.deepStrictEqual(r.editados, ['monto'])
})

test('el formateado no se acepta del cliente: es un derivado del monto', () => {
  const r = validarCambioDeMovimiento({ monto: 50000, montoFormateado: '$1' })

  assert.strictEqual(r.ok, false)
  assert.match(r.errores[0], /no se pueden editar: montoFormateado/)
})

test('un monto que no es entero mayor que 0 se rechaza', () => {
  for (const monto of [0, -1, 1.5, '50000', null]) {
    const r = validarCambioDeMovimiento({ monto })
    assert.strictEqual(r.ok, false, `aceptó ${monto}`)
  }
})

test('elegir la categoría a mano la marca como venida del campo, no del item', () => {
  const r = validarCambioDeMovimiento({ categoria: 'Transporte' })

  assert.strictEqual(r.campos.categoria, 'Transporte')
  assert.strictEqual(r.campos.categoriaSrc, 'campo')
})

test('dejarlo sin categoría a mano queda como fuente ninguna', () => {
  const r = validarCambioDeMovimiento({ categoria: 'Sin categoría' })

  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.campos.categoriaSrc, 'ninguna')
})

test('una categoría fuera del catálogo se rechaza', () => {
  assert.strictEqual(validarCambioDeMovimiento({ categoria: 'Viajes' }).ok, false)
})

test('una fecha que no existe en el calendario se rechaza', () => {
  assert.strictEqual(esFechaIso('2026-02-31'), false)
  assert.strictEqual(esFechaIso('2026-2-3'), false)
  assert.strictEqual(esFechaIso('2026-02-28'), true)
  assert.strictEqual(validarCambioDeMovimiento({ fecha: '2026-02-31' }).ok, false)
})

test('vaciar la nota la borra, y se guarda null y no cadena vacía', () => {
  for (const notas of [null, '']) {
    const r = validarCambioDeMovimiento({ notas })
    assert.strictEqual(r.ok, true)
    assert.strictEqual(r.campos.notas, null)
    assert.deepStrictEqual(r.editados, ['notas'])
  }
})

test('una nota más larga que el tope se rechaza con el número en el mensaje', () => {
  const r = validarCambioDeMovimiento({ notas: 'x'.repeat(LARGO_MAXIMO_NOTAS + 1) })

  assert.strictEqual(r.ok, false)
  assert.match(r.errores[0], new RegExp(String(LARGO_MAXIMO_NOTAS)))
})

test('un item en blanco se rechaza: no es lo mismo que no mandarlo', () => {
  assert.strictEqual(validarCambioDeMovimiento({ item: '   ' }).ok, false)
  assert.strictEqual(validarCambioDeMovimiento({ item: '  pan  ' }).campos.item, 'pan')
})

test('un cuerpo sin ningún campo no es un cambio', () => {
  for (const cuerpo of [{}, null, [], 'nada']) {
    const r = validarCambioDeMovimiento(cuerpo)
    assert.strictEqual(r.ok, false, `aceptó ${JSON.stringify(cuerpo)}`)
  }
})

test('con un campo inválido no se guarda ninguno de los válidos', () => {
  const r = validarCambioDeMovimiento({ monto: 50000, metodo: 'BTC' })

  assert.strictEqual(r.ok, false)
  assert.deepStrictEqual(r.campos, {})
  assert.deepStrictEqual(r.editados, [])
})

test('los campos editados se acumulan y quedan en el orden del catálogo', () => {
  assert.deepStrictEqual(unirCamposEditados(['notas', 'monto'], ['categoria']), [
    'monto',
    'categoria',
    'notas',
  ])
  // Editar dos veces lo mismo no lo duplica.
  assert.deepStrictEqual(unirCamposEditados(['monto'], ['monto']), ['monto'])
  assert.deepStrictEqual(unirCamposEditados(undefined, ['item']), ['item'])
})

test('fueEditadoAMano contesta por campo y aguanta una fila sin la columna', () => {
  assert.strictEqual(fueEditadoAMano({ campos_editados: ['categoria'] }, 'categoria'), true)
  assert.strictEqual(fueEditadoAMano({ campos_editados: ['monto'] }, 'categoria'), false)
  assert.strictEqual(fueEditadoAMano({}, 'categoria'), false)
  assert.strictEqual(fueEditadoAMano(null, 'categoria'), false)
})

test('el catálogo de campos editables es el que conoce la pantalla', () => {
  assert.deepStrictEqual([...CAMPOS_EDITABLES], [
    'monto',
    'item',
    'categoria',
    'metodo',
    'fecha',
    'notas',
  ])
})
