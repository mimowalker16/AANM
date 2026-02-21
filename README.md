# AANM Website - Lab Directory Feature

This project includes a laboratory directory feature that allows association members and participants to submit their laboratory information with location selection via Google Maps.

## 🏗️ **Architecture**

### **Backend Structure**
```
server/
├── config/
│   └── index.js          # Configuration management with .env
├── database/
│   ├── index.js          # Database connection & operations
│   └── labs.db          # SQLite database (auto-created)
├── routes/
│   ├── labs.js          # Lab-related endpoints
│   ├── admin.js         # Admin-only endpoints
│   └── system.js        # Health checks & system info
├── controllers/
│   ├── labController.js # Lab business logic
│   └── adminController.js # Admin business logic
├── middleware/
│   ├── security.js      # CORS, rate limiting, helmet
│   ├── validation.js    # Input validation rules
│   └── errorHandler.js  # Error handling & logging
├── .env                 # Environment variables
└── index.js            # Main application entry point
```

### **Frontend Structure**
```
/
├── lab-submission.html  # Google Maps form
├── style.css           # Shared styles
├── main.js            # Shared JavaScript
└── [other pages...]   # Existing website pages
```

## 🚀 **Quick Start**

### **1. Environment Setup**
```bash
# Install dependencies
npm install

# Configure environment variables
cp server/.env.example server/.env
# Edit server/.env with your settings
```

### **2. Google Maps API Key**
Get your API key from [Google Cloud Console](https://console.cloud.google.com/):
1. Enable Maps JavaScript API + Geocoding API
2. Add your key to `server/.env`:
   ```bash
   GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```
3. Replace `YOUR_API_KEY` in [lab-submission.html](lab-submission.html)

### **3. Run the Application**
```bash
# Option 1: Run both frontend and backend
npm run full-dev

# Option 2: Run separately
npm run dev        # Frontend → http://localhost:5173  
npm run server:dev # Backend → http://localhost:3001
```

## 📊 **Database Structure**

### **Automatic Setup**
- SQLite database created automatically on first run
- Location: `server/database/labs.db`
- No manual setup required

### **Schema**
```sql
CREATE TABLE labs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lab_name TEXT NOT NULL,
  institution_name TEXT,
  contact_person TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  address TEXT NOT NULL,           -- Auto from coordinates
  city TEXT NOT NULL,              -- Auto from coordinates  
  country TEXT NOT NULL,           -- Auto from coordinates
  coordinates_lat REAL NOT NULL,   -- Primary location data
  coordinates_lng REAL NOT NULL,   -- Primary location data
  research_areas TEXT NOT NULL,    -- JSON array
  description TEXT,
  established_year INTEGER,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved BOOLEAN DEFAULT 0,      -- Requires admin approval
  admin_notes TEXT
);
```

## 🔧 **API Endpoints**

### **Public Endpoints**
- `GET  /api/health` - Health check & system status
- `GET  /api/labs` - Get all approved labs
- `POST /api/labs/submit` - Submit new lab (rate limited)

### **Admin Endpoints** (No auth yet - secure before production!)
- `GET    /api/admin/labs/pending` - Get pending submissions
- `PUT    /api/admin/labs/:id/approve` - Approve submission
- `DELETE /api/admin/labs/:id` - Delete submission
- `GET    /api/info` - Detailed system info (dev only)

## 🛡️ **Security Features**

### **Built-in Protection**
- **Rate Limiting**: 10 requests/15min general, 3 submissions/15min
- **Input Validation**: Comprehensive validation with express-validator
- **Security Headers**: Helmet.js with CSP
- **CORS**: Configured for development origins
- **SQL Injection**: Parameterized queries only
- **Error Handling**: Sanitized error responses

### **Environment Variables**
All sensitive config in `.env`:
```bash
PORT=3001
DATABASE_URL=./server/database/labs.db
GOOGLE_MAPS_API_KEY=your_key_here
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

## 🗺️ **Location System**

### **How It Works**
1. **User clicks map** → Places draggable marker
2. **Reverse geocoding** → Converts coordinates to address
3. **Database storage**:
   - **Primary**: `coordinates_lat`, `coordinates_lng` (precise)
   - **Secondary**: `address`, `city`, `country` (human-readable)
4. **Validation** → Both coordinates and address required

### **Benefits**
- ✅ Precise location data for mapping
- ✅ No typing errors in addresses  
- ✅ Consistent geocoding
- ✅ Mobile-friendly interface

## ⚡ **Development**

### **Adding New Features**
1. **Routes**: Add to `server/routes/`
2. **Business Logic**: Add to `server/controllers/`
3. **Database**: Extend `server/database/index.js`
4. **Validation**: Add rules to `server/middleware/validation.js`

### **Environment Configuration**
- **Development**: Uses `server/.env`
- **Production**: Set environment variables directly
- **Database**: Auto-creates SQLite file on startup

### **Code Quality**
- Modular architecture with separation of concerns
- Async/await error handling throughout
- Comprehensive input validation
- Environment-based configuration
- Graceful shutdown handling

## 🚧 **Todo (Future Enhancements)**

### **Phase 1**
- [ ] Lab directory public page (`/lab-directory.html`)
- [ ] Interactive map view of all approved labs
- [ ] Search and filter by research area/location

### **Phase 2**  
- [ ] Admin dashboard UI for approving submissions
- [ ] Authentication system for admin routes
- [ ] Email notifications for new submissions
- [ ] Export functionality (CSV/JSON)

### **Phase 3**
- [ ] User accounts for lab updates
- [ ] Lab collaboration features
- [ ] Advanced search with research matching
- [ ] Analytics and usage statistics

## 🐛 **Troubleshooting**

### **Server won't start?**
```bash
# Check if port is in use
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Check database permissions
ls -la server/database/  # Ensure write access
```

### **Maps not loading?**
- Verify Google Maps API key in both `.env` and `lab-submission.html`
- Check console for API errors
- Ensure Maps JavaScript API + Geocoding API are enabled

### **Database errors?**
- Database auto-creates on first run
- Check `server/database/` directory permissions  
- Verify SQLite3 installation: `npm ls sqlite3`

## 📝 **Best Practices Implemented**

✅ **Modular architecture** - Separated concerns into logical modules  
✅ **Environment configuration** - All config in `.env` files  
✅ **Error handling** - Comprehensive async error handling  
✅ **Security** - Rate limiting, validation, sanitization  
✅ **Database abstraction** - Clean database interface layer  
✅ **Validation layer** - Centralized input validation  
✅ **Logging** - Structured logging with context  
✅ **Graceful shutdown** - Proper cleanup on termination