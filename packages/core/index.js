/**
 * @saldai/core — el dominio de Saldai, sin framework y sin red.
 *
 * Lo consumen la API, mobile y web, para que un gasto signifique lo mismo en
 * las tres. Los submódulos también se pueden importar sueltos:
 * `require('@saldai/core/categorias')`.
 */

module.exports = {
  ...require('./categorias'),
  ...require('./metodos'),
  ...require('./dinero'),
  ...require('./fechas'),
  ...require('./fechas-humanas'),
  ...require('./parser'),
}
