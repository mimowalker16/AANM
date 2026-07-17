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

# Recommended on Windows: starts frontend and backend against the live Supabase DB
dev.bat
```

Development uses the live Supabase database. Copy the example env file and fill
in the database password from the Supabase dashboard:

```bash
copy backend\.env.example backend\.env
```

`backend\.env` should keep:
- `DATABASE_URL` set to the Supabase pooler URL
- `DATABASE_SSL=true`
- `SKIP_TABLE_INIT=true`

`dev.bat` also reads the legacy `backend\server\.env` file if you already keep
your local settings there.

If you run the backend without `dev.bat`, set the same variables in your shell
first.

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
- `dev.bat` loads `.env`, `backend/.env`, and `backend/server/.env`, then uses `DATABASE_URL`.
- Development and production both use the Supabase PostgreSQL URL supplied through `DATABASE_URL`.
- To deliberately use a disposable local PostgreSQL database, set `USE_LOCAL_POSTGRES=true` before running `dev.bat`.
- Local PostgreSQL data, when explicitly enabled, lives in `.local/postgres-data`.


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
All sensitive config in `backend/.env`:
```bash
PORT=3001
DATABASE_URL=
DATABASE_SSL=true
SKIP_TABLE_INIT=true
ALLOWED_ORIGINS=
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
