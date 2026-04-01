import * as THREE from 'three';

// ---------- UI elements & params ----------
const uiPanel = document.getElementById('uiPanel');
const toggleBtn = document.getElementById('toggleUI');
let uiVisible = true;
toggleBtn.addEventListener('click', () => {
    uiVisible = !uiVisible;
    uiPanel.classList.toggle('hidden', !uiVisible);
    toggleBtn.textContent = uiVisible ? '✕' : '☰';
});

const params = { tx: 0, ty: 0, sz: 1.0, rot: 0, inv: 0 };
const sliders = ['tx', 'ty', 'sz', 'rot', 'inv'];
sliders.forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', (e) => {
        params[id] = parseFloat(e.target.value);
        const span = document.getElementById(id + '_val');
        if (span) span.innerText = params[id].toFixed(2);
    });
});

// ---------- Setup canvas with explicit selector ----------
const canvas = document.querySelector('canvas.webgl');
if (!canvas) throw new Error('Canvas with class "webgl" not found');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
// Pixel ratio and size handling exactly like the reference style
renderer.setSize(window.innerWidth, window.innerHeight);
const pixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(pixelRatio);

const scene = new THREE.Scene();
// Orthographic camera for fullscreen quad
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// Uniforms: mimic iResolution handling with pixel ratio scaling
const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector3() },
    uSphPos: { value: new THREE.Vector3(0, 0, 0.5) },
    uSphRot: { value: new THREE.Vector2(0, 0) }
};

// Compute initial resolution with pixel ratio
const initWidth = window.innerWidth * renderer.getPixelRatio();
const initHeight = window.innerHeight * renderer.getPixelRatio();
uniforms.iResolution.value.set(initWidth, initHeight, 1);

// ----- Fullscreen shader material (complex raymarching + Mobius sphere mapping) -----
const fragmentShader = `
    uniform float iTime;
    uniform vec3 iResolution;
    uniform vec3 uSphPos;
    uniform vec2 uSphRot;
    
    #define ROT(a) mat2(cos(a), sin(a), -sin(a), cos(a))
    
    // Ray-sphere intersection
    vec2 raySphere(vec3 ro, vec3 rd, vec4 sph) {
        vec3 oc = ro - sph.xyz;
        float b = dot(oc, rd);
        float c = dot(oc, oc) - sph.w * sph.w;
        float h = b * b - c;
        if (h < 0.0) return vec2(-1.0);
        float sqrtH = sqrt(h);
        return vec2(-b - sqrtH, -b + sqrtH);
    }
    
    float rayPlane(vec3 ro, vec3 rd) {
        return -ro.z / rd.z;
    }
    
    // Rigid motion on sphere: apply inverse rotation (so the texture/grid moves with sphere)
    void applyInverseRigid(inout vec3 p, vec3 center, vec2 r) {
        p -= center;
        p.xz *= ROT(-r.y);
        p.xy *= ROT(-r.x);
        p += center;
    }
    
    // Map from plane point to sphere surface via stereographic projection from north pole
    vec3 planeToSphere(vec3 p, vec4 sph) {
        vec3 N = sph.xyz + vec3(0.0, 0.0, sph.w);
        vec3 rd = normalize(N - p);
        float t = raySphere(p, rd, sph).x;
        return p + rd * t;
    }
    
    // Map from sphere point back to plane (inverse stereographic)
    vec3 sphereToPlane(vec3 p, vec4 sph) {
        vec3 N = sph.xyz + vec3(0.0, 0.0, sph.w);
        vec3 rd = normalize(p - N);
        float t = rayPlane(p, rd);
        return p + rd * t;
    }
    
    // Helper: draw glowing reference dots
    vec3 drawDot(vec2 p, vec2 target, vec3 col) {
        float d = length(p - target);
        float m = smoothstep(0.004, 0.0, d);
        float glow = exp(-30.0 * d);
        return col * (m + glow * 20.0);
    }
    
    // Grid + bright axes (Real = Y direction? but we use standard complex plane: X = Real, Y = Imag)
    vec3 getGridColor(vec2 uv) {
        // fine grid
        vec2 gridUV = uv * 2.2;
        vec2 g = abs(fract(gridUV + 0.5) - 0.5);
        float lineX = smoothstep(0.045, 0.0, g.x);
        float lineY = smoothstep(0.045, 0.0, g.y);
        
        vec3 gridCol = vec3(0.0, 0.02, 0.06);
        vec3 cyanSub = vec3(0.0, 0.55, 0.65);
        vec3 magentaSub = vec3(0.55, 0.2, 0.5);
        gridCol = mix(gridCol, cyanSub, lineX);
        gridCol = mix(gridCol, magentaSub, lineY);
        
        // main axes: X axis (Imaginary? Actually complex: horizontal real, vertical imag)
        // but we match classical: u.x = Re, u.y = Im
        float axisReal = smoothstep(0.045, 0.0, abs(uv.y));  // horizontal line? Real axis is horizontal line y=0
        float axisImag = smoothstep(0.045, 0.0, abs(uv.x));  // Imag axis vertical line x=0
        
        vec3 realColor = vec3(1.0, 0.55, 0.1);   // orange
        vec3 imagColor = vec3(0.0, 0.85, 1.0);   // bright cyan
        
        gridCol = mix(gridCol, realColor, axisReal);
        gridCol = mix(gridCol, imagColor, axisImag);
        
        // extra glow
        gridCol += realColor * exp(-45.0 * abs(uv.y)) * 1.9;
        gridCol += imagColor * exp(-45.0 * abs(uv.x)) * 1.9;
        
        return gridCol;
    }
    
    void main() {
        vec2 fragCoord = gl_FragCoord.xy;
        vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
        
        // Camera view: Fixed isometric but engaging
        vec3 ro = vec3(2.9, -4.8, 5.2);
        vec3 lookat = vec3(0.5, 0.5, 0.5);
        vec3 fwd = normalize(lookat - ro);
        vec3 right = normalize(cross(fwd, vec3(0.0, 0.0, 1.0)));
        vec3 up = cross(right, fwd);
        float zoom = 1.3;
        vec3 rd = normalize(fwd * zoom + uv.x * right + uv.y * up);
        
        // Sphere center + translation offset: make sphere more visible with artistic shift
        vec3 translateObjects = vec3(0.8, 1.0, 0.0);
        vec4 sph = vec4(uSphPos + translateObjects, 0.52);
        
        float tPlane = rayPlane(ro, rd);
        vec2 tSph = raySphere(ro, rd, sph);
        
        float t = 1e10;
        bool hitSph = false;
        if (tSph.x > 0.0) { t = tSph.x; hitSph = true; }
        if (tPlane > 0.0 && tPlane < t) { t = tPlane; hitSph = false; }
        
        vec3 col = vec3(0.01, 0.008, 0.02);
        
        if (t < 45.0) {
            vec3 pos = ro + rd * t;
            
            // 1. get point on sphere (if hit plane, lift to sphere via stereographic)
            vec3 pOnSph = hitSph ? pos : planeToSphere(pos, sph);
            
            // 2. apply rigid motions (rotation & inversion) on sphere
            applyInverseRigid(pOnSph, sph.xyz, uSphRot);
            
            // 3. project back to complex plane
            vec3 gridP = sphereToPlane(pOnSph, sph);
            
            // --- scaling (dilation) logic: uSphPos.z acts as uniform scaling factor ---
            // shift by sphere center offset before scaling
            vec2 localUV = (gridP.xy - uSphPos.xy - translateObjects.xy) / (max(0.35, uSphPos.z) * 1.8);
            
            col = getGridColor(localUV);
            
            // --- reference points : ±1 ± i  (matching points in the plane)
            col += drawDot(localUV, vec2( 1.0,  1.0), vec3(1.0, 1.0, 0.0)); // gold (1+i)
            col += drawDot(localUV, vec2(-1.0, -1.0), vec3(0.0, 1.0, 0.0)); // green (-1-i)
            col += drawDot(localUV, vec2( 1.0, -1.0), vec3(1.0, 0.0, 0.0)); // red (1-i)
            col += drawDot(localUV, vec2(-1.0,  1.0), vec3(0.0, 0.5, 1.0)); // blue (-1+i)
            
            // Shading & atmospheric
            if (hitSph) {
                vec3 n = normalize(pos - sph.xyz);
                vec3 lightDir = normalize(vec3(3.5, 5.0, 4.0));
                float diff = max(0.35, dot(n, lightDir));
                col *= diff;
                float fresnel = pow(1.0 - max(0.0, dot(n, -rd)), 2.2);
                col += vec3(0.5, 0.5, 0.7) * fresnel * 0.35;
                // subtle specular
                vec3 refl = reflect(rd, n);
                float spec = pow(max(0.0, dot(refl, lightDir)), 48.0);
                col += vec3(0.9, 0.85, 0.7) * spec * 0.5;
            } else {
                // ground plane fog for depth
                col *= exp(-0.055 * t);
                col += vec3(0.02, 0.01, 0.04) * (1.0 - exp(-0.12 * t));
            }
            
            // slight vignette
            float vign = 1.0 - 0.2 * length(uv);
            col *= vign;
        } else {
            col = vec3(0.02, 0.01, 0.05);
        }
        
        // gamma correction
        gl_FragColor = vec4(pow(col, vec3(0.4545)), 1.0);
    }
    `;

const material = new THREE.ShaderMaterial({
    uniforms,
    fragmentShader,
    vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`
});

const geometry = new THREE.PlaneGeometry(2, 2);
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Animation loop with time uniform
let clock = new THREE.Clock();

function animate() {
    const elapsedTime = performance.now() / 1000; // seconds
    uniforms.iTime.value = elapsedTime;

    // Update uniforms from UI params
    uniforms.uSphPos.value.set(params.tx, params.ty, params.sz);
    uniforms.uSphRot.value.set(params.rot, params.inv);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

// ---------- RESIZE HANDLER (exactly as requested: using pixel ratio and iResolution) ----------
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Update renderer size and pixel ratio (high DPI friendly)
    renderer.setSize(width, height);
    const newPixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(newPixelRatio);

    // Update iResolution uniform with actual pixel dimensions (accounting for pixel ratio)
    const canvasWidth = width * renderer.getPixelRatio();
    const canvasHeight = height * renderer.getPixelRatio();
    uniforms.iResolution.value.set(canvasWidth, canvasHeight, 1);
});

// Optional: initial trigger to ensure resolution uniform matches after any potential race
// Manually trigger once to be safe:
setTimeout(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const curPixelRatio = renderer.getPixelRatio();
    uniforms.iResolution.value.set(width * curPixelRatio, height * curPixelRatio, 1);
}, 100);

// small console feedback
console.log('Möbius sphere visualization ready | canvas.webgl active');