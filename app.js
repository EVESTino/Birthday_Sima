const holdButton = document.querySelector("#holdButton");
const holdHint = document.querySelector("#holdHint");
const surprise = document.querySelector("#surprise");
const bearStage = document.querySelector("#bearStage");
const birthdayPrompt = document.querySelector("#birthdayPrompt");
const video = document.querySelector("#birthdayVideo");
const answerButton = document.querySelector("#answerButton");
const spiralSection = document.querySelector("#spiralSection");
const spiralViewport = document.querySelector("#spiralViewport");
const photoSlots = [...document.querySelectorAll(".photo-slot")];
const auroraCanvas = document.querySelector("#auroraCanvas");

const holdDuration = 1500;
let startedAt = 0;
let holdFrame = 0;
let complete = false;

function setProgress(value) {
  holdButton.style.setProperty("--progress", `${Math.min(100, Math.max(0, value))}%`);
}

function openSurprise() {
  if (complete) return;
  complete = true;
  cancelAnimationFrame(holdFrame);
  setProgress(100);
  holdButton.classList.remove("is-holding");
  holdButton.classList.add("is-complete");
  holdButton.querySelector(".hold-label").textContent = "открываю…";
  holdHint.textContent = "";
  window.setTimeout(() => {
    surprise.classList.add("is-visible");
    surprise.setAttribute("aria-hidden", "false");
    bearStage.classList.add("is-revealed");
    video.play().catch(() => {});
    bearStage.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => birthdayPrompt.classList.add("is-visible"), 2450);
  }, 380);
}

function updateHold(now) {
  const progress = ((now - startedAt) / holdDuration) * 100;
  setProgress(progress);
  if (progress >= 100) openSurprise(); else holdFrame = requestAnimationFrame(updateHold);
}

function startHold(event) {
  if (complete || (event.type === "keydown" && !["Enter", " "].includes(event.key))) return;
  if (event.cancelable) event.preventDefault();
  if (holdButton.classList.contains("is-holding")) return;
  holdButton.classList.add("is-holding");
  startedAt = performance.now();
  holdFrame = requestAnimationFrame(updateHold);
}

function cancelHold(event) {
  if (complete || !holdButton.classList.contains("is-holding")) return;
  if (event.type === "keyup" && !["Enter", " "].includes(event.key)) return;
  cancelAnimationFrame(holdFrame);
  holdButton.classList.remove("is-holding");
  setProgress(0);
}

holdButton.addEventListener("pointerdown", startHold);
holdButton.addEventListener("pointerup", cancelHold);
holdButton.addEventListener("pointercancel", cancelHold);
holdButton.addEventListener("pointerleave", cancelHold);
holdButton.addEventListener("keydown", startHold);
holdButton.addEventListener("keyup", cancelHold);

answerButton.addEventListener("click", () => {
  spiralSection.classList.add("is-visible");
  spiralSection.setAttribute("aria-hidden", "false");
  window.setTimeout(() => spiralSection.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
});

let spiralRotation = 0;
let spiralSpeed = 0.055;
let dragging = false;
let previousX = 0;

function renderSpiral() {
  const mobile = window.innerWidth < 600;
  const radiusX = mobile ? 150 : Math.min(410, window.innerWidth * .31);
  const radiusY = mobile ? 215 : Math.min(300, window.innerHeight * .34);
  photoSlots.forEach((slot, index) => {
    const angle = spiralRotation + (index / photoSlots.length) * Math.PI * 2;
    const x = Math.sin(angle) * radiusX;
    const y = Math.cos(angle) * radiusY * .72;
    const depth = Math.cos(angle);
    const z = depth * 260;
    const scale = .72 + (depth + 1) * .19;
    slot.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${-angle * 30}deg) scale(${scale})`;
    slot.style.opacity = String(.36 + (depth + 1) * .31);
    slot.style.zIndex = String(Math.round((depth + 1) * 100));
  });
  if (!dragging && spiralSection.classList.contains("is-visible")) spiralRotation += spiralSpeed * .012;
  requestAnimationFrame(renderSpiral);
}

spiralViewport.addEventListener("pointerdown", (event) => {
  dragging = true;
  previousX = event.clientX;
  spiralViewport.setPointerCapture(event.pointerId);
});
spiralViewport.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  spiralRotation += (event.clientX - previousX) * .008;
  previousX = event.clientX;
});
spiralViewport.addEventListener("pointerup", () => { dragging = false; });
spiralViewport.addEventListener("pointercancel", () => { dragging = false; });
spiralViewport.addEventListener("wheel", (event) => { spiralRotation += event.deltaY * .0007; }, { passive: true });
renderSpiral();

function initAurora() {
  const gl = auroraCanvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: true });
  if (!gl) return;

  const vertexSource = `#version 300 es
    in vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;
  const fragmentSource = `#version 300 es
    precision highp float;
    uniform float uTime;
    uniform float uAmplitude;
    uniform vec3 uColorStops[3];
    uniform vec2 uResolution;
    uniform float uBlend;
    out vec4 fragColor;

    vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m * m; m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x = a0.x*x0.x + h.x*x0.y;
      g.yz = a0.yz*x12.xz + h.yz*x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution;
      vec3 rampColor = uv.x < 0.5
        ? mix(uColorStops[0], uColorStops[1], uv.x * 2.0)
        : mix(uColorStops[1], uColorStops[2], (uv.x - 0.5) * 2.0);
      float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
      height = exp(height);
      height = uv.y * 2.0 - height + 0.2;
      float intensity = 0.6 * height;
      float auroraAlpha = smoothstep(0.20 - uBlend * 0.5, 0.20 + uBlend * 0.5, intensity);
      vec3 auroraColor = max(intensity, 0.0) * rampColor;
      fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
    }
  `;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    time: gl.getUniformLocation(program, "uTime"),
    amplitude: gl.getUniformLocation(program, "uAmplitude"),
    colors: gl.getUniformLocation(program, "uColorStops"),
    resolution: gl.getUniformLocation(program, "uResolution"),
    blend: gl.getUniformLocation(program, "uBlend")
  };
  gl.uniform1f(uniforms.amplitude, 1.15);
  gl.uniform1f(uniforms.blend, 0.58);
  gl.uniform3fv(uniforms.colors, new Float32Array([
    188/255,103/255,1,
    1,64/255,145/255,
    82/255,39/255,1
  ]));

  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  let lastWidth = 0;
  let lastHeight = 0;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const drawAurora = (time) => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(auroraCanvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(auroraCanvas.clientHeight * ratio));
    if (width !== lastWidth || height !== lastHeight) {
      auroraCanvas.width = width;
      auroraCanvas.height = height;
      gl.viewport(0, 0, width, height);
      lastWidth = width;
      lastHeight = height;
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uniforms.time, time * 0.00052);
    gl.uniform2f(uniforms.resolution, width, height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reducedMotion) requestAnimationFrame(drawAurora);
  };
  requestAnimationFrame(drawAurora);
}

initAurora();
