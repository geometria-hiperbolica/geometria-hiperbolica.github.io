import * as THREE from 'three';

// --- setup three.js fullscreen shader pass ---
const canvas = document.querySelector('canvas.webgl');

const scene = new THREE.Scene();
const geometry = new THREE.PlaneGeometry(2, 2);

// uniforms
const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
    uP: { value: 5.0 },
    uQ: { value: 4.0 },
    uR: { value: 4.0 },
    uMaxReflections: { value: 500.0 },
    uLighteningFactor: { value: 8.0 },
    uCamDistance: { value: 10 },
    uMouse: { value: new THREE.Vector2(0.5, 0.3) } 
};

const fragmentShader = `
#ifdef GL_ES
precision highp float;
#endif

uniform vec2 iResolution;
uniform float iTime;
uniform float uP;
uniform float uQ;
uniform float uR;
uniform float uMaxReflections;
uniform float uLighteningFactor;
uniform float uCamDistance;
uniform vec2 uMouse;

#define inf -1.0
#define MAX_TRACE_STEPS 100
#define MIN_TRACE_DIST 0.1
#define MAX_TRACE_DIST 100.0
#define PRECISION 0.0002
#define AA 2
#define PI 3.14159265359

#define CHECKER1  vec3(0.0, 0.0, 0.05)
#define CHECKER2  vec3(0.2)
#define MATERIAL  vec3(0.5, 2.9, 10.2)
#define FUNDCOL   vec3(0.3, 1.0, 8.0)

vec3 A, B, D;
vec4 C;
float orb;

float dihedral(float x) { 
    if(x == inf) return 1.0; 
    return cos(PI / x); 
}

float distABCD(vec3 p) {
    float dA = abs(dot(p, A));
    float dB = abs(dot(p, B));
    float dD = abs(dot(p, D));
    float dC = abs(length(p - C.xyz) - C.w);
    return min(dA, min(dB, min(dC, dD)));
}

bool try_reflect_plane(inout vec3 p, vec3 n, inout int count) {
    float k = dot(p, n);
    if (k >= 0.0) return true;
    p -= 2.0 * k * n;
    count += 1;
    return false;
}

bool try_reflect_sphere(inout vec3 p, vec4 sphere, inout int count) {
    vec3 cen = sphere.xyz;
    float r = sphere.w;
    vec3 q = p - cen;
    float d2 = dot(q, q);
    if (d2 == 0.0) return true;
    float k = (r * r) / d2;
    if (k < 1.0) return true;
    p = k * q + cen;
    count += 1;
    orb *= k;
    return false;
}

bool iterateSpherePoint(inout vec3 p, inout int count) {
    bool inA, inB, inC, inD;
    for(int iter=0; iter<1200; iter++) {
        if(iter >= int(uMaxReflections)) break;
        inA = try_reflect_plane(p, A, count);
        inB = try_reflect_plane(p, B, count);
        inC = try_reflect_sphere(p, C, count);
        inD = try_reflect_plane(p, D, count);
        p = normalize(p);
        if (inA && inB && inC && inD) return true;
    }
    return false;
}

int func_mod(int x, int y) {
    return int(float(x) - float(y)*floor(float(x)/float(y)));
}

vec3 chooseColor(bool found, int count, float orbVal) {
    vec3 col;
    if (found) {
        if (count == 0) return FUNDCOL;
        else if (count >= 300) col = MATERIAL;
        else {
            col = (func_mod(count, 2) == 0) ? CHECKER1 : CHECKER2;
        }
    } else {
        col = MATERIAL;
    }
    float t = float(count) / uMaxReflections;
    col = mix(MATERIAL * uLighteningFactor, col, 1.0 - t * smoothstep(0.0, 1.0, log(orbVal) / 32.0));
    return col;
}

vec2 rot2d(vec2 p, float a) { return p * cos(a) + vec2(-p.y, p.x) * sin(a); }

float sdSphere(vec3 p, float radius) { return length(p) - 1.0; }
float sdPlane(vec3 p, float offset) { return p.y + 1.0; }

vec2 map(vec3 p) {
    float d1 = sdSphere(p, 1.0);
    float d2 = sdPlane(p, -1.0);
    float id = (d1 < d2) ? 0.0 : 1.0;
    return vec2(min(d1, d2), id);
}

vec2 raymarch(vec3 ro, vec3 rd) {
    float t = MIN_TRACE_DIST;
    vec2 h;
    for(int i=0; i<MAX_TRACE_STEPS; i++) {
        h = map(ro + t * rd);
        if (h.x < PRECISION * t) return vec2(t, h.y);
        if (t > MAX_TRACE_DIST) break;
        t += h.x;
    }
    return vec2(-1.0);
}

float calcOcclusion(vec3 p, vec3 n) {
    float occ = 0.0;
    float sca = 1.0;
    for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.15 * float(i) / 4.0;
        float d = map(p + h * n).x;
        occ += (h - d) * sca;
        sca *= 0.75;
    }
    return clamp(1.0 - occ, 0.0, 1.0);
}

float softShadow(vec3 ro, vec3 rd, float tmin, float tmax, float k) {
    float res = 1.0;
    float t = tmin;
    for (int i = 0; i < 12; i++) {
        float h = map(ro + rd * t).x;
        res = min(res, k * h / t);
        t += clamp(h, 0.01, 0.2);
        if (h < 0.0001 || t > tmax) break;
    }
    return clamp(res, 0.0, 1.0);
}

vec3 getColor(vec3 ro, vec3 rd, vec3 pos, vec3 nor, vec3 lp, vec3 basecol) {
    vec3 col = vec3(0.0);
    vec3 ld = lp - pos;
    float lDist = max(length(ld), 0.001);
    ld /= lDist;
    float ao = calcOcclusion(pos, nor);
    float sh = softShadow(pos + 0.001*nor, ld, 0.02, lDist, 32.0);
    float diff = clamp(dot(nor, ld), 0.0, 1.0);
    float atten = 2.0 / (1.0 + lDist * lDist * 0.01);
    float spec = pow(max(dot(reflect(-ld, nor), -rd), 0.0), 32.0);
    float fres = clamp(1.0 + dot(rd, nor), 0.0, 1.0);
    col += basecol * diff;
    col += basecol * vec3(1.0, 0.8, 0.3) * spec * 10.0;
    col += basecol * vec3(0.8) * fres * fres * 2.0;
    col *= ao * atten * sh;
    col += basecol * clamp(0.8 + 0.2 * nor.y, 0.0, 1.0) * 0.5;
    return col;
}

mat3 sphMat(float theta, float phi) {
    float cx = cos(theta);
    float cy = cos(phi);
    float sx = sin(theta);
    float sy = sin(phi);
    return mat3(cy, -sy * -sx, -sy * cx,
                0,   cx,  sx,
                sy,  cy * -sx, cy * cx);
}

vec3 planeToSphere(vec2 p) {
    float pp = dot(p, p);
    return vec3(2.0 * p, pp - 1.0).xzy / (1.0 + pp);
}

void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = (fragCoord - iResolution.xy * 0.5) / iResolution.y;
    
    vec3 camera = vec3(3.0, 3.2, -5.0);
    camera.xz = rot2d(camera.xz, iTime * 0.02);
    camera = normalize(camera) * uCamDistance;

    vec3 lookat = vec3(0.0, -0.5, 0.0);
    vec3 lp = vec3(0.5, 3.0, -0.8);
    vec3 forward = normalize(lookat - camera);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = normalize(cross(right, forward));
    
    float rx = uMouse.y * PI;
    float ry = -uMouse.x * 2.0 * PI;
    mat3 mouRot = sphMat(rx, ry);

    vec3 finalcol = vec3(0.0);
    for(int ii=0; ii<AA; ii++) {
        for(int jj=0; jj<AA; jj++) {
            vec2 offset = vec2(float(ii), float(jj)) / float(AA);
            vec2 uv_jitter = uv + (offset - 0.5) * (2.0 / iResolution.y);
            vec3 rd = normalize(uv_jitter.x * right + uv_jitter.y * up + 3.0 * forward);
            
            float P = uP, Q = uQ, R = uR;
            float cp = dihedral(P), sp = sqrt(1.0 - cp*cp);
            float cq = dihedral(Q);
            float cr = dihedral(R);
            A = vec3(0.0, 0.0, 1.0);
            B = vec3(0.0, sp, -cp);
            D = vec3(1.0, 0.0, 0.0);
            float rs = 1.0 / cr;
            float k_val = rs * cq / sp;
            vec3 cen = vec3(1.0, k_val, 0.0);
            C = vec4(cen, rs) / sqrt(dot(cen, cen) - rs * rs);
            
            orb = 1.0;
            vec2 res = raymarch(camera, rd);
            float t = res.x;
            float id = res.y;
            vec3 col = vec3(0.05);
            
            if (t > 0.0 && t < MAX_TRACE_DIST) {
                vec3 pos = camera + t * rd;
                int count = 0;
                bool found = false;
                float edist = 0.0;

                if (id == 0.0) { // sphere
                    vec3 nor = pos;
                    vec3 q = pos * mouRot;
                    found = iterateSpherePoint(q, count);
                    edist = distABCD(q);
                    vec3 basecol = chooseColor(found, count, orb);
                    col = getColor(camera, rd, pos, nor, lp, basecol);
                } else { // plane
                    vec3 nor = vec3(0.0, 1.0, 0.0);
                    vec3 q = planeToSphere(pos.xz);
                    q = q * mouRot;
                    found = iterateSpherePoint(q, count);
                    edist = distABCD(q);
                    vec3 basecol = chooseColor(found, count, orb);
                    col = getColor(camera, rd, pos, nor, lp, basecol) * 0.9;
                }
                col = mix(col, vec3(0.0), (1.0 - smoothstep(0.0, 0.005, edist)) * 0.85);
                col = mix(col, vec3(0.0), 1.0 - exp(-0.01 * t * t));
            }
            finalcol += col;
        }
    }
    finalcol /= float(AA*AA);
    finalcol = mix(finalcol, 1.0 - exp(-finalcol), 0.35);
    gl_FragColor = vec4(sqrt(max(finalcol, 0.0)), 1.0);
}
`;

const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
    fragmentShader: fragmentShader,
    transparent: false
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

function updateResolution() {
    const pr = renderer.getPixelRatio();
    uniforms.iResolution.value.set(window.innerWidth * pr, window.innerHeight * pr, 1);
}
updateResolution();

// --- CLICK AND DRAG LOGIC ---
let isDragging = false;
const mouseVec = new THREE.Vector2(0.5, 0.3);

window.addEventListener('mousedown', () => { isDragging = true; });
window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('mouseleave', () => { isDragging = false; });

window.addEventListener('mousemove', (e) => {
    // Only update the uniform if the mouse is pressed
    if (isDragging) {
        mouseVec.x = e.clientX / window.innerWidth;
        mouseVec.y = e.clientY / window.innerHeight;
        uniforms.uMouse.value = mouseVec;
    }
});

// --- UI EVENT LISTENERS ---
const paramP = document.getElementById('paramP');
const paramQ = document.getElementById('paramQ');
const paramR = document.getElementById('paramR');
//const applyBtn = document.getElementById('applyCustom');
const presetBtns = document.querySelectorAll('#presetContainer button');
//const maxReflSlider = document.getElementById('maxReflections');
const reflectionsVal = document.getElementById('reflectionsVal');
//const lightSlider = document.getElementById('lightFactor');
const lightVal = document.getElementById('lightVal');
const camZoomSlider = document.getElementById('camZoom');
const zoomVal = document.getElementById('zoomVal');
const currentTripleSpan = document.getElementById('currentTriple');

function updateParams(p, q, r) {
    uniforms.uP.value = parseFloat(p);
    uniforms.uQ.value = parseFloat(q);
    uniforms.uR.value = parseFloat(r);
    currentTripleSpan.innerText = `(${p}, ${q}, ${r})`;
    paramP.value = p; paramQ.value = q; paramR.value = r;
    presetBtns.forEach(btn => {
        const bp = parseInt(btn.getAttribute('data-p'));
        const bq = parseInt(btn.getAttribute('data-q'));
        const br = parseInt(btn.getAttribute('data-r'));
        btn.classList.toggle('active', bp === p && bq === q && br === r);
    });
}

// applyBtn.addEventListener('click', () => updateParams(paramP.value, paramQ.value, paramR.value));

presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        updateParams(parseInt(btn.dataset.p), parseInt(btn.dataset.q), parseInt(btn.dataset.r));
    });
});

// maxReflSlider.addEventListener('input', (e) => {
//     uniforms.uMaxReflections.value = reflectionsVal.innerText = parseInt(e.target.value);
// });

// lightSlider.addEventListener('input', (e) => {
//     uniforms.uLighteningFactor.value = parseFloat(e.target.value);
//     lightVal.innerText = parseFloat(e.target.value).toFixed(1);
// });

camZoomSlider.addEventListener('input', (e) => {
    uniforms.uCamDistance.value = zoomVal.innerText = parseFloat(e.target.value).toFixed(1);
});

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateResolution();
});

function animate() {
    uniforms.iTime.value = performance.now() / 1000.0;
    renderer.render(scene, new THREE.Camera());
    requestAnimationFrame(animate);
}
animate();