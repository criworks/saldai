/**
 * Categorizer
 * Mapea keywords a categorías. Primera categoría del orden de prioridad que
 * coincide gana.
 *
 * El match es por palabra completa y sin acentos: "gaseosa" no cuenta como
 * "gas" ni "barbería" como "bar", y "cafe" encuentra "café".
 */

const CATEGORIAS = {
  Básicos: [
    "básicos", "basicos", "arriendo", "renta", "gastos comunes", "comunidad", "luz", "electricidad",
    "agua", "gas", "metrogas", "lipigas", "abastible", "cuenta", "dividendo"
  ],
  Suscripciones: [
    "suscripciones", "suscripción", "suscripcion", "spotify", "netflix", "amazon prime", "hbo", "disney", "youtube premium",
    "apple", "apple tv", "appletv", "icloud", "notion", "chatgpt", "openai"
  ],
  Mercado: [
    "mercado", "supermercado", "jumbo", "lider", "líder", "santa isabel", "unimarc", "tottus", "acuenta",
    "panaderia", "panadería", "verduleria", "verdulería",
    "feria", "carniceria", "carnicería", "almacen", "almacén"
  ],
  Inversión: [
    "inversión", "inversion", "ahorro", "ropa", "zapatillas", "zapatos", "audifono", "audífono",
    "auricular", "audifonos", "audífonos", "earphone", "headphone",
    "electronico", "electrónico", "utensilio", "cocina", "impuesto",
    "sii", "contribuciones", "seguro", "herramienta", "libro", "curso",
    "tecnologia", "tecnología", "computador", "celular", "tablet"
  ],
  Ocio: [
    "ocio", "entretenimiento", "bar", "bares", "cine", "teatro", "concierto", "evento", "fiesta",
    "alfajor", "dulce", "snack", "helado", "copa", "trago", "cerveza",
    "vino", "pub", "discoteca", "karaoke", "juego", "videojuego", "steam",
    "café", "cafe", "cafeteria", "cafetería", "almuerzo", "comida", "cena",
    "desayuno", "restaurante", "restaurant", "sushi", "pizza", "hamburgesa",
    "empanada", "sandwich", "lunch"
  ],
  Delivery: [
    "delivery", "uber eats", "ubereats", "rappi", "pedidosya", "pedidos ya",
    "domicilio", "despacho", "a domicilio"
  ],
  Transporte: [
    "transporte", "uber", "cabify", "bolt", "indriver", "taxi", "metro", "bip",
    "microbus", "micro", "bus", "combustible", "bencina",
    "gasolina", "estacionamiento", "peaje", "tren"
  ],
};

// Orden importa: Delivery antes de Transporte para que "uber eats" no caiga en
// Transporte, y Mercado antes de Básicos para que "acuenta" no caiga en "cuenta".
const ORDEN_PRIORIDAD = [
  "Delivery",
  "Suscripciones",
  "Mercado",
  "Básicos",
  "Inversión",
  "Ocio",
  "Transporte",
];

const SIN_CATEGORIA = "Sin categoría";

/** Minúsculas y sin acentos, para que "Café" y "cafe" se comparen igual. */
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Las keywords se precompilan una vez: el servidor categoriza en cada gasto y
 * armar los regex en caliente sería trabajo repetido.
 *
 * El sufijo opcional "s"/"es" acepta el plural sin tener que listarlo:
 * "auriculares" matchea "auricular", pero "gaseosa" sigue sin matchear "gas".
 */
const PATRONES = ORDEN_PRIORIDAD.map((categoria) => ({
  categoria,
  regex: CATEGORIAS[categoria].map(
    (kw) => new RegExp(`(^|[^a-z0-9])${escaparRegex(normalizar(kw))}(?:es|s)?($|[^a-z0-9])`)
  ),
}));

/**
 * @param {string} descripcion
 * @returns {string} categoría detectada o "Sin categoría"
 */
function categorizar(descripcion) {
  const texto = normalizar(descripcion || "");
  if (!texto.trim()) return SIN_CATEGORIA;

  for (const { categoria, regex } of PATRONES) {
    if (regex.some((re) => re.test(texto))) return categoria;
  }

  return SIN_CATEGORIA;
}

module.exports = { categorizar, CATEGORIAS, SIN_CATEGORIA };
