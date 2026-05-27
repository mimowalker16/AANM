# AANM Website - Lab Directory Feature

> The project is now split into `frontend/` and `backend/`, with PostgreSQL as the production database.
> See `HOSTINGER_DEPLOYMENT.md` for Hostinger deployment and migration instructions.

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

# Recommended on Windows: starts frontend, backend, and a local PostgreSQL dev DB
dev.bat
```

If you run the backend without `dev.bat`, set `DATABASE_URL` to a PostgreSQL
connection string first, for example:

```bash
DATABASE_URL=postgres://postgres@127.0.0.1:55432/aanm
```

### **2. No API Keys Required! 🎉**
We use **OpenStreetMap + Leaflet** (completely free):
- ✅ No Google Maps API costs
- ✅ No usage limits or quotas  
- ✅ No API keys to manage
- ✅ Same functionality as Google Maps

The map works immediately after installation!

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
- `dev.bat` starts a project-local PostgreSQL database on port `55432` when `DATABASE_URL` is not already set.
- Local PostgreSQL data lives in `.local/postgres-data`.
- Production uses the PostgreSQL URL supplied through `DATABASE_URL`.

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
DATABASE_URL=postgres://postgres@127.0.0.1:55432/aanm
DATABASE_SSL=false
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

## 🗺️ **Location System**

### **How It Works**
1. **User clicks map** → Places draggable marker on OpenStreetMap
2. **Reverse geocoding** → Converts coordinates to address (via Nominatim - free!)
3. **Database storage**:
   - **Primary**: `coordinates_lat`, `coordinates_lng` (precise)
   - **Secondary**: `address`, `city`, `country` (human-readable)
4. **Validation** → Both coordinates and address required

### **Technology Stack**
- **Maps**: OpenStreetMap (free, open source)
- **Map Library**: Leaflet.js (free, lightweight)
- **Geocoding**: Nominatim (free OpenStreetMap service)
- **No API keys**: Zero cost, no limits!

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
- Check internet connection (needs to fetch OpenStreetMap tiles)
- Verify Leaflet.js CDN is accessible
- Check browser console for JavaScript errors
- No API keys needed!

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
