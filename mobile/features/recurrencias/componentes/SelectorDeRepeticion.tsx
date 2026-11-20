import type { DiaDeLaSemana, Frecuencia, Repeticion, SemanaDelMes } from '@saldai/core'
import React from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  DIAS_EN_ORDEN,
  ETIQUETAS_SEMANAS,
  INICIALES_DIAS,
  MESES,
  NOMBRES_DIAS,
  NOMBRES_MESES,
  reglaEfectiva,
  SEMANAS_DEL_MES,
} from '../frecuencias'

export interface SelectorDeRepeticionProps {
  frecuencia: Frecuencia
  /** La regla elegida. Cada campo en `null` es "derivá del ancla". */
  repeticion: Repeticion
  /** La fecha del plan: de ahí sale el default de cada campo. */
  ancla: string | null | undefined
  onCambiar: (repeticion: Repeticion) => void
  ocupado?: boolean
}

/** Un chip de los de siempre: seleccionado en negativo, el resto en secundario. */
function Chip({
  etiqueta,
  seleccionado,
  onPress,
  accessibilityLabel,
  ocupado,
}: {
  etiqueta: string
  seleccionado: boolean
  onPress: () => void
  accessibilityLabel: string
  ocupado?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={ocupado}
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionado }}
      accessibilityLabel={accessibilityLabel}
      className={`px-md py-sm rounded-full active:opacity-80 ${
        seleccionado ? 'bg-foreground' : 'bg-secondary'
      } ${ocupado ? 'opacity-50' : ''}`}
    >
      <Text
        className={`text-base font-medium ${
          seleccionado ? 'text-background' : 'text-muted-foreground'
        }`}
      >
        {etiqueta}
      </Text>
    </Pressable>
  )
}

function Fila({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View className="flex-col gap-sm w-full pt-lg">
      <Text className="text-muted-foreground text-base font-normal">{titulo}</Text>
      <View className="flex-row flex-wrap gap-sm">{children}</View>
    </View>
  )
}

/**
 * Qué día del período propone el plan.
 *
 * **El ancla es el default de cada campo, no la única fuente.** Lo que está sin
 * elegir se muestra ya seleccionado con lo que sale del ancla
 * (`reglaEfectiva`), porque un selector que arranca vacío le hace creer al
 * usuario que no hay ninguna regla cuando sí la hay: la de siempre. Lo que
 * viaja a la API es la regla elegida, que es la que el core valida.
 *
 * Las dos formas del día en un plan mensual o anual —"el 2" y "el último
 * viernes"— son **excluyentes**, y elegir una limpia la otra en vez de dejar
 * las dos escritas: el core y un check de la tabla las rechazan juntas, así que
 * dejarlas sería un 400 al guardar en vez de un chip que se apaga.
 */
export function SelectorDeRepeticion({
  frecuencia,
  repeticion,
  ancla,
  onCambiar,
  ocupado,
}: SelectorDeRepeticionProps) {
  const regla = reglaEfectiva(frecuencia, repeticion, ancla)
  const porDiaDeLaSemana = regla.diaDeLaSemana !== null

  const cambiar = (campos: Partial<Repeticion>) => onCambiar({ ...regla, ...campos })

  const elegirDiaDelMes = (dia: number) =>
    cambiar({ diaDelMes: dia, diaDeLaSemana: null, semanaDelMes: null })

  const elegirDiaDeLaSemana = (dia: DiaDeLaSemana) =>
    frecuencia === 'semanal'
      ? cambiar({ diaDeLaSemana: dia })
      : cambiar({ diaDeLaSemana: dia, semanaDelMes: regla.semanaDelMes ?? 1, diaDelMes: null })

  const elegirSemana = (semana: SemanaDelMes) =>
    cambiar({
      semanaDelMes: semana,
      // Sin día de la semana la semana del mes no significa nada, así que
      // elegirla pasa a esa forma con el día que el ancla ya daba.
      diaDeLaSemana: regla.diaDeLaSemana ?? diaDelAncla(ancla),
      diaDelMes: null,
    })

  if (frecuencia === 'semanal') {
    return (
      <Fila titulo="Qué día">
        {DIAS_EN_ORDEN.map((dia) => (
          <Chip
            key={dia}
            etiqueta={INICIALES_DIAS[dia]}
            seleccionado={regla.diaDeLaSemana === dia}
            onPress={() => elegirDiaDeLaSemana(dia)}
            accessibilityLabel={NOMBRES_DIAS[dia]}
            ocupado={ocupado}
          />
        ))}
      </Fila>
    )
  }

  return (
    <View className="flex-col w-full">
      {frecuencia === 'anual' && (
        <Fila titulo="Qué mes">
          {MESES.map((mes) => (
            <Chip
              key={mes}
              etiqueta={NOMBRES_MESES[mes].slice(0, 3)}
              seleccionado={regla.mesDelAnio === mes}
              onPress={() => cambiar({ mesDelAnio: mes })}
              accessibilityLabel={NOMBRES_MESES[mes]}
              ocupado={ocupado}
            />
          ))}
        </Fila>
      )}

      <Fila titulo="Qué día del mes">
        {DIAS_DEL_MES.map((dia) => (
          <Chip
            key={dia}
            etiqueta={String(dia)}
            seleccionado={!porDiaDeLaSemana && regla.diaDelMes === dia}
            onPress={() => elegirDiaDelMes(dia)}
            accessibilityLabel={`Día ${dia}`}
            ocupado={ocupado}
          />
        ))}
      </Fila>

      <Fila titulo="O un día de la semana">
        {SEMANAS_DEL_MES.map((semana) => (
          <Chip
            key={semana}
            etiqueta={ETIQUETAS_SEMANAS[semana]}
            seleccionado={porDiaDeLaSemana && regla.semanaDelMes === semana}
            onPress={() => elegirSemana(semana)}
            accessibilityLabel={`${ETIQUETAS_SEMANAS[semana]} semana`}
            ocupado={ocupado}
          />
        ))}
      </Fila>

      <View className="flex-row flex-wrap gap-sm pt-sm">
        {DIAS_EN_ORDEN.map((dia) => (
          <Chip
            key={dia}
            etiqueta={INICIALES_DIAS[dia]}
            seleccionado={porDiaDeLaSemana && regla.diaDeLaSemana === dia}
            onPress={() => elegirDiaDeLaSemana(dia)}
            accessibilityLabel={NOMBRES_DIAS[dia]}
            ocupado={ocupado}
          />
        ))}
      </View>
    </View>
  )
}

/** 1 a 31. El 31 en un mes de 30 cae el último día, igual que un ancla el 31. */
const DIAS_DEL_MES = Array.from({ length: 31 }, (_, i) => i + 1)

/** El día de la semana del ancla, para cuando se elige la semana primero. */
function diaDelAncla(ancla: string | null | undefined): DiaDeLaSemana {
  return reglaEfectiva('semanal', null, ancla).diaDeLaSemana ?? 1
}
