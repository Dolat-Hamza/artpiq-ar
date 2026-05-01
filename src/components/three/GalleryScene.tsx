'use client'
import { Component, Suspense, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Artwork, VirtualExhibition } from '@/types'

// Per-artwork error boundary — keeps a single bad texture from killing the scene.
class ArtworkBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() { /* swallow */ }
  render() {
    if (this.state.failed) return null
    return this.props.children as React.ReactElement
  }
}

// Box gallery: 16m × 16m room, 4m tall walls.
const ROOM_W = 16
const ROOM_H = 4
const WALL_THICKNESS = 0.1

const WALL_PLACEMENTS: Array<{
  position: [number, number, number]
  rotationY: number
  size: [number, number]
}> = [
  // North wall (z = -ROOM_W/2), faces +Z
  { position: [0, ROOM_H / 2, -ROOM_W / 2 + 0.01], rotationY: 0, size: [ROOM_W, ROOM_H] },
  // East wall (x = +ROOM_W/2), faces -X
  { position: [ROOM_W / 2 - 0.01, ROOM_H / 2, 0], rotationY: -Math.PI / 2, size: [ROOM_W, ROOM_H] },
  // South wall (z = +ROOM_W/2), faces -Z
  { position: [0, ROOM_H / 2, ROOM_W / 2 - 0.01], rotationY: Math.PI, size: [ROOM_W, ROOM_H] },
  // West wall (x = -ROOM_W/2), faces +X
  { position: [-ROOM_W / 2 + 0.01, ROOM_H / 2, 0], rotationY: Math.PI / 2, size: [ROOM_W, ROOM_H] },
]

function ArtworkPlane({
  src,
  wall,
  position01,
  height01,
  scale,
  ar,
}: {
  src: string
  wall: 0 | 1 | 2 | 3
  position01: number // 0..1 along wall
  height01: number // 0..1 vertical (0 = floor, 1 = ceiling)
  scale: number
  ar: number // height/width
}) {
  const tex = useTexture(src)
  tex.anisotropy = 8
  const w = WALL_PLACEMENTS[wall]
  const baseW = 1.2 * scale
  const baseH = baseW * ar
  // Position along wall (-W/2 ... +W/2 of wall length axis)
  const halfRoom = ROOM_W / 2
  const along = (position01 - 0.5) * (ROOM_W - 2)
  const y = ROOM_H * Math.min(0.85, Math.max(0.15, height01))
  // Compute world position based on wall index
  let pos: [number, number, number]
  let rotY = w.rotationY
  if (wall === 0) pos = [along, y, -halfRoom + 0.05]
  else if (wall === 1) pos = [halfRoom - 0.05, y, along]
  else if (wall === 2) pos = [-along, y, halfRoom - 0.05]
  else pos = [-halfRoom + 0.05, y, -along]
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* Frame backing */}
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[baseW + 0.06, baseH + 0.06]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <mesh>
        <planeGeometry args={[baseW, baseH]} />
        <meshStandardMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Walls({ color }: { color: string }) {
  return (
    <group>
      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_W]} />
        <meshStandardMaterial color="#9a9a9a" />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, ROOM_H, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[ROOM_W, ROOM_W]} />
        <meshStandardMaterial color="#f8f8f8" />
      </mesh>
      {/* 4 walls */}
      {WALL_PLACEMENTS.map((w, i) => (
        <mesh key={i} position={w.position} rotation={[0, w.rotationY, 0]}>
          <boxGeometry args={[w.size[0], w.size[1], WALL_THICKNESS]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  )
}

function FirstPersonControls() {
  const { camera } = useThree()
  const keys = useRef<Record<string, boolean>>({})
  const dir = useRef(new THREE.Vector3())
  useEffect(() => {
    camera.position.set(0, 1.6, ROOM_W / 2 - 1)
    const onDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true
    }
    const onUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [camera])
  useFrame((_state, delta) => {
    const speed = 4 * delta
    const k = keys.current
    camera.getWorldDirection(dir.current)
    dir.current.y = 0
    dir.current.normalize()
    // forward × up gives a +X-pointing right vector in three.js right-handed coords
    const right = new THREE.Vector3().crossVectors(dir.current, new THREE.Vector3(0, 1, 0))
    if (k['KeyW'] || k['ArrowUp']) camera.position.addScaledVector(dir.current, speed)
    if (k['KeyS'] || k['ArrowDown']) camera.position.addScaledVector(dir.current, -speed)
    if (k['KeyA'] || k['ArrowLeft']) camera.position.addScaledVector(right, -speed)
    if (k['KeyD'] || k['ArrowRight']) camera.position.addScaledVector(right, speed)
    // Clamp to room
    const half = ROOM_W / 2 - 0.6
    camera.position.x = Math.max(-half, Math.min(half, camera.position.x))
    camera.position.z = Math.max(-half, Math.min(half, camera.position.z))
    camera.position.y = 1.6
  })
  return <PointerLockControls />
}

export default function GalleryScene({
  exhibition,
  artworks,
}: {
  exhibition: VirtualExhibition
  artworks: Artwork[]
}) {
  const artById = useMemo(() => {
    const m = new Map<string, Artwork>()
    for (const a of artworks) m.set(a.id, a)
    return m
  }, [artworks])
  return (
    <Canvas
      shadows
      camera={{ fov: 70, near: 0.05, far: 100, position: [0, 1.6, ROOM_W / 2 - 1] }}
      style={{ background: '#1a1a1a', height: '100%', width: '100%' }}
    >
      <ambientLight intensity={0.55 * (exhibition.lighting?.intensity ?? 1)} />
      <directionalLight position={[5, 6, 5]} intensity={0.6 * (exhibition.lighting?.intensity ?? 1)} castShadow />
      <Walls color={exhibition.wallColor || '#f4f4f4'} />
      {exhibition.wallArtworks.map((wa, i) => {
        const aw = artById.get(wa.artworkId)
        if (!aw || !aw.image) return null
        const ar = aw.heightCm / aw.widthCm
        return (
          <ArtworkBoundary key={i}>
            <Suspense fallback={null}>
              <ArtworkPlane
                src={aw.image}
                wall={wa.wall}
                position01={wa.position}
                height01={wa.height}
                scale={wa.scale}
                ar={ar}
              />
            </Suspense>
          </ArtworkBoundary>
        )
      })}
      <FirstPersonControls />
    </Canvas>
  )
}
