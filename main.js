// main.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as ort from 'onnxruntime-web';

// ONNX Runtime WASM Path Configuration (kept for reference, but ONNX loading is skipped as requested)
ort.env.wasm.wasmPaths = {
  'ort-wasm.wasm': '/ort-wasm/ort-wasm.wasm',
  'ort-wasm-simd.wasm': '/ort-wasm/ort-wasm-simd-threaded.wasm', // This path might need adjustment if you enable ONNX later
  'ort-wasm-threaded.wasm': '/ort-wasm/ort-wasm-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.wasm': '/ort-wasm/ort-wasm-simd-threaded.jsep.wasm',
};
console.log('ONNX Runtime WASM paths configured.');

let scene, camera, renderer, aircraft;
let canvas = document.getElementById('aircraft-canvas');
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraDistance = 15;
let cameraAngle = { x: 0, y: 0 }; // Initialized here, will be set in initThreeJS

// Global flags for ONNX loading state - Set to force analytical mode from start
let onnxSession = null;
let onnxModelLoaded = false; // Always false to force analytical
let usingFallbackModel = true; // Always true to indicate analytical is being used

function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x10141a);
    scene.fog = new THREE.FogExp2(0x10141a, 0.001);

    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    // --- START MODIFIED ---
    cameraAngle.y = THREE.MathUtils.degToRad(15); // Start looking down at 15 degrees
    // --- END MODIFIED ---
    updateCameraPosition();

    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    const ambientLight = new THREE.AmbientLight(0x404040, 5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
    scene.add(hemisphereLight);

    const gridHelper = new THREE.GridHelper(20, 20, 0x00e676, 0x00e676);
    gridHelper.position.y = 0; // Grid is at y=0
    scene.add(gridHelper);

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', onMouseWheel);

    loadAircraftModel();

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
    // --- START MODIFIED ---
    // Allow camera to look down a bit more, but not fully inverted
    cameraAngle.y -= deltaY * 0.01;
    cameraAngle.y = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, cameraAngle.y)); // Approx -81 to +81 degrees
    // --- END MODIFIED ---

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
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);

    loader.load(
        'Models/scene.gltf',
        function(gltf) {
            console.log('Model loaded successfully');
            aircraft = gltf.scene;

            aircraft.scale.set(1.5, 1.5, 1.5); // Apply scaling first

            // Calculate the bounding box of the entire aircraft model *after* scaling
            const box = new THREE.Box3().setFromObject(aircraft);

            // Get the current lowest Y-coordinate of the model's bounding box
            const currentMinY = box.min.y;

            // Define the desired vertical offset from the grid (e.g., 0.1 units above y=0)
            const desiredClearance = 0.1; // This ensures it's visibly above the grid. Adjust as needed.

            // Calculate the amount needed to shift the model upwards.
            // If currentMinY is negative, we add its absolute value to bring it to y=0,
            // then add the desiredClearance.
            const verticalShift = (0 - currentMinY) + desiredClearance;

            // Apply the calculated vertical shift to the model's Y position
            aircraft.position.y += verticalShift;

            // OPTIONAL: Keep the model centered horizontally (X and Z axes)
            // You can comment these two lines out if you find the model ends up
            // off-center horizontally after the vertical adjustment based on your specific model.
            const center = box.getCenter(new THREE.Vector3());
            aircraft.position.x -= center.x;
            aircraft.position.z -= center.z;


            scene.add(aircraft);

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

    // For the fallback box, calculate its actual lowest point too for consistency
    const boxFallback = new THREE.Box3().setFromObject(aircraft);
    const currentMinYFallback = boxFallback.min.y;
    const desiredClearanceFallback = 0.1; // Same desired clearance for consistency
    aircraft.position.y += (0 - currentMinYFallback) + desiredClearanceFallback;

    scene.add(aircraft);
    animate();
}

function animate() {
    requestAnimationFrame(animate);

    if (aircraft) {
        // Pitch (nose up/down): Positive pitch (slider) -> nose up (visual) -> negative X rotation
        aircraft.rotation.x = THREE.MathUtils.degToRad(-(params.pitch || 0));
        // Roll (banking): Positive roll (slider) -> right bank (visual) -> positive Z rotation
        aircraft.rotation.z = THREE.MathUtils.degToRad(params.roll || 0);
        // Yaw (turning): Positive yaw (slider) -> nose right (visual) -> negative Y rotation
        // This is crucial for matching the analytical model's turn logic.
        aircraft.rotation.y = THREE.MathUtils.degToRad(-(params.yaw || 0));

        // Gentle floating animation (maintains the aircraft slightly above/on the grid center)
        // aircraft.position.y = Math.sin(Date.now() * 0.001) * 0.5; // This line remains commented out to prevent floating.
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

// ONNX MODEL LOADING AND PREDICTION - This function is now effectively a placeholder
async function loadONNXModel() {
    // As per user request, we are skipping ONNX loading and directly using analytical.
    console.log("Skipping ONNX model load as requested. Using analytical fallback.");
    // No actual ONNX loading logic here. Global flags onnxModelLoaded and usingFallbackModel
    // are already set to ensure analytical mode is active.
}


// Fallback analytical prediction model (now much more robust and realistic)
function analyticalPrediction(params) {
    let flightLabel = "unknown";
    let stability = 0.9; // Start high, deduct for issues. Default to good stability.
    const reasons = []; // Array to store reasons for stability deductions/classifications

    // Normalize parameters for easier calculation (0-1 or -1 to 1)
    const normalized = {
        fuel: params.fuel / 100, // 0-1
        throttle: params.throttle / 100, // 0-1
        weight: (params.weight - 5000) / 15000, // 0-1 (normalized from 5000-20000)
        altitude: params.altitude / 12000, // 0-1 (0 to 12000m)
        speed: params.speed / 2000, // 0-1 (0 to 2000 km/h)
        pitch: params.pitch / 30, // -1 to 1 (-30 to 30 deg)
        roll: params.roll / 45,   // -1 to 1 (-45 to 45 deg)
        yaw: params.yaw / 30,     // -1 to 1 (-30 to 30 deg)
        engineTemp: (params.engineTemp - 200) / 1000, // 0-1 (200 to 1200 C)
        flapAngle: (params.flapAngle + 10) / 50 // 0-1 (-10 to 40 deg)
    };

    // --- Determine Flight Label ---
    // Prioritize clear flight states first, then apply global stability modifiers.

    // 1. Cruise condition: Very stable, neutral flight.
    if (params.speed > 550 && params.speed < 950 && // Slightly refined speed range
        params.throttle > 45 && params.throttle < 70 &&
        params.altitude > 2500 && params.altitude < 10000 && // Slightly wider altitude for general cruise
        Math.abs(params.pitch) < 2 && // Very near 0 pitch
        Math.abs(params.roll) < 2 &&  // Very near 0 roll
        Math.abs(params.yaw) < 2) {   // Very near 0 yaw
        flightLabel = "cruise";
        stability = 0.98; // Very high base stability for ideal cruise
        reasons.push("Ideal parameters for stable cruise flight.");
    }
    // 2. Climb condition: Positive pitch, sufficient thrust and speed.
    // Adjusted throttle and pitch thresholds to be more inclusive.
    else if (params.pitch > 5 && params.throttle >= 45 && params.speed > 400) { // Pitch > 5 degrees (more defined climb)
        flightLabel = "climb";
        stability = 0.88; // High base for controlled climb
        if (params.pitch > 20) { // Very steep climb
            stability -= (params.pitch - 20) / 10 * 0.15;
            reasons.push("Steep climb angle.");
        }
        if (params.speed < 500 && params.pitch > 15) { // Slow speed for steep climb
             stability -= 0.05;
             reasons.push("Relatively low speed for current climb rate.");
        }
    }
    // 3. Descend condition: Negative pitch and sufficient speed.
    // Enhanced to better differentiate controlled vs. steep/powered descent.
    else if (params.pitch < -5 && params.speed > 300) { // Pitch < -5 degrees
        flightLabel = "descend";
        stability = 0.85; // Good base for controlled descent

        if (params.pitch < -20) { // Very steep descent
            stability -= (Math.abs(params.pitch) - 20) / 10 * 0.18;
            reasons.push("Steep descent angle.");
        }
        if (params.throttle > 60 && params.speed > 1000) { // High throttle during steep descent (potential overspeed)
            stability -= 0.1;
            reasons.push("High throttle during steep descent, potential for overspeed.");
        } else if (params.throttle < 20) { // Gliding descent
            reasons.push("Low throttle indicates a gliding descent.");
        }
    }
    // 4. Turn Left / Turn Right: Significant yaw and decent speed, considering roll for coordination.
    else if (Math.abs(params.yaw) > 5 && params.speed > 300) { // Yaw > 5 degrees
        if (params.yaw < -5) { // Negative yaw value means a visual LEFT turn
            flightLabel = "turn_left";
            reasons.push("Executing a left turn.");
        } else { // Positive yaw value means a visual RIGHT turn
            flightLabel = "turn_right";
            reasons.push("Executing a right turn.");
        }
        stability = 0.75; // Base stability for turns
        stability -= (Math.abs(normalized.yaw) - (5/30)) * 0.2; // Deduct for aggressive yaw
        stability -= Math.abs(normalized.roll) * 0.1; // Deduct for uncoordinated roll
        if (Math.abs(normalized.roll) > 0.3) {
            reasons.push("Significant roll angle during turn, consider coordination.");
        }
        if (params.speed < 500 || params.speed > 1200) {
             stability -= 0.05;
             reasons.push("Turn speed is outside optimal range.");
        }
    }
    // 5. Stall condition: Very low speed, high positive pitch, and low throttle. (CRITICAL)
    else if (params.speed < 150 && params.pitch > 15 && params.throttle < 20) { // More specific stall conditions
        flightLabel = "stall";
        stability = 0.05; // Very low base stability for stall
        reasons.push("STALL WARNING: Low speed, high pitch, and low throttle detected.");
        stability += (params.speed / 150) * 0.05; // Slight recovery chance if speed increases
    }
    // 6. Near Ground/Takeoff/Landing (more robust check for these specific low-altitude states)
    else if (params.altitude < 150 && params.speed < 350) { // Low altitude and relatively low speed
        if (params.flapAngle > 10 && params.speed > 100 && params.speed < 250 && params.throttle < 40) {
            flightLabel = "landing_approach";
            stability = 0.85; // Controlled approach is stable
            reasons.push("Executing a controlled landing approach.");
        } else if (params.flapAngle > 0 && params.speed < 150 && params.throttle > 60) {
            flightLabel = "takeoff_run";
            stability = 0.8; // Active takeoff is stable
            reasons.push("Performing a takeoff run.");
        } else if (params.flapAngle > 10 && params.speed < 50 && params.throttle < 20) {
            flightLabel = "landed";
            stability = 0.95; // Stable on ground
            reasons.push("Aircraft is on the ground.");
        } else {
            // Low altitude, but not specifically landing/takeoff config, potentially dangerous.
            flightLabel = "low_altitude_flight";
            stability = 0.45; // Caution or Critical if very low and fast
            reasons.push("Operating at very low altitude without specific landing/takeoff configuration.");
            if (params.altitude < 20 && params.speed > 300) {
                stability -= 0.2;
                reasons.push("EXTREMELY low altitude at high speed.");
            }
        }
    }
    // 7. Default to unknown for unclassified states, with dynamic stability based on control inputs
    else {
        flightLabel = "unknown";
        let angularDeviation = Math.abs(normalized.pitch) + Math.abs(normalized.roll) + Math.abs(normalized.yaw);
        if (angularDeviation < 0.3) { // Relatively neutral controls for an unknown state
            stability = 0.65; // Mild Caution / Good
            reasons.push("Flight parameters do not fit a standard classification, but control inputs are relatively neutral.");
        } else {
            stability = 0.55; // Caution
            reasons.push("Flight parameters do not fit a standard classification, and control inputs show significant deviation.");
        }
    }

    // --- Apply Global Modifiers for Critical Parameters (deductions from current stability) ---

    // Fuel: Extremely low fuel is highly critical.
    if (normalized.fuel < 0.03) { // 0-3% fuel
        stability -= 0.6; // Very severe penalty
        reasons.push("CRITICAL: Fuel extremely low (0-3%).");
    } else if (normalized.fuel < 0.1) { // 3-10% fuel
        stability -= 0.3;
        reasons.push("WARNING: Low fuel (3-10%).");
    } else if (normalized.fuel < 0.2) { // 10-20% fuel
        stability -= 0.1;
        reasons.push("CAUTION: Fuel quantity is low (10-20%).");
    }

    // Engine Temp: Indicates stress or damage.
    if (normalized.engineTemp > 0.95) { // Over 1150C
        stability -= (normalized.engineTemp - 0.95) * 0.7; // Severe penalty for extreme temp
        reasons.push(`CRITICAL: Engine Overheat (${params.engineTemp}°C).`);
    } else if (normalized.engineTemp > 0.85) { // Over 1050C
        stability -= (normalized.engineTemp - 0.85) * 0.4;
        reasons.push(`WARNING: High Engine Temperature (${params.engineTemp}°C).`);
    } else if (normalized.engineTemp > 0.7) { // Over 900C
        stability -= (normalized.engineTemp - 0.7) * 0.1;
        reasons.push(`CAUTION: Elevated Engine Temperature (${params.engineTemp}°C).`);
    }

    // Altitude Extremes:
    if (params.altitude < 10) { // Very very low (crash imminent)
        stability = 0.01; // Near zero stability
        reasons.push("CRITICAL: Extremely low altitude (below 10m). Ground proximity alert!");
    } else if (params.altitude > 11800) { // Near service ceiling
        stability -= (params.altitude - 11800) / 200 * 0.2;
        reasons.push("WARNING: Approaching service ceiling (above 11800m).");
        if (params.speed < 400 && flightLabel !== "stall") { // Too slow at very high altitude
            stability -= 0.1;
            reasons.push("Low speed for very high altitude flight.");
        }
    }

    // Speed Extremes:
    if (params.speed < 80 && flightLabel !== "landed" && flightLabel !== "takeoff_run") { // Critically slow (not landing/takeoff)
        stability -= (80 - params.speed) / 80 * 0.3;
        reasons.push("CRITICAL: Airspeed dangerously low outside of landing/takeoff.");
    }
    if (params.speed > 1950) { // Exceeding max structural speed
        stability -= (params.speed - 1950) / 50 * 0.4;
        reasons.push("CRITICAL: Airspeed exceeds maximum structural limits.");
    } else if (params.speed > 1800) {
        stability -= (params.speed - 1800) / 150 * 0.2;
        reasons.push("WARNING: Very high airspeed, approaching structural limits.");
    }

    // Flap Angle: Inappropriate flap usage.
    if (params.flapAngle > 10 && params.speed > 600) { // Flaps deployed at high speed
        stability -= (params.flapAngle - 10) / 30 * 0.35; // Strong penalty
        reasons.push("CRITICAL: Flaps extended at high speed, risk of damage.");
    }
    if (params.flapAngle < 5 && params.speed < 250 && params.altitude < 500 && flightLabel === "landing_approach") { // Needs flaps for landing
        stability -= (5 - params.flapAngle) / 5 * 0.15;
        reasons.push("CAUTION: Insufficient flap angle for landing approach.");
    }

    // Weight: Very high weight slightly reduces maneuverability and efficiency.
    if (params.weight > 18000) {
        stability -= (params.weight - 18000) / 2000 * 0.08;
        reasons.push("CAUTION: High aircraft weight impacts maneuverability and fuel efficiency.");
    }

    // Excessive control deflections (deduct for large deviations from neutral, adjusted coefficients)
    const totalAngularDeviation = Math.abs(normalized.pitch) + Math.abs(normalized.roll) + Math.abs(normalized.yaw);
    if (totalAngularDeviation > 0.5) { // If total normalized deviation is significant (e.g., > 15 degrees avg.)
        stability -= (totalAngularDeviation - 0.5) * 0.1; // Deduct more for extreme
        reasons.push("CAUTION: Significant control surface deflection (aggressive maneuvering).");
    }


    // Clamp final stability between 0 and 1
    stability = Math.min(1, Math.max(0, stability));

    return { label: flightLabel, stability: stability, reasons: reasons };
}

async function updatePrediction() {
    const output = document.getElementById('prediction-output');

    try {
        let predictionResult;
        // Always use analytical model as requested
        predictionResult = analyticalPrediction(params);

        const prediction = predictionResult.stability;
        const flightLabel = predictionResult.label;
        const reasons = predictionResult.reasons;

        let statusEmoji, statusText, statusColor;
        if (prediction > 0.8) {
            statusEmoji = '✅';
            statusText = 'Stable';
            statusColor = '#00e676';
        } else if (prediction > 0.5) {
            statusEmoji = '⚠️';
            statusText = 'Caution';
            statusColor = '#ffc107';
        } else {
            statusEmoji = '❌';
            statusText = 'Critical';
            statusColor = '#ff5555';
        }

        let reasonsHtml = '';
        if (reasons && reasons.length > 0) {
            reasonsHtml = '<strong>Reasons:</strong><ul>' + reasons.map(r => `<li>${r}</li>`).join('') + '</ul>';
        }


        output.innerHTML = `
            <strong>Flight State:</strong> <span style="color:${statusColor}">${flightLabel.toUpperCase().replace('_', ' ')}</span><br>
            <strong>Overall Stability:</strong> <span style="color:${statusColor}">${(prediction * 100).toFixed(1)}% ${statusEmoji} ${statusText}</span><br>
            <progress value="${prediction}" max="1"></progress><br>
            <small>Using analytical model</small>
            ${reasonsHtml}
        `;

    } catch (error) {
        console.error('Prediction Error:', error);
        output.innerHTML = `
            <span style="color:#ff5555">Prediction Error:</span><br>
            ${error.message}<br>
            <small>Check console for details</small>
            <small>Using analytical model</small>
        `;
    }
}

// INIT
window.addEventListener('DOMContentLoaded', async () => {
    initThreeJS();
    setupParamControls();
    // Directly set the initial message and ensure analytical mode is active.
    // The global flags onnxModelLoaded=false and usingFallbackModel=true handle the model choice.
    document.getElementById('prediction-output').innerHTML = 'AI model loaded, change params to predict.<br><small>Using analytical model</small>';
    // Removed the call to loadONNXModel() here, as we are skipping ONNX loading entirely.
});