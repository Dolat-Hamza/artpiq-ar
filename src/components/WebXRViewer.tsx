'use client'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Trash2, Check, Hand } from 'lucide-react'
import { useStore } from '@/store'
import { buildPaintingMesh, preloadArtworkTextures } from '@/lib/three-builder'
import { Artwork } from '@/types'
import type * as THREE_TYPE from 'three'

type Mode = 'placing' | 'moving'

export default function WebXRViewer() {
  const { xrOpen, xrArtworks, closeXR, showToast } = useStore()

  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const overlayRef  = useRef<HTMLDivElement>(null)
  const sessionRef  = useRef<XRSession | null>(null)
  const rendererRef = useRef<THREE_TYPE.WebGLRenderer | null>(null)
  const sceneRef    = useRef<THREE_TYPE.Scene | null>(null)
  const reticleRef  = useRef<THREE_TYPE.Mesh | null>(null)
  const threeRef    = useRef<typeof THREE_TYPE | null>(null)

  const heldAw         = useRef<Artwork | null>(null)
  const hitMat         = useRef<number[] | null>(null)
  const placedGroups   = useRef<Map<THREE_TYPE.Group, Artwork>>(new Map())
  const selectedGroup  = useRef<THREE_TYPE.Group | null>(null)

  // React state for overlay UI (outside XR render loop)
  const [hint, setHint]             = useState('Scanning for surfaces…')
  const [mode, setMode]             = useState<Mode>('placing')
  const [placedCount, setPlacedCnt] = useState(0)
  const [activeId, setActiveId]     = useState<string | null>(null)
  const [showTutorial, setShowTut]  = useState(false)
  const [selectedLabel, setSelLbl]  = useState<string | null>(null)

  const paintings = xrArtworks.filter(a => a.type === 'painting')
  const totalToPlace = paintings.length

  /** Visual highlight for selected group (emissive glow) */
  function highlight(group: THREE_TYPE.Group | null) {
    const THREE = threeRef.current
    if (!THREE) return
    for (const [g] of placedGroups.current) {
      g.traverse(child => {
        const mesh = child as THREE_TYPE.Mesh
        if (mesh.isMesh) {
          const mat = mesh.material as THREE_TYPE.MeshStandardMaterial
          if (mat && 'emissive' in mat) {
            mat.emissive.set(g === group ? 0xc8a96e : 0x000000)
            mat.emissiveIntensity = g === group ? 0.45 : 0
          }
        }
      })
    }
  }

  /** Pick next unplaced painting from strip; null if all placed */
  function pickNextUnplaced(): Artwork | null {
    const placedIds = new Set(Array.from(placedGroups.current.values()).map(a => a.id))
    return paintings.find(a => !placedIds.has(a.id)) ?? null
  }

  /** Deselect and return to placing mode */
  function deselect() {
    selectedGroup.current = null
    highlight(null)
    setSelLbl(null)
    setMode('placing')
    if (reticleRef.current) {
      const mat = reticleRef.current.material as THREE_TYPE.MeshBasicMaterial
      mat.color.set(0xc8a96e)
    }
  }

  /** Smooth scale-in animation for newly placed group */
  function animatePlacement(group: THREE_TYPE.Group) {
    const start = performance.now()
    const duration = 280
    const targetScale = group.scale.x
    group.scale.set(0.01, 0.01, 0.01)
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const s = 0.01 + (targetScale - 0.01) * eased
      group.scale.set(s, s, s)
      if (t < 1) requestAnimationFrame(tick)
    }
    tick()
  }

  async function start() {
    const canvas = canvasRef.current
    if (!canvas || !xrArtworks.length) return

    const ok = navigator.xr
      ? await navigator.xr.isSessionSupported('immersive-ar').catch(() => false)
      : false
    if (!ok) {
      showToast('WebXR AR not supported — using model-viewer fallback')
      closeXR()
      return
    }

    // Preload all textures BEFORE entering XR — prevents empty-frame bug
    await preloadArtworkTextures(paintings)

    heldAw.current = paintings[0] ?? null
    setActiveId(heldAw.current?.id ?? null)
    placedGroups.current.clear()
    selectedGroup.current = null
    setPlacedCnt(0)
    setMode('placing')
    setSelLbl(null)

    // Show tutorial once per browser
    if (!localStorage.getItem('xr-tutorial-seen')) {
      setShowTut(true)
      setTimeout(() => setShowTut(false), 4500)
      localStorage.setItem('xr-tutorial-seen', '1')
    }

    const THREE = await import('three')
    threeRef.current = THREE

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    sceneRef.current = scene
    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const key = new THREE.DirectionalLight(0xfff8f0, 1.1)
    key.position.set(0, 2, 1); scene.add(key)

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20)

    // Reticle: dual-ring with pulse animation
    const reticleGroup = new THREE.Group()
    const outerGeo = new THREE.RingGeometry(0.06, 0.075, 32); outerGeo.rotateX(-Math.PI / 2)
    const innerGeo = new THREE.RingGeometry(0.015, 0.022, 24); innerGeo.rotateX(-Math.PI / 2)
    const retMat = new THREE.MeshBasicMaterial({ color: 0xc8a96e, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
    const outer = new THREE.Mesh(outerGeo, retMat)
    const inner = new THREE.Mesh(innerGeo, retMat)
    reticleGroup.add(outer); reticleGroup.add(inner)
    reticleGroup.matrixAutoUpdate = false
    reticleGroup.visible = false
    scene.add(reticleGroup)
    reticleRef.current = outer as unknown as THREE_TYPE.Mesh // for color updates via mat ref

    let session: XRSession
    try {
      session = await navigator.xr!.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: overlayRef.current ? { root: overlayRef.current } : undefined,
      })
      sessionRef.current = session
    } catch (err) {
      renderer.dispose()
      showToast('AR failed: ' + (err instanceof Error ? err.message : 'unknown'))
      closeXR()
      return
    }

    await renderer.xr.setSession(session)
    const viewerSpace = await session.requestReferenceSpace('viewer')
    const hitTestSrc  = await session.requestHitTestSource!({ space: viewerSpace })

    const raycaster = new THREE.Raycaster()

    session.addEventListener('select', async () => {
      const xrCam = renderer.xr.getCamera()

      // Raycast from screen center against all placed meshes
      const meshes: THREE_TYPE.Object3D[] = []
      for (const [g] of placedGroups.current) {
        g.traverse(child => { if ((child as THREE_TYPE.Mesh).isMesh) meshes.push(child) })
      }
      raycaster.setFromCamera(new THREE.Vector2(0, 0), xrCam)
      const hits = raycaster.intersectObjects(meshes, false)

      if (hits.length > 0) {
        let hitGroup: THREE_TYPE.Group | null = null
        for (const [g] of placedGroups.current) {
          if (g.getObjectById(hits[0].object.id)) { hitGroup = g; break }
        }
        if (hitGroup) {
          if (selectedGroup.current === hitGroup) {
            deselect()
          } else {
            selectedGroup.current = hitGroup
            highlight(hitGroup)
            const aw = placedGroups.current.get(hitGroup)!
            setSelLbl(aw.title)
            setMode('moving')
            retMat.color.set(0x6eb5c8) // blue = reposition
          }
          if (navigator.vibrate) navigator.vibrate(30)
          return
        }
      }

      // Empty-surface tap: reposition selected OR place new
      if (!hitMat.current) return

      const hitPos = new THREE.Vector3().setFromMatrixPosition(
        new THREE.Matrix4().fromArray(hitMat.current)
      )
      const xrCamPos = new THREE.Vector3().setFromMatrixPosition(xrCam.matrixWorld)
      const dir = new THREE.Vector3(xrCamPos.x - hitPos.x, 0, xrCamPos.z - hitPos.z).normalize()
      const yaw = Math.atan2(dir.x, dir.z)

      if (selectedGroup.current) {
        selectedGroup.current.position.copy(hitPos)
        selectedGroup.current.rotation.y = yaw
        if (navigator.vibrate) navigator.vibrate(40)
        deselect()
      } else if (heldAw.current) {
        const group = await buildPaintingMesh(heldAw.current)
        group.position.copy(hitPos)
        group.rotation.y = yaw
        scene.add(group)
        placedGroups.current.set(group, heldAw.current)
        setPlacedCnt(placedGroups.current.size)
        animatePlacement(group)
        if (navigator.vibrate) navigator.vibrate([30, 30, 50])

        // Auto-advance: pick next unplaced artwork
        const next = pickNextUnplaced()
        if (next) {
          heldAw.current = next
          setActiveId(next.id)
        } else {
          heldAw.current = null
          setActiveId(null)
          showToast('All artworks placed! Tap any to move or delete')
        }
      }
    })

    renderer.setAnimationLoop((time, frame) => {
      // Reticle pulse
      const pulse = 0.92 + Math.sin(time * 0.004) * 0.08
      reticleGroup.scale.setScalar(pulse)

      if (frame) {
        const refSpace = renderer.xr.getReferenceSpace()
        if (hitTestSrc && refSpace) {
          const results = frame.getHitTestResults(hitTestSrc as XRHitTestSource)
          if (results.length > 0) {
            const pose = results[0].getPose(refSpace)
            if (pose) {
              hitMat.current = Array.from(pose.transform.matrix)
              reticleGroup.matrix.fromArray(hitMat.current)
              reticleGroup.visible = true
            }
          } else {
            reticleGroup.visible = false
          }
        }
      }
      renderer.render(scene, camera)
    })

    session.addEventListener('end', cleanup)
  }

  function cleanup() {
    const r = rendererRef.current
    if (r) { r.setAnimationLoop(null); r.dispose() }
    rendererRef.current = null
    sessionRef.current = null
    sceneRef.current = null
    threeRef.current = null
    reticleRef.current = null
    placedGroups.current.clear()
    selectedGroup.current = null
    closeXR()
  }

  /** Delete selected group from scene */
  function handleDelete() {
    const g = selectedGroup.current
    const scene = sceneRef.current
    if (!g || !scene) return
    scene.remove(g)
    g.traverse(child => {
      const mesh = child as THREE_TYPE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = mesh.material as THREE_TYPE.Material | THREE_TYPE.Material[]
      if (Array.isArray(mat)) mat.forEach(m => m.dispose())
      else if (mat) mat.dispose()
    })
    placedGroups.current.delete(g)
    setPlacedCnt(placedGroups.current.size)
    // If this was the last of its kind, make it available to place again
    const aw = placedGroups.current.get(g) // undefined since we just deleted
    void aw
    deselect()
    // Refresh held artwork to next unplaced
    const next = pickNextUnplaced()
    heldAw.current = next
    setActiveId(next?.id ?? null)
    if (navigator.vibrate) navigator.vibrate(50)
  }

  /** Pick artwork from strip */
  function pickFromStrip(aw: Artwork) {
    // If already placed, select it instead (highlight + reposition)
    const placed = Array.from(placedGroups.current.entries()).find(([, a]) => a.id === aw.id)
    if (placed) {
      selectedGroup.current = placed[0]
      highlight(placed[0])
      setSelLbl(aw.title)
      setMode('moving')
      const THREE = threeRef.current
      if (THREE && reticleRef.current) {
        const mat = (reticleRef.current as unknown as THREE_TYPE.Mesh).material as THREE_TYPE.MeshBasicMaterial
        mat.color.set(0x6eb5c8)
      }
      return
    }
    if (selectedGroup.current) deselect()
    heldAw.current = aw
    setActiveId(aw.id)
  }

  useEffect(() => {
    if (xrOpen) start()
    return () => {
      if (sessionRef.current) { sessionRef.current.end().catch(() => {}); sessionRef.current = null }
      if (rendererRef.current) { rendererRef.current.dispose(); rendererRef.current = null }
      placedGroups.current.clear()
      selectedGroup.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xrOpen])

  // Derived hint text based on mode + state
  useEffect(() => {
    if (mode === 'moving') setHint(`Moving "${selectedLabel}" — tap new spot`)
    else if (placedCount === 0) setHint('Aim at wall · tap to place')
    else if (placedCount < totalToPlace) setHint(`${placedCount}/${totalToPlace} placed · tap next spot`)
    else setHint('All placed · tap art to move, delete to remove')
  }, [mode, selectedLabel, placedCount, totalToPlace])

  function handleClose() {
    if (sessionRef.current) sessionRef.current.end().catch(() => {})
    else closeXR()
  }

  const placedIds = new Set(Array.from(placedGroups.current.values()).map(a => a.id))

  return (
    <AnimatePresence>
      {xrOpen && (
        <motion.div className="fixed inset-0 z-[350]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

          <div ref={overlayRef} className="absolute inset-0 flex flex-col pointer-events-none">
            {/* Top bar */}
            <div className="px-4 py-3 flex items-center gap-3 pointer-events-auto bg-gradient-to-b from-black/75 via-black/30 to-transparent">
              <div className="flex-1 flex items-center gap-2">
                <div className="text-white text-[13px] font-semibold tracking-tight">Live AR</div>
                <div className="text-white/75 text-[12px] tabular-nums bg-white/10 px-2 py-0.5 rounded-full">
                  {placedCount}/{totalToPlace} placed
                </div>
              </div>
              {mode === 'moving' && (
                <button
                  onClick={handleDelete}
                  aria-label="Delete"
                  className="bg-red-500/85 backdrop-blur-md border-none text-white h-9 px-3 rounded-full flex items-center gap-1.5 cursor-pointer text-[12px] font-medium active:scale-95 transition-transform"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <button
                onClick={handleClose}
                aria-label="Close"
                className="bg-white/18 backdrop-blur-md border-none text-white w-9 h-9 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tutorial card — one-time */}
            <AnimatePresence>
              {showTutorial && (
                <motion.div
                  initial={{ opacity: 0, y: -12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="mx-4 mt-1 pointer-events-auto bg-black/85 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg"
                >
                  <div className="text-white text-[13px] font-semibold mb-2 flex items-center gap-1.5">
                    <Hand size={14} /> How to use
                  </div>
                  <ul className="text-white/85 text-[12px] space-y-1 leading-snug">
                    <li>• <b>Point</b> at a wall — reticle locks on</li>
                    <li>• <b>Tap</b> to place selected artwork</li>
                    <li>• <b>Tap placed art</b> to select it, then tap new spot to move</li>
                    <li>• <b>Delete</b> button removes selected artwork</li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1" />

            {/* Bottom dock */}
            <div className="px-3 pb-5 pt-2 flex flex-col items-center gap-2 pointer-events-auto bg-gradient-to-t from-black/78 via-black/40 to-transparent">
              {/* Hint */}
              <motion.div
                key={hint}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`backdrop-blur-xl text-white px-4 py-2 rounded-full text-[12.5px] font-medium text-center max-w-[90%] ${
                  mode === 'moving' ? 'bg-[#6eb5c8]/85' : 'bg-black/70'
                }`}
              >
                {mode === 'moving' && <Check className="inline -mt-0.5 mr-1" size={12} />}
                {hint}
              </motion.div>

              {/* Artwork strip */}
              <div className="flex gap-2 overflow-x-auto py-1 w-full justify-start" style={{ scrollbarWidth: 'none' }}>
                {paintings.map(aw => {
                  const isPlaced = placedIds.has(aw.id)
                  const isActive = activeId === aw.id
                  return (
                    <button
                      key={aw.id}
                      onClick={() => pickFromStrip(aw)}
                      className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer bg-transparent border-none p-0 active:scale-95 transition-transform"
                    >
                      <div className="relative">
                        {aw.thumb && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={aw.thumb}
                            alt={aw.title}
                            referrerPolicy="no-referrer-when-downgrade"
                            style={{
                              width: 48, height: 48, borderRadius: 10, objectFit: 'cover',
                              border: `2px solid ${isActive ? '#c8a96e' : isPlaced ? '#6eb5c8' : 'rgba(255,255,255,.22)'}`,
                              background: '#222',
                              opacity: isPlaced && !isActive ? 0.55 : 1,
                            }}
                          />
                        )}
                        {isPlaced && (
                          <div className="absolute -top-1 -right-1 bg-[#6eb5c8] rounded-full w-4 h-4 flex items-center justify-center">
                            <Check size={10} className="text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-white/75 max-w-[52px] truncate">
                        {aw.title.split(' ').slice(0, 2).join(' ')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
