# AANM Laboratory Directory Platform - Deployment Guide

## 🚀 Production Deployment

### Prerequisites
- Node.js 18+ and npm 9+
- Git for version control
- Web server (Apache, Nginx, or cloud platform)

### Build Process

1. **Install Dependencies**
```bash
npm install
```

2. **Production Build**
```bash
npm run build:prod
```

3. **Preview Build Locally**
```bash
npm run preview
```

### Performance Optimizations

#### ✅ Completed Optimizations
- **CSS Optimization**: Minified, critical CSS inlined, non-critical CSS lazy-loaded
- **JavaScript Optimization**: Tree-shaking, terser minification, code splitting
- **Image Optimization**: Lazy loading, WebP format ready, responsive images
- **Bundle Optimization**: Vendor chunk splitting, dynamic imports
- **Caching Strategy**: Service worker ready, cache headers optimized
- **Core Web Vitals**: LCP, FID, CLS monitoring and optimization

#### 📊 Performance Targets
- **Lighthouse Score**: 95+ (Performance)
- **First Contentful Paint**: < 1.8s
- **Largest Contentful Paint**: < 2.5s  
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

### Deployment Options

#### Option 1: Static Hosting (Recommended)
**Platforms**: Vercel, Netlify, GitHub Pages, Cloudflare Pages

```bash
# Build and deploy to static hosting
npm run build:prod

# Upload 'dist' folder contents to your hosting platform
```

**Example: Vercel Deployment**
```bash
npm i -g vercel
vercel --prod
```

#### Option 2: Traditional Web Server

**Apache (.htaccess)**
```apache
# Place in dist/.htaccess
RewriteEngine On
RewriteRule ^([^.]+)$ $1.html [NC,L]

# Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/json
</IfModule>

# Browser caching
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>
```

**Nginx Configuration**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/aanm/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle SPA routing
    location / {
        try_files $uri $uri.html $uri/ =404;
    }
}
```

#### Option 3: Full-Stack Deployment (with Backend)

**Docker Setup**
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build:prod

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose (with Backend)**
```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "80:80"
    depends_on:
      - backend
  
  backend:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    volumes:
      - ./server/database:/app/database
```

### Environment Configuration

**Production Environment Variables**
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=/path/to/production.db
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Performance Monitoring

#### Built-in Performance Monitoring
The platform includes comprehensive performance monitoring:

- **Real User Monitoring (RUM)**: Core Web Vitals tracking
- **Performance Overlay**: Development mode performance dashboard (Ctrl+Shift+P)
- **Console Reporting**: Detailed performance metrics in browser console

#### External Monitoring Integration
```javascript
// Add to main.js for production analytics
if (typeof gtag !== 'undefined') {
  // Google Analytics 4 - Core Web Vitals
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (window.performanceMonitor) {
        window.performanceMonitor.reportMetrics();
      }
    }, 0);
  });
}
```

### Security Checklist

- ✅ CSP headers configured via Helmet.js
- ✅ Rate limiting implemented
- ✅ Input validation with express-validator
- ✅ CORS properly configured
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection enabled
- ✅ HTTPS enforcement (configure on server/CDN)

### SEO Optimizations

- ✅ Meta tags optimized for each page
- ✅ Structured data ready for implementation
- ✅ Semantic HTML structure
- ✅ Image alt tags and optimization
- ✅ Social media meta tags (Open Graph, Twitter Cards)

### Maintenance

#### Regular Tasks
```bash
# Check for dependency updates
npm audit
npm outdated

# Performance analysis
npm run analyze

# Lighthouse audit
npm run check:performance
```

#### Database Maintenance
```bash
# Backup database
cp server/database/labs.db server/database/backup_$(date +%Y%m%d).db

# Initialize fresh database if needed
npm run db:init
```

### Monitoring & Analytics

#### Lighthouse Monitoring
```bash
# Local lighthouse audit
npm install -g lighthouse
lighthouse https://yourdomain.com --output html --output-path ./lighthouse-report.html
```

#### Performance Budget (recommended)
```json
{
  "budget": [
    {
      "path": "/*",
      "timings": [
        {
          "metric": "first-contentful-paint",
          "budget": 2000
        },
        {
          "metric": "largest-contentful-paint", 
          "budget": 2500
        }
      ],
      "resourceSizes": [
        {
          "resourceType": "total",
          "budget": 500
        },
        {
          "resourceType": "javascript",
          "budget": 150
        }
      ]
    }
  ]
}
```

### Troubleshooting

#### Common Issues

1. **Build Errors**
   - Check Node.js version compatibility
   - Clear node_modules and reinstall dependencies
   - Verify all file paths are correct

2. **Performance Issues**
   - Use the built-in performance monitor (Ctrl+Shift+P in dev mode)
   - Check Network tab for large resources
   - Verify lazy loading is working correctly

3. **Database Connection Issues**
   - Ensure database file permissions are correct
   - Check database initialization has run
   - Verify SQLite3 installation

### Support

For deployment issues or questions:
- Check the performance monitor dashboard
- Review browser console for errors  
- Verify all optimization scripts have run successfully

---

**Deployment Checklist**
- [ ] Dependencies installed
- [ ] Production build completed successfully
- [ ] Performance metrics meet targets (> 90 Lighthouse score)
- [ ] Security headers configured
- [ ] Environment variables set
- [ ] Database initialized and populated
- [ ] Cache headers configured
- [ ] Monitoring/analytics initialized
- [ ] SSL certificate installed
- [ ] Domain properly configured