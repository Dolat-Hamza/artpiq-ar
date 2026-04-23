'use client'
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useStore } from '@/store'
import { buildPaintingMesh } from '@/lib/three-builder'
import { Artwork } from '@/types'

export default function WebXRViewer() {
  const { xrOpen, xrArtworks, closeXR, showToast } = useStore()
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const overlayRef  = useRef<HTMLDivElement>(null)
  const hintRef     = useRef<HTMLDivElement>(null)
  const stripRef    = useRef<HTMLDivElement>(null)
  const sessionRef  = useRef<XRSession | null>(null)
  const heldAw      = useRef<Artwork | null>(null)
  const hitMat      = useRef<number[] | null>(null)
  const rendererRef = useRef<import('three').WebGLRenderer | null>(null)

  function setHint(msg: string) {
    if (hintRef.current) hintRef.current.textContent = msg
  }

  async function start() {
    const canvas = canvasRef.current
    if (!canvas || !xrArtworks.length) return

    heldAw.current = xrArtworks[0]

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

    const scene  = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const key = new THREE.DirectionalLight(0xfff8f0, 1.1); key.position.set(0, 2, 1); scene.add(key)
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20)

    const reticleGeo = new THREE.RingGeometry(0.06, 0.08, 32)
    reticleGeo.rotateX(-Math.PI / 2)
    const reticle = new THREE.Mesh(reticleGeo, new THREE.MeshBasicMaterial({ color: 0xc8a96e, side: THREE.DoubleSide }))
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

    // Build artwork strip UI
    buildStrip(xrArtworks, xrArtworks[0])

    session.addEventListener('select', async () => {
      if (!hitMat.current || !heldAw.current) return
      const group = await buildPaintingMesh(heldAw.current)
      const hitPos = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(hitMat.current))
      const xrCam  = renderer.xr.getCamera()
      const camPos = new THREE.Vector3().setFromMatrixPosition(xrCam.matrixWorld)
      group.position.copy(hitPos)
      const dir = new THREE.Vector3(camPos.x - hitPos.x, 0, camPos.z - hitPos.z).normalize()
      group.rotation.y = Math.atan2(dir.x, dir.z)
      scene.add(group)
      if (navigator.vibrate) navigator.vibrate(40)
      setHint('✓ Placed! Select artwork below to add more')
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
              reticle.matrix.fromArray(hitMat.current); reticle.visible = !!heldAw.current
              setHint('Aim at wall · tap to place')
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
      closeXR()
    })
  }

  function buildStrip(artworks: Artwork[], active: Artwork) {
    const strip = stripRef.current
    if (!strip) return
    strip.innerHTML = ''
    artworks.filter(a => a.type === 'painting').forEach(aw => {
      const chip = document.createElement('div')
      chip.className = `flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer`
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
        strip.querySelectorAll('img').forEach(img => { img.style.borderColor = 'rgba(255,255,255,.25)' })
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
    }
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
              <button onClick={handleClose} className="bg-white/18 backdrop-blur-md border-none text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer pointer-events-all">
                <X size={15} />
              </button>
            </div>
            <div className="flex-1" />
            <div className="px-4 pb-6 flex flex-col items-center gap-2 pointer-events-all bg-gradient-to-t from-black/72 to-transparent">
              <div ref={hintRef} className="bg-black/65 backdrop-blur-lg text-white px-[18px] py-2 rounded-full text-[13px] font-medium text-center">
                Scanning for surfaces…
              </div>
              <div ref={stripRef} className="flex gap-2 overflow-x-auto py-1 pointer-events-all" style={{ scrollbarWidth: 'none' }} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
