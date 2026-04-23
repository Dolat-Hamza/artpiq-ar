'use client'
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useStore } from '@/store'
import { buildPaintingMesh } from '@/lib/three-builder'
import { Artwork } from '@/types'
import type * as THREE_TYPE from 'three'

export default function WebXRViewer() {
  const { xrOpen, xrArtworks, closeXR, showToast } = useStore()
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const overlayRef  = useRef<HTMLDivElement>(null)
  const hintRef     = useRef<HTMLDivElement>(null)
  const stripRef    = useRef<HTMLDivElement>(null)
  const sessionRef  = useRef<XRSession | null>(null)
  const heldAw      = useRef<Artwork | null>(null)
  const hitMat      = useRef<number[] | null>(null)
  const rendererRef = useRef<THREE_TYPE.WebGLRenderer | null>(null)

  // Placed artwork tracking
  const placedGroups   = useRef<Map<THREE_TYPE.Group, Artwork>>(new Map())
  const selectedGroup  = useRef<THREE_TYPE.Group | null>(null)
  const sceneRef       = useRef<THREE_TYPE.Scene | null>(null)

  function setHint(msg: string) {
    if (hintRef.current) hintRef.current.textContent = msg
  }

  /** Highlight selected group with emissive tint; clear others */
  function applySelection(THREE: typeof THREE_TYPE, group: THREE_TYPE.Group | null) {
    for (const [g] of placedGroups.current) {
      g.traverse(child => {
        if ((child as THREE_TYPE.Mesh).isMesh) {
          const mat = (child as THREE_TYPE.Mesh).material as THREE_TYPE.MeshStandardMaterial
          if (mat && 'emissive' in mat) {
            mat.emissive.set(g === group ? 0xc8a96e : 0x000000)
            mat.emissiveIntensity = g === group ? 0.4 : 0
          }
        }
      })
    }
  }

  async function start() {
    const canvas = canvasRef.current
    if (!canvas || !xrArtworks.length) return

    heldAw.current = xrArtworks[0]
    placedGroups.current.clear()
    selectedGroup.current = null

    const ok = navigator.xr
      ? await navigator.xr.isSessionSupported('immersive-ar').catch(() => false)
      : false

    if (!ok) {
      showToast('WebXR AR not supported — using model-viewer fallback')
      closeXR()
      return
    }

    const THREE = await import('three')

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

    // Reticle ring — gold when placing new, blue when repositioning
    const reticleGeo = new THREE.RingGeometry(0.06, 0.08, 32)
    reticleGeo.rotateX(-Math.PI / 2)
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0xc8a96e, side: THREE.DoubleSide })
    const reticle = new THREE.Mesh(reticleGeo, reticleMat)
    reticle.matrixAutoUpdate = false; reticle.visible = false
    scene.add(reticle)

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

    buildStrip(xrArtworks, xrArtworks[0])

    const raycaster = new THREE.Raycaster()

    session.addEventListener('select', async () => {
      const xrCam = renderer.xr.getCamera()

      // Collect all meshes from placed groups for raycasting
      const meshes: THREE_TYPE.Object3D[] = []
      for (const [g] of placedGroups.current) {
        g.traverse(child => { if ((child as THREE_TYPE.Mesh).isMesh) meshes.push(child) })
      }

      // Raycast from camera center (screen center = where user is looking)
      raycaster.setFromCamera(new THREE.Vector2(0, 0), xrCam)
      const hits = raycaster.intersectObjects(meshes, false)

      if (hits.length > 0) {
        // Find which placed group owns the hit mesh
        let hitGroup: THREE_TYPE.Group | null = null
        for (const [g] of placedGroups.current) {
          if (g.getObjectById(hits[0].object.id)) { hitGroup = g; break }
        }
        if (hitGroup) {
          if (selectedGroup.current === hitGroup) {
            // Tap same artwork again → deselect
            selectedGroup.current = null
            applySelection(THREE, null)
            reticleMat.color.set(0xc8a96e)
            setHint('Aim at wall · tap to place')
          } else {
            // Select this artwork for repositioning
            selectedGroup.current = hitGroup
            applySelection(THREE, hitGroup)
            reticleMat.color.set(0x6eb5c8) // blue reticle = reposition mode
            const aw = placedGroups.current.get(hitGroup)
            setHint(`Moving "${aw?.title.split(' ')[0]}" — aim + tap new spot`)
          }
          if (navigator.vibrate) navigator.vibrate(30)
          return
        }
      }

      // No artwork hit — handle reposition or new placement
      if (!hitMat.current) return

      const hitPos = new THREE.Vector3().setFromMatrixPosition(
        new THREE.Matrix4().fromArray(hitMat.current)
      )
      const xrCamPos = new THREE.Vector3().setFromMatrixPosition(xrCam.matrixWorld)
      const dir = new THREE.Vector3(
        xrCamPos.x - hitPos.x, 0, xrCamPos.z - hitPos.z
      ).normalize()
      const rotation = Math.atan2(dir.x, dir.z)

      if (selectedGroup.current) {
        // Reposition selected artwork
        selectedGroup.current.position.copy(hitPos)
        selectedGroup.current.rotation.y = rotation
        const aw = placedGroups.current.get(selectedGroup.current)
        applySelection(THREE, null)
        selectedGroup.current = null
        reticleMat.color.set(0xc8a96e)
        if (navigator.vibrate) navigator.vibrate(40)
        setHint(`✓ Moved! Tap any artwork to reposition it`)
        void aw // suppress unused warning
      } else if (heldAw.current) {
        // Place new artwork
        const group = await buildPaintingMesh(heldAw.current)
        group.position.copy(hitPos)
        group.rotation.y = rotation
        scene.add(group)
        placedGroups.current.set(group, heldAw.current)
        if (navigator.vibrate) navigator.vibrate(40)
        setHint('✓ Placed! Tap placed artwork to move it')
      }
    })

    renderer.setAnimationLoop((_time, frame) => {
      if (frame) {
        const refSpace = renderer.xr.getReferenceSpace()
        if (hitTestSrc && refSpace) {
          const results = frame.getHitTestResults(hitTestSrc as XRHitTestSource)
          if (results.length > 0) {
            const pose = results[0].getPose(refSpace)
            if (pose) {
              hitMat.current = Array.from(pose.transform.matrix)
              reticle.matrix.fromArray(hitMat.current)
              reticle.visible = true
              if (!hintRef.current?.textContent?.startsWith('Moving') &&
                  !hintRef.current?.textContent?.startsWith('✓')) {
                setHint(selectedGroup.current
                  ? 'Aim at new spot · tap to move here'
                  : 'Aim at wall · tap to place')
              }
            }
          } else {
            reticle.visible = false
            setHint('Scanning for surfaces…')
          }
        }
      }
      renderer.render(scene, camera)
    })

    session.addEventListener('end', () => {
      renderer.setAnimationLoop(null)
      renderer.dispose()
      rendererRef.current = null
      sessionRef.current = null
      sceneRef.current = null
      placedGroups.current.clear()
      selectedGroup.current = null
      closeXR()
    })
  }

  function buildStrip(artworks: Artwork[], active: Artwork) {
    const strip = stripRef.current
    if (!strip) return
    strip.innerHTML = ''
    artworks.filter(a => a.type === 'painting').forEach(aw => {
      const chip = document.createElement('div')
      chip.style.cssText = 'flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer'
      if (aw.thumb) {
        const img = document.createElement('img')
        img.src = aw.thumb; img.alt = aw.title; img.referrerPolicy = 'no-referrer-when-downgrade'
        img.style.cssText = `width:44px;height:44px;border-radius:8px;object-fit:cover;border:2px solid ${aw.id === active.id ? 'var(--accent)' : 'rgba(255,255,255,.25)'};background:#222;`
        chip.appendChild(img)
      }
      const label = document.createElement('span')
      label.textContent = aw.title.split(' ').slice(0, 2).join(' ')
      label.style.cssText = 'font-size:9px;color:rgba(255,255,255,.75);max-width:50px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
      chip.appendChild(label)
      chip.addEventListener('click', () => {
        heldAw.current = aw
        // Clear reposition mode when user picks a new artwork to place
        if (selectedGroup.current && sceneRef.current) {
          // Deselect via emissive clear — need THREE but it's async; use inline traverse
          selectedGroup.current.traverse(child => {
            const mat = (child as THREE_TYPE.Mesh & { material?: THREE_TYPE.MeshStandardMaterial }).material
            if (mat && 'emissive' in mat) {
              mat.emissive.set(0x000000); mat.emissiveIntensity = 0
            }
          })
          selectedGroup.current = null
        }
        strip.querySelectorAll('img').forEach(img => { (img as HTMLImageElement).style.borderColor = 'rgba(255,255,255,.25)' })
        const chipImg = chip.querySelector('img') as HTMLImageElement | null
        if (chipImg) chipImg.style.borderColor = 'var(--accent)'
        setHint('Aim at wall · tap to place')
      })
      strip.appendChild(chip)
    })
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

  function handleClose() {
    if (sessionRef.current) sessionRef.current.end().catch(() => {})
    else closeXR()
  }

  return (
    <AnimatePresence>
      {xrOpen && (
        <motion.div className="fixed inset-0 z-[350]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          <div ref={overlayRef} className="absolute inset-0 flex flex-col pointer-events-none">
            <div className="px-4 py-3.5 flex items-center gap-2.5 pointer-events-all bg-gradient-to-b from-black/72 to-transparent">
              <div className="flex-1 text-[14px] font-semibold text-white">
                Multi-AR ({xrArtworks.filter(a => a.type === 'painting').length} artworks)
              </div>
              <button
                onClick={handleClose}
                className="bg-white/18 backdrop-blur-md border-none text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer pointer-events-all"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex-1" />
            <div className="px-4 pb-6 flex flex-col items-center gap-2 pointer-events-all bg-gradient-to-t from-black/72 to-transparent">
              <div
                ref={hintRef}
                className="bg-black/65 backdrop-blur-lg text-white px-[18px] py-2 rounded-full text-[13px] font-medium text-center"
              >
                Scanning for surfaces…
              </div>
              <div
                ref={stripRef}
                className="flex gap-2 overflow-x-auto py-1 pointer-events-all"
                style={{ scrollbarWidth: 'none' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
