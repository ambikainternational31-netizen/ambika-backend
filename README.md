# Ambika International Backend API

A comprehensive e-commerce backend API for hotel and hospitality supplies, built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Product Management**: Full CRUD operations for products and categories
- **Order Management**: Complete order lifecycle management
- **Admin Dashboard**: Comprehensive analytics and management tools
- **Customer Management**: User profiles and order history
- **Real-time Analytics**: Dashboard statistics and reporting
- **File Upload**: Image upload for products and categories
- **Data Export**: Export functionality for orders, products, and customers

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ambika/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using MongoDB Compass/Atlas connection
   ```

5. **Seed the database (optional)**
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📊 API Endpoints

### Authentication
```
POST   /api/users/register     - Register new user
POST   /api/users/login        - User login
GET    /api/users/profile      - Get user profile
PUT    /api/users/profile      - Update user profile
```

### Products
```
GET    /api/products           - Get all products (with filters)
GET    /api/products/:id       - Get single product
POST   /api/products           - Create product (Admin)
PUT    /api/products/:id       - Update product (Admin)
DELETE /api/products/:id       - Delete product (Admin)
```

### Categories
```
GET    /api/categories         - Get all categories
GET    /api/categories/:id     - Get single category
POST   /api/categories         - Create category (Admin)
PUT    /api/categories/:id     - Update category (Admin)
DELETE /api/categories/:id     - Delete category (Admin)
```

### Orders
```
GET    /api/orders             - Get user orders
POST   /api/orders             - Create new order
GET    /api/orders/:id         - Get single order
PUT    /api/orders/:id/cancel  - Cancel order
GET    /api/orders/track/:orderNumber - Track order
GET    /api/orders/stats       - Get user order statistics
```

### Admin Dashboard
```
GET    /api/admin/dashboard/stats    - Dashboard statistics
GET    /api/admin/products          - Admin product management
GET    /api/admin/orders            - Admin order management
GET    /api/admin/customers         - Admin customer management
GET    /api/admin/categories        - Admin category management
PUT    /api/admin/orders/:id/status - Update order status
PUT    /api/admin/products/bulk     - Bulk update products
GET    /api/admin/export            - Export data
```

## 🔐 Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

### User Roles
- **User**: Can place orders, view own orders, manage profile
- **Admin**: Full access to all resources and admin panel

## 📝 Request/Response Examples

### Register User
```json
POST /api/users/register
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "+91 98765 43210"
}
```

### Create Order
```json
POST /api/orders
{
  "items": [
    {
      "product": "60d5f49c7d4e8b001f8e4e4a",
      "quantity": 2,
      "size": "Standard"
    }
  ],
  "customerInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+91 98765 43210",
    "company": "Hotel Paradise"
  },
  "shipping": {
    "address": {
      "street": "123 Hotel Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    },
    "method": "standard"
  },
  "payment": {
    "method": "cod"
  }
}
```

### Get Products with Filters
```
GET /api/products?category=60d5f49c7d4e8b001f8e4e4a&search=kettle&minPrice=1000&maxPrice=5000&page=1&limit=10
```

## 📊 Database Models

### User Model
```javascript
{
  username: String (required, unique),
  email: String (required, unique),
  password: String (required, hashed),
  role: String (enum: ["user", "admin"]),
  name: String,
  phone: String,
  address: String
}
```

### Product Model
```javascript
{
  title: String (required),
  description: String (required),
  price: Number (required),
  stock: Number (required),
  images: [String],
  category: ObjectId (ref: Category),
  sizes: [String],
  quality: String (enum: ["Premium", "Standard", "Economy"]),
  variants: [{ name: String, value: String }],
  featured: Boolean,
  discount: Number,
  isActive: Boolean,
  avgRating: Number,
  numReviews: Number
}
```

### Order Model
```javascript
{
  orderNumber: String (auto-generated),
  customer: ObjectId (ref: User),
  customerInfo: {
    name: String,
    email: String,
    phone: String,
    company: String,
    address: Object
  },
  items: [OrderItem],
  pricing: {
    subtotal: Number,
    tax: Number,
    shipping: Number,
    total: Number
  },
  payment: {
    method: String,
    status: String,
    transactionId: String
  },
  status: String,
  shipping: Object,
  statusHistory: [Object]
}
```

## 🧪 Testing the API

### Using Default Admin Account
After running the seed script, you can login with:
- **Email**: admin@ambikainternational.com
- **Password**: admin123

### Using Default Customer Account
- **Email**: rajesh@hotelparadise.com
- **Password**: password123

### API Testing Tools
- **Postman**: Import the API collection
- **Thunder Client**: VS Code extension
- **curl**: Command line testing

Example curl request:
```bash
# Login
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ambikainternational.com","password":"admin123"}'

# Get dashboard stats (replace TOKEN with actual JWT)
curl -X GET http://localhost:5000/api/admin/dashboard/stats \
  -H "Authorization: Bearer TOKEN"
```

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRE`: Token expiration time
- `FRONTEND_URL`: Frontend URL for CORS

### Database Configuration
The app uses MongoDB with Mongoose ODM. Make sure to:
1. Install MongoDB locally or use MongoDB Atlas
2. Update the `MONGODB_URI` in your `.env` file
3. Run the seed script to populate initial data

## 📈 Performance Features

- **Pagination**: All list endpoints support pagination
- **Filtering**: Advanced filtering for products and orders
- **Indexing**: Database indexes for optimal query performance
- **Caching**: Response caching for frequently accessed data
- **Rate Limiting**: API rate limiting to prevent abuse

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Input Validation**: express-validator for request validation
- **CORS Protection**: Configured CORS for cross-origin requests
- **Helmet**: Security headers middleware
- **Role-based Access**: Admin and user role separation

## 📚 Additional Features

### File Upload
Products and categories support image uploads. Configure upload path in environment variables.

### Order Tracking
Orders can be tracked using order number without authentication.

### Analytics
Comprehensive analytics for admin dashboard including:
- Revenue tracking
- Order statistics
- Customer analytics
- Product performance
- Category insights

### Export Functionality
Admin can export data in various formats:
- Orders (CSV/JSON)
- Products (CSV/JSON)
- Customers (CSV/JSON)

## 🚨 Error Handling

The API uses consistent error response format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors array (if applicable)
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Email: support@ambikainternational.com
- Documentation: [API Docs](link-to-docs)
- Issues: [GitHub Issues](link-to-issues)

## 📄 License

This project is licensed under the ISC License.
