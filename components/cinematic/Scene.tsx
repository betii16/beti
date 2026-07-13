'use client'

// components/cinematic/Scene.tsx
// Scène three.js de l'expérience cinématique. Le modèle GLB est un rendu
// « baked » (matériaux unlit KHR_materials_unlit) : l'éclairage est déjà cuit
// dans les textures, donc pas de lumières temps réel — on garde le rendu
// photoréaliste d'origine et on sculpte l'ambiance avec bloom, vignette,
// halo animé et particules. Canvas en `flat` (pas de tone mapping) pour ne
// pas altérer les couleurs cuites.

import { useRef, useEffect, useMemo, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, ContactShadows } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { MODEL_URL, CINE_VIOLET, type CamState } from '@/lib/cinematic'

type Mouse = MutableRefObject<{ x: number; y: number }>

const _pos = new THREE.Vector3()
const _look = new THREE.Vector3()
const _violet = new THREE.Color(CINE_VIOLET)

/* ── Rig caméra : suit CamState avec amortissement + parallaxe souris ── */
function CameraRig({ cam, mouse }: { cam: CamState; mouse: Mouse }) {
  const { camera } = useThree()
  const look = useRef(new THREE.Vector3(cam.tx, cam.ty, cam.tz))
  useFrame((state, dt) => {
    // Amortissement indépendant du framerate (jamais d'arrêt sec)
    const k = 1 - Math.pow(0.0001, dt)
    const t = state.clock.elapsedTime
    _pos.set(
      cam.x + mouse.current.x * 0.8,
      cam.y - mouse.current.y * 0.5 + Math.sin(t * 0.5) * 0.07, // flottement subtil
      cam.z,
    )
    camera.position.lerp(_pos, k)
    look.current.lerp(_look.set(cam.tx + mouse.current.x * 0.4, cam.ty, cam.tz), k)
    camera.lookAt(look.current)
  })
  return null
}

/* ── Modèle appartement : centré à l'origine, respiration + embrasement ── */
function ApartmentModel({ cam }: { cam: CamState }) {
  const { scene } = useGLTF(MODEL_URL, true)
  const group = useRef<THREE.Group>(null)

  // Recentrage sur l'origine + collecte des matériaux (couleur d'origine
  // mémorisée pour pouvoir interpoler vers le violet final).
  const mats = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    // Centré en x/z, posé sur le sol (y = 0)
    scene.position.set(-center.x, -box.min.y, -center.z)

    const found: { mat: THREE.Material & { color?: THREE.Color }; orig: THREE.Color }[] = []
    scene.traverse(obj => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      list.forEach(m => {
        const mat = m as THREE.Material & { color?: THREE.Color }
        if (mat.color && !found.some(f => f.mat === mat)) found.push({ mat, orig: mat.color.clone() })
      })
    })
    return found
  }, [scene])

  useFrame(state => {
    const t = state.clock.elapsedTime
    if (group.current) {
      // Respiration + rotation lente pendant le héros (amplitude → 0 ensuite,
      // oscillation bornée pour ne jamais désaxer les vues des sections)
      group.current.position.y = Math.sin(t * 0.4) * 0.05
      group.current.rotation.y = Math.sin(t * 0.12) * 0.1 * cam.spin
    }
    // Embrasement violet final (matériaux unlit → on teinte la couleur de base)
    for (const { mat, orig } of mats) {
      mat.color!.copy(orig).lerp(_violet, cam.tint * 0.85)
    }
  })

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  )
}

/* ── Halo animé : anneau + disque lumineux sur la zone mise en avant ── */
function HighlightPulse({ cam }: { cam: CamState }) {
  const group = useRef<THREE.Group>(null)
  const ringMat = useRef<THREE.MeshBasicMaterial>(null)
  const discMat = useRef<THREE.MeshBasicMaterial>(null)
  const color = useRef(new THREE.Color(CINE_VIOLET))

  useFrame(state => {
    const t = state.clock.elapsedTime
    if (!group.current) return
    // y = 0.32 : au-dessus de la dalle du plancher ; depthTest désactivé
    // (voir matériaux) → lisible même à travers les murs, façon « scanner ».
    group.current.position.set(cam.hx, 0.32, cam.hz)
    const pulse = 1 + Math.sin(t * 2.2) * 0.09
    group.current.scale.setScalar(pulse)
    color.current.set(cam.hColor)
    if (ringMat.current) {
      ringMat.current.color.copy(color.current)
      ringMat.current.opacity = cam.hOp * (0.75 + Math.sin(t * 2.2) * 0.2)
    }
    if (discMat.current) {
      discMat.current.color.copy(color.current)
      discMat.current.opacity = cam.hOp * 0.16
    }
  })

  return (
    <group ref={group} rotation={[-Math.PI / 2, 0, 0]} renderOrder={999}>
      <mesh renderOrder={999}>
        <ringGeometry args={[1.15, 1.3, 64]} />
        <meshBasicMaterial ref={ringMat} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh renderOrder={998}>
        <circleGeometry args={[1.15, 48]} />
        <meshBasicMaterial ref={discMat} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  )
}

/* ── Particules thématiques : un système unique dont le comportement change
      selon la section active (cam.zone) — bulles d'eau qui montent (plomberie),
      étincelles orbitales (électricité), copeaux qui tombent (menuiserie),
      pigments en spirale (peinture), flux d'air horizontal (climatisation).
      Position = zone du halo, opacité = cam.hOp. ── */
const ZONE_COUNT = 90
function ZoneParticles({ cam }: { cam: CamState }) {
  const points = useRef<THREE.Points>(null)
  const mat = useRef<THREE.PointsMaterial>(null)
  const color = useRef(new THREE.Color(CINE_VIOLET))
  // seeds[i] = phase/rayon/vitesse propres à chaque particule
  const { geo, seeds } = useMemo(() => {
    const arr = new Float32Array(ZONE_COUNT * 3)
    const s = new Float32Array(ZONE_COUNT * 3)
    for (let i = 0; i < ZONE_COUNT; i++) {
      s[i * 3] = Math.random() * Math.PI * 2       // phase
      s[i * 3 + 1] = 0.25 + Math.random() * 1.1    // rayon
      s[i * 3 + 2] = 0.5 + Math.random()           // vitesse
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return { geo: g, seeds: s }
  }, [])
  useEffect(() => () => geo.dispose(), [geo])

  useFrame(state => {
    if (!points.current || !mat.current) return
    const t = state.clock.elapsedTime
    const pos = geo.attributes.position.array as Float32Array
    const zone = cam.zone
    for (let i = 0; i < ZONE_COUNT; i++) {
      const ph = seeds[i * 3], r = seeds[i * 3 + 1], sp = seeds[i * 3 + 2]
      let x = 0, y = 0, z = 0
      if (zone === 0) {          // plomberie : bulles qui montent en colonne
        const cyc = (t * sp * 0.35 + ph) % 1
        x = Math.cos(ph + t * 0.4) * r * 0.45
        z = Math.sin(ph + t * 0.4) * r * 0.45
        y = cyc * 2.2
      } else if (zone === 1) {   // électricité : étincelles orbitales rapides
        const a = ph + t * sp * 2.4
        x = Math.cos(a) * r
        z = Math.sin(a) * r
        y = 0.5 + Math.sin(a * 3 + ph) * 0.5
      } else if (zone === 2) {   // menuiserie : copeaux qui retombent doucement
        const cyc = 1 - ((t * sp * 0.25 + ph) % 1)
        x = Math.cos(ph) * r + Math.sin(t * 1.6 + ph) * 0.14
        z = Math.sin(ph) * r
        y = cyc * 1.7
      } else if (zone === 3) {   // peinture : pigments en spirale ascendante
        const a = ph + t * sp * 0.9
        const cyc = (t * sp * 0.3 + ph) % 1
        x = Math.cos(a) * r * (1 - cyc * 0.5)
        z = Math.sin(a) * r * (1 - cyc * 0.5)
        y = cyc * 2
      } else {                   // climatisation : flux d'air horizontal
        const cyc = (t * sp * 0.5 + ph) % 1
        x = (cyc - 0.5) * 3.2
        z = Math.sin(ph) * r * 0.6
        y = 1 + Math.sin(ph * 2) * 0.55 + Math.sin(t * 2 + ph) * 0.08
      }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z
    }
    geo.attributes.position.needsUpdate = true
    points.current.position.set(cam.hx, 0.25, cam.hz)
    color.current.set(cam.hColor)
    mat.current.color.copy(color.current)
    mat.current.opacity = cam.hOp * 0.85
  })

  return (
    <points ref={points} geometry={geo} frustumCulled={false} renderOrder={997}>
      <pointsMaterial ref={mat} size={0.065} transparent opacity={0} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

/* ── Poussière : nappe de particules dérivant lentement au-dessus du modèle ── */
function DustParticles() {
  const points = useRef<THREE.Points>(null)
  const geo = useMemo(() => {
    const n = 260
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40
      arr[i * 3 + 1] = Math.random() * 9 + 0.5
      arr[i * 3 + 2] = (Math.random() - 0.5) * 16
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  useFrame(state => {
    if (!points.current) return
    const t = state.clock.elapsedTime
    points.current.rotation.y = t * 0.012
    points.current.position.y = Math.sin(t * 0.3) * 0.25
  })
  return (
    <points ref={points} geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.055} color="#b9a9ff" transparent opacity={0.4} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

/* ── Bloom dont l'intensité suit l'embrasement final ── */
function AnimatedBloom({ cam }: { cam: CamState }) {
  const bloom = useRef<any>(null)
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = 0.32 + cam.tint * 1.6
  })
  return <Bloom ref={bloom} intensity={0.32} luminanceThreshold={0.82} luminanceSmoothing={0.3} mipmapBlur />
}

useGLTF.preload(MODEL_URL, true)

/* ── Canvas principal ── */
export default function Scene({ cam, mouse }: { cam: CamState; mouse: Mouse }) {
  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      camera={{ fov: 42, near: 0.5, far: 140, position: [0, 15, 17] }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <CameraRig cam={cam} mouse={mouse} />
      <ApartmentModel cam={cam} />
      <HighlightPulse cam={cam} />
      <ZoneParticles cam={cam} />
      <DustParticles />
      <ContactShadows position={[0, -0.02, 0]} scale={44} blur={2.6} far={5} opacity={0.32} frames={1} />
      <EffectComposer multisampling={0}>
        <AnimatedBloom cam={cam} />
        <Vignette eskil={false} offset={0.28} darkness={0.55} />
      </EffectComposer>
    </Canvas>
  )
}
