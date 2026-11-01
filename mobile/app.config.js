// Variantes de la app.
//
// Android identifica una app por su `package`, así que dos builds que comparten
// package son la misma app para el sistema y una desinstala a la otra. Con esto
// el development build tiene identidad propia y convive en el teléfono con el
// APK de `preview`, que es el que funciona sin el dev server.
//
// La variante la elige `APP_VARIANT`, que declaran los perfiles de `eas.json` y
// los scripts de `package.json`. Sin ella se asume producción, que es lo que
// conviene por defecto: una variable que falta no debería renombrar la app.
//
// `preview` y `production` comparten identidad a propósito: el APK de preview es
// la app de verdad, solo que repartida a mano.

const PAQUETE = 'com.crirun.saldai';

module.exports = ({ config }) => {
  const esDev = process.env.APP_VARIANT === 'development';
  const identificador = esDev ? `${PAQUETE}.dev` : PAQUETE;

  return {
    ...config,
    name: esDev ? 'Saldai (Dev)' : 'Saldai',
    // Esquemas distintos para que un enlace `saldai://` no abra un selector
    // entre las dos apps instaladas.
    scheme: esDev ? 'saldai-dev' : 'saldai',
    ios: {
      ...config.ios,
      bundleIdentifier: identificador,
    },
    android: {
      ...config.android,
      package: identificador,
      adaptiveIcon: {
        ...config.android.adaptiveIcon,
        // El icono adaptativo de Android son dos piezas, la imagen de adelante
        // y un color de fondo. Cambiar solo el fondo distingue las dos apps en
        // la grilla sin un asset nuevo.
        backgroundColor: esDev ? '#262A35' : '#ffffff',
      },
    },
  };
};
