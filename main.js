// JetControl AI - main.js
// 3D Fighter Aircraft Viewer, Parameter Controls, Model Import Placeholder, Mouse Control (Unlimited Rotation)

let scene, camera, renderer, aircraft, animateId;
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

  // Create fighter aircraft
  aircraft = createFighterAircraft();
  scene.add(aircraft);

  setupMouseControls(canvas);

  window.addEventListener('resize', onWindowResize);
  animate();
}

function createFighterAircraft() {
  const group = new THREE.Group();

  // Fuselage (longer, thinner)
  const fuselageGeo = new THREE.CylinderGeometry(0.11, 0.16, 4.2, 32);
  const fuselageMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, metalness: 0.6, roughness: 0.25 });
  const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
  fuselage.rotation.z = Math.PI / 2;
  group.add(fuselage);

  // Sharper nose cone
  const noseGeo = new THREE.ConeGeometry(0.11, 0.7, 32);
  const noseMat = new THREE.MeshStandardMaterial({ color: 0x26334d });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.x = 2.15;
  nose.rotation.z = Math.PI / 2;
  group.add(nose);

  // Sharper tail cone
  const tailGeo = new THREE.ConeGeometry(0.09, 0.5, 32);
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x26334d });
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.position.x = -2.15;
  tail.rotation.z = -Math.PI / 2;
  group.add(tail);

  // Main wings (swept back)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(1.2, 0.18);
  wingShape.lineTo(1.7, 0.5);
  wingShape.lineTo(0.2, 0.1);
  wingShape.lineTo(0, 0);
  const extrudeSettings = { depth: 0.12, bevelEnabled: false };
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xffb74d, metalness: 0.4 });
  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.set(0.2, -0.18, 0.45);
  leftWing.rotation.y = 0.18;
  leftWing.rotation.x = Math.PI / 2.1;
  group.add(leftWing);
  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.position.set(0.2, -0.18, -0.45);
  rightWing.rotation.y = -0.18;
  rightWing.rotation.x = -Math.PI / 2.1;
  rightWing.scale.y = -1;
  group.add(rightWing);

  // Tail wings (horizontal stabilizers, swept)
  const tailWingGeo = new THREE.BoxGeometry(0.7, 0.05, 0.16);
  const tailWingMat = new THREE.MeshStandardMaterial({ color: 0x90caf9 });
  const leftTailWing = new THREE.Mesh(tailWingGeo, tailWingMat);
  leftTailWing.position.set(-1.7, 0.05, 0.22);
  leftTailWing.rotation.y = 0.32;
  leftTailWing.rotation.x = Math.PI / 12;
  group.add(leftTailWing);
  const rightTailWing = new THREE.Mesh(tailWingGeo, tailWingMat);
  rightTailWing.position.set(-1.7, 0.05, -0.22);
  rightTailWing.rotation.y = -0.32;
  rightTailWing.rotation.x = -Math.PI / 12;
  group.add(rightTailWing);

  // Twin vertical stabilizers (tail fins, angled)
  const finGeo = new THREE.BoxGeometry(0.32, 0.18, 0.05);
  const finMat = new THREE.MeshStandardMaterial({ color: 0x90caf9 });
  const leftFin = new THREE.Mesh(finGeo, finMat);
  leftFin.position.set(-2.05, 0.18, 0.13);
  leftFin.rotation.z = Math.PI / 16;
  leftFin.rotation.y = Math.PI / 10;
  group.add(leftFin);
  const rightFin = new THREE.Mesh(finGeo, finMat);
  rightFin.position.set(-2.05, 0.18, -0.13);
  rightFin.rotation.z = Math.PI / 16;
  rightFin.rotation.y = -Math.PI / 10;
  group.add(rightFin);

  // Cockpit (bubble canopy)
  const cockpitGeo = new THREE.SphereGeometry(0.18, 24, 16, 0, Math.PI);
  const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x1976d2, transparent: true, opacity: 0.7 });
  const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
  cockpit.position.set(0.85, 0.13, 0);
  cockpit.rotation.x = Math.PI / 2;
  group.add(cockpit);

  // Canards (small forward wings)
  const canardGeo = new THREE.BoxGeometry(0.32, 0.025, 0.08);
  const canardMat = new THREE.MeshStandardMaterial({ color: 0x90caf9 });
  const leftCanard = new THREE.Mesh(canardGeo, canardMat);
  leftCanard.position.set(1.1, 0.07, 0.16);
  leftCanard.rotation.y = 0.18;
  group.add(leftCanard);
  const rightCanard = new THREE.Mesh(canardGeo, canardMat);
  rightCanard.position.set(1.1, 0.07, -0.16);
  rightCanard.rotation.y = -0.18;
  group.add(rightCanard);

  group.position.set(0, 0, 0);
  return group;
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
      // Roll with horizontal mouse movement
      params.roll = (params.roll || 0) + dx * factor;
      document.getElementById('roll').value = params.roll;
      document.getElementById('roll-value').textContent = Math.round(params.roll);
    } else {
      // Pitch and yaw
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
  if (!aircraft) return;
  // Pitch (x), Roll (z), Yaw (y)
  aircraft.rotation.x = THREE.MathUtils.degToRad(params.pitch || 0);
  aircraft.rotation.y = THREE.MathUtils.degToRad(params.yaw || 0);
  aircraft.rotation.z = THREE.MathUtils.degToRad(params.roll || 0);
  // Optionally, change color if engine temp is high
  if (aircraft.children && aircraft.children[0] && aircraft.children[0].material) {
    if (params.engineTemp > 1000) {
      aircraft.children[0].material.color.set(0xff5252); // red for overheat
    } else {
      aircraft.children[0].material.color.set(0x4fc3f7);
    }
  }
  camera.lookAt(aircraft.position);
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
