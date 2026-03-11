import { KeyboardTypeOptions } from 'react-native'
export { categoryColor, COLORES_CAT, EMOJIS_CAT } from '@expenses/ui/tokens'

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

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
