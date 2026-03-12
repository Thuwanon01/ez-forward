import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import fontJson from 'three/examples/fonts/helvetiker_regular.typeface.json'
import * as CANNON from 'cannon-es'

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color('#060818')
scene.fog = new THREE.Fog('#060818', 45, 180)

const ambientLight = new THREE.AmbientLight('#ffffff', 1.2)
scene.add(ambientLight)

const sunLight = new THREE.DirectionalLight('#ffffff', 1.1)
sunLight.position.set(6, 14, 10)
scene.add(sunLight)

const loader = new FontLoader()
const font = loader.parse(fontJson)

const textY = 2
const textGeometryOptions = {
    font: font,
    size: 4,
    depth: 1,
    curveSegments: 12
}
const material = new THREE.MeshStandardMaterial({ color: 0xff4d4d, roughness: 0.35, metalness: 0.1 })
const characterItems = []

// Universe star field
const starCount = 2000
const starPositions = new Float32Array(starCount * 3)
for (let i = 0; i < starCount; i++) {
    const i3 = i * 3
    starPositions[i3] = (Math.random() - 0.5) * 260
    starPositions[i3 + 1] = (Math.random() - 0.5) * 180
    starPositions[i3 + 2] = (Math.random() - 0.5) * 260
}

const starsGeometry = new THREE.BufferGeometry()
starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
const starsMaterial = new THREE.PointsMaterial({
    color: '#dbe8ff',
    size: 0.25,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
})
const stars = new THREE.Points(starsGeometry, starsMaterial)
scene.add(stars)

// Physics world
const world = new CANNON.World()
world.gravity.set(0, 0, 0)

const buildGlyphs = (text) => {
    const glyphs = []
    const letterSpacing = 0.25
    let cursorX = 0

    for (const char of text) {
        if (char === ' ') {
            cursorX += textGeometryOptions.size * 0.45
            continue
        }

        const geometry = new TextGeometry(char, textGeometryOptions)
        geometry.computeBoundingBox()
        const bounds = geometry.boundingBox
        const width = bounds.max.x - bounds.min.x
        const height = bounds.max.y - bounds.min.y
        const depth = bounds.max.z - bounds.min.z

        // Center each glyph around its own origin for clean physics syncing.
        geometry.translate(
            -(bounds.min.x + width * 0.5),
            -(bounds.min.y + height * 0.5),
            -(bounds.min.z + depth * 0.5)
        )

        glyphs.push({ geometry, width, height, depth, offsetX: cursorX })
        cursorX += width + letterSpacing
    }

    return {
        glyphs,
        totalWidth: Math.max(0, cursorX - letterSpacing)
    }
}

const setCharacterText = (nextText, nextColor) => {
    characterItems.forEach((character) => {
        scene.remove(character.mesh)
        world.removeBody(character.body)
        character.mesh.geometry.dispose()
    })
    characterItems.length = 0

    material.color.set(nextColor)
    const { glyphs, totalWidth } = buildGlyphs(nextText)
    const startX = -totalWidth * 0.5

    glyphs.forEach((glyph) => {
        const letterX = startX + glyph.offsetX + glyph.width * 0.5
        const letterMesh = new THREE.Mesh(glyph.geometry, material)
        letterMesh.position.set(letterX, textY, 0)
        scene.add(letterMesh)

        const letterBody = new CANNON.Body({
            mass: 1.5,
            shape: new CANNON.Box(
                new CANNON.Vec3(
                    Math.max(0.2, glyph.width * 0.5),
                    Math.max(0.2, glyph.height * 0.5),
                    Math.max(0.2, glyph.depth * 0.5)
                )
            ),
            position: new CANNON.Vec3(letterX, textY, 0)
        })
        letterBody.linearDamping = 0.25
        letterBody.angularDamping = 0.45
        world.addBody(letterBody)

        characterItems.push({
            mesh: letterMesh,
            body: letterBody,
            initialPosition: new CANNON.Vec3(letterX, textY, 0)
        })
    })
}

const sceneThemes = {
    1: {
        background: '#060818',
        fogColor: '#060818',
        fogNear: 45,
        fogFar: 180,
        starsVisible: true,
        starsColor: '#dbe8ff',
        starsSize: 0.25,
        ambientIntensity: 1.2,
        sunColor: '#ffffff',
        sunIntensity: 1.1,
        text: 'ez-forward.com',
        textColor: '#ff4d4d'
    },
    2: {
        background: '#87ceeb',
        fogColor: '#b9e3ff',
        fogNear: 40,
        fogFar: 170,
        starsVisible: false,
        starsColor: '#dbe8ff',
        starsSize: 0.25,
        ambientIntensity: 1.2,
        sunColor: '#ffffff',
        sunIntensity: 1.25,
        text: 'Learning On the Jobs',
        textColor: '#2d6bff'
    },
    3: {
        background: '#e8c07d',
        fogColor: '#e0b56d',
        fogNear: 35,
        fogFar: 150,
        starsVisible: false,
        starsColor: '#dbe8ff',
        starsSize: 0.25,
        ambientIntensity: 1.1,
        sunColor: '#ffd58a',
        sunIntensity: 1.4,
        text: 'make money!!',
        textColor: '#8a3d00'
    }
}

let currentSceneId = 1
const applySceneTheme = (sceneId) => {
    const theme = sceneThemes[sceneId]
    if (!theme) return

    scene.background = new THREE.Color(theme.background)
    scene.fog = new THREE.Fog(theme.fogColor, theme.fogNear, theme.fogFar)
    stars.visible = theme.starsVisible
    starsMaterial.color.set(theme.starsColor)
    starsMaterial.size = theme.starsSize
    ambientLight.intensity = theme.ambientIntensity
    sunLight.color.set(theme.sunColor)
    sunLight.intensity = theme.sunIntensity
    setCharacterText(theme.text, theme.textColor)
    currentSceneId = sceneId
}

applySceneTheme(1)

const playerWidth = 3.8
const playerHeight = 1.0
const playerDepth = 2.2
const playerY = 2
const playerStartX = 0
const playerStartZ = 18
const rightEdgeThreshold = 28
const leftEdgeThreshold = -28
const edgePadding = 1.5
const projectileMesh = new THREE.Group()

const jetBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 3.2, 16),
    new THREE.MeshStandardMaterial({ color: '#2d6bff', metalness: 0.35, roughness: 0.45 })
)
jetBody.rotation.z = Math.PI * 0.5
projectileMesh.add(jetBody)

const jetNose = new THREE.Mesh(
    new THREE.ConeGeometry(0.38, 1.1, 16),
    new THREE.MeshStandardMaterial({ color: '#153c99', metalness: 0.25, roughness: 0.55 })
)
jetNose.rotation.z = -Math.PI * 0.5
jetNose.position.x = 2.1
projectileMesh.add(jetNose)

const jetCockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 16, 16),
    new THREE.MeshStandardMaterial({ color: '#8fd3ff', metalness: 0.1, roughness: 0.15 })
)
jetCockpit.position.set(0.4, 0.28, 0)
projectileMesh.add(jetCockpit)

const leftWing = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.08, 2.2),
    new THREE.MeshStandardMaterial({ color: '#1f57d9', metalness: 0.2, roughness: 0.5 })
)
leftWing.position.x = 0.1
projectileMesh.add(leftWing)

const tailWing = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.08, 1.4),
    new THREE.MeshStandardMaterial({ color: '#1f57d9', metalness: 0.2, roughness: 0.5 })
)
tailWing.position.x = -1.25
projectileMesh.add(tailWing)

const tailFin = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.7, 0.08),
    new THREE.MeshStandardMaterial({ color: '#153c99', metalness: 0.2, roughness: 0.5 })
)
tailFin.position.set(-1.55, 0.42, 0)
projectileMesh.add(tailFin)

projectileMesh.position.set(playerStartX, playerY, playerStartZ)

const projectileBody = new CANNON.Body({
    mass: 3,
    shape: new CANNON.Box(new CANNON.Vec3(playerWidth * 0.5, playerHeight * 0.5, playerDepth * 0.5)),
    position: new CANNON.Vec3(playerStartX, playerY, playerStartZ)
})
projectileBody.linearDamping = 0.45
projectileBody.angularDamping = 0.4
world.addBody(projectileBody)
scene.add(projectileMesh)

let lastSceneSwitchTime = -100
const sceneSwitchCooldown = 0.25
const switchSceneAtEdge = (nextSceneId, spawnX) => {
    applySceneTheme(nextSceneId)
    projectileBody.position.x = spawnX
    projectileBody.position.y = playerY
    projectileBody.velocity.y = 0
}

const clampBlockedEdges = () => {
    // Scene 1 has no previous scene on the left.
    if (currentSceneId === 1 && projectileBody.position.x < leftEdgeThreshold) {
        projectileBody.position.x = leftEdgeThreshold
        if (projectileBody.velocity.x < 0) projectileBody.velocity.x = 0
    }

    // Scene 3 has no next scene on the right.
    if (currentSceneId === 3 && projectileBody.position.x > rightEdgeThreshold) {
        projectileBody.position.x = rightEdgeThreshold
        if (projectileBody.velocity.x > 0) projectileBody.velocity.x = 0
    }
}

const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    arrowup: false,
    arrowdown: false,
    arrowleft: false,
    arrowright: false
}

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase()
    if (key in keys) keys[key] = true

    if (key === 'r') {
        projectileBody.position.set(playerStartX, playerY, playerStartZ)
        projectileBody.velocity.set(0, 0, 0)
        projectileBody.angularVelocity.set(0, 0, 0)
        projectileBody.quaternion.set(0, 0, 0, 1)

        characterItems.forEach((character) => {
            character.body.position.copy(character.initialPosition)
            character.body.velocity.set(0, 0, 0)
            character.body.angularVelocity.set(0, 0, 0)
            character.body.quaternion.set(0, 0, 0, 1)
        })
    }
})

window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase()
    if (key in keys) keys[key] = false
})

// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000)
camera.position.set(0, 14, 30)
camera.lookAt(0, playerY, 0)
scene.add(camera)

// Controls (orbit view)
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.target.set(0, playerY, 0)

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas: canvas })
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Animate
const clock = new THREE.Clock()
let elapsedTime = 0

const tick = () => {
    const deltaTime = clock.getDelta()
    elapsedTime += deltaTime

    const moveX = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0)
    const moveZ = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0)
    const speed = 16
    const desiredVelocityX = moveX * speed
    const desiredVelocityZ = moveZ * speed
    projectileBody.velocity.x += (desiredVelocityX - projectileBody.velocity.x) * 0.2
    projectileBody.velocity.z += (desiredVelocityZ - projectileBody.velocity.z) * 0.2
    projectileBody.velocity.y = 0

    world.step(1 / 60, deltaTime, 3)

    if (elapsedTime - lastSceneSwitchTime > sceneSwitchCooldown) {
        if (currentSceneId === 1 && projectileBody.position.x > rightEdgeThreshold) {
            switchSceneAtEdge(2, leftEdgeThreshold + edgePadding)
            lastSceneSwitchTime = elapsedTime
        } else if (currentSceneId === 2 && projectileBody.position.x < leftEdgeThreshold) {
            switchSceneAtEdge(1, rightEdgeThreshold - edgePadding)
            lastSceneSwitchTime = elapsedTime
        } else if (currentSceneId === 2 && projectileBody.position.x > rightEdgeThreshold) {
            switchSceneAtEdge(3, leftEdgeThreshold + edgePadding)
            lastSceneSwitchTime = elapsedTime
        } else if (currentSceneId === 3 && projectileBody.position.x < leftEdgeThreshold) {
            switchSceneAtEdge(2, rightEdgeThreshold - edgePadding)
            lastSceneSwitchTime = elapsedTime
        }
    }

    clampBlockedEdges()

    projectileBody.position.y = playerY
    projectileBody.angularVelocity.set(0, 0, 0)
    projectileMesh.position.copy(projectileBody.position)
    if (projectileBody.velocity.lengthSquared() > 0.02) {
        const yaw = Math.atan2(-projectileBody.velocity.z, projectileBody.velocity.x)
        projectileMesh.rotation.set(0, yaw, 0)
    }
    characterItems.forEach((character) => {
        character.body.position.y = textY
        character.body.velocity.y = 0
        character.body.angularVelocity.x = 0
        character.body.angularVelocity.z = 0
        character.mesh.position.copy(character.body.position)
        character.mesh.quaternion.copy(character.body.quaternion)
    })

    stars.rotation.y = elapsedTime * 0.02

    controls.update()
    renderer.render(scene, camera)
    window.requestAnimationFrame(tick)
}

tick()