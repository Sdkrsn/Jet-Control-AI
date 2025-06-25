// JetControl AI - main.js
// 3D GLTF Aircraft Viewer, Parameter Controls, Model Import Placeholder, Mouse Control (Unlimited Rotation)

let scene, camera, renderer, aircraft, animateId, gltfAircraft = null;
let isMouseDown = false;
let lastMouse = { x: 0, y: 0 };
let isShiftDown = false;

function init3D() {
  const canvas = document.getElementById('aircraft-canvas');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101624);

  const aspect = canvas.clientWidth / canvas.clientHeight;
  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
  camera.position.set(0, 2, 8);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // Debug helpers
  const gridHelper = new THREE.GridHelper(20, 20, 0x4fc3f7, 0x232b3e);
  gridHelper.position.y = -1.2;
  scene.add(gridHelper);
  const axesHelper = new THREE.AxesHelper(2);
  scene.add(axesHelper);

  // Floor
  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x232b3e, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.2;
  scene.add(floor);

  // Load GLTF aircraft automatically
  loadGLTFAircraft('scene.gltf');

  setupMouseControls(canvas);

  window.addEventListener('resize', onWindowResize);
  animate();
}

function setupMouseControls(canvas) {
  canvas.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
  });
  window.addEventListener('mouseup', () => {
    isMouseDown = false;
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') isShiftDown = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') isShiftDown = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
    // Sensitivity factors
    const factor = 0.3;
    if (isShiftDown) {
      params.roll = (params.roll || 0) + dx * factor;
      document.getElementById('roll').value = params.roll;
      document.getElementById('roll-value').textContent = Math.round(params.roll);
    } else {
      params.pitch = (params.pitch || 0) - dy * factor;
      params.yaw = (params.yaw || 0) + dx * factor;
      document.getElementById('pitch').value = params.pitch;
      document.getElementById('pitch-value').textContent = Math.round(params.pitch);
      document.getElementById('yaw').value = params.yaw;
      document.getElementById('yaw-value').textContent = Math.round(params.yaw);
    }
    updateAircraft3D();
    updatePrediction();
  });
}

function onWindowResize() {
  const canvas = renderer.domElement;
  const width = canvas.parentElement.clientWidth * 0.92;
  const height = window.innerHeight * 0.8;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate() {
  animateId = requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// --- GLTF AUTO LOAD ---
function loadGLTFAircraft(path) {
  const loader = new THREE.GLTFLoader();
  loader.load(
    path,
    function (gltf) {
      if (gltfAircraft) {
        scene.remove(gltfAircraft);
      }
      gltfAircraft = gltf.scene;
      centerAndScaleModel(gltfAircraft);
      gltfAircraft.position.set(0, 0, 0);
      scene.add(gltfAircraft);
      updateAircraft3D();
    },
    undefined,
    function (error) {
      alert('Failed to load scene.gltf. Check the file and path.');
      console.error('Error loading GLTF:', error);
    }
  );
}

// Center and scale the imported model to fit the scene
function centerAndScaleModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 3.5 / maxDim;
  model.scale.set(scale, scale, scale);
  const center = new THREE.Vector3();
  box.getCenter(center);
  model.position.sub(center);
  model.position.y += size.y * scale / 2;
}

// --- PARAMETER CONTROLS ---
const paramList = [
  { id: 'fuel', min: 0, max: 100, default: 50 },
  { id: 'throttle', min: 0, max: 100, default: 50 },
  { id: 'weight', min: 5000, max: 20000, default: 10000 },
  { id: 'altitude', min: 0, max: 12000, default: 5000 },
  { id: 'speed', min: 0, max: 2000, default: 600 },
  { id: 'pitch', min: -30, max: 30, default: 0 },
  { id: 'roll', min: -45, max: 45, default: 0 },
  { id: 'yaw', min: -30, max: 30, default: 0 },
  { id: 'engineTemp', min: 200, max: 1200, default: 400 },
  { id: 'flapAngle', min: -10, max: 40, default: 0 }
];

const params = {};

function setupParamControls() {
  paramList.forEach(param => {
    const slider = document.getElementById(param.id);
    const valueLabel = document.getElementById(param.id + '-value');
    if (slider && valueLabel) {
      slider.value = param.default;
      valueLabel.textContent = param.default;
      params[param.id] = param.default;
      slider.addEventListener('input', () => {
        valueLabel.textContent = slider.value;
        params[param.id] = parseFloat(slider.value);
        updateAircraft3D();
        updatePrediction();
      });
    }
  });
}

// --- 3D AIRCRAFT PARAMETER UPDATES ---
function updateAircraft3D() {
  let model = gltfAircraft;
  if (!model) return;
  model.rotation.x = THREE.MathUtils.degToRad(params.pitch || 0);
  model.rotation.y = THREE.MathUtils.degToRad(params.yaw || 0);
  model.rotation.z = THREE.MathUtils.degToRad(params.roll || 0);
  camera.lookAt(model.position);
}

// --- MODEL IMPORT PLACEHOLDER ---
let loadedModel = null;
function setupModelImport() {
  const modelInput = document.getElementById('model-upload');
  modelInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    loadedModel = file;
    document.getElementById('prediction-output').textContent = `Model loaded: ${file.name}. Adjust parameters and import your model to see predictions.`;
    updatePrediction();
  });
}

// --- PREDICTION OUTPUT PLACEHOLDER ---
function updatePrediction() {
  const output = document.getElementById('prediction-output');
  if (!loadedModel) {
    output.textContent = 'Model not loaded. Adjust parameters and import your model to see predictions.';
    return;
  }
  if (params.fuel < 10) {
    output.textContent = 'Warning: Fuel critically low. Crash likely due to fuel exhaustion.';
  } else if (params.engineTemp > 1100) {
    output.textContent = 'Warning: Engine overheating. Crash risk due to engine failure.';
  } else if (params.pitch > 25) {
    output.textContent = 'Warning: Excessive pitch. Stall risk.';
  } else if (params.roll > 40 || params.roll < -40) {
    output.textContent = 'Warning: Excessive roll. Loss of control possible.';
  } else {
    output.textContent = 'Aircraft stable. No crash predicted.';
  }
}

// --- INIT ---
window.addEventListener('DOMContentLoaded', () => {
  init3D();
  setupParamControls();
  setupModelImport();
  updateAircraft3D();
  updatePrediction();
});
