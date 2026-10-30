import { KeyboardTypeOptions } from 'react-native'

// El catálogo de categorías y los nombres de los meses son dominio y viven en
// @saldai/core; acá solo se reexportan para que las pantallas tengan un solo
// import. El color y el emoji de cada categoría son diseño y vienen de los
// tokens.
export { MESES, NOMBRES_CATEGORIAS, SIN_CATEGORIA } from '@saldai/core'
export {
  categoryColor,
  categoryEmoji,
  colors,
  COLORES_CAT,
  EMOJIS_CAT,
  withAlpha,
} from '@saldai/ui/tokens'

export type CampoClave = 'monto' | 'item' | 'categoria' | 'fecha'

export const CAMPOS_CAPTURA: {
  key: CampoClave
  placeholder: string
  keyboardType: KeyboardTypeOptions
}[] = [
  { key: 'monto',     placeholder: 'monto',     keyboardType: 'numeric'  },
  { key: 'item',      placeholder: 'qué',        keyboardType: 'default'  },
  { key: 'categoria', placeholder: 'categoría',  keyboardType: 'default'  },
  { key: 'fecha',     placeholder: 'cuándo',     keyboardType: 'default'  },
]
