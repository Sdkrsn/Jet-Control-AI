// JetControl AI - Complete Solution
let scene, camera, renderer, aircraft;
let canvas = document.getElementById('aircraft-canvas');
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraDistance = 15;
let cameraAngle = { x: 0, y: 0 };

function initThreeJS() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x10141a);
    scene.fog = new THREE.FogExp2(0x10141a, 0.001);

    // Camera
    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    updateCameraPosition();

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
    scene.add(hemisphereLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x00e676, 0x00e676);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // Mouse events for camera control
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', onMouseWheel);

    // Load aircraft model
    loadAircraftModel();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function updateCameraPosition() {
    camera.position.x = cameraDistance * Math.sin(cameraAngle.x) * Math.cos(cameraAngle.y);
    camera.position.y = cameraDistance * Math.sin(cameraAngle.y);
    camera.position.z = cameraDistance * Math.cos(cameraAngle.x) * Math.cos(cameraAngle.y);
    camera.lookAt(0, 0, 0);
}

function onMouseDown(event) {
    isDragging = true;
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseUp() {
    isDragging = false;
}

function onMouseMove(event) {
    if (!isDragging) return;
    
    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;
    
    cameraAngle.x += deltaX * 0.01;
    cameraAngle.y -= deltaY * 0.01;
    cameraAngle.y = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraAngle.y));
    
    updateCameraPosition();
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseWheel(event) {
    cameraDistance += event.deltaY * 0.01;
    cameraDistance = Math.max(5, Math.min(50, cameraDistance));
    updateCameraPosition();
}

function loadAircraftModel() {
    const loader = new THREE.GLTFLoader();
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);

    loader.load(
        'Models/scene.gltf',
        function(gltf) {
            console.log('Model loaded successfully');
            aircraft = gltf.scene;
            
            // Larger aircraft model
            aircraft.scale.set(1.5, 1.5, 1.5);
            aircraft.position.y = 0;
            
            // Center the model
            const box = new THREE.Box3().setFromObject(aircraft);
            const center = box.getCenter(new THREE.Vector3());
            aircraft.position.sub(center);
            
            scene.add(aircraft);
            
            // Start animation
            animate();
        },
        function(xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function(error) {
            console.error('Error loading model:', error);
            loadFallbackModel();
        }
    );
}

function loadFallbackModel() {
    console.log('Loading fallback model');
    const geometry = new THREE.BoxGeometry(2, 1, 5);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0x00ff00,
        specular: 0x111111,
        shininess: 30
    });
    aircraft = new THREE.Mesh(geometry, material);
    scene.add(aircraft);
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    
    if (aircraft) {
        // Corrected control mapping
        aircraft.rotation.x = THREE.MathUtils.degToRad(params.pitch || 0); // Pitch (nose up/down)
        aircraft.rotation.z = THREE.MathUtils.degToRad(params.roll || 0);  // Roll (banking)
        aircraft.rotation.y = THREE.MathUtils.degToRad(params.yaw || 0);   // Yaw (turning)
        
        // Gentle floating animation
        aircraft.position.y = Math.sin(Date.now() * 0.001) * 0.5;
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
}

// PARAMETER CONTROLS
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
                updatePrediction();
            });
        }
    });
}

// ONNX MODEL LOADING AND PREDICTION
let onnxSession = null;
let onnxModelLoaded = false;

async function loadONNXModel() {
    try {
        console.log('Loading ONNX model...');
        onnxSession = new onnx.InferenceSession();
        await onnxSession.loadModel('Models/flight_behavior_model.onnx');
        onnxModelLoaded = true;
        console.log('ONNX model loaded successfully.');
        updatePrediction();
    } catch (err) {
        console.error('Failed to load ONNX model:', err);
        document.getElementById('prediction-output').textContent = 'Failed to load ONNX model: ' + err;
    }
}

async function updatePrediction() {
    const output = document.getElementById('prediction-output');
    if (!onnxModelLoaded) {
        output.textContent = 'Model loading...';
        return;
    }
    const input = new Float32Array([
        params.fuel,
        params.throttle,
        params.weight,
        params.altitude,
        params.speed,
        params.pitch,
        params.roll,
        params.yaw,
        params.engineTemp,
        params.flapAngle
    ]);
    const tensor = new onnx.Tensor(input, 'float32', [1, 10]);
    try {
        const result = await onnxSession.run({ float_input: tensor });
        const prediction = Object.values(result)[0].data[0];
        output.textContent = 'Prediction: ' + prediction;
    } catch (err) {
        output.textContent = 'Prediction error: ' + err;
        console.error('Prediction error:', err);
    }
}

// INIT
window.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    setupParamControls();
    document.getElementById('prediction-output').textContent = 'Prediction will appear here.';
    loadONNXModel();
});