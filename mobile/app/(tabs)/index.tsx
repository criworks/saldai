import { formatearMonto } from '@saldai/core'
import React, { useMemo, useState } from 'react'
import {
  RefreshControl,
  SectionList,
  Text,
  Pressable,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, SIN_CATEGORIA } from '@/constants/theme'
import { EditorDeMovimiento, EncabezadoDelMes, ExpenseItem, useFilter, useMovimientos, Movimiento } from '@/features/movimientos'
import { usePreferencias } from '@/features/perfil'
import { ConfirmarPropuesta, ListaDePropuestas, usePropuestas } from '@/features/recurrencias'
import { Alert } from '@/components/ui/Alert'
import type { PropuestaPendiente } from '@saldai/core'

/**
 * `AAAA-MM-DD` a Date del día, en hora local.
 *
 * La columna es `date` y la API devuelve ISO, así que no hay más formatos que
 * atender; antes esto también aceptaba `DD/MM/AAAA`, que era el formato viejo
 * de la columna. Se arma con las partes y no con `new Date(iso)` porque esa
 * forma lo interpreta en UTC y en Chile corre el día para atrás.
 */
function fechaDelDia(iso: string): Date {
  const partes = iso?.split('-').map(Number)
  if (!partes || partes.length !== 3 || partes.some(Number.isNaN)) return new Date(0)

  const [anio, mes, dia] = partes
  return new Date(anio, mes - 1, dia)
}

/** El título de cada grupo: "Hoy", "Ayer" o "Jue 26". */
function tituloDelDia(dia: Date): string {
  if (isNaN(dia.getTime()) || dia.getTime() === 0) return 'Desconocido'

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)

  if (dia.getTime() === hoy.getTime()) return 'Hoy'
  if (dia.getTime() === ayer.getTime()) return 'Ayer'

  // El resto, abreviado y sin el punto que agrega la plataforma: "Jue 26".
  const formato = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric' })
  const texto = formato.format(dia).replace('.', '')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export default function DashboardScreen() {
  const {
    mes,
    datos,
    loading,
    refreshing,
    error,
    fetchMovimientos,
    totalMes,
  } = useMovimientos()

  // Las dos funciones conmutables del perfil: deciden si la fila del listado
  // muestra la burbuja de categoría y la de método.
  const { categoriasVisibles, metodosVisibles } = usePreferencias()

  // La categoría elegida en el footer. Si la función está apagada el filtro no
  // se aplica: el footer no muestra las burbujas para soltarlo, así que una
  // selección vieja dejaría el listado recortado sin forma de volver atrás.
  const { selectedCategory } = useFilter()
  const filtro = categoriasVisibles ? selectedCategory : null

  // El movimiento que se está editando. `null` tiene el editor cerrado; se
  // guarda el movimiento entero y no el id porque el editor abre con sus
  // valores, y buscarlo de nuevo en la lista lo dejaría vacío justo cuando un
  // refetch está en vuelo.
  const [enEdicion, setEnEdicion] = useState<Movimiento | null>(null)

  // Lo que las recurrencias proponen y el usuario todavía no decidió. Va en el
  // feed y no en una pantalla aparte porque es lo único del producto que le
  // pide algo: una propuesta pendiente es plata que ya salió y que todavía no
  // está contada en el total del mes.
  //
  // Con el filtro de categoría puesto no se muestran: el listado está recortado
  // a una categoría y las propuestas no son parte de ese recorte, así que
  // quedarían arriba de una lista que no las incluye.
  const { propuestas } = usePropuestas()
  const [propuestaElegida, setPropuestaElegida] = useState<PropuestaPendiente | null>(null)

  const insets = useSafeAreaInsets()
  const listPaddingBottom = 220 + insets.bottom;

  const movimientosVisibles = useMemo(() => {
    const delMes = datos?.datos ?? []
    if (!filtro) return delMes
    // `|| SIN_CATEGORIA` como en el desglose: un movimiento sin categoría cae en el
    // mismo grupo por el que se puede filtrar.
    return delMes.filter((g) => (g.categoria || SIN_CATEGORIA) === filtro)
  }, [datos?.datos, filtro])

  // Los movimientos agrupados por día, en el orden en que se muestran: el día más
  // nuevo primero. Es lo que SectionList espera como `sections`.
  const secciones = useMemo(() => {
    const conFecha = movimientosVisibles.map((g) => ({
      ...g,
      diaDelMovimiento: fechaDelDia(g.fecha),
    }))

    conFecha.sort((a, b) => b.diaDelMovimiento.getTime() - a.diaDelMovimiento.getTime())

    // Un Map y no un objeto: el Map mantiene el orden de inserción, que acá es
    // el orden en que se van a ver los grupos.
    const porDia = new Map<string, Movimiento[]>()
    for (const movimiento of conFecha) {
      const titulo = tituloDelDia(movimiento.diaDelMovimiento)
      if (!porDia.has(titulo)) porDia.set(titulo, [])
      porDia.get(titulo)!.push(movimiento)
    }

    return Array.from(porDia, ([titulo, data]) => ({ titulo, data }))
  }, [movimientosVisibles])

  // Con filtro, el total es el de lo que se ve. El total del mes arriba de una
  // lista recortada es un número que no corresponde a ninguna de sus filas.
  const totalMostrado = useMemo(
    () => (filtro ? movimientosVisibles.reduce((suma, g) => suma + g.monto, 0) : totalMes),
    [filtro, movimientosVisibles, totalMes],
  )

  const hayMovimientosEnElMes = !loading && !error && !!datos && datos.cantidad > 0
  const sinMovimientos = !loading && !error && (!datos || datos.cantidad === 0)
  // El mes tiene movimientos pero ninguno de la categoría elegida: es distinto de un
  // mes vacío y se dice distinto, porque lo que hay que hacer es soltar el
  // filtro y no registrar un movimiento.
  const sinResultados = hayMovimientosEnElMes && secciones.length === 0

  // Esqueleto de la primera carga de un mes que no se había visto. Con caché,
  // volver a un mes ya visto no pasa por acá.
  const esqueleto = (
    <View className="flex-col gap-xl w-full">
      {[1, 2].map((grupo) => (
        <View key={grupo} className="flex-col items-start w-full gap-xl">
          <View className="flex-col items-start w-full pt-xl">
            <View className="h-[22px] w-[80px] bg-secondary rounded-full" />
          </View>
          <View className="flex-col w-full gap-xl">
            {[1, 2, 3].map((item) => (
              <View key={item} className="flex-row items-center justify-between w-full">
                <View className="flex-row items-center gap-xs">
                  <View className="h-[34px] w-[90px] bg-secondary rounded-full" />
                </View>
                <View className="h-[22px] w-[60px] bg-secondary rounded-full" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )

  const vacio = loading ? (
    esqueleto
  ) : error ? (
    // Se muestra si la consulta falló incluso después de los reintentos.
    <View className="w-full flex-col pt-xl pb-24 items-center">
      <Text className="text-destructive text-body font-medium text-center">Error al cargar datos</Text>
      <Pressable onPress={() => fetchMovimientos()} className="mt-4 px-6 py-3 bg-secondary rounded-full active:opacity-80">
        <Text className="text-foreground font-medium">Reintentar</Text>
      </Pressable>
    </View>
  ) : sinResultados ? (
    <View className="w-full flex-col pt-xl items-start">
      <Text className="text-muted-foreground text-body font-medium">
        No hay movimientos de {filtro} este mes
      </Text>
    </View>
  ) : sinMovimientos ? (
    <View className="w-full flex-col pt-xl items-start">
      <Text className="text-muted-foreground text-body font-medium">No hay movimientos este mes</Text>
    </View>
  ) : null

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <Alert visible={!!error} message={error || ''} type="error" />

      {/*
        SectionList y no un ScrollView con todos los movimientos dibujados: la lista
        crece con cada mes y solo lo que está en pantalla se monta. Los títulos
        de día no quedan pegados arriba, porque el diseño los tiene scrolleando
        con los movimientos.
      */}
      <SectionList
        sections={secciones}
        keyExtractor={(movimiento) => String(movimiento.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: listPaddingBottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchMovimientos()}
            tintColor={colors.bgElevated}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="w-full flex-col">
            <EncabezadoDelMes mes={mes} total={totalMostrado} loading={loading} />
            {!filtro && (
              <ListaDePropuestas propuestas={propuestas} onElegir={setPropuestaElegida} />
            )}
          </View>
        }
        ListEmptyComponent={vacio}
        renderSectionHeader={({ section }) => (
          // El primer día va más arriba que los siguientes: entre dos grupos
          // el diseño deja el doble de aire que entre el encabezado y el
          // primer grupo, que antes salía de sumar dos gaps.
          <View
            className={`flex-col items-start w-full pb-xl ${
              secciones[0] === section ? 'pt-xl' : 'pt-4xl'
            }`}
          >
            <Text className="text-muted-foreground text-subtitle font-normal leading-[normal]">
              {section.titulo}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View className="h-xl" />}
        renderItem={({ item }) => (
          // Tocar la fila abre el editor. Un movimiento provisorio (el que se ve
          // mientras la API responde el alta) todavía no tiene id de Postgres,
          // así que no se puede editar: abrirlo mandaría un PATCH a un id que
          // no existe.
          <Pressable
            onPress={() => setEnEdicion(item)}
            disabled={String(item.id).startsWith('provisorio-')}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${item.item}`}
            className="active:opacity-60"
          >
            {/*
              La categoría y el método se pasan solo si el perfil los tiene
              prendidos. Es la misma cuenta que hace la captura para mostrar sus
              selectores: lo que se registra se ve, y lo que no se registra no
              aparece a medias en el listado.
            */}
            <ExpenseItem
              monto={formatearMonto(item.monto)}
              titulo={item.item}
              categoria={categoriasVisibles ? item.categoria : undefined}
              metodo={metodosVisibles ? item.metodo : undefined}
            />
          </Pressable>
        )}
      />

      <EditorDeMovimiento movimiento={enEdicion} onCerrar={() => setEnEdicion(null)} />

      <ConfirmarPropuesta
        propuesta={propuestaElegida}
        onCerrar={() => setPropuestaElegida(null)}
      />
    </SafeAreaView>
  )
}
