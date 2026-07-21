# Integración del Tablero 3D con Three.js

Fecha de investigación: 21 de julio de 2026.

## Decisión recomendada

Implementar el nuevo **Tablero** con `three` mediante **React Three Fiber (R3F) v9**, como una capa fina y sin agregar Drei en la primera iteración.

Esta opción encaja mejor que Three.js directo con el estado actual del proyecto:

- La aplicación ya usa React 19.2, `StrictMode` y Convex; el Tablero es una proyección de `lobby.board` y `lobby.teams`, no una simulación que deba ser autoritativa por sí misma.
- Los 54 Casilleros y hasta cuatro fichas se expresan naturalmente como componentes declarativos que R3F crea, actualiza y desmonta junto con React.
- `<Canvas>` ya integra renderer, cámara, resize, DPR, color, raycaster, render loop y fallback; R3F intenta liberar los objetos declarativos al desmontarlos. Three.js directo obligaría a implementar y probar cada una de esas responsabilidades de forma manual. [Canvas](https://r3f.docs.pmnd.rs/api/canvas), [ciclo de objetos y disposal](https://r3f.docs.pmnd.rs/api/objects).
- R3F 9 es la versión indicada para React 19. La versión estable verificada es `@react-three/fiber@9.6.1`; su paquete declara `react` y `react-dom >=19 <19.3` y `three >=0.156`, por lo que es compatible con React 19.2.7 del proyecto. [Introducción oficial](https://r3f.docs.pmnd.rs/getting-started/introduction), [package.json de R3F 9.6.1](https://github.com/pmndrs/react-three-fiber/blob/v9.6.1/packages/fiber/package.json).

Three.js directo sigue siendo viable para un único canvas acotado, y agrega menos abstracción. Sin embargo, en este caso esa ventaja no compensa duplicar de forma imperativa la sincronización que React ya resuelve. Reconsiderarlo solo si el prototipo demuestra que el reconciler impide una optimización concreta y medida, no por anticipación.

## Versiones e instalación verificadas

Al 21 de julio de 2026, las versiones estables publicadas son:

| Paquete | Versión | Uso |
|---|---:|---|
| `three` | `0.185.1` (r185) | motor y renderer |
| `@react-three/fiber` | `9.6.1` | renderer declarativo para React 19 |
| `@types/three` | `0.185.1` | tipos TypeScript mantenidos por la comunidad |

Fuentes: [three en npm](https://www.npmjs.com/package/three), [R3F en npm](https://www.npmjs.com/package/%40react-three/fiber), [tipos de Three.js en npm](https://www.npmjs.com/package/%40types/three). La guía oficial de Three.js recomienda instalar desde el registro y usar un bundler; su soporte TypeScript depende de `@types/three`. [Instalación de Three.js](https://threejs.org/manual/en/installation.html).

Comandos acordes al uso exclusivo de Bun en este repositorio:

```sh
bun add three @react-three/fiber
bun add --dev @types/three
```

No hace falta instalar addons de Three.js por separado. Tampoco se justifica agregar `@react-three/drei` hasta que una necesidad concreta —por ejemplo texto SDF o controles de cámara— compense esa dependencia.

## Encaje en el código actual

El reemplazo debería quedar encapsulado en un componente `Board3D` que reciba datos ya derivados, no el objeto `lobby` completo:

```ts
type Board3DProps = {
  board: Array<{
    category: 'sequence' | 'association' | 'common' | 'approximation'
    isShop: boolean
    maxBet: number
  }>
  teams: Array<{
    id: string
    color: string
    name: string
    position: number
    money: number
    coins: number
  }>
  dimmed: boolean
  lastRoll?: number
}
```

`GameBoard` conservaría la ronda, sonidos, modales y métricas. Solo `BoardStrip`, `BoardGrid`, `BoardDirectionLayer`, `TeamTokenLayer` y `BoardCell` serían reemplazados. Convex continúa siendo la fuente autoritativa: la escena no calcula Tiradas, economía, compra de Monedas ni posición final.

La escena inicial debería ser procedural —casilleros extruidos, mesa, fichas y etiquetas— sin modelos externos. Esto elimina carga de assets del camino crítico y mantiene el primer incremento verificable. Una cámara ortográfica inclinada preserva la legibilidad de Inicio, topes de Apuesta y marcadores E sin que los Casilleros lejanos se achiquen por perspectiva; R3F expone este modo con `orthographic`. [Propiedades de Canvas](https://r3f.docs.pmnd.rs/api/canvas), [OrthographicCamera](https://threejs.org/docs/pages/OrthographicCamera.html).

La función de recorrido en S debe seguir siendo una función pura compartida. Puede elegir 14×4 en contenedores anchos y 9×6 en angostos, como la UI actual, pero posición lógica y posición visual deben permanecer separadas. Para animar una Tirada hay que recorrer cada posición intermedia —incluido `(position + step) % 54` al cruzar Inicio— y no interpolar en línea recta entre origen y destino.

## Renderer, canvas, resize y DPR

Configuración inicial sugerida:

```tsx
<Canvas
  orthographic
  frameloop="demand"
  dpr={[1, 1.5]}
  flat
  gl={{ antialias: true, alpha: false, powerPreference: 'default' }}
  fallback={<BoardFallback />}
>
  <BoardScene />
</Canvas>
```

Las decisiones detrás de esa base son:

- El tamaño visible lo decide CSS y el canvas ocupa su contenedor. Three.js distingue tamaño CSS de tamaño del drawing buffer y exige actualizar también la proyección al cambiar el tamaño. `<Canvas>` gestiona ese resize; una integración directa debería observar el contenedor, llamar `renderer.setSize(width, height, false)` y actualizar la cámara. [Diseño responsive de Three.js](https://threejs.org/manual/en/responsive.html), [Resize Observer](https://www.w3.org/TR/resize-observer/).
- El DPR completo multiplica el trabajo aproximadamente por el cuadrado del ratio. El manual actual recomienda limitar el buffer para evitar carga GPU y consumo excesivos. Empezar con máximo 1.5 es una decisión conservadora para companion; subir a 2 solo si las pruebas reales muestran etiquetas insuficientemente nítidas. R3F acepta un rango y su valor predeterminado es `[1, 2]`. [HD-DPI y límite de resolución](https://threejs.org/manual/en/responsive.html), [Canvas `dpr`](https://r3f.docs.pmnd.rs/api/canvas).
- R3F usa `powerPreference="high-performance"` por defecto, pero Khronos advierte que ese hint puede aumentar consumo y pérdidas de contexto en segundo plano. Esta escena mayormente estática debe comenzar con `default`; cambiarlo requiere una medición. [Defaults de Canvas](https://r3f.docs.pmnd.rs/api/canvas), [especificación WebGL](https://registry.khronos.org/webgl/specs/latest/1.0/).
- Three.js r185 requiere WebGL 2; WebGL 1 dejó de estar soportado desde r163. Por eso el fallback no es opcional. [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html).

`flat` desactiva el tone mapping cinematográfico que R3F activa por defecto, pero mantiene la salida sRGB. Es una mejor base para respetar los colores funcionales del Tablero y de los Equipos; si se decide usar tone mapping por motivos artísticos, habrá que validar de nuevo contraste e identidad de color. [Defaults de Canvas](https://r3f.docs.pmnd.rs/api/canvas).

## Color y sombras

`THREE.ColorManagement.enabled` ya está activo por defecto. Three.js trabaja en Linear-sRGB, convierte inputs hex/CSS sRGB y entrega el canvas en `SRGBColorSpace` por defecto. No deben copiarse recetas antiguas con `outputEncoding`, `sRGBEncoding`, `gammaInput` o `gammaOutput`. [Gestión de color](https://threejs.org/manual/en/color-management.html), [WebGLRenderer `outputColorSpace`](https://threejs.org/docs/pages/WebGLRenderer.html).

Los colores de Equipo actuales ya son hex sRGB y pueden pasarse directamente. Para las categorías conviene definir equivalentes hex sRGB compartidos con la vista 3D, en vez de entregar a `THREE.Color` los tokens CSS `oklch(...)`: la API documenta hex, RGB, HSL y nombres, y recomienda el triplete hexadecimal como formato estándar. [Color](https://threejs.org/docs/pages/Color.html). Las texturas con color —incluidas etiquetas dibujadas en canvas— deben marcarse `SRGBColorSpace`; normal, roughness y otros datos permanecen sin espacio de color. [Roles de las texturas](https://threejs.org/manual/en/color-management.html).

Las sombras deben vender volumen sin convertir el Tablero en una escena cara:

- una sola `DirectionalLight` con shadow map acotado;
- solo las fichas proyectan sombra y la mesa la recibe;
- preferir una sombra blob bajo cada ficha si visualmente alcanza;
- no usar `PointLight` con sombras: cada una exige seis vistas adicionales.

Los shadow maps vuelven a dibujar los objetos desde cada luz que proyecta sombra, por eso Three.js recomienda pocas luces con sombra o alternativas falsas. R3F deja las sombras apagadas salvo que se habiliten explícitamente. [Sombras en Three.js](https://threejs.org/manual/en/shadows.html), [shadow map de WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html), [Canvas `shadows`](https://r3f.docs.pmnd.rs/api/canvas).

## Render loop, movimiento y reducción de movimiento

El Tablero permanece quieto la mayor parte de la Partida. Debe usarse `frameloop="demand"`: R3F renderiza ante cambios declarativos y `invalidate()` solicita un frame cuando se mutan refs. Esto evita un loop a 60 FPS sin trabajo, que la documentación identifica como una fuente innecesaria de consumo y batería. [Render bajo demanda](https://r3f.docs.pmnd.rs/advanced/scaling-performance).

Cada ficha puede mantener su posición renderizada en una ref y animarse con `useFrame`. Mientras haya un tramo activo, el callback avanza con `delta` y llama `invalidate()` para obtener el frame siguiente; al llegar al destino deja de invalidar. No debe llamar `setState` de React por frame.

La preferencia se consulta con `matchMedia('(prefers-reduced-motion: reduce)')` y se observa por si cambia. Con `reduce`, la ficha salta a su posición final, no hay rebote, flotación, rotación o travelling de cámara, y se invalida una sola vez. La especificación define `reduce` como petición de minimizar movimiento no esencial. [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion).

Si se eligiera Three.js directo, su documentación recomienda `renderer.setAnimationLoop(callback)` en vez de gestionar `requestAnimationFrame()` a mano, y detenerlo con `setAnimationLoop(null)` al terminar cada tween. [WebGLRenderer `setAnimationLoop`](https://threejs.org/docs/pages/WebGLRenderer.html).

## Recursos, carga y disposal

La primera versión no necesita loader. Debe reutilizar geometrías y materiales para los Casilleros repetidos y cachear las texturas de etiquetas por valor único, no crear una textura nueva por Casillero. `InstancedMesh` puede reducir draw calls si una medición muestra que hace falta, pero 54 piezas no justifican complicar las etiquetas antes de medir. [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html), [CanvasTexture](https://threejs.org/docs/pages/CanvasTexture.html).

R3F intenta llamar `dispose()` en objetos declarativos que desmonta, pero hay dos excepciones importantes:

- un objeto agregado como `<primitive>` no se libera automáticamente;
- los assets de `useLoader` se cachean por URL y no deben liberarse desde una instancia que podría compartirlos.

Fuentes: [disposal de objetos en R3F](https://r3f.docs.pmnd.rs/api/objects), [`useLoader` y caché](https://r3f.docs.pmnd.rs/api/hooks).

Si más adelante se agregan modelos, usar GLB/glTF con `GLTFLoader`, `useLoader`/`Suspense` y un fallback visible. Three.js recomienda glTF 2.0 por su manejo más consistente de materiales y espacios de color. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [gestión de color](https://threejs.org/manual/en/color-management.html). Para carga imperativa, `LoadingManager` ofrece progreso, error y `abort()` cuando el loader lo soporta. [LoadingManager](https://threejs.org/docs/pages/LoadingManager.html).

Quitar un mesh de una escena no libera la memoria GPU. En código Three.js propio se deben liberar de forma explícita geometrías, materiales, texturas y render targets; `renderer.dispose()` tampoco sustituye esos pasos. `ImageBitmap.close()` sigue siendo responsabilidad de la aplicación cuando corresponda. [Cómo liberar objetos](https://threejs.org/manual/en/how-to-dispose-of-objects.html), [WebGLRenderer `dispose`](https://threejs.org/docs/pages/WebGLRenderer.html).

## Lifecycle de React y StrictMode

`src/main.tsx` activa `StrictMode`. En desarrollo, React ejecuta un ciclo adicional setup → cleanup → setup para cada Effect y repite callbacks de refs; es una prueba deliberada de simetría. [StrictMode](https://react.dev/reference/react/StrictMode), [useEffect](https://react.dev/reference/react/useEffect).

Con R3F, la escena declarativa debe vivir dentro de `<Canvas>` y los hooks de R3F dentro de su contexto. Todo Effect propio —`matchMedia`, eventos de contexto, observers, controles o caches— debe devolver cleanup. Crear recursos Three durante el render de un componente React rompe la regla de pureza; deben declararse en JSX, construirse con `useMemo` cuando su lifetime esté bien definido, o inicializarse en un Effect simétrico. [Pureza de componentes y hooks](https://react.dev/reference/rules/components-and-hooks-must-be-pure).

Si se optara por Three.js directo, React debería renderizar `<canvas ref={canvasRef}>` y un único Effect sería dueño de scene, camera, renderer, listeners, observer, loop y recursos. Su cleanup tendría que detener el loop, desconectar observers, quitar listeners, liberar recursos y ejecutar `renderer.dispose()`. La secuencia repetida por StrictMode no puede dejar canvases, loops ni listeners duplicados.

## Picking y accesibilidad

El Tablero actual en la Pantalla companion es informativo, no interactivo. La primera versión 3D **no debe implementar picking**: hacerlo no aporta una acción de juego y aumenta superficie de eventos y accesibilidad.

El canvas tampoco debe ser la única representación del estado. La escena debe ser decorativa para tecnología asistiva (`aria-hidden`) y tener un hermano DOM semántico con:

- lista o tabla de Equipos con nombre, Saldo, Monedas y posición;
- descripción del Casillero de cada Equipo —categoría, tope y E cuando corresponda—;
- anuncio `aria-live="polite"` al completar un movimiento;
- la misma información visible dentro del fallback cuando WebGL no esté disponible.

Un canvas no aporta semántica automática para sus objetos. Si en el futuro cada Casillero o ficha se vuelve interactivo, el estándar HTML exige un mapeo uno a uno con contenido fallback enfocable para ofrecer teclado; un `tabIndex` en el canvas no vuelve accesibles sus objetos internos. [Estándar HTML para canvas accesible](https://html.spec.whatwg.org/multipage/canvas.html).

Si aparece un caso real de interacción, R3F ya convierte pointer events a su raycaster. En Three.js directo, el patrón oficial es transformar coordenadas relativas a `canvas.getBoundingClientRect()` a Normalized Device Coordinates, llamar `Raycaster.setFromCamera()` y elegir la intersección más cercana. No se debe incorporar DPR al cálculo basado en coordenadas CSS. [Eventos de R3F](https://r3f.docs.pmnd.rs/api/events), [picking en Three.js](https://threejs.org/manual/en/picking.html), [Raycaster](https://threejs.org/docs/pages/Raycaster.html).

## Pérdida de contexto y fallback

WebGL puede perder su contexto por GPU, drivers, memoria o gestión de energía. La especificación define `webglcontextlost` y `webglcontextrestored`; para permitir restauración hay que ejecutar `preventDefault()` al perderlo, y los recursos WebGL anteriores dejan de ser válidos al restaurar. [Especificación WebGL](https://registry.khronos.org/webgl/specs/latest/1.0/).

Three.js escucha estos eventos y reconstruye sus internos, pero la aplicación todavía debe comunicar el estado y volver a invalidar la escena. [Implementación de WebGLRenderer r185](https://raw.githubusercontent.com/mrdoob/three.js/r185/src/renderers/WebGLRenderer.js). La integración propuesta debe incluir:

1. `fallback` de `<Canvas>` para ausencia de WebGL 2;
2. un Error Boundary alrededor de la escena para fallos de creación o render;
3. un estado DOM accesible durante pérdida de contexto;
4. reintento acotado o remount del Canvas tras restauración; si vuelve a fallar, dejar el fallback estable.

La propia documentación de R3F recomienda combinar fallback con Error Boundary ante fallos de contexto. [Errores y fallbacks de Canvas](https://r3f.docs.pmnd.rs/api/canvas). `WEBGL_lose_context` permite simular pérdida/restauración en pruebas; no es una API para forzar context loss como parte rutinaria del unmount. [Extensión oficial de Khronos](https://registry.khronos.org/webgl/extensions/WEBGL_lose_context/).

## Criterios de aceptación técnicos

- `bun run lint`, `bun run typecheck` y `bun run build` pasan con las nuevas dependencias.
- En `StrictMode`, montar y desmontar repetidamente el Tablero no duplica canvas, listeners, loops ni recursos.
- La escena queda inactiva cuando no hay movimiento; no mantiene render continuo.
- Una Tirada recorre cada Casillero intermedio y cruza Inicio correctamente; la primera carga no anima desde una posición ficticia.
- `prefers-reduced-motion: reduce` elimina movimiento no esencial y coloca la ficha directamente en destino.
- La vista se reencuadra sin deformación en 9×6 y 14×4, con DPR 1, 1.5 y 2 probado en hardware real.
- Categorías, topes, E y fichas siguen siendo legibles; los cuatro colores de Equipo conservan contraste bajo la iluminación elegida.
- Sin WebGL 2, ante error del renderer y ante pérdida de contexto aparece un fallback DOM con el estado vigente.
- Un lector de pantalla obtiene Equipo, Saldo, Monedas, posición y Casillero sin depender del canvas.
- No se agregan picking, OrbitControls, modelos, postprocesado ni Drei sin un requisito de interacción o una medición que lo justifique.

## Resumen ejecutivo

La ruta de menor riesgo para el objetivo de hoy es `three@0.185.1` + `@react-three/fiber@9.6.1`, con escena procedural, cámara ortográfica inclinada, render bajo demanda y fallback DOM. R3F debe limitarse a traducir el estado React/Convex a objetos Three.js: las reglas de la Partida continúan fuera de la escena. La claridad del Tablero, la accesibilidad y la resistencia a pérdida de contexto son parte del reemplazo, no trabajo posterior.
