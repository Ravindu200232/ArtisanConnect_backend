// routes/imageGenerationRoute.js
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Initialize Gemini AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyCMY7C8g_LSES9IB9BHS8DQVGdrSLXr08I");

// Available Gemini models
const AVAILABLE_MODELS = {
  text: "gemini-pro",  // For text generation
  vision: "gemini-pro-vision" // For image analysis
};

// Enhanced FREE Image Generation for ArticleConnect shops
router.post('/generate-images', async (req, res) => {
  try {
    const { prompt, numberOfImages = 1, shopCategory, style } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Prompt is required' 
      });
    }

    if (numberOfImages < 1 || numberOfImages > 4) {
      return res.status(400).json({ 
        success: false,
        error: 'Number of images must be between 1 and 4' 
      });
    }

    // Step 1: Use Gemini to enhance the prompt with shop context
    const model = genAI.getGenerativeModel({ model: AVAILABLE_MODELS.text });
    
    const enhancementPrompt = `You are an expert AI image prompt engineer for artisan and material supplier shops. 
Enhance this prompt for product/service image generation.

Shop Context: ${shopCategory || 'General Artisan Shop'}
Original prompt: "${prompt}"
Style Preference: ${style || 'Professional product photography'}

Create ${numberOfImages} different enhanced versions optimized for shop product listings.
Each should be 1-2 sentences, specific and detailed for e-commerce.

Return ONLY a JSON array: ["enhanced prompt 1", "enhanced prompt 2", ...]`;

    let enhancedPrompts = [];

    try {
      const result = await model.generateContent(enhancementPrompt);
      const text = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*?\]/);
      
      if (jsonMatch) {
        enhancedPrompts = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: use original prompt with shop context
        enhancedPrompts = Array(numberOfImages).fill(
          `Professional product image: ${prompt}. High quality, well-lit, suitable for online shop listing.`
        );
      }
    } catch (geminiError) {
      console.warn('Gemini prompt enhancement failed, using original prompts:', geminiError.message);
      // Use original prompts if Gemini fails
      enhancedPrompts = Array(numberOfImages).fill(prompt);
    }

    // Step 2: Generate images using FREE Pollinations.ai API
    const images = [];
    
    for (let i = 0; i < numberOfImages; i++) {
      const enhancedPrompt = enhancedPrompts[i] || prompt;
      
      try {
        // Method 1: Try Pollinations.ai first
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&seed=${Date.now() + i}&nologo=true`;
        
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });
        
        const base64Image = `data:image/jpeg;base64,${Buffer.from(imageResponse.data).toString('base64')}`;
        
        images.push({
          id: `img_${Date.now()}_${i}`,
          image: base64Image,
          prompt: prompt,
          enhancedPrompt: enhancedPrompt,
          directUrl: imageUrl,
          shopOptimized: true,
          category: shopCategory,
          generatedBy: 'Pollinations.ai'
        });
      } catch (pollinationsError) {
        console.warn(`Pollinations.ai failed for image ${i}, trying fallback...`);
        
        try {
          // Method 2: Fallback to Lorem Picsum for placeholder images
          const fallbackImageUrl = `https://picsum.photos/1024/1024?random=${Date.now() + i}`;
          const fallbackResponse = await axios.get(fallbackImageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000
          });
          
          const base64Image = `data:image/jpeg;base64,${Buffer.from(fallbackResponse.data).toString('base64')}`;
          
          images.push({
            id: `img_${Date.now()}_${i}`,
            image: base64Image,
            prompt: prompt,
            enhancedPrompt: enhancedPrompt,
            directUrl: fallbackImageUrl,
            shopOptimized: false,
            category: shopCategory,
            generatedBy: 'Placeholder (Fallback)',
            note: 'AI service unavailable - using placeholder'
          });
        } catch (fallbackError) {
          console.error(`All image generation methods failed for image ${i}:`, fallbackError.message);
          images.push({
            id: `img_${Date.now()}_${i}`,
            image: null,
            prompt: prompt,
            enhancedPrompt: enhancedPrompt,
            error: 'All image generation methods failed',
            note: 'Please try again later'
          });
        }
      }
    }

    const successfulImages = images.filter(img => img.image !== null);
    
    res.json({
      success: successfulImages.length > 0,
      images: successfulImages,
      count: successfulImages.length,
      enhancedBy: 'Gemini AI',
      timestamp: new Date().toISOString(),
      note: successfulImages.length !== numberOfImages ? 
        `Generated ${successfulImages.length} out of ${numberOfImages} requested images` : 
        'All images generated successfully'
    });

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate images',
      message: error.message,
      suggestion: 'Please check your internet connection and try again'
    });
  }
});

// Analyze image quality for shop uploads
router.post('/analyze-image-quality', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ 
        success: false,
        error: 'Image data is required' 
      });
    }

    const model = genAI.getGenerativeModel({ model: AVAILABLE_MODELS.vision });

    // Extract base64 data
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const prompt = `Analyze this image for e-commerce product listing quality. Consider:
    - Image clarity and sharpness
    - Lighting conditions
    - Composition and framing
    - Professional appearance
    - Suitability for online shop
    
    Provide a rating out of 10 and specific feedback for improvement.`;

    try {
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
      ]);

      const analysis = result.response.text();
      
      res.json({
        success: true,
        analysis: analysis,
        rating: extractRating(analysis), // Helper function to extract numeric rating
        timestamp: new Date().toISOString()
      });
    } catch (visionError) {
      console.warn('Vision model failed, providing basic analysis:', visionError.message);
      
      // Basic analysis without AI
      res.json({
        success: true,
        analysis: 'Basic image analysis: Ensure good lighting and clear focus for best shop presentation.',
        rating: 7,
        basicAnalysis: true,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to analyze image',
      message: error.message 
    });
  }
});

// Helper function to extract rating from text
function extractRating(analysisText) {
  const ratingMatch = analysisText.match(/(\d+(?:\.\d+)?)\/10|rating.*?(\d+(?:\.\d+)?)/i);
  if (ratingMatch) {
    return parseFloat(ratingMatch[1] || ratingMatch[2]) || 7;
  }
  return 7; // Default rating
}

// Save generated image to shop
router.post('/save-to-shop', async (req, res) => {
  try {
    const { imageBase64, filename, shopId, userId, description } = req.body;

    console.log('Save to shop request:', { shopId, userId, filename });

    if (!imageBase64) {
      return res.status(400).json({ 
        success: false,
        error: 'Image data required' 
      });
    }

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'Shop ID and User ID are required' 
      });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../uploads', 'ai-generated-shop-images');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueFilename = filename || `ai-shop-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/ai-generated-shop-images/${uniqueFilename}`;

    res.json({
      success: true,
      url: publicUrl,
      filename: uniqueFilename,
      shopId: shopId,
      userId: userId,
      description: description,
      aiGenerated: true,
      message: 'AI generated image saved successfully for shop',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Save image error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to save image to shop',
      message: error.message 
    });
  }
});

// Generate product descriptions using AI
router.post('/generate-product-description', async (req, res) => {
  try {
    const { productName, category, features, tone = 'professional' } = req.body;

    if (!productName) {
      return res.status(400).json({ 
        success: false,
        error: 'Product name is required' 
      });
    }

    const model = genAI.getGenerativeModel({ model: AVAILABLE_MODELS.text });
    
    const prompt = `Generate a compelling product description for an online shop.

Product: ${productName}
Category: ${category || 'Artisan Product'}
Key Features: ${features || 'Handcrafted quality'}
Tone: ${tone}

Generate 3 different descriptions (150-200 characters each):
1. Professional and detailed
2. Friendly and engaging  
3. Concise and feature-focused

Return ONLY JSON: {
  "descriptions": [
    {"style": "Professional", "text": "..."},
    {"style": "Friendly", "text": "..."},
    {"style": "Concise", "text": "..."}
  ]
}`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const descriptions = JSON.parse(jsonMatch[0]);
        res.json({
          success: true,
          product: productName,
          descriptions: descriptions.descriptions,
          generatedAt: new Date().toISOString()
        });
      } else {
        // Fallback descriptions
        const fallbackDescriptions = {
          descriptions: [
            {
              style: "Professional",
              text: `Premium ${productName} crafted with attention to detail and quality materials. Perfect for discerning customers seeking exceptional craftsmanship.`
            },
            {
              style: "Friendly", 
              text: `Love this beautiful ${productName}! Handcrafted with care and perfect for adding a special touch to your collection. You'll adore it!`
            },
            {
              style: "Concise",
              text: `Handcrafted ${productName} - Quality materials, expert craftsmanship. durable and beautiful.`
            }
          ]
        };
        
        res.json({
          success: true,
          product: productName,
          descriptions: fallbackDescriptions.descriptions,
          generatedAt: new Date().toISOString(),
          note: 'Used fallback descriptions'
        });
      }
    } catch (geminiError) {
      console.warn('Gemini description generation failed, using fallback:', geminiError.message);
      
      // Fallback descriptions
      const fallbackDescriptions = {
        descriptions: [
          {
            style: "Professional",
            text: `Expertly crafted ${productName} made from premium materials. Features excellent durability and timeless design perfect for various uses.`
          },
          {
            style: "Friendly",
            text: `You'll love this amazing ${productName}! Beautifully made and perfect for everyday use or special occasions. A wonderful addition to any home!`
          },
          {
            style: "Concise", 
            text: `Quality ${productName} - handcrafted, durable, beautiful design. Great value and perfect for gifting.`
          }
        ]
      };
      
      res.json({
        success: true,
        product: productName,
        descriptions: fallbackDescriptions.descriptions,
        generatedAt: new Date().toISOString(),
        note: 'Fallback descriptions used due to AI service issue'
      });
    }

  } catch (error) {
    console.error('Description generation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate product descriptions',
      message: error.message 
    });
  }
});

// Get available models (for debugging)
router.get('/available-models', async (req, res) => {
  try {
    // Note: You might need to use the full API for this
    res.json({
      success: true,
      availableModels: AVAILABLE_MODELS,
      note: 'Using stable Gemini models: gemini-pro for text, gemini-pro-vision for images',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Models fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch available models',
      message: error.message 
    });
  }
});

// Health check for AI services
router.get('/health', async (req, res) => {
  try {
    // Test Gemini API
    const model = genAI.getGenerativeModel({ model: AVAILABLE_MODELS.text });
    const testResult = await model.generateContent('Say "OK" if working.');
    
    res.json({
      success: true,
      geminiStatus: 'operational',
      message: 'AI services are running correctly',
      geminiResponse: testResult.response.text(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      geminiStatus: 'degraded',
      message: 'AI services experiencing issues',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;