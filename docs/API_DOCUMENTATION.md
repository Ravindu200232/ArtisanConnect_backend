const apiDocumentation = `
# ArtisanConnect API Documentation

## Base URL
\`\`\`
http://localhost:3000/api
\`\`\`

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

## Response Format
All responses follow this format:
\`\`\`json
{
  "message": "Success/Error message",
  "data": {}, // Response data (if applicable)
  "error": "Error details" // Only present on errors
}
\`\`\`

## Artisan Endpoints

### Register Artisan
\`POST /artisans/register\`

**Request Body:**
\`\`\`json
{
  "email": "artisan@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "businessName": "Traditional Crafts",
  "phone": "+94712345678",
  "address": "123 Craft Street",
  "province": "Western",
  "city": "Colombo",
  "craftSpecialties": ["Woodcarving", "Pottery"],
  "experienceYears": 15,
  "bio": "Master craftsman...",
  "culturalBackground": "Sinhalese"
}
\`\`\`

### Login Artisan
\`POST /artisans/login\`

**Request Body:**
\`\`\`json
{
  "email": "artisan@example.com",
  "password": "password123"
}
\`\`\`

### Get Business Insights (AI)
\`GET /artisans/ai/business-insights\`
**Auth Required:** Artisan

**Response:**
\`\`\`json
{
  "message": "Business insights generated successfully",
  "insights": {
    "performanceScore": 92,
    "keyMetrics": {
      "totalProducts": 15,
      "totalViews": 1250,
      "totalSales": 89,
      "averageRating": 4.7,
      "totalRevenue": 125000
    },
    "recommendations": [
      "Add more products to increase visibility",
      "Optimize product photos for better engagement"
    ],
    "demandForecast": [
      {
        "product": "Traditional Mask",
        "prediction": 25,
        "month": "December"
      }
    ]
  }
}
\`\`\`

### AI Photo Analysis
\`POST /artisans/ai/photo-analysis\`
**Auth Required:** Artisan

**Request Body:**
\`\`\`json
{
  "imageUrl": "https://example.com/image.jpg",
  "productId": "PRD0001" // Optional
}
\`\`\`

## Product Endpoints

### Create Product
\`POST /products\`
**Auth Required:** Artisan

**Request Body:**
\`\`\`json
{
  "name": "Traditional Mask",
  "description": "Hand-carved traditional mask...",
  "culturalStory": "This mask represents...",
  "category": "Masks",
  "price": 7500,
  "materials": [
    {
      "name": "Kaduru Wood",
      "source": "Local forests",
      "sustainability": "Sustainably sourced"
    }
  ],
  "dimensions": {
    "length": 25,
    "width": 20,
    "height": 8,
    "weight": 0.5
  },
  "images": [
    {
      "url": "https://example.com/image.jpg",
      "altText": "Traditional mask front view",
      "isPrimary": true
    }
  ],
  "stock": 5,
  "productionTime": 7
}
\`\`\`

### Get Products with AI Recommendations
\`GET /products?culturalInterests=traditional_crafts,history\`

**Query Parameters:**
- \`category\`: Filter by category
- \`minPrice\`, \`maxPrice\`: Price range
- \`culturalInterests\`: Comma-separated interests for AI recommendations
- \`page\`, \`limit\`: Pagination

## Customer Endpoints

### Get Personalized Recommendations (AI)
\`GET /customers/recommendations\`
**Auth Required:** Customer

**Response:**
\`\`\`json
{
  "message": "Personalized recommendations generated",
  "recommendations": [
    {
      "productId": "PRD0001",
      "name": "Traditional Mask",
      "aiRecommendationScore": 92,
      "recommendationReasons": [
        "Matches your interest in traditional crafts",
        "Highly rated by other customers"
      ]
    }
  ]
}
\`\`\`

### Track Product View (AI Learning)
\`POST /customers/track-view\`
**Auth Required:** Customer

**Request Body:**
\`\`\`json
{
  "productId": "PRD0001",
  "duration": 45 // seconds spent viewing
}
\`\`\`

## AI Services Endpoints

### Generate Cultural Story
\`POST /ai/cultural-story\`

**Request Body:**
\`\`\`json
{
  "productName": "Traditional Mask",
  "category": "Woodcarving",
  "materials": ["Kaduru Wood", "Natural Pigments"],
  "culturalBackground": "Kandyan"
}
\`\`\`

### Real-time Translation
\`POST /ai/translate\`

**Request Body:**
\`\`\`json
{
  "text": "Beautiful handcrafted item",
  "sourceLang": "en",
  "targetLang": "si",
  "contentType": "product_description"
}
\`\`\`

### AR Visualization
\`POST /ai/ar-visualization\`

**Request Body:**
\`\`\`json
{
  "productId": "PRD0001",
  "roomType": "living_room",
  "dimensions": {
    "width": 5,
    "height": 3,
    "length": 6
  }
}
\`\`\`

## IoT Endpoints

### Process Environment Data
\`POST /iot/environment\`

**Request Body:**
\`\`\`json
{
  "deviceId": "IOT_ENV_001",
  "readings": {
    "temperature": 25.5,
    "humidity": 62,
    "lightLevel": 450,
    "airQuality": 85
  },
  "location": "Workshop Area 1"
}
\`\`\`

### Get Inventory Status
\`GET /iot/inventory/:artisanId\`
**Auth Required:** Artisan/Admin

## Blockchain Endpoints

### Verify Artisan Identity
\`POST /blockchain/verify-artisan\`

**Request Body:**
\`\`\`json
{
  "artisanId": "ART0001",
  "skillsCertificates": [
    {
      "skill": "Mask Carving",
      "level": "Master",
      "certifyingBody": "Sri Lanka Handicrafts Board",
      "documentUrl": "https://example.com/cert.pdf"
    }
  ],
  "workSamples": [
    {
      "title": "Traditional Kolam Mask",
      "imageUrl": "https://example.com/sample.jpg",
      "description": "Award-winning mask design"
    }
  ]
}
\`\`\`

### Generate NFT Certificate
\`POST /blockchain/generate-nft\`

**Request Body:**
\`\`\`json
{
  "productId": "PRD0001",
  "artisanId": "ART0001",
  "certificateType": "Authenticity Certificate"
}
\`\`\`

## Tourism Endpoints

### Get GPS Culture Points
\`GET /tourism/gps-culture/:latitude/:longitude?radius=5\`

### Personalize Experience (AI)
\`POST /tourism/personalize\`

**Request Body:**
\`\`\`json
{
  "interests": ["traditional_crafts", "history"],
  "travelStyle": "immersive",
  "duration": "3",
  "budget": "moderate",
  "groupSize": 4
}
\`\`\`

## Order Endpoints

### Create Order
\`POST /orders\`
**Auth Required:** Customer

### Get Orders
\`GET /orders\`
**Auth Required:** Customer/Artisan/Admin

### Update Order Status
\`PUT /orders/:orderId/status\`
**Auth Required:** Artisan/Admin

## Payment Endpoints

### Process Payment
\`POST /payments/process\`
**Auth Required:** Customer

**Request Body:**
\`\`\`json
{
  "orderId": "ORD0001",
  "paymentMethod": "card",
  "paymentGateway": "stripe",
  "cardDetails": {
    "number": "4111111111111111",
    "expiry": "12/25",
    "cvv": "123",
    "name": "John Doe"
  },
  "billingAddress": {
    "street": "123 Main St",
    "city": "Colombo",
    "country": "Sri Lanka"
  }
}
\`\`\`

## Error Codes
- \`400\`: Bad Request - Validation failed
- \`401\`: Unauthorized - Authentication required
- \`403\`: Forbidden - Insufficient permissions
- \`404\`: Not Found - Resource not found
- \`409\`: Conflict - Resource already exists
- \`429\`: Too Many Requests - Rate limit exceeded
- \`500\`: Internal Server Error - Server error

## Rate Limits
- General API: 1000 requests per 15 minutes
- Authentication: 10 attempts per 15 minutes
- Payment: 50 attempts per hour
`;

// scripts/deploy.sh
const deployScript = `#!/bin/bash

# ArtisanConnect Backend Deployment Script

echo "🚀 Starting ArtisanConnect Backend Deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MongoDB is running
if ! systemctl is-active --quiet mongod; then
    echo "⚠️ MongoDB is not running. Starting MongoDB..."
    sudo systemctl start mongod
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run database migrations/seeding
echo "🗄️ Setting up database..."
npm run seed

# Build application (if needed)
echo "🔨 Building application..."
# npm run build

# Run tests
echo "🧪 Running tests..."
npm test

# Start the application
echo "🌟 Starting ArtisanConnect Backend..."
if [ "$NODE_ENV" = "production" ]; then
    # Production start with PM2
    if command -v pm2 &> /dev/null; then
        pm2 start ecosystem.config.js --env production
        echo "✅ Application started in production mode with PM2"
    else
        npm start
        echo "✅ Application started in production mode"
    fi
else
    # Development start
    npm run dev
    echo "✅ Application started in development mode"
fi

echo "🎉 Deployment completed successfully!"
echo "📡 API is running on: http://localhost:\${PORT:-3000}"
echo "📚 API Documentation: http://localhost:\${PORT:-3000}/docs"
`;