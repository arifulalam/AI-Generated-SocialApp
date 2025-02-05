import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
import { Perspective } from 'perspective-api-client';

let nsfwModel = null;
//console.log(import.meta.env.VITE_PERSPECTIVE_API_KEY);
//const perspective = new Perspective(import.meta.env.VITE_PERSPECTIVE_API_KEY);

// Initialize NSFW detection model
export const initNSFWModel = async () => {
  if (!nsfwModel) {
    nsfwModel = await nsfwjs.load();
  }
  return nsfwModel;
};

// Check image content
export const checkImage = async (file) => {
  try {
    const model = await initNSFWModel();
    
    // Create an image element
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    // Wait for image to load
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    // Predict content type
    const predictions = await model.classify(img);
    
    // Clean up
    URL.revokeObjectURL(img.src);

    // Check for inappropriate content
    const inappropriate = predictions.some(prediction => 
      (prediction.className === 'Porn' && prediction.probability > 0.5) ||
      (prediction.className === 'Hentai' && prediction.probability > 0.5) ||
      (prediction.className === 'Sexy' && prediction.probability > 0.8)
    );

    return {
      safe: !inappropriate,
      predictions
    };
  } catch (error) {
    console.error('Error checking image:', error);
    throw new Error('Failed to analyze image content');
  }
};

// Check text content
export const checkText = async (text) => {
  try {
    const result = false; 
    /*await perspective.analyze(text, {
      attributes: [
        'TOXICITY',
        'SEVERE_TOXICITY',
        'IDENTITY_ATTACK',
        'THREAT',
        'SEXUALLY_EXPLICIT',
        'PROFANITY'
      ]
    });*/

    const scores = result.attributeScores;
    
    // Define thresholds for different content types
    const isInappropriate = 
      scores.SEVERE_TOXICITY.summaryScore.value > 0.7 ||
      scores.IDENTITY_ATTACK.summaryScore.value > 0.7 ||
      scores.SEXUALLY_EXPLICIT.summaryScore.value > 0.8 ||
      (scores.TOXICITY.summaryScore.value > 0.8 && 
       scores.PROFANITY.summaryScore.value > 0.8);

    return {
      safe: !isInappropriate,
      scores
    };
  } catch (error) {
    console.error('Error checking text:', error);
    throw new Error('Failed to analyze text content');
  }
};

// Keywords blacklist
const blacklistedKeywords = [
  // Racial slurs and hate speech
  'racial slurs',
  'hate speech',
  // Add more keywords as needed
];

// Check for blacklisted keywords
export const containsBlacklistedKeywords = (text) => {
  const lowercaseText = text.toLowerCase();
  return blacklistedKeywords.some(keyword => 
    lowercaseText.includes(keyword.toLowerCase())
  );
};

// Combined content check
export const validateContent = async ({ text, media }) => {
  const issues = [];

  // Check text content
  if (text) {
    if (containsBlacklistedKeywords(text)) {
      issues.push('Content contains inappropriate language');
    }

    const textCheck = await checkText(text);
    if (!textCheck.safe) {
      issues.push('Content may contain harmful or inappropriate text');
    }
  }

  // Check media content
  if (media && media.length > 0) {
    for (const file of media) {
      if (file.type.startsWith('image/')) {
        const imageCheck = await checkImage(file);
        if (!imageCheck.safe) {
          issues.push('One or more images contain inappropriate content');
          break;
        }
      }
    }
  }

  return {
    safe: issues.length === 0,
    issues
  };
};
