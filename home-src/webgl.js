// This function adds some shadertoy functionality
const fragWrap = (str) =>
  `uniform vec3      iResolution;
  uniform float     iTime;
  uniform float     iTimeDelta;
  uniform float     iFrameRate;
  uniform int       iFrame;
  uniform float     iChannelTime[4];
  uniform vec3      iChannelResolution[4];
  uniform vec4      iMouse;
  ${str}
  void main() {
    vec4 fragColor;
    mainImage(fragColor, gl_FragCoord.xy);
    gl_FragColor = fragColor;
}`;

const response = await fetch("./home-src/shader.frag");
const fragmentShader = fragWrap(await response.text());

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const material = new THREE.ShaderMaterial({
  fragmentShader: fragmentShader,
  uniforms: {
    iResolution: {
      value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1),
    },
    iTime: { value: 0.0 },
  },
});

const canvas = document.querySelector("canvas");
const camera = new THREE.PerspectiveCamera(
  10,
  canvas.width / canvas.height,
  0.1,
  1000
);
camera.position.z = 5;

const geometry = new THREE.PlaneGeometry(2, 2);
const plane = new THREE.Mesh(geometry, material);

const scene = new THREE.Scene();
scene.add(plane);

const render = () => {
  requestAnimationFrame(render);
  material.uniforms.iTime.value += 0.01;
  renderer.render(scene, camera);
};

addEventListener(
  "resize",
  () => {
    material.uniforms.iResolution.value.set(
      window.innerWidth,
      window.innerHeight,
      1
    );
    renderer.setSize(window.innerWidth, window.innerHeight);
  },
  false
);

render();
