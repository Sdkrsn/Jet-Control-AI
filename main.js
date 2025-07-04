// JetControl AI - Complete Solution with Robust ONNX Handling
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
        aircraft.rotation.x = THREE.MathUtils.degToRad(-(params.pitch || 0)); // Pitch (nose up/down)
        aircraft.rotation.z = THREE.MathUtils.degToRad(params.roll || 0);     // Roll (banking)
        aircraft.rotation.y = THREE.MathUtils.degToRad(-(params.yaw || 0));   // Yaw (turning)
        
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
let usingFallbackModel = false;

async function loadONNXModel() {
    const output = document.getElementById('prediction-output');
    output.innerHTML = 'Loading flight behavior model...<br>';

    try {
        // Try both possible model locations
        const modelPaths = [
            './flight_behavior_modell.onnx',      // Root directory
            './Models/flight_behavior_modell.onnx' // Models folder
        ];

        let modelData = null;
        let modelFound = false;

        for (const path of modelPaths) {
            try {
                output.innerHTML += `Checking: ${path}<br>`;
                const response = await fetch(path);
                if (!response.ok) continue;
                
                modelData = await response.arrayBuffer();
                output.innerHTML += `Found model at ${path}<br>`;
                modelFound = true;
                break;
            } catch (e) {
                console.log(`Not found at ${path}`, e);
            }
        }

        if (!modelFound) {
            throw new Error('Model not found in root directory or Models folder');
        }

        // Validate ONNX model header
        if (!isValidONNXModel(modelData)) {
            throw new Error('Invalid ONNX file format (corrupted or wrong version)');
        }

        // Initialize ONNX session with WebGL backend
        onnxSession = new onnx.InferenceSession({ backendHint: 'webgl' });
        await onnxSession.loadModel(modelData);

        // Verify model structure
        if (!onnxSession.inputNames.includes('float_input')) {
            throw new Error('Model input mismatch - expected "float_input"');
        }

        onnxModelLoaded = true;
        output.innerHTML += 'ONNX model loaded successfully!<br>';
        console.log('Model input dimensions:', onnxSession.inputDimensions);

    } catch (error) {
        console.error('ONNX Loading Error:', error);
        onnxModelLoaded = false;
        usingFallbackModel = true;
        
        output.innerHTML = `
            <span style="color:#ff5555">⚠️ Couldn't load AI model:</span><br>
            ${error.message}<br><br>
            <strong>Using analytical fallback mode</strong><br>
            <small>(Predictions will be simulated)</small>
        `;
    }
}

function isValidONNXModel(data) {
    // Check for ONNX file magic number
    if (!data || data.byteLength < 8) return false;
    const header = new Uint8Array(data, 0, 8);
    return header[0] === 0x4F && header[1] === 0x4E && 
           header[2] === 0x4E && header[3] === 0x58; // "ONNX"
}

// Fallback analytical prediction model
function analyticalPrediction(params) {
    // Simple physics-based approximation
    const stability = 
        0.3 * (params.throttle / 100) +
        0.2 * (1 - Math.abs(params.pitch) / 30) +
        0.2 * (1 - Math.abs(params.roll) / 45) +
        0.1 * (params.speed / 2000) +
        0.1 * (1 - (params.engineTemp - 200) / 1000) +
        0.1 * (params.altitude / 12000);
    
    return Math.min(1, Math.max(0, stability)); // Clamp to 0-1 range
}

async function updatePrediction() {
    const output = document.getElementById('prediction-output');
    
    try {
        let prediction;
        if (onnxModelLoaded) {
            // Use ONNX model if available
            const input = new Float32Array([
                params.fuel / 100,
                params.throttle / 100,
                (params.weight - 5000) / 15000,
                params.altitude / 12000,
                params.speed / 2000,
                params.pitch / 30,
                params.roll / 45,
                params.yaw / 30,
                (params.engineTemp - 200) / 1000,
                (params.flapAngle + 10) / 50
            ]);
            
            const tensor = new onnx.Tensor(input, 'float32', [1, 10]);
            const result = await onnxSession.run({ float_input: tensor });
            prediction = result[onnxSession.outputNames[0]].data[0];
        } else {
            // Fallback to analytical model
            prediction = analyticalPrediction(params);
        }

        // Format prediction output
        const status = prediction > 0.7 ? '✅ Stable' : 
                      prediction > 0.4 ? '⚠️ Caution' : '❌ Critical';
        
        output.innerHTML = `
            <strong>Flight Stability:</strong> ${(prediction * 100).toFixed(1)}%<br>
            <progress value="${prediction}" max="1"></progress><br>
            ${status}<br>
            ${usingFallbackModel ? '<small>Using analytical model</small>' : ''}
        `;

    } catch (error) {
        console.error('Prediction Error:', error);
        output.innerHTML = `
            <span style="color:#ff5555">Prediction Error:</span><br>
            ${error.message}<br>
            <small>Check console for details</small>
        `;
    }
}

// INIT
window.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    setupParamControls();
    document.getElementById('prediction-output').textContent = 'Initializing system...';
    loadONNXModel();
});