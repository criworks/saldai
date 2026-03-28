import { Tabs } from 'expo-router';
import { GradientFooter } from '../../components/ui/GradientFooter';
import { FilterProvider } from '../../contexts/FilterContext';
import { GastosProvider } from '../../contexts/GastosContext';

export default function TabLayout() {
  return (
    <FilterProvider>
      <GastosProvider>
        <Tabs
          // Hacemos que React Navigation use nuestro componente en lugar de su barra nativa
          tabBar={(props) => <GradientFooter {...props} />}
          screenOptions={{
            headerShown: false,
            // Al usar un Custom Tab Bar con posición absoluta (transparente),
            // a veces es útil asegurarse de que el fondo subyacente de la página
            // ocupe el espacio sin ser empujado.
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="categorias" />
          <Tabs.Screen name="configuraciones" />
          <Tabs.Screen name="captura" />
          <Tabs.Screen name="cuenta" options={{ href: null }} />
        </Tabs>
      </GastosProvider>
    </FilterProvider>
  )
}
