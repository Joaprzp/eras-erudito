# Especificación del MVP — Eras Erudito

## Propósito

Eras Erudito es una adaptación web privada de *El Erudito* para partidas presenciales de dos a cuatro Equipos. Cada Equipo juega desde un teléfono y una Pantalla companion muestra la información compartida. El MVP debe permitir completar una Partida de punta a punta y obtener feedback cualitativo de pruebas familiares.

Las reglas y términos canónicos están en [`CONTEXT.md`](../CONTEXT.md). Las decisiones arquitectónicas están en [`docs/adr/`](./adr/).

## Límites del MVP

Incluye:

- Sala efímera, privada y multi-dispositivo.
- Tablero propio con economía, monedas, apuestas y condición de victoria.
- Las cuatro Categorías de pregunta y sus modos de respuesta móviles.
- Tablero y mazo configurados de manera aleatoria y balanceada al iniciar una Partida.
- Resultados y métricas visibles durante la Partida, sin persistencia posterior.
- Despliegue privado para probar desde teléfonos reales y companion.

Queda fuera:

- Cuentas, perfiles, avatares, panel de administración e historial.
- Tarjetas de suerte y pasadizos.
- Analíticas persistentes y exportación de resultados.
- Arte, tipografías o reconstrucción literal del juego físico.

## Sala y acceso

1. La Pantalla companion crea una Sala y muestra un código y QR.
2. Cada Equipo entra desde su teléfono, elige nombre y un color único.
3. El primer Equipo es el Anfitrión; puede quitar entradas erróneas. Los Equipos pueden abandonar o editar nombre/color mientras la Sala espera.
4. El Anfitrión puede iniciar con dos, tres o cuatro Equipos. El orden de ingreso define la rotación y el Anfitrión es el primer Retador.
5. Al iniciar, la Sala se cierra: no entran, salen ni sustituyen Equipos. Una recarga o corte breve recupera el mismo Equipo desde el mismo navegador.

No hay cuentas. La Pantalla companion y cada Equipo reciben una credencial aleatoria no adivinable, limitada a la vida de esa Sala. El código/QR permite encontrar la Sala; la credencial autoriza las acciones del dispositivo.

## Tablero de prototipo

- Recorrido en forma de S y de un solo sentido.
- 54 casilleros: **Inicio** y 53 casilleros de pregunta.
- Siete de los 53 casilleros de pregunta también están marcados como **E** de compra.
- Al iniciar la Partida se genera y fija una configuración balanceada:
  - cada Categoría recibe al menos 13 casilleros y una categoría recibe el decimocuarto;
  - los siete marcadores E se distribuyen entre los casilleros de pregunta;
  - los topes de Apuesta de $100 a $500 se distribuyen de forma equilibrada.

La distribución exacta de cada tope se podrá calibrar tras las primeras pruebas, sin cambiar las reglas de generación balanceada.

## Economía y victoria

- Cada Equipo comienza con **$2000**.
- Una Apuesta es un múltiplo de **$100**, con mínimo de **$100**.
- El máximo efectivo es el menor entre el tope del casillero y el saldo de todos los Equipos que deban aportar.
- Una Moneda cuesta **$1000** en un casillero E.
- Gana de inmediato quien obtiene su cuarta Moneda. La Partida también termina si queda un único Equipo activo.
- Si un Equipo no puede aportar $100 cuando debe hacerlo, vende una Moneda por $1000. Si no tiene saldo ni Monedas, queda eliminado.
- Al cruzar Inicio, el Equipo recibe una Moneda y cobra $500 de cada rival. Si cae exactamente en Inicio, también elige Categoría y puede apostar hasta $500.
- Al llegar a E, el Equipo puede comprar una Moneda una sola vez, antes o después de la ronda, incluso si pierde. Ese derecho no se repite si inicia allí su próximo Turno.

## Turnos y rondas

1. El Retador pulsa tirar en su teléfono; el sistema genera dos dados, los anima en el companion y mueve el peón.
2. Se aplican los efectos de Inicio y la oportunidad de compra E si corresponde.
3. Salvo en Aproximación, el Retador elige un Retado y define la Apuesta.
4. El sistema sortea una Tarjeta de la Categoría del casillero.
5. Los Equipos requeridos responden en privado y confirman su Respuesta final.
6. El companion revela las respuestas, solución y resultado; después muestra métricas acumuladas de acierto y Ritmo de respuesta.
7. Si gana el Retador, continúa hasta un máximo de tres rondas ganadas consecutivas. Al tercer triunfo consecutivo, el Turno rota al siguiente Equipo. Si gana el Retado, el Turno termina y rota al siguiente Equipo.

Durante la espera, el companion solo muestra cuántos Equipos ya confirmaron: nunca respuestas, solución ni ritmo individual antes de la revelación.

## Categorías de pregunta

### Secuencia

- Cinco elementos a ordenar.
- Entrada móvil: arrastrar y soltar, con controles alternativos para subir/bajar.
- Corrección automática por cantidad de posiciones correctas.
- Ante empate, gana quien confirmó primero.

### Asociación

- Dos columnas de cinco elementos que se conectan uno a uno.
- Entrada móvil: tocar un elemento de la primera columna y luego su pareja de la segunda; se puede corregir antes de confirmar.
- Corrección automática por cantidad de asociaciones correctas.
- Ante empate, gana quien confirmó primero.

### En Común

- Cinco elementos para los que se identifica una característica compartida.
- Entrada móvil: texto breve.
- Tras revelar las respuestas en el companion, el Anfitrión decide desde su teléfono: gana Retador, gana Retado o Empate.
- Ante Empate —incluido el caso de ninguna respuesta aceptable— se devuelven las Apuestas y termina el Turno del Retador.
- El orden de confirmación es información de apoyo para que el Anfitrión resuelva respuestas igualmente defendibles.

### Aproximación

- Todos los Equipos activos aportan y responden una cifra.
- Entrada móvil: campo numérico con unidad opcional definida por la Tarjeta.
- La aplicación calcula la cercanía a la respuesta correcta.
- Empates exactos dividen el Pozo; cualquier resto se conserva para la próxima Aproximación.

## Mazo inicial

- Mínimo de 16 Tarjetas por Categoría: 64 en total.
- El primer mazo se transcribe desde tarjetas físicas del usuario y se mantiene solamente en el entorno privado del MVP.
- Una Tarjeta no se repite dentro de la misma Partida. Si se agota una Categoría, se recicla únicamente esa Categoría y el companion lo anuncia.
- Para una publicación futura, las tarjetas transcritas deben ser reemplazadas por contenido propio o con licencia adecuada.

## Pantallas

### Companion

- Crear Sala, código y QR.
- Sala de espera, Equipos y controles del Anfitrión.
- Tablero, peones, orden, saldos, Monedas, Tiradas y estado de la ronda.
- Consigna pública, contador de Respuestas finales y revelación.
- Métricas acumuladas tras cada ronda.
- Final de Partida con ganador, saldos, Monedas y métricas, hasta que el Anfitrión cierre la Sala.

### Teléfono de Equipo

- Entrar a Sala y configurar nombre/color.
- Estado de espera y de Turno.
- Tirada, elección de Retado y Apuesta cuando corresponde.
- Respuesta privada por Categoría y confirmación final.
- En el teléfono del Anfitrión, control de inicio/cierre y resolución de En Común.

## Arquitectura

- **Runtime y tooling:** Bun exclusivamente.
- **Frontend:** React 19, TypeScript y Vite.
- **Rutas:** TanStack Router con rutas basadas en archivos.
- **Backend y estado autoritativo:** Convex, incluidas mutaciones transaccionales que validen cada transición de la Partida.
- **Estado local:** Zustand únicamente para credenciales de sesión y preferencia de tema.
- **Estilos:** Tailwind CSS v4, tokens CSS/OKLCH, Base UI, CVA, clsx y tailwind-merge.
- **Deploy privado:** Cloudflare Workers Static Assets para frontend y Convex desplegado por separado.
- **Calidad:** ESLint, TypeScript y validación de lint, typecheck y build sin `--noEmit` por compatibilidad con Convex.

Antes de instalar, se validarán las últimas versiones estables compatibles de todas las dependencias.

## Validación del MVP

La primera prueba debe usar una Pantalla companion y al menos dos teléfonos en un despliegue privado. El objetivo es terminar una Partida y recoger feedback cualitativo sobre:

- claridad del flujo de sala;
- ritmo de turnos y apuestas;
- comprensión de cada modo de respuesta;
- balance de dinero, Monedas y tablero;
- utilidad de las métricas visibles;
- fricción de conexión y recuperación.

Al cerrar la Sala se eliminan resultado, métricas y credenciales; el feedback se registra manualmente fuera de la aplicación.
