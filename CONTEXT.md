# Eras Erudito

La adaptación web jugable de *El Erudito*, un juego de cultura general de Maldón. Este contexto describe el lenguaje del juego digital, no su implementación.

## Language

**El Erudito**:
El juego de cultura general cuyo objetivo es obtener cuatro monedas del mismo nombre antes que los equipos rivales.
_Avoid_: trivia genérica, quiz

**Eras Erudito**:
El producto digital privado que adapta la dinámica de El Erudito para partidas presenciales multi-dispositivo.
_Avoid_: nombre temporal del proyecto

**Versión Familiar**:
Modalidad en la que el equipo retador y el equipo retado responden en paralelo; gana quien acumula más aciertos o, cuando corresponda, responde correctamente en menos tiempo. No impone un límite de tiempo a las respuestas ni a la Partida.
_Avoid_: reglas clásicas

**Partida presencial multi-dispositivo**:
Una partida en la que los participantes están físicamente juntos, pero se conectan desde dispositivos individuales para recibir interacción privada y rápida.
_Avoid_: partida de pantalla compartida, partida remota

**Pantalla companion**:
La pantalla compartida que muestra el estado común de una Partida presencial multi-dispositivo, incluidas las tarjetas o consignas que deben ser visibles para todos.
_Avoid_: dispositivo de respuesta

**Equipo**:
El grupo de una o más personas que compite como una única parte en una partida. El MVP admite entre dos y cuatro Equipos, identificados por un nombre y un color único.
_Avoid_: jugador individual

**Sala**:
El espacio temporal previo a una Partida presencial multi-dispositivo, al que los Equipos entran mediante un código o código QR y donde esperan su inicio. Mientras está en espera, los Equipos pueden abandonar o ajustar su identidad y el Anfitrión puede quitar entradas erróneas.
_Avoid_: cuenta, perfil

**Anfitrión**:
El primer Equipo que entra a una Sala, controla el inicio y la finalización de su Partida, y actúa como primer Retador.
_Avoid_: administrador permanente

**Partida efímera**:
Una Partida cuyos participantes y estado solo existen mientras está activa y se eliminan cuando el Anfitrión la finaliza.
_Avoid_: historial de juego, perfil persistente

**Final de Partida**:
El estado temporal al que entra una Partida cuando un Equipo logra su cuarta Moneda o queda un único Equipo activo. Muestra el resultado antes de que el Anfitrión elimine la Sala.

**Sala cerrada**:
El estado de una Sala después de iniciar la Partida, en el que su conjunto de Equipos y su orden de ingreso quedan fijos. Un Equipo desconectado puede recuperar su plaza, pero no se admiten ni retiran Equipos.
_Avoid_: sala de espera

**Tablero**:
El recorrido de casilleros que determina la Categoría de pregunta y el límite de la Apuesta de un Equipo tras mover sus dados. En el MVP, la configuración de categorías y límites se genera al iniciar una Partida y no cambia durante ella.

**Tirada**:
El resultado de dos dados que el Retador inicia desde su dispositivo. Determina cuántos Casilleros avanza su Equipo en el único sentido del Tablero.

**Apuesta**:
El importe que el Equipo retador elige arriesgar antes de responder una pregunta, dentro del límite que marca su Casillero y del saldo disponible de cada Equipo que debe aportarlo. En el MVP es un múltiplo de $100 de al menos $100.

**Pozo**:
El dinero reunido por los Equipos que participan de una Apuesta y que recibe el ganador de la pregunta.

**Saldo inicial**:
Los $2000 con los que cada Equipo comienza una Partida.

**Precio de Moneda**:
Los $1000 que un Equipo paga para comprar una Moneda al llegar a un Casillero de compra.

**Insolvencia**:
La situación de un Equipo que no puede aportar el mínimo de $100 cuando corresponde. Puede vender una Moneda por $1000; si no posee dinero ni Monedas, queda eliminado de la Partida antes de formar el Pozo.

**Moneda**:
Una moneda El Erudito. Un Equipo gana la Partida en el instante en que obtiene su cuarta Moneda. La Partida también termina si solo queda un Equipo activo.

**Categoría de pregunta**:
Una de las cuatro formas de consigna que puede determinar un Casillero: Secuencia, Asociación, En Común o Aproximación.

**Secuencia**:
Una Categoría de pregunta en la que se ordenan cinco elementos con un criterio indicado. En la Versión Familiar gana el Equipo con más posiciones correctas y, ante empate, quien emitió antes su Respuesta final.

**Asociación**:
Una Categoría de pregunta en la que se relacionan, uno a uno, los cinco elementos de una columna con los de otra. En la Versión Familiar gana el Equipo con más asociaciones correctas y, ante empate, quien emitió antes su Respuesta final.

**En Común**:
Una Categoría de pregunta en la que se identifica la característica compartida por cinco elementos. Tras revelar las respuestas en la Pantalla companion, el Anfitrión decide desde su dispositivo si gana el Retador, el Retado o hay Empate. Ante Empate se restituyen las Apuestas y termina el Turno del Retador; el orden de Respuesta final puede ayudarle a elegir entre respuestas aceptables.

**Aproximación**:
Una Categoría de pregunta en la que todos los Equipos activos responden una cifra y aportan al Pozo. Gana quien quede más cerca de la respuesta correcta; los empates exactos dividen el Pozo y cualquier resto se conserva para la próxima Aproximación.

**Tarjeta de pregunta**:
Una consigna de una Categoría de pregunta con su respuesta o criterio de corrección.
_Avoid_: pregunta sin validar

**Mazo**:
El conjunto de Tarjetas de pregunta disponibles para una Partida.

**Sorteo de Tarjeta**:
La selección aleatoria de una Tarjeta disponible del Mazo de la Categoría que indica el Casillero actual.

**Respuesta final**:
La respuesta que un Equipo confirma para una Tarjeta de pregunta. Al confirmarse queda bloqueada y privada hasta la revelación; su orden y momento de envío sirven como información de desempate y rendimiento, sin imponer un límite de tiempo.

**Ritmo de respuesta**:
La rapidez relativa con la que los Equipos emiten sus Respuestas finales durante una Partida. Se muestra en la Pantalla companion después de resolver cada ronda y puede resolver desempates, pero no limita el juego.

**Retador**:
El Equipo que inicia una ronda, elige a su Retado y define la Apuesta antes de que se revele la Tarjeta de pregunta.

**Retado**:
El Equipo elegido por el Retador para competir en una ronda que no es de Aproximación.

**Turno**:
La secuencia de hasta tres rondas consecutivas que juega un Retador. Tras una ronda ganada, puede continuar; después de la tercera ronda ganada, la iniciativa pasa al siguiente Equipo. Si gana el Retado, el Turno termina y la iniciativa pasa al siguiente Equipo.

**Inicio**:
El Casillero que, al ser cruzado, entrega una Moneda al Equipo que lo cruza y le permite cobrar $500 de cada rival. Si el Equipo cae en Inicio, también puede elegir la Categoría de pregunta y apostar hasta $500.

**Casillero de compra**:
El Casillero E en el que un Equipo puede comprar una Moneda por $1000 una sola vez al llegar, antes o después de la ronda. El derecho no reaparece al iniciar un turno posterior desde ese Casillero.
