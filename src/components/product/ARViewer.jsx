import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import {
  CubeIcon,
  ArrowPathIcon,
  ViewfinderCircleIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';

const ARViewer = ({ product, modelUrl }) => {
  const containerRef = useRef(null);
  const [isARSupported, setIsARSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  // Three.js instances
  const scene = useRef(new THREE.Scene());
  const camera = useRef(null);
  const renderer = useRef(null);
  const model = useRef(null);
  const mixer = useRef(null);
  const clock = useRef(new THREE.Clock());

  useEffect(() => {
    checkARSupport();
    initializeAR();

    return () => {
      if (renderer.current) {
        renderer.current.dispose();
      }
    };
  }, []);

  const checkARSupport = async () => {
    if ('xr' in navigator) {
      try {
        const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
        setIsARSupported(isSupported);
      } catch (error) {
        console.error('Error checking AR support:', error);
        setIsARSupported(false);
      }
    } else {
      setIsARSupported(false);
    }
  };

  const initializeAR = async () => {
    try {
      // Setup renderer
      renderer.current = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
      });
      renderer.current.setSize(window.innerWidth, window.innerHeight);
      renderer.current.setPixelRatio(window.devicePixelRatio);
      renderer.current.xr.enabled = true;

      // Setup camera
      camera.current = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.current.position.z = 5;

      // Setup lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.current.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0, 10, 0);
      scene.current.add(directionalLight);

      // Load 3D model
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          model.current = gltf.scene;
          scene.current.add(model.current);

          // Setup animations if available
          if (gltf.animations.length) {
            mixer.current = new THREE.AnimationMixer(model.current);
            const action = mixer.current.clipAction(gltf.animations[0]);
            action.play();
          }

          setIsLoading(false);
        },
        (progress) => {
          console.log('Loading progress:', (progress.loaded / progress.total) * 100);
        },
        (error) => {
          console.error('Error loading model:', error);
          setError('Failed to load 3D model');
          setIsLoading(false);
        }
      );

      // Add AR button
      const arButton = ARButton.createButton(renderer.current, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: containerRef.current }
      });
      containerRef.current.appendChild(arButton);

      // Start animation loop
      renderer.current.setAnimationLoop(render);
      containerRef.current.appendChild(renderer.current.domElement);

      // Handle window resize
      window.addEventListener('resize', onWindowResize);
    } catch (error) {
      console.error('Error initializing AR:', error);
      setError('Failed to initialize AR');
      setIsLoading(false);
    }
  };

  const render = () => {
    if (mixer.current) {
      mixer.current.update(clock.current.getDelta());
    }
    renderer.current.render(scene.current, camera.current);
  };

  const onWindowResize = () => {
    if (camera.current && renderer.current) {
      camera.current.aspect = window.innerWidth / window.innerHeight;
      camera.current.updateProjectionMatrix();
      renderer.current.setSize(window.innerWidth, window.innerHeight);
    }
  };

  const captureImage = () => {
    try {
      const canvas = renderer.current.domElement;
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
    } catch (error) {
      console.error('Error capturing image:', error);
    }
  };

  const resetModel = () => {
    if (model.current) {
      model.current.position.set(0, 0, 0);
      model.current.rotation.set(0, 0, 0);
      model.current.scale.set(1, 1, 1);
    }
  };

  const handleModelInteraction = (event) => {
    if (!model.current) return;

    const rect = renderer.current.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x, y }, camera.current);

    const intersects = raycaster.intersectObject(model.current, true);
    if (intersects.length > 0) {
      // Handle model interaction
      const point = intersects[0].point;
      model.current.position.copy(point);
    }
  };

  if (!isARSupported) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">
          AR is not supported on your device. Please try using a compatible device.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-screen">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-center">
            <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-2">Loading 3D model...</p>
          </div>
        </div>
      )}

      {/* AR Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
        <button
          onClick={resetModel}
          className="p-3 bg-white rounded-full shadow-lg"
        >
          <ViewfinderCircleIcon className="h-6 w-6 text-gray-800" />
        </button>
        <button
          onClick={captureImage}
          className="p-3 bg-white rounded-full shadow-lg"
        >
          <PhotoIcon className="h-6 w-6 text-gray-800" />
        </button>
      </div>

      {/* Captured Image Preview */}
      {capturedImage && (
        <div className="absolute top-4 right-4 w-32 h-32">
          <img
            src={capturedImage}
            alt="AR Capture"
            className="w-full h-full object-cover rounded-lg shadow-lg"
          />
          <button
            onClick={() => setCapturedImage(null)}
            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Product Info Overlay */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg">
        <h3 className="font-medium">{product.name}</h3>
        <p className="text-sm text-gray-600 mt-1">{product.price}</p>
      </div>

      {/* Instructions */}
      {!isLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white bg-black bg-opacity-50 p-4 rounded-lg pointer-events-none">
          <p>Point your camera at a flat surface to place the 3D model</p>
        </div>
      )}
    </div>
  );
};

export default ARViewer;
