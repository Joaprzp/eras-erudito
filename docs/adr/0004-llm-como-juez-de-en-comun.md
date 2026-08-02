# Delegar el Fallo de En Común a un LLM cuando el Anfitrión lo pide

En Común es la única Categoría de pregunta cuyo resultado no se puede calcular: la respuesta es texto libre y hay que juzgar si captura la característica compartida. Hasta ahora fallaba siempre el Anfitrión, que además es un Equipo en juego, y eso lo pone en una posición incómoda cuando la ronda es reñida o cuando él mismo es el Retador. Incorporamos un Juez —un llamado a Claude Sonnet que devuelve el Fallo y su fundamento— que el Anfitrión puede convocar botón mediante.

El Juez convive con el Fallo manual en lugar de reemplazarlo: los tres botones del Anfitrión siguen disponibles incluso mientras el Juez delibera, quien resuelva primero manda, y si la llamada falla la ronda vuelve a quedar en manos del Anfitrión. La Partida nunca queda bloqueada esperando una respuesta externa.

## Considered Options

Comparación difusa de cadenas o similitud por embeddings contra la respuesta de la Tarjeta: descartadas porque las respuestas aceptables suelen ser paráfrasis o formulaciones más generales que no se parecen léxicamente a la solución impresa, que es justamente el caso donde el Anfitrión necesita ayuda. Dejarlo solamente manual: es el statu quo que motivó el pedido.

## Consequences

Introduce la primera dependencia de un servicio externo en una Partida y una credencial que hay que administrar (`ANTHROPIC_API_KEY` como variable de entorno de Convex). Cada Fallo delegado envía a Anthropic las pistas de la Tarjeta, su solución y las respuestas de los dos Equipos: el Mazo es privado y transcrito de tarjetas físicas, así que esto es una salida deliberada de ese material fuera del entorno del MVP, acotada a las Tarjetas efectivamente jugadas y sin datos personales más allá del nombre de Equipo elegido para la Sala.
