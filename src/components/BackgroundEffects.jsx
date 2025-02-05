import React from 'react';
import { useState, useEffect, useRef } from 'react';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

const BackgroundEffects = ({ stream, onProcessedStream }) => {
  const [effect, setEffect] = useState('none'); // none, blur, image, color
  const [model, setModel] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('#00ff00');
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const loadModel = async () => {
      const segmenterConfig = {
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2,
      };
      const model = await bodySegmentation.createSegmenter(
        bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
        segmenterConfig
      );
      setModel(model);
    };

    loadModel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!stream || !model || !canvasRef.current) return;

    const video = videoRef.current;
    video.srcObject = stream;
    video.play();

    const processFrame = async () => {
      if (!video || !model || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Get segmentation mask
      const segmentation = await model.segmentPeople(video);
      const foregroundMask = await bodySegmentation.toBinaryMask(segmentation);

      // Draw original frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Apply effect based on mask
      for (let i = 0; i < frame.data.length; i += 4) {
        const maskValue = foregroundMask.data[i / 4];
        
        if (maskValue === 0) { // Background pixel
          switch (effect) {
            case 'blur':
              // Simple blur effect (average of surrounding pixels)
              const x = (i / 4) % canvas.width;
              const y = Math.floor((i / 4) / canvas.width);
              let r = 0, g = 0, b = 0, count = 0;
              
              for (let dx = -5; dx <= 5; dx++) {
                for (let dy = -5; dy <= 5; dy++) {
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                    const j = (ny * canvas.width + nx) * 4;
                    r += frame.data[j];
                    g += frame.data[j + 1];
                    b += frame.data[j + 2];
                    count++;
                  }
                }
              }
              
              frame.data[i] = r / count;
              frame.data[i + 1] = g / count;
              frame.data[i + 2] = b / count;
              break;

            case 'image':
              if (backgroundImage) {
                const bgX = (i / 4) % canvas.width;
                const bgY = Math.floor((i / 4) / canvas.width);
                const bgI = (bgY * canvas.width + bgX) * 4;
                frame.data[i] = backgroundImage.data[bgI];
                frame.data[i + 1] = backgroundImage.data[bgI + 1];
                frame.data[i + 2] = backgroundImage.data[bgI + 2];
              }
              break;

            case 'color':
              const color = hexToRgb(backgroundColor);
              frame.data[i] = color.r;
              frame.data[i + 1] = color.g;
              frame.data[i + 2] = color.b;
              break;
          }
        }
      }

      ctx.putImageData(frame, 0, 0);
      
      // Create a new MediaStream from the canvas
      const processedStream = canvas.captureStream();
      onProcessedStream(processedStream);

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();
  }, [stream, model, effect, backgroundImage, backgroundColor]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setBackgroundImage(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.src = URL.createObjectURL(file);
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <button
          onClick={() => setEffect('none')}
          className={`px-3 py-1 rounded ${
            effect === 'none' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          None
        </button>
        <button
          onClick={() => setEffect('blur')}
          className={`px-3 py-1 rounded ${
            effect === 'blur' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          Blur
        </button>
        <button
          onClick={() => setEffect('image')}
          className={`px-3 py-1 rounded ${
            effect === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          Image
        </button>
        <button
          onClick={() => setEffect('color')}
          className={`px-3 py-1 rounded ${
            effect === 'color' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          Color
        </button>
      </div>

      {effect === 'image' && (
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      )}

      {effect === 'color' && (
        <input
          type="color"
          value={backgroundColor}
          onChange={(e) => setBackgroundColor(e.target.value)}
          className="block w-full h-10 rounded"
        />
      )}

      <video
        ref={videoRef}
        className="hidden"
        width="640"
        height="480"
        autoPlay
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="hidden"
        width="640"
        height="480"
      />
    </div>
  );
};

export default BackgroundEffects;
