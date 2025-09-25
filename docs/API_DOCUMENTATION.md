# ArtisanConnect Backend API Documentation

## Base Configuration

```json
{
  "baseURL": "http://localhost:3000/api",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_JWT_TOKEN"
  }
}
```

## Authentication Structure

### Register/Login Response Format
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "ART0001",
    "email": "artisan@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "artisan"
  }
}
```

---

# 🎨 ARTISAN ENDPOINTS

## 1. Register Artisan
**POST** `/artisans/register`

### Request Body:
```json
{
  "email": "master.craftsman@gmail.com",
  "password": "SecurePass123",
  "firstName": "Upali",
  "lastName": "Seneviratne", 
  "businessName": "Traditional Mask Workshop",
  "phone": "+94712345678",
  "address": "123 Craft Street, Colombo",
  "province": "Western",
  "city": "Colombo",
  "craftSpecialties": ["Mask Carving", "Wood Sculpture"],
  "experienceYears": 25,
  "bio": "Master craftsman specializing in traditional Sri Lankan masks",
  "culturalBackground": "Kandyan"
}
```

### Response:
```json
{
  "message": "Artisan registered successfully",
  "artisanId": "ART0001"
}
```

## 2. Artisan Login
**POST** `/artisans/login`

### Request Body:
```json
{
  "email": "master.craftsman@gmail.com",
  "password": "SecurePass123"
}
```

## 3. Get Business Insights (AI)
**GET** `/artisans/ai/business-insights`
*Requires: Artisan Authentication*

### Response:
```json
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
    ],
    "pricingOptimization": [
      {
        "product": "Wooden Elephant",
        "suggestedPrice": 8200,
        "currentPrice": 7500,
        "reasoning": "High demand detected, price increase recommended"
      }
    ]
  }
}
```

## 4. AI Photo Analysis
**POST** `/artisans/ai/photo-analysis`
*Requires: Artisan Authentication*

### Request Body:
```json
{
  "imageUrl": "https://example.com/product-image.jpg",
  "productId": "PRD0001"
}
```

### Response:
```json
{
  "message": "Photo analysis completed",
  "analysis": {
    "overallScore": 85,
    "aspects": {
      "brightness": 78,
      "focus": 92,
      "composition": 88,
      "backgroundClarity": 85,
      "colorBalance": 82
    },
    "suggestions": [
      "Improve lighting - use natural light",
      "Center the product better"
    ]
  }
}
```

---

# 🛍️ PRODUCT ENDPOINTS

## 1. Create Product
**POST** `/products`
*Requires: Artisan Authentication*

### Request Body:
```json
{
  "name": "Traditional Kolam Mask",
  "description": "Hand-carved traditional dance mask representing the Kolam character",
  "culturalStory": "This mask represents a character from traditional Kolam performances...",
  "culturalSignificance": "Integral to Sri Lankan performing arts",
  "category": "Masks",
  "subcategory": "Dance Masks",
  "price": 7500,
  "currency": "LKR",
  "materials": [
    {
      "name": "Kaduru Wood",
      "source": "Sri Lankan forests",
      "sustainability": "Sustainably sourced"
    }
  ],
  "dimensions": {
    "length": 25,
    "width": 20,
    "height": 8,
    "weight": 0.5,
    "unit": "cm"
  },
  "colors": ["Red", "Black", "Gold"],
  "images": [
    {
      "url": "https://example.com/mask1.jpg",
      "altText": "Traditional Kolam Mask - Front View",
      "isPrimary": true
    }
  ],
  "stock": 5,
  "productionTime": 7,
  "customizable": true,
  "customizationOptions": [
    {
      "option": "Size",
      "choices": ["Small", "Medium", "Large"],
      "additionalCost": 500
    }
  ],
  "tags": ["traditional", "handcrafted", "cultural"]
}
```

### Response:
```json
{
  "message": "Product created successfully",
  "product": {
    "productId": "PRD0001",
    "artisanId": "ART0001",
    "name": "Traditional Kolam Mask",
    "price": 7500,
    "availability": true,
    "aiData": {
      "qualityScore": 0,
      "demandPrediction": {
        "score": 78,
        "trend": "Growing",
        "bestSeasonality": ["December", "January", "February"]
      }
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## 2. Get Products with Filters
**GET** `/products?category=Masks&minPrice=5000&maxPrice=10000&page=1&limit=10`

### Response:
```json
{
  "message": "Products fetched successfully",
  "products": [
    {
      "productId": "PRD0001",
      "name": "Traditional Kolam Mask",
      "description": "Hand-carved traditional dance mask...",
      "price": 7500,
      "category": "Masks",
      "images": [
        {
          "url": "https://example.com/mask1.jpg",
          "isPrimary": true,
          "aiQualityScore": 95
        }
      ],
      "artisanInfo": {
        "artisanId": "ART0001",
        "firstName": "Upali",
        "lastName": "Seneviratne",
        "businessName": "Traditional Mask Workshop"
      },
      "ratings": {
        "average": 4.8,
        "count": 12
      },
      "availability": true
    }
  ],
  "pagination": {
    "current": 1,
    "total": 3,
    "count": 10,
    "totalProducts": 25
  }
}
```

## 3. Get Single Product with Cultural Enhancement
**GET** `/products/PRD0001`

### Response:
```json
{
  "message": "Product fetched successfully",
  "product": {
    "productId": "PRD0001",
    "name": "Traditional Kolam Mask",
    "description": "Hand-carved traditional dance mask...",
    "culturalStory": "This mask represents a character from traditional Kolam performances...",
    "price": 7500,
    "materials": [
      {
        "name": "Kaduru Wood",
        "source": "Sri Lankan forests",
        "sustainability": "Sustainably sourced"
      }
    ],
    "artisanId": {
      "firstName": "Upali",
      "lastName": "Seneviratne",
      "businessName": "Traditional Mask Workshop",
      "bio": "Master craftsman...",
      "traditionalTechniques": [
        {
          "technique": "Kolam Mask Carving",
          "masterLevel": "Master"
        }
      ]
    },
    "enhancedCulturalStory": {
      "originalStory": "This mask represents...",
      "aiEnhancement": "This woodcarving represents centuries of Kandyan craftsmanship tradition.",
      "culturalContext": "This craft originates from the Kandyan tradition...",
      "artisanInsight": "Crafted by Upali Seneviratne of Traditional Mask Workshop..."
    }
  }
}
```

---

# 👤 CUSTOMER ENDPOINTS

## 1. Customer Registration
**POST** `/customers/register`

### Request Body:
```json
{
  "email": "customer@example.com",
  "password": "SecurePass123",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1234567890",
  "addresses": [
    {
      "type": "Home",
      "street": "123 Main St",
      "city": "New York",
      "province": "NY",
      "country": "USA",
      "isDefault": true
    }
  ],
  "preferences": {
    "categories": ["Woodcarving", "Pottery"],
    "culturalInterests": ["traditional_crafts", "history"],
    "priceRange": {
      "min": 1000,
      "max": 15000
    }
  }
}
```

## 2. Get Personalized Recommendations (AI)
**GET** `/customers/recommendations`
*Requires: Customer Authentication*

### Response:
```json
{
  "message": "Personalized recommendations generated",
  "recommendations": [
    {
      "productId": "PRD0001",
      "name": "Traditional Kolam Mask",
      "price": 7500,
      "aiRecommendationScore": 92,
      "recommendationReasons": [
        "Matches your interest in traditional crafts",
        "Highly rated by other customers",
        "Features Kandyan cultural elements"
      ],
      "images": [
        {
          "url": "https://example.com/mask1.jpg",
          "isPrimary": true
        }
      ]
    }
  ]
}
```

## 3. Track Product View (AI Learning)
**POST** `/customers/track-view`
*Requires: Customer Authentication*

### Request Body:
```json
{
  "productId": "PRD0001",
  "duration": 45
}
```

### Response:
```json
{
  "message": "Product view tracked successfully"
}
```

---

# 🤖 AI SERVICES ENDPOINTS

## 1. Generate Cultural Story
**POST** `/ai/cultural-story`

### Request Body:
```json
{
  "productName": "Traditional Water Pot",
  "category": "Pottery",
  "materials": ["Clay", "Natural Glaze"],
  "culturalBackground": "Kandyan"
}
```

### Response:
```json
{
  "message": "Cultural story generated successfully",
  "story": {
    "mainStory": "This remarkable Traditional Water Pot represents the diverse artisanal traditions of Sri Lanka...",
    "culturalContext": "Rooted in Kandyan traditions, this craft form has been preserved...",
    "materialsSignificance": "The Clay and Natural Glaze used in this piece hold special cultural significance...",
    "artisanConnection": "Created by skilled hands that carry forward the wisdom...",
    "modernRelevance": "While honoring traditional techniques, this piece bridges ancient wisdom..."
  }
}
```

## 2. Real-time Translation
**POST** `/ai/translate`

### Request Body:
```json
{
  "text": "Beautiful handcrafted item",
  "sourceLang": "en",
  "targetLang": "si",
  "contentType": "product_description"
}
```

### Response:
```json
{
  "message": "Translation completed",
  "translation": {
    "original": "Beautiful handcrafted item",
    "translated": "ලස්සන අතින් සාදන ලද භාණ්ඩය",
    "sourceLang": "en",
    "targetLang": "si",
    "confidence": 0.95,
    "culturalGuidance": "In Sinhala culture, showing respect through language is important."
  }
}
```

## 3. AR Product Visualization
**POST** `/ai/ar-visualization`

### Request Body:
```json
{
  "productId": "PRD0001",
  "roomType": "living_room",
  "dimensions": {
    "width": 5,
    "height": 3,
    "length": 6
  }
}
```

### Response:
```json
{
  "message": "AR visualization data generated",
  "arData": {
    "productId": "PRD0001",
    "arModelUrl": "https://ar-models.artisanconnect.com/PRD0001.glb",
    "previewImages": [
      "https://ar-previews.artisanconnect.com/PRD0001_living_room.jpg"
    ],
    "roomPlacements": {
      "livingRoom": {
        "suggestedPositions": [
          { "x": 0, "y": 0, "z": -2, "rotation": { "x": 0, "y": 45, "z": 0 } }
        ]
      }
    },
    "scaleOptions": [0.5, 0.75, 1.0, 1.25, 1.5],
    "compatibilityInfo": {
      "requiresARCore": true,
      "minAndroidVersion": "7.0",
      "estimatedFileSize": "2.5MB"
    }
  }
}
```

---

# 📦 ORDER ENDPOINTS

## 1. Create Order
**POST** `/orders`
*Requires: Customer Authentication*

### Request Body:
```json
{
  "items": [
    {
      "productId": "PRD0001",
      "quantity": 2,
      "customizations": [
        {
          "option": "Size",
          "choice": "Large"
        }
      ]
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Colombo",
    "province": "Western",
    "postalCode": "00100",
    "country": "Sri Lanka",
    "phone": "+94712345678"
  }
}
```

### Response:
```json
{
  "message": "Order created successfully",
  "order": {
    "orderId": "ORD0001",
    "customerId": "CUST0001",
    "items": [
      {
        "productId": "PRD0001",
        "artisanId": "ART0001",
        "productName": "Traditional Kolam Mask",
        "quantity": 2,
        "unitPrice": 7500,
        "totalPrice": 15000
      }
    ],
    "totalAmount": 15000,
    "currency": "LKR",
    "status": "pending",
    "estimatedDelivery": "2024-01-22T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## 2. Get Orders
**GET** `/orders`
*Requires: Customer/Artisan/Admin Authentication*

### Response:
```json
{
  "message": "Orders fetched successfully",
  "orders": [
    {
      "orderId": "ORD0001",
      "status": "processing",
      "totalAmount": 15000,
      "currency": "LKR",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "items": [
        {
          "productName": "Traditional Kolam Mask",
          "quantity": 2,
          "unitPrice": 7500
        }
      ]
    }
  ]
}
```

## 3. Update Order Status
**PUT** `/orders/ORD0001/status`
*Requires: Artisan/Admin Authentication*

### Request Body:
```json
{
  "status": "shipped",
  "trackingNumber": "TN123456789",
  "notes": "Package shipped via express courier"
}
```

---

# 💳 PAYMENT ENDPOINTS

## 1. Process Payment
**POST** `/payments/process`
*Requires: Customer Authentication*

### Request Body:
```json
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
```

### Response:
```json
{
  "message": "Payment processed successfully",
  "payment": {
    "paymentId": "PAY_1640123456_ABC123",
    "status": "completed",
    "amount": 15000,
    "currency": "LKR"
  }
}
```

---

# 🏭 SUPPLIER ENDPOINTS

## 1. Get Materials
**GET** `/suppliers/materials?category=Wood&available=true`

### Response:
```json
{
  "message": "Materials fetched successfully",
  "materials": [
    {
      "supplierId": "SUP0001",
      "companyName": "Lanka Wood Suppliers",
      "material": {
        "name": "Teak Wood",
        "category": "Wood",
        "pricePerUnit": 850,
        "unit": "kg",
        "minimumOrder": 10,
        "availability": true,
        "sustainabilityInfo": {
          "isEcoFriendly": true,
          "certifications": ["FSC Certified"]
        }
      },
      "ratings": {
        "average": 4.6,
        "count": 24
      }
    }
  ]
}
```

## 2. Process Supply Order
**POST** `/suppliers/orders`

### Request Body:
```json
{
  "materials": [
    {
      "name": "Teak Wood",
      "quantity": 25,
      "pricePerUnit": 850
    }
  ],
  "deliveryAddress": {
    "street": "Workshop Address",
    "city": "Colombo"
  },
  "requestedDeliveryDate": "2024-01-25"
}
```

### Response:
```json
{
  "message": "Supply order processed",
  "order": {
    "orderId": "ORD12345678",
    "materials": [...],
    "totalCost": 21250,
    "estimatedDeliveryDate": "2024-01-25T00:00:00.000Z",
    "sustainabilityScore": 85
  }
}
```

---

# 🏛️ TOURISM ENDPOINTS

## 1. Get Tourism Packages
**GET** `/tourism/packages?type=Workshop&location=Western&maxPrice=8000`

### Response:
```json
{
  "message": "Tourism packages fetched successfully",
  "packages": [
    {
      "packageId": "PKG0001",
      "title": "Traditional Mask Carving Workshop",
      "description": "Learn the ancient art of mask carving...",
      "type": "Workshop",
      "location": {
        "province": "Western",
        "city": "Colombo",
        "address": "Traditional Craft Village, Colombo 7"
      },
      "duration": {
        "hours": 4,
        "days": 1
      },
      "price": {
        "adult": 5500,
        "child": 3500,
        "currency": "LKR"
      },
      "maxParticipants": 8,
      "inclusions": [
        "Workshop materials",
        "Master craftsman guidance",
        "Traditional lunch"
      ],
      "ratings": {
        "average": 4.9,
        "count": 15
      }
    }
  ]
}
```

## 2. Book Tourism Package
**POST** `/tourism/bookings`
*Requires: Customer Authentication*

### Request Body:
```json
{
  "packageId": "PKG0001",
  "bookingDate": "2024-02-15",
  "participants": 4,
  "specialRequests": ["Vegetarian lunch", "English translation"]
}
```

### Response:
```json
{
  "message": "Tourism package booked successfully",
  "booking": {
    "bookingId": "BOOK_1640123456_DEF789",
    "packageId": "PKG0001",
    "bookingDate": "2024-02-15T00:00:00.000Z",
    "participants": 4,
    "totalAmount": 22000,
    "status": "confirmed"
  }
}
```

## 3. GPS Culture Discovery
**GET** `/tourism/gps-culture/6.9271/79.8612?radius=10`

### Response:
```json
{
  "message": "Cultural points discovered",
  "location": {
    "latitude": 6.9271,
    "longitude": 79.8612
  },
  "radius": 10,
  "culturePoints": [
    {
      "id": "CP001",
      "name": "Traditional Mask Carving Workshop",
      "type": "Workshop",
      "distance": 2.3,
      "coordinates": {
        "latitude": 6.9251,
        "longitude": 79.8592
      },
      "artisanInfo": {
        "name": "Master Seneviratne",
        "experience": "30 years",
        "specialties": ["Devil Masks", "Traditional Kolam"]
      },
      "visitInfo": {
        "openHours": "9:00 AM - 5:00 PM",
        "cost": "LKR 2500",
        "bookingRequired": true
      },
      "arContent": {
        "hasAR": true,
        "markerUrl": "https://ar.artisanconnect.com/markers/CP001.jpg"
      }
    }
  ]
}
```

---

# 🔧 IOT ENDPOINTS

## 1. Register IoT Device
**POST** `/iot/devices/register`
*Requires: Artisan/Admin Authentication*

### Request Body:
```json
{
  "deviceType": "environmental_sensor",
  "location": "Workshop Area 1",
  "artisanId": "ART0001",
  "specifications": {
    "sensors": ["temperature", "humidity", "light"],
    "connectivity": "WiFi",
    "powerSource": "AC"
  }
}
```

### Response:
```json
{
  "message": "IoT device registered successfully",
  "device": {
    "deviceId": "IOT_1640123456_ABC123",
    "status": "active",
    "apiKey": "a1b2c3d4e5f6..."
  },
  "connectionInstructions": {
    "mqttBroker": "mqtt.artisanconnect.com",
    "port": 8883,
    "topic": "iot/ART0001/IOT_1640123456_ABC123"
  }
}
```

## 2. Get Inventory Status
**GET** `/iot/inventory/ART0001`
*Requires: Artisan/Admin Authentication*

### Response:
```json
{
  "message": "Inventory status retrieved successfully",
  "inventory": {
    "artisanId": "ART0001",
    "lastUpdated": "2024-01-15T10:30:00.000Z",
    "materials": [
      {
        "materialId": "MAT_001",
        "name": "Teak Wood",
        "currentStock": 45.5,
        "unit": "kg",
        "minLevel": 20,
        "status": "adequate",
        "quality": {
          "score": 92,
          "moistureContent": 12.5,
          "temperature": 24.2
        },
        "iotSensor": {
          "deviceId": "IOT_INV_002",
          "batteryLevel": 88
        }
      }
    ],
    "summary": {
      "totalMaterials": 3,
      "lowStockCount": 1,
      "averageQuality": 90.7
    }
  }
}
```

---

# ⛓️ BLOCKCHAIN ENDPOINTS

## 1. Generate NFT Certificate
**POST** `/blockchain/generate-nft`

### Request Body:
```json
{
  "productId": "PRD0001",
  "artisanId": "ART0001",
  "certificateType": "Authenticity Certificate"
}
```

### Response:
```json
{
  "message": "NFT certificate generated successfully",
  "nftCertificate": {
    "tokenId": "NFT_1640123456_ABC123DEF456",
    "contractAddress": "0xa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "transactionHash": "0x1234567890abcdef...",
    "metadata": {
      "name": "ArtisanConnect Certificate - Authenticity Certificate",
      "description": "Authentic Authenticity Certificate for product PRD0001",
      "image": "https://nft.artisanconnect.com/certificates/PRD0001.jpg",
      "attributes": [
        {
          "trait_type": "Certificate Type",
          "value": "Authenticity Certificate"
        },
        {
          "trait_type": "Artisan ID", 
          "value": "ART0001"
        }
      ]
    },
    "authenticity": {
      "digitalSignature": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      "ipfsHash": "Qm123456789abcdefghijklmnopqrstuv"
    }
  }
}
```

---

# 📝 REVIEWS ENDPOINTS

## 1. Add Review
**POST** `/reviews`
*Requires: Customer Authentication*

### Request Body:
```json
{
  "productId": "PRD0001",
  "rating": 5,
  "title": "Amazing traditional craftsmanship",
  "comment": "Absolutely beautiful mask with incredible detail...",
  "pros": ["Excellent quality", "Fast shipping", "Beautiful design"],
  "cons": ["Slightly expensive"],
  "wouldRecommend": true
}
```

### Response:
```json
{
  "message": "Review added successfully",
  "review": {
    "reviewId": "REV_1640123456_ABC123",
    "productId": "PRD0001",
    "rating": 5,
    "title": "Amazing traditional craftsmanship",
    "verified": false,
    "isApproved": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## 2. Get Product Reviews
**GET** `/reviews/product/PRD0001`

### Response:
```json
{
  "message": "Product reviews fetched successfully",
  "reviews": [
    {
      "reviewId": "REV_123",
      "customerName": "Jane Smith",
      "rating": 5,
      "title": "Amazing traditional craftsmanship",
      "comment": "Absolutely beautiful mask...",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "helpfulVotes": 12
    }
  ],
  "statistics": {
    "averageRating": 4.8,
    "totalReviews": 15,
    "ratingDistribution": {
      "5": 10,
      "4": 3,
      "3": 2,
      "2": 0,
      "1": 0
    }
  }
}
```

---

# ❓ INQUIRY ENDPOINTS

## 1. Create Inquiry
**POST** `/inquiries`

### Request Body:
```json
{
  "customerName": "John Doe",
  "email": "john@example.com",
  "phone": "+94712345678",
  "type": "product_inquiry",
  "subject": "Custom mask design inquiry",
  "message": "I'm interested in commissioning a custom mask design..."
}
```

### Response:
```json
{
  "message": "Inquiry created successfully",
  "inquiry": {
    "inquiryId": "INQ0001",
    "status": "open",
    "priority": 2,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

# ⚠️ ERROR RESPONSES

## Standard Error Format:
```json
{
  "message": "Error description",
  "error": "Detailed error information"
}
```

## Common HTTP Status Codes:
- **200**: Success
- **201**: Created successfully
- **400**: Bad Request - Invalid data
- **401**: Unauthorized - Authentication required
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource doesn't exist
- **409**: Conflict - Resource already exists
- **429**: Too Many Requests - Rate limit exceeded
- **500**: Internal Server Error

## Sample Error Responses:

### 400 - Validation Error:
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    },
    {
      "field": "price",
      "message": "Price must be a positive number"
    }
  ]
}
```

### 401 - Authentication Required:
```json
{
  "message": "Authentication required"
}
```

### 403 - Access Denied:
```json
{
  "message": "Access denied. Insufficient permissions."
}
```

### 404 - Not Found:
```json
{
  "message": "Product not found"
}
```

### 429 - Rate Limit:
```json
{
  "message": "Too many requests from this IP, please try again later."
}
```

---

# 🔄 INTEGRATION EXAMPLES

## React/JavaScript Integration:
```javascript
// API Configuration
const API_BASE = 'http://localhost:3000/api';
const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

// Get Products Example
const fetchProducts = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/products?${params}`);
  return response.json();
};

// Create Order Example
const createOrder = async (orderData, token) => {
  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(orderData)
  });
  return response.json();
};
```

## Flutter/Dart Integration:
```dart
// API Service Class
class ArtisanConnectAPI {
  static const String baseURL = 'http://localhost:3000/api';
  
  static Future<Map<String, dynamic>> getProducts({
    String? category,
    double? minPrice,
    double? maxPrice,
  }) async {
    final params = <String, String>{};
    if (category != null) params['category'] = category;
    if (minPrice != null) params['minPrice'] = minPrice.toString();
    if (maxPrice != null) params['maxPrice'] = maxPrice.toString();
    
    final uri = Uri.parse('$baseURL/products').replace(queryParameters: params);
    final response = await http.get(uri);
    return json.decode(response.body);
  }
}
```

This documentation provides comprehensive API endpoints and data structures for easy integration with web, mobile, and desktop applications connecting to the ArtisanConnect backend system.