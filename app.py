from flask import Flask, request, jsonify
import pickle
from flask_cors import CORS 
import numpy as np
from sklearn.preprocessing import StandardScaler
import os

app = Flask(__name__)
CORS(app)

# Load the model and scaler
model_path = os.path.join('flight_behavior_model.pkl')

try:
    with open(model_path, 'rb') as f:
        model_data = pickle.load(f)
        model = model_data['model']
        scaler = model_data['scaler']
    print("Model loaded successfully")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None
    scaler = None

# Your model's class labels
CLASS_LABELS = ['cruise', 'descend', 'stall', 'turn_left', 'turn_right', 'unknown']

@app.route('/predict', methods=['POST'])
def predict():
    if not model or not scaler:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        # Get parameters from request
        data = request.json
        params = [
            data.get('fuel', 50),
            data.get('throttle', 50),
            data.get('weight', 10000),
            data.get('altitude', 5000),
            data.get('speed', 600),
            data.get('pitch', 0),
            data.get('roll', 0),
            data.get('yaw', 0),
            data.get('engineTemp', 400),
            data.get('flapAngle', 0)
        ]
        
        # Normalize parameters
        params = np.array(params).reshape(1, -1)
        params_normalized = scaler.transform(params)
        
        # Get prediction probabilities
        probabilities = model.predict_proba(params_normalized)[0]
        
        # Get the predicted class
        predicted_class_idx = np.argmax(probabilities)
        predicted_class = CLASS_LABELS[predicted_class_idx]
        confidence = probabilities[predicted_class_idx]
        
        return jsonify({
            'predicted_class': predicted_class,
            'confidence': float(confidence),
            'probabilities': {cls: float(prob) for cls, prob in zip(CLASS_LABELS, probabilities)},
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/')
def home():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)