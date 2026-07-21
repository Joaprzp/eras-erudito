import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Component, type ErrorInfo, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  CanvasTexture,
  Color,
  MathUtils,
  Object3D,
  SRGBColorSpace,
  Vector3,
  type Group,
  type InstancedMesh,
  type OrthographicCamera,
} from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

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
  joinIndex: number
  money: number
  name: string
  position: number
}

type Board3DProps = {
  activeTeamId?: string
  board: BoardSpace[]
  dice?: { first: number; second: number }
  dimmed: boolean
  rollId?: string
  teams: BoardTeam[]
  winnerTeamId?: string
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

export function Board3D({ activeTeamId, board, dice, dimmed, rollId, teams, winnerTeamId }: Board3DProps) {
  const [contextLost, setContextLost] = useState(false)

  return (
    <div className={`relative transition duration-500 ${dimmed ? 'opacity-35 blur-[1px]' : ''}`}>
      <BoardSceneErrorBoundary fallback={<BoardFallback board={board} teams={teams} winnerTeamId={winnerTeamId} />}>
        <div className="h-[24rem] w-full sm:h-[27rem] lg:h-[32rem]">
          <Canvas
            aria-hidden="true"
            dpr={[1, 1.5]}
            fallback={<BoardFallback board={board} teams={teams} winnerTeamId={winnerTeamId} />}
            flat
            frameloop="demand"
            gl={{ alpha: false, antialias: true, powerPreference: 'default' }}
            shadows="basic"
          >
            <BoardScene activeTeamId={activeTeamId} board={board} cloudsActive={!dimmed} dice={dice} rollId={rollId} teams={teams} winnerTeamId={winnerTeamId} onContextLost={setContextLost} />
          </Canvas>
        </div>
      </BoardSceneErrorBoundary>
      {contextLost ? <div className="absolute inset-0 grid place-items-center bg-ink/85 p-6"><BoardFallback board={board} teams={teams} winnerTeamId={winnerTeamId} message="La vista 3D está recuperándose." /></div> : null}
      <BoardAccessibleState board={board} teams={teams} winnerTeamId={winnerTeamId} />
      {dimmed ? <p className="pb-4 text-center text-[0.58rem] font-black uppercase tracking-[0.22em] text-paper/60">Tablero en pausa · la tarjeta está en juego</p> : null}
    </div>
  )
}

function BoardScene({ activeTeamId, board, cloudsActive, dice, onContextLost, rollId, teams, winnerTeamId }: { activeTeamId?: string; board: BoardSpace[]; cloudsActive: boolean; dice?: { first: number; second: number }; onContextLost: (lost: boolean) => void; rollId?: string; teams: BoardTeam[]; winnerTeamId?: string }) {
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
      {winnerTeamId ? <pointLight color="#f2bd2e" intensity={8} position={[0, 5, 1]} distance={18} decay={1.5} /> : null}
      <CameraRig columns={columns} rows={layout.rows} />
      <ContextMonitor onChange={onContextLost} />

      <group rotation={[0, -0.015, 0]}>
        <TableSurface columns={columns} rows={layout.rows} />
        <PathLinks positions={layout.positions} />
        <DicePair dice={dice} reducedMotion={reducedMotion} rollId={rollId} rows={layout.rows} />
        <CloudLayer active={cloudsActive} columns={columns} reducedMotion={reducedMotion} />
        {winnerTeamId ? <VictoryConfetti columns={columns} reducedMotion={reducedMotion} rows={layout.rows} winnerTeamId={winnerTeamId} /> : null}
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
              active={team.id === activeTeamId}
              layout={layout.positions}
              reducedMotion={reducedMotion}
              slotCount={colocated.length}
              slotIndex={colocated.findIndex((item) => item.id === team.id)}
              team={team}
              variant={team.joinIndex % 4}
              winner={team.id === winnerTeamId}
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
  const depth = rows * (TILE_DEPTH + TILE_GAP) + 2.15

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

function DicePair({ dice, reducedMotion, rollId, rows }: { dice?: { first: number; second: number }; reducedMotion: boolean; rollId?: string; rows: number }) {
  if (!dice) return null
  const boardDepth = (rows - 1) * (TILE_DEPTH + TILE_GAP)

  return (
    <group position={[0, 0.19, boardDepth / 2 + 0.75]}>
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <boxGeometry args={[1.55, 0.08, 0.82]} />
        <meshStandardMaterial color="#2b1b13" roughness={0.92} />
      </mesh>
      <mesh position={[0, -0.132, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.66, 0.72, 4]} />
        <meshBasicMaterial color="#d99b1d" toneMapped={false} />
      </mesh>
      <Die direction={1} position={[-0.34, 0, 0]} reducedMotion={reducedMotion} rollId={rollId} value={dice.first} />
      <Die direction={-1} position={[0.34, 0, 0]} reducedMotion={reducedMotion} rollId={rollId} value={dice.second} />
    </group>
  )
}

function CloudLayer({ active, columns, reducedMotion }: { active: boolean; columns: number; reducedMotion: boolean }) {
  const firstCloud = useRef<Group>(null)
  const secondCloud = useRef<Group>(null)
  const elapsed = useRef(0)
  const { invalidate } = useThree()
  const span = columns * (TILE_WIDTH + TILE_GAP) + 7
  const texture = useMemo(() => createCloudTexture(), [])

  useEffect(() => () => texture.dispose(), [texture])

  useEffect(() => {
    if (!active || reducedMotion) return
    const interval = window.setInterval(() => {
      if (!document.hidden) invalidate()
    }, 160)
    return () => window.clearInterval(interval)
  }, [active, invalidate, reducedMotion])

  useFrame((_, delta) => {
    if (!active || reducedMotion) return
    elapsed.current += Math.min(delta, 0.18)
    if (firstCloud.current) firstCloud.current.position.x = (elapsed.current * 0.16 + span * 0.16) % span - span / 2
    if (secondCloud.current) secondCloud.current.position.x = (elapsed.current * 0.11 + span * 0.72) % span - span / 2
  })

  return (
    <group>
      <group ref={firstCloud} position={[-span * 0.34, 4.2, -1.35]}>
        <sprite renderOrder={4} scale={[4.6, 1.65, 1]}><spriteMaterial map={texture} color={PAPER} depthWrite={false} opacity={0.16} transparent toneMapped={false} /></sprite>
      </group>
      <group ref={secondCloud} position={[span * 0.22, 4.85, 1.6]}>
        <sprite renderOrder={4} scale={[3.8, 1.35, 1]}><spriteMaterial map={texture} color={PAPER} depthWrite={false} opacity={0.11} transparent toneMapped={false} /></sprite>
      </group>
    </group>
  )
}

function Die({ direction, position, reducedMotion, rollId, value }: { direction: number; position: [number, number, number]; reducedMotion: boolean; rollId?: string; value: number }) {
  const die = useRef<Group>(null)
  const { invalidate } = useThree()
  const animation = useRef<{ elapsed: number } | null>(null)
  const geometry = useMemo(() => new RoundedBoxGeometry(0.48, 0.48, 0.48, 4, 0.055), [])
  const faceValues = useMemo(() => dieFaceValues(value), [value])
  const textures = useMemo(() => faceValues.map(createDieFaceTexture), [faceValues])
  const [restX, restY, restZ] = position

  useEffect(() => () => {
    geometry.dispose()
    for (const texture of textures) texture.dispose()
  }, [geometry, textures])

  useEffect(() => {
    if (!die.current || !rollId) return
    if (reducedMotion) {
      die.current.position.set(restX, restY, restZ)
      die.current.rotation.set(0, 0, 0)
      die.current.scale.set(1, 1, 1)
      invalidate()
      return
    }
    animation.current = { elapsed: 0 }
    invalidate()
  }, [invalidate, reducedMotion, restX, restY, restZ, rollId, value])

  useFrame((_, delta) => {
    if (!die.current || !animation.current) return
    const duration = 1.05
    const motion = animation.current
    motion.elapsed += Math.min(delta, 0.05)
    const progress = Math.min(motion.elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    const mainArc = progress < 0.72 ? Math.sin(progress / 0.72 * Math.PI) * 0.9 : 0
    const landingProgress = Math.max(0, (progress - 0.72) / 0.28)
    const bounce = progress >= 0.72 ? Math.abs(Math.sin(landingProgress * Math.PI * 2)) * 0.17 * (1 - landingProgress) : 0
    die.current.position.set(
      restX + Math.sin(progress * Math.PI * 5) * 0.13 * (1 - progress) * direction,
      restY + mainArc + bounce,
      restZ + Math.cos(progress * Math.PI * 4) * 0.08 * (1 - progress),
    )
    die.current.rotation.set(
      (1 - eased) * Math.PI * 4.5 * direction,
      (1 - eased) * Math.PI * 3.5,
      (1 - eased) * Math.PI * 3 * -direction,
    )
    const squash = Math.sin(landingProgress * Math.PI) * 0.08 * (progress >= 0.72 ? 1 : 0)
    die.current.scale.set(1 + squash, 1 - squash, 1 + squash)
    if (progress >= 1) {
      die.current.position.set(restX, restY, restZ)
      die.current.rotation.set(0, 0, 0)
      die.current.scale.set(1, 1, 1)
      animation.current = null
      return
    }
    invalidate()
  })

  return (
    <group ref={die} position={position}>
      <mesh castShadow receiveShadow geometry={geometry}>
        {textures.map((texture, index) => <meshStandardMaterial key={index} attach={`material-${index}`} color={PAPER} map={texture} metalness={0.02} roughness={0.48} />)}
      </mesh>
    </group>
  )
}

function VictoryConfetti({ columns, reducedMotion, rows, winnerTeamId }: { columns: number; reducedMotion: boolean; rows: number; winnerTeamId: string }) {
  const mesh = useRef<InstancedMesh>(null)
  const { invalidate } = useThree()
  const elapsed = useRef(0)
  const dummy = useMemo(() => new Object3D(), [])
  const pieces = useMemo(() => Array.from({ length: 48 }, (_, index) => ({
    color: ['#f2bd2e', '#e85f4a', '#63c5a0', '#f7efd9'][index % 4],
    offset: index * 0.37 % 5.8,
    phase: index * 1.73,
    speed: 1.45 + index % 7 * 0.11,
    x: ((index * 47) % 101) / 100 - 0.5,
    z: ((index * 67) % 97) / 96 - 0.5,
  })), [])

  useEffect(() => {
    if (!mesh.current) return
    pieces.forEach((piece, index) => mesh.current?.setColorAt(index, new Color(piece.color)))
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [pieces])

  useEffect(() => {
    elapsed.current = 0
    invalidate()
  }, [invalidate, winnerTeamId])

  useFrame((_, delta) => {
    if (!mesh.current || reducedMotion || elapsed.current > 6.2) return
    elapsed.current += Math.min(delta, 0.05)
    const boardWidth = columns * (TILE_WIDTH + TILE_GAP)
    const boardDepth = rows * (TILE_DEPTH + TILE_GAP)

    pieces.forEach((piece, index) => {
      const fall = (elapsed.current * piece.speed + piece.offset) % 6.2
      dummy.position.set(
        piece.x * boardWidth + Math.sin(elapsed.current * 1.8 + piece.phase) * 0.22,
        5.9 - fall,
        piece.z * boardDepth + Math.cos(elapsed.current * 1.3 + piece.phase) * 0.14,
      )
      dummy.rotation.set(elapsed.current * piece.speed, piece.phase + elapsed.current * 2.2, elapsed.current * 1.7)
      dummy.scale.setScalar(elapsed.current > 5.8 ? Math.max(0, (6.2 - elapsed.current) / 0.4) : 1)
      dummy.updateMatrix()
      mesh.current?.setMatrixAt(index, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    invalidate()
  })

  if (reducedMotion) return null

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, pieces.length]} frustumCulled={false}>
      <boxGeometry args={[0.09, 0.025, 0.16]} />
      <meshBasicMaterial toneMapped={false} vertexColors />
    </instancedMesh>
  )
}

function PathLinks({ positions }: { positions: Vector3[] }) {
  return (
    <group>
      {positions.slice(0, -1).map((from, index) => {
        const to = positions[index + 1]
        const horizontal = Math.abs(to.x - from.x) > Math.abs(to.z - from.z)
        const length = horizontal ? Math.abs(to.x - from.x) : Math.abs(to.z - from.z)
        return (
          <mesh key={index} position={[(from.x + to.x) / 2, -0.015, (from.z + to.z) / 2]} receiveShadow>
            <boxGeometry args={horizontal ? [length, 0.055, 0.18] : [0.18, 0.055, length]} />
            <meshStandardMaterial color="#d99b1d" metalness={0.12} roughness={0.65} />
          </mesh>
        )
      })}
    </group>
  )
}

function BoardTile({ index, position, space }: { index: number; position: Vector3; space?: BoardSpace }) {
  const isStart = index === 0
  const color = isStart ? PAPER : CATEGORY_COLORS[space!.category]
  const texture = useMemo(() => createTileTexture(isStart ? 'INICIO' : `$${space!.maxBet}`), [isStart, space])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <group position={[position.x, 0, position.z]}>
      {isStart ? <StartGate /> : null}
      {space?.isShop ? <ShopMarker /> : null}
      <mesh castShadow receiveShadow position={[0, isStart ? -0.005 : 0, 0]}>
        <boxGeometry args={[isStart ? TILE_WIDTH + 0.11 : TILE_WIDTH, 0.11, isStart ? TILE_DEPTH + 0.11 : TILE_DEPTH]} />
        <meshStandardMaterial color={isStart ? '#d99b1d' : INK} metalness={isStart ? 0.14 : 0} roughness={0.72} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
        <boxGeometry args={[isStart ? TILE_WIDTH - 0.06 : TILE_WIDTH - 0.035, isStart ? 0.23 : 0.2, isStart ? TILE_DEPTH - 0.06 : TILE_DEPTH - 0.035]} />
        <meshStandardMaterial color={color} roughness={0.74} />
      </mesh>
      <mesh position={[0, 0.146, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TILE_WIDTH * 0.88, TILE_DEPTH * 0.78]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

function StartGate() {
  return (
    <group position={[0, 0, TILE_DEPTH * 0.42]}>
      <mesh castShadow position={[-0.43, 0.34, 0]}>
        <cylinderGeometry args={[0.045, 0.06, 0.58, 12]} />
        <meshStandardMaterial color="#d99b1d" metalness={0.25} roughness={0.48} />
      </mesh>
      <mesh castShadow position={[0.43, 0.34, 0]}>
        <cylinderGeometry args={[0.045, 0.06, 0.58, 12]} />
        <meshStandardMaterial color="#d99b1d" metalness={0.25} roughness={0.48} />
      </mesh>
      <mesh castShadow position={[0, 0.62, 0]}>
        <boxGeometry args={[0.92, 0.09, 0.08]} />
        <meshStandardMaterial color="#d99b1d" metalness={0.25} roughness={0.48} />
      </mesh>
    </group>
  )
}

function ShopMarker() {
  const texture = useMemo(() => createBadgeTexture('E'), [])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <group position={[0.36, 0.26, -0.2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.12, 20]} />
        <meshStandardMaterial color={INK} metalness={0.08} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.066, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.105, 20]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

function TeamPawn({ active, layout, reducedMotion, slotCount, slotIndex, team, variant, winner }: { active: boolean; layout: Vector3[]; reducedMotion: boolean; slotCount: number; slotIndex: number; team: BoardTeam; variant: number; winner: boolean }) {
  const pawn = useRef<Group>(null)
  const { invalidate } = useThree()
  const logicalPosition = useRef(team.position)
  const animation = useRef<{ crossedStart: boolean; elapsed: number; from: number; steps: number } | null>(null)
  const ceremonyElapsed = useRef(0)
  const passageElapsed = useRef<number | null>(null)
  const slotOffset = pawnSlot(slotIndex, slotCount)
  const monogram = useMemo(() => createMonogramTexture(team.name), [team.name])

  useEffect(() => () => monogram.dispose(), [monogram])

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
    animation.current = { crossedStart: previous + steps >= TOTAL_SPACES, elapsed: 0, from: previous, steps }
    invalidate()
  }, [invalidate, layout, reducedMotion, slotOffset.x, slotOffset.z, team.position])

  useEffect(() => {
    if (!winner) return
    ceremonyElapsed.current = 0
    invalidate()
  }, [invalidate, winner])

  useFrame((_, delta) => {
    if (!pawn.current || !animation.current) return
    const durationPerSpace = 0.13
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
    const lift = Math.sin(segmentProgress * Math.PI)
    pawn.current.scale.set(1 - lift * 0.07, 1 + lift * 0.14, 1 - lift * 0.07)
    pawn.current.rotation.y += delta * 4.4
    if (rawProgress >= motion.steps) {
      const target = layout[team.position]
      pawn.current.position.set(target.x + slotOffset.x, 0.38, target.z + slotOffset.z)
      pawn.current.rotation.y = 0
      pawn.current.scale.setScalar(1)
      if (motion.crossedStart) passageElapsed.current = 0
      animation.current = null
      if (motion.crossedStart) invalidate()
      return
    }
    invalidate()
  })

  useFrame((_, delta) => {
    if (!pawn.current || passageElapsed.current === null || winner || animation.current) return
    passageElapsed.current += Math.min(delta, 0.05)
    const progress = Math.min(passageElapsed.current / 1.2, 1)
    const glow = Math.sin(progress * Math.PI)
    pawn.current.position.y = 0.38 + glow * 0.28
    pawn.current.scale.setScalar(1 + glow * 0.3)
    if (progress >= 1) {
      pawn.current.position.y = 0.38
      pawn.current.scale.setScalar(1)
      passageElapsed.current = null
      return
    }
    invalidate()
  })

  useFrame((_, delta) => {
    if (!pawn.current || !winner || reducedMotion || animation.current || ceremonyElapsed.current > 5.8) return
    ceremonyElapsed.current += Math.min(delta, 0.05)
    const target = layout[team.position]
    const settle = Math.min(ceremonyElapsed.current / 0.7, 1)
    const pulse = Math.sin(ceremonyElapsed.current * Math.PI * 3) * 0.07 * (1 - ceremonyElapsed.current / 5.8)
    pawn.current.position.set(target.x + slotOffset.x, 0.38 + Math.abs(Math.sin(ceremonyElapsed.current * 3.2)) * 0.18 * (1 - settle * 0.45), target.z + slotOffset.z)
    pawn.current.rotation.y += delta * (3.4 - settle * 1.8)
    pawn.current.scale.setScalar(1.12 + pulse)
    if (ceremonyElapsed.current >= 5.8) {
      pawn.current.position.set(target.x + slotOffset.x, 0.38, target.z + slotOffset.z)
      pawn.current.rotation.y = 0
      pawn.current.scale.setScalar(1.12)
      return
    }
    invalidate()
  })

  const initial = layout[team.position]
  return (
    <group ref={pawn} position={[initial.x + slotOffset.x, 0.38, initial.z + slotOffset.z]}>
      {active || winner ? <mesh position={[0, -0.225, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[winner ? 0.36 : 0.31, winner ? 0.045 : 0.025, 8, 28]} /><meshBasicMaterial color="#f2bd2e" toneMapped={false} /></mesh> : null}
      {winner ? <><mesh position={[0, -0.22, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.48, 0.018, 8, 32]} /><meshBasicMaterial color={PAPER} transparent opacity={0.78} toneMapped={false} /></mesh><pointLight color="#f2bd2e" distance={3.5} intensity={5} position={[0, 1, 0]} /></> : null}
      <mesh position={[0.1, -0.19, 0.11]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 20]} />
        <meshBasicMaterial color="#140d09" transparent opacity={0.24} depthWrite={false} />
      </mesh>
      <mesh castShadow position={[0, 0.24, 0]}>
        <sphereGeometry args={[0.17, 20, 14]} />
        <meshStandardMaterial color={team.color} metalness={0.08} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.414, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.115, 24]} />
        <meshBasicMaterial map={monogram} transparent toneMapped={false} />
      </mesh>
      <mesh castShadow position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.12, 0.23, 0.38, variant === 1 ? 4 : variant === 2 ? 6 : variant === 3 ? 3 : 20]} />
        <meshStandardMaterial color={team.color} metalness={0.08} roughness={0.32} />
      </mesh>
      <mesh castShadow position={[0, -0.23, 0]} rotation={[0, variant === 1 ? Math.PI / 4 : 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.08, variant === 1 ? 4 : variant === 2 ? 6 : variant === 3 ? 3 : 24]} />
        <meshStandardMaterial color={team.color} metalness={0.06} roughness={0.34} />
      </mesh>
      <CoinStuds count={team.coins} reducedMotion={reducedMotion} />
    </group>
  )
}

function CoinStuds({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const group = useRef<Group>(null)
  const { invalidate } = useThree()
  const elapsed = useRef<number | null>(null)
  const previousCount = useRef(count)

  useEffect(() => {
    const gainedCoin = count > previousCount.current
    previousCount.current = count
    if (!gainedCoin || reducedMotion) return
    elapsed.current = 0
    invalidate()
  }, [count, invalidate, reducedMotion])

  useFrame((_, delta) => {
    if (!group.current || elapsed.current === null) return
    elapsed.current += Math.min(delta, 0.05)
    const progress = Math.min(elapsed.current / 1.1, 1)
    const burst = Math.sin(progress * Math.PI) * 0.45
    group.current.position.y = burst
    group.current.rotation.y = progress * Math.PI * 2
    group.current.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.42)
    if (progress >= 1) {
      group.current.position.y = 0
      group.current.rotation.y = 0
      group.current.scale.setScalar(1)
      elapsed.current = null
      return
    }
    invalidate()
  })

  return <group ref={group}>{Array.from({ length: Math.min(count, 4) }, (_, index) => {
    const angle = index / 4 * Math.PI * 2 + Math.PI / 4
    return <mesh key={index} position={[Math.cos(angle) * 0.2, -0.17, Math.sin(angle) * 0.2]} castShadow><sphereGeometry args={[0.045, 10, 8]} /><meshStandardMaterial color="#f2bd2e" metalness={0.35} roughness={0.35} /></mesh>
  })}</group>
}

function BoardAccessibleState({ board, teams, winnerTeamId }: { board: BoardSpace[]; teams: BoardTeam[]; winnerTeamId?: string }) {
  const winner = teams.find((team) => team.id === winnerTeamId)
  return (
    <div className="sr-only">
      <h2>Estado del tablero</h2>
      {winner ? <p>Ganador: {winner.name}.</p> : null}
      <ul>
        {teams.map((team) => <li key={team.id}>{teamStatus(team, board)}</li>)}
      </ul>
    </div>
  )
}

function BoardFallback({ board, message = 'Vista simplificada del tablero.', teams, winnerTeamId }: { board: BoardSpace[]; message?: string; teams: BoardTeam[]; winnerTeamId?: string }) {
  const winner = teams.find((team) => team.id === winnerTeamId)
  return (
    <div className="grid h-full min-h-56 place-items-center rounded-[1.4rem] border border-paper/15 bg-ink px-5 py-8 text-center text-paper">
      <div>
        <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-saffron">Tablero</p>
        <p className="mt-2 font-display text-2xl">{message}</p>
        {winner ? <p className="mt-2 font-display text-xl text-saffron">Ganó {winner.name}</p> : null}
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

function createTileTexture(label: string) {
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
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function createMonogramTexture(name: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) return new CanvasTexture(canvas)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.beginPath()
  context.arc(64, 64, 58, 0, Math.PI * 2)
  context.fillStyle = PAPER
  context.fill()
  context.lineWidth = 7
  context.strokeStyle = INK
  context.stroke()
  context.fillStyle = INK
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '900 72px Georgia'
  context.fillText(name.trim().slice(0, 1).toUpperCase() || '?', 64, 68)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function createBadgeTexture(label: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) return new CanvasTexture(canvas)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.beginPath()
  context.arc(64, 64, 60, 0, Math.PI * 2)
  context.fillStyle = '#e5ad22'
  context.fill()
  context.fillStyle = INK
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '900 80px Georgia'
  context.fillText(label, 64, 67)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function createCloudTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 192
  const context = canvas.getContext('2d')
  if (!context) return new CanvasTexture(canvas)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.save()
  context.filter = 'blur(8px)'
  context.fillStyle = 'rgb(247 239 217 / 0.9)'
  const puffs: Array<[number, number, number, number]> = [
    [82, 111, 70, 38],
    [166, 86, 92, 54],
    [267, 78, 112, 62],
    [372, 96, 94, 50],
    [448, 113, 58, 33],
  ]
  for (const [x, y, radiusX, radiusY] of puffs) {
    context.beginPath()
    context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function dieFaceValues(topValue: number) {
  const opposite = 7 - topValue
  const available = [1, 2, 3, 4, 5, 6].filter((value) => value !== topValue && value !== opposite)
  const firstSide = available[0]
  const secondSide = available.find((value) => value !== firstSide && value !== 7 - firstSide) ?? available[1]
  return [firstSide, 7 - firstSide, topValue, opposite, secondSide, 7 - secondSide]
}

function createDieFaceTexture(value: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) return new CanvasTexture(canvas)
  context.fillStyle = PAPER
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = INK
  const points: Record<number, Array<[number, number]>> = {
    1: [[128, 128]],
    2: [[72, 72], [184, 184]],
    3: [[72, 72], [128, 128], [184, 184]],
    4: [[72, 72], [184, 72], [72, 184], [184, 184]],
    5: [[72, 72], [184, 72], [128, 128], [72, 184], [184, 184]],
    6: [[72, 66], [184, 66], [72, 128], [184, 128], [72, 190], [184, 190]],
  }
  for (const [x, y] of points[value] ?? points[1]) {
    context.beginPath()
    context.arc(x, y, 22, 0, Math.PI * 2)
    context.fill()
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
