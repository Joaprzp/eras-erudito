import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Component, type ErrorInfo, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  CanvasTexture,
  MathUtils,
  SRGBColorSpace,
  Vector3,
  type Group,
  type OrthographicCamera,
} from 'three'

export type BoardCategory = 'sequence' | 'association' | 'common' | 'approximation'

export type BoardSpace = {
  category: BoardCategory
  isShop: boolean
  maxBet: number
}

export type BoardTeam = {
  id: string
  coins: number
  color: string
  money: number
  name: string
  position: number
}

type Board3DProps = {
  board: BoardSpace[]
  dimmed: boolean
  teams: BoardTeam[]
}

type Board3DState = {
  hasError: boolean
}

const TOTAL_SPACES = 54
const TILE_WIDTH = 1.06
const TILE_DEPTH = 0.78
const TILE_GAP = 0.14
const CATEGORY_COLORS: Record<BoardCategory, string> = {
  sequence: '#e85f4a',
  association: '#e5ad22',
  common: '#63c5a0',
  approximation: '#4a88e6',
}
const INK = '#21160f'
const PAPER = '#f7efd9'

export function Board3D({ board, dimmed, teams }: Board3DProps) {
  const [contextLost, setContextLost] = useState(false)

  return (
    <div className={`relative transition duration-500 ${dimmed ? 'opacity-35 blur-[1px]' : ''}`}>
      <BoardSceneErrorBoundary fallback={<BoardFallback board={board} teams={teams} />}>
        <div className="h-[24rem] w-full sm:h-[27rem] lg:h-[32rem]">
          <Canvas
            aria-hidden="true"
            dpr={[1, 1.5]}
            fallback={<BoardFallback board={board} teams={teams} />}
            flat
            frameloop="demand"
            gl={{ alpha: false, antialias: true, powerPreference: 'default' }}
            shadows="basic"
          >
            <BoardScene board={board} teams={teams} onContextLost={setContextLost} />
          </Canvas>
        </div>
      </BoardSceneErrorBoundary>
      {contextLost ? <div className="absolute inset-0 grid place-items-center bg-ink/85 p-6"><BoardFallback board={board} teams={teams} message="La vista 3D está recuperándose." /></div> : null}
      <BoardAccessibleState board={board} teams={teams} />
      {dimmed ? <p className="pb-4 text-center text-[0.58rem] font-black uppercase tracking-[0.22em] text-paper/60">Tablero en pausa · la tarjeta está en juego</p> : null}
    </div>
  )
}

function BoardScene({ board, onContextLost, teams }: { board: BoardSpace[]; onContextLost: (lost: boolean) => void; teams: BoardTeam[] }) {
  const { size } = useThree()
  const columns = size.width < 640 ? 9 : 14
  const layout = useMemo(() => createBoardLayout(columns), [columns])
  const reducedMotion = useReducedMotion()
  const teamsByPosition = useMemo(() => {
    const result = new Map<number, BoardTeam[]>()
    for (const team of teams) result.set(team.position, [...(result.get(team.position) ?? []), team])
    return result
  }, [teams])

  return (
    <>
      <color attach="background" args={[INK]} />
      <fog attach="fog" args={[INK, 19, 32]} />
      <ambientLight intensity={1.65} />
      <directionalLight
        castShadow
        color={PAPER}
        intensity={2.4}
        position={[-4, 10, 6]}
        shadow-mapSize-height={1024}
        shadow-mapSize-width={1024}
        shadow-camera-bottom={-7}
        shadow-camera-far={30}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={7}
      />
      <CameraRig columns={columns} rows={layout.rows} />
      <ContextMonitor onChange={onContextLost} />

      <group rotation={[0, -0.015, 0]}>
        <TableSurface columns={columns} rows={layout.rows} />
        {layout.positions.map((position, index) => (
          <BoardTile
            key={index}
            index={index}
            position={position}
            space={index === 0 ? undefined : board[index - 1]}
          />
        ))}
        {teams.map((team) => {
          const colocated = teamsByPosition.get(team.position) ?? [team]
          return (
            <TeamPawn
              key={`${team.id}:${columns}`}
              layout={layout.positions}
              reducedMotion={reducedMotion}
              slotCount={colocated.length}
              slotIndex={colocated.findIndex((item) => item.id === team.id)}
              team={team}
            />
          )
        })}
      </group>
    </>
  )
}

function CameraRig({ columns, rows }: { columns: number; rows: number }) {
  const camera = useRef<OrthographicCamera>(null)
  const { camera: defaultCamera, invalidate, set, size } = useThree()
  const previousCamera = useRef(defaultCamera)

  useEffect(() => {
    const orthographic = camera.current
    if (!orthographic) return
    const fallbackCamera = previousCamera.current
    const boardWidth = columns * (TILE_WIDTH + TILE_GAP)
    const boardDepth = rows * (TILE_DEPTH + TILE_GAP)
    const portrait = size.width < 640
    orthographic.left = -size.width / 2
    orthographic.right = size.width / 2
    orthographic.top = size.height / 2
    orthographic.bottom = -size.height / 2
    orthographic.position.set(0, portrait ? 13 : 11.5, portrait ? 8.5 : 7.4)
    orthographic.lookAt(0, 0, 0)
    const verticalWorld = boardDepth + (portrait ? 5.5 : 3.8)
    const horizontalWorld = boardWidth + 2.2
    orthographic.zoom = Math.min(size.height / verticalWorld, size.width / horizontalWorld)
    orthographic.updateProjectionMatrix()
    set({ camera: orthographic })
    invalidate()
    return () => set({ camera: fallbackCamera })
  }, [columns, invalidate, rows, set, size.height, size.width])

  return <orthographicCamera ref={camera} far={100} near={0.1} />
}

function ContextMonitor({ onChange }: { onChange: (lost: boolean) => void }) {
  const { gl, invalidate } = useThree()

  useEffect(() => {
    const canvas = gl.domElement
    const handleLost = (event: Event) => {
      event.preventDefault()
      onChange(true)
    }
    const handleRestored = () => {
      onChange(false)
      invalidate()
    }
    canvas.addEventListener('webglcontextlost', handleLost)
    canvas.addEventListener('webglcontextrestored', handleRestored)
    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost)
      canvas.removeEventListener('webglcontextrestored', handleRestored)
      onChange(false)
    }
  }, [gl, invalidate, onChange])

  return null
}

function TableSurface({ columns, rows }: { columns: number; rows: number }) {
  const width = columns * (TILE_WIDTH + TILE_GAP) + 1.05
  const depth = rows * (TILE_DEPTH + TILE_GAP) + 1.05

  return (
    <group>
      <mesh position={[0, -0.29, 0]} receiveShadow>
        <boxGeometry args={[width, 0.34, depth]} />
        <meshStandardMaterial color="#39251a" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.105, 0]} receiveShadow>
        <boxGeometry args={[width - 0.16, 0.04, depth - 0.16]} />
        <meshStandardMaterial color="#5a3825" roughness={0.98} />
      </mesh>
    </group>
  )
}

function BoardTile({ index, position, space }: { index: number; position: Vector3; space?: BoardSpace }) {
  const isStart = index === 0
  const color = isStart ? PAPER : CATEGORY_COLORS[space!.category]
  const texture = useMemo(() => createTileTexture(isStart ? 'INICIO' : `$${space!.maxBet}`, space?.isShop ?? false), [isStart, space])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <group position={[position.x, 0, position.z]}>
      <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
        <boxGeometry args={[TILE_WIDTH, 0.2, TILE_DEPTH]} />
        <meshStandardMaterial color={color} roughness={0.74} />
      </mesh>
      <mesh position={[0, 0.146, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TILE_WIDTH * 0.88, TILE_DEPTH * 0.78]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

function TeamPawn({ layout, reducedMotion, slotCount, slotIndex, team }: { layout: Vector3[]; reducedMotion: boolean; slotCount: number; slotIndex: number; team: BoardTeam }) {
  const pawn = useRef<Group>(null)
  const { invalidate } = useThree()
  const logicalPosition = useRef(team.position)
  const animation = useRef<{ elapsed: number; from: number; steps: number } | null>(null)
  const slotOffset = pawnSlot(slotIndex, slotCount)

  useEffect(() => {
    const previous = logicalPosition.current
    logicalPosition.current = team.position
    const steps = (team.position - previous + TOTAL_SPACES) % TOTAL_SPACES
    if (!pawn.current || steps === 0) return
    if (reducedMotion) {
      const target = layout[team.position]
      pawn.current.position.set(target.x + slotOffset.x, 0.38, target.z + slotOffset.z)
      invalidate()
      return
    }
    animation.current = { elapsed: 0, from: previous, steps }
    invalidate()
  }, [invalidate, layout, reducedMotion, slotOffset.x, slotOffset.z, team.position])

  useFrame((_, delta) => {
    if (!pawn.current || !animation.current) return
    const durationPerSpace = 0.105
    const motion = animation.current
    motion.elapsed += Math.min(delta, 0.05)
    const rawProgress = motion.elapsed / durationPerSpace
    const completedSteps = Math.min(Math.floor(rawProgress), motion.steps - 1)
    const segmentProgress = motion.steps === 0 ? 1 : Math.min(rawProgress - completedSteps, 1)
    const fromIndex = (motion.from + completedSteps) % TOTAL_SPACES
    const toIndex = (fromIndex + 1) % TOTAL_SPACES
    const from = layout[fromIndex]
    const to = layout[toIndex]
    const eased = MathUtils.smoothstep(segmentProgress, 0, 1)
    pawn.current.position.set(
      MathUtils.lerp(from.x, to.x, eased) + slotOffset.x,
      0.38 + Math.sin(segmentProgress * Math.PI) * 0.34,
      MathUtils.lerp(from.z, to.z, eased) + slotOffset.z,
    )
    pawn.current.rotation.y += delta * 3.2
    if (rawProgress >= motion.steps) {
      const target = layout[team.position]
      pawn.current.position.set(target.x + slotOffset.x, 0.38, target.z + slotOffset.z)
      pawn.current.rotation.y = 0
      animation.current = null
      return
    }
    invalidate()
  })

  const initial = layout[team.position]
  return (
    <group ref={pawn} position={[initial.x + slotOffset.x, 0.38, initial.z + slotOffset.z]}>
      <mesh castShadow position={[0, 0.24, 0]}>
        <sphereGeometry args={[0.17, 20, 14]} />
        <meshStandardMaterial color={team.color} metalness={0.08} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.12, 0.23, 0.38, 20]} />
        <meshStandardMaterial color={team.color} metalness={0.08} roughness={0.32} />
      </mesh>
      <mesh castShadow position={[0, -0.23, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.08, 24]} />
        <meshStandardMaterial color={team.color} metalness={0.06} roughness={0.34} />
      </mesh>
    </group>
  )
}

function BoardAccessibleState({ board, teams }: { board: BoardSpace[]; teams: BoardTeam[] }) {
  return (
    <div className="sr-only">
      <h2>Estado del tablero</h2>
      <ul>
        {teams.map((team) => <li key={team.id}>{teamStatus(team, board)}</li>)}
      </ul>
    </div>
  )
}

function BoardFallback({ board, message = 'Vista simplificada del tablero.', teams }: { board: BoardSpace[]; message?: string; teams: BoardTeam[] }) {
  return (
    <div className="grid h-full min-h-56 place-items-center rounded-[1.4rem] border border-paper/15 bg-ink px-5 py-8 text-center text-paper">
      <div>
        <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-saffron">Tablero</p>
        <p className="mt-2 font-display text-2xl">{message}</p>
        <ul className="mt-4 space-y-1 text-sm text-paper/70">
          {teams.map((team) => <li key={team.id}>{teamStatus(team, board)}</li>)}
        </ul>
      </div>
    </div>
  )
}

class BoardSceneErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, Board3DState> {
  state: Board3DState = { hasError: false }

  static getDerivedStateFromError(): Board3DState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('No pudimos montar el tablero 3D.', error, info)
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

function createBoardLayout(columns: number) {
  const rows = Math.ceil(TOTAL_SPACES / columns)
  const width = (columns - 1) * (TILE_WIDTH + TILE_GAP)
  const depth = (rows - 1) * (TILE_DEPTH + TILE_GAP)
  const positions = Array.from({ length: TOTAL_SPACES }, (_, index) => {
    const row = Math.floor(index / columns)
    const offset = index % columns
    const column = row % 2 === 0 ? offset : columns - 1 - offset
    return new Vector3(column * (TILE_WIDTH + TILE_GAP) - width / 2, 0, row * (TILE_DEPTH + TILE_GAP) - depth / 2)
  })
  return { positions, rows }
}

function createTileTexture(label: string, shop: boolean) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 160
  const context = canvas.getContext('2d')
  if (!context) return new CanvasTexture(canvas)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = INK
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.font = label === 'INICIO' ? '900 43px Georgia' : '900 48px sans-serif'
  context.fillText(label, 14, 16)
  if (shop) {
    context.beginPath()
    context.arc(211, 49, 31, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#e5ad22'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = '900 37px sans-serif'
    context.fillText('E', 211, 50)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function pawnSlot(index: number, count: number) {
  if (count <= 1) return { x: 0, z: 0 }
  const slots = count === 2
    ? [{ x: -0.2, z: 0 }, { x: 0.2, z: 0 }]
    : [{ x: -0.2, z: -0.14 }, { x: 0.2, z: -0.14 }, { x: -0.2, z: 0.16 }, { x: 0.2, z: 0.16 }]
  return slots[index] ?? slots[0]
}

function teamStatus(team: BoardTeam, board: BoardSpace[]) {
  if (team.position === 0) return `${team.name}: Inicio, $${team.money}, ${team.coins} monedas.`
  const space = board[team.position - 1]
  if (!space) return `${team.name}: posición ${team.position}, $${team.money}, ${team.coins} monedas.`
  const category = space.category === 'sequence' ? 'Secuencia' : space.category === 'association' ? 'Asociación' : space.category === 'common' ? 'En común' : 'Aproximación'
  return `${team.name}: casillero ${team.position}, ${category}, tope $${space.maxBet}${space.isShop ? ', compra E' : ''}, saldo $${team.money}, ${team.coins} monedas.`
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setReduced(media.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return reduced
}
