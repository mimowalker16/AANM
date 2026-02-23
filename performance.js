/**
 * Performance Monitoring Utility
 * Tracks and reports Core Web Vitals and custom metrics
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            navigationStart: performance.timing?.navigationStart || Date.now(),
            firstPaint: null,
            firstContentfulPaint: null,
            largestContentfulPaint: null,
            firstInputDelay: null,
            cumulativeLayoutShift: null,
            domContentLoaded: null,
            loadComplete: null,
            timeToInteractive: null
        };

        this.observers = new Map();
        this.init();
    }

    init() {
        this.observeWebVitals();
        this.trackCustomMetrics();
        this.setupPerformanceObserver();
        
        // Log results when page is hidden or unloaded
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.reportMetrics();
            }
        });

        window.addEventListener('beforeunload', () => {
            this.reportMetrics();
        });
    }

    observeWebVitals() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            const lcpObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.largestContentfulPaint = entry.startTime;
                }
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.set('lcp', lcpObserver);

            // First Input Delay (FID)
            const fidObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
                }
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
            this.observers.set('fid', fidObserver);

            // Cumulative Layout Shift (CLS)
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                this.metrics.cumulativeLayoutShift = clsValue;
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
            this.observers.set('cls', clsObserver);

            // Paint Metrics
            const paintObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.name === 'first-paint') {
                        this.metrics.firstPaint = entry.startTime;
                    } else if (entry.name === 'first-contentful-paint') {
                        this.metrics.firstContentfulPaint = entry.startTime;
                    }
                }
            });
            paintObserver.observe({ entryTypes: ['paint'] });
            this.observers.set('paint', paintObserver);
        }
    }

    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'navigation') {
                        this.metrics.domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
                        this.metrics.loadComplete = entry.loadEventEnd - entry.loadEventStart;
                    }
                }
            });
            observer.observe({ entryTypes: ['navigation'] });
            this.observers.set('navigation', observer);
        }
    }

    trackCustomMetrics() {
        // Time to Interactive approximation
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    this.metrics.timeToInteractive = performance.now();
                }, 0);
            });
        } else {
            this.metrics.timeToInteractive = performance.now();
        }

        // Track resource loading performance
        window.addEventListener('load', () => {
            this.trackResourceMetrics();
        });
    }

    trackResourceMetrics() {
        const resources = performance.getEntriesByType('resource');
        const resourceMetrics = {
            totalResources: resources.length,
            images: resources.filter(r => r.initiatorType === 'img').length,
            scripts: resources.filter(r => r.initiatorType === 'script').length,
            stylesheets: resources.filter(r => r.initiatorType === 'link' && r.name.includes('.css')).length,
            totalTransferSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
            largestResource: Math.max(...resources.map(r => r.transferSize || 0))
        };

        this.metrics.resources = resourceMetrics;
    }

    // Grade performance metrics
    gradeMetrics() {
        const grades = {
            lcp: this.gradeLCP(),
            fid: this.gradeFID(),
            cls: this.gradeCLS(),
            fcp: this.gradeFCP(),
            overall: 'good'
        };

        // Calculate overall grade
        const gradeValues = { good: 3, needs_improvement: 2, poor: 1 };
        const avgScore = Object.values(grades)
            .filter(grade => grade !== 'N/A')
            .reduce((sum, grade) => sum + gradeValues[grade], 0) / 
            Object.values(grades).filter(grade => grade !== 'N/A').length;

        if (avgScore >= 2.5) grades.overall = 'good';
        else if (avgScore >= 1.5) grades.overall = 'needs_improvement';
        else grades.overall = 'poor';

        return grades;
    }

    gradeLCP() {
        if (!this.metrics.largestContentfulPaint) return 'N/A';
        if (this.metrics.largestContentfulPaint <= 2500) return 'good';
        if (this.metrics.largestContentfulPaint <= 4000) return 'needs_improvement';
        return 'poor';
    }

    gradeFID() {
        if (!this.metrics.firstInputDelay) return 'N/A';
        if (this.metrics.firstInputDelay <= 100) return 'good';
        if (this.metrics.firstInputDelay <= 300) return 'needs_improvement';
        return 'poor';
    }

    gradeCLS() {
        if (this.metrics.cumulativeLayoutShift === null) return 'N/A';
        if (this.metrics.cumulativeLayoutShift <= 0.1) return 'good';
        if (this.metrics.cumulativeLayoutShift <= 0.25) return 'needs_improvement';
        return 'poor';
    }

    gradeFCP() {
        if (!this.metrics.firstContentfulPaint) return 'N/A';
        if (this.metrics.firstContentfulPaint <= 1800) return 'good';
        if (this.metrics.firstContentfulPaint <= 3000) return 'needs_improvement';
        return 'poor';
    }

    // Create performance overlay for development
    createOverlay() {
        if (process.env.NODE_ENV === 'production') return;

        const overlay = document.createElement('div');
        overlay.className = 'performance-overlay';
        overlay.innerHTML = this.generateOverlayHTML();
        document.body.appendChild(overlay);

        // Update every 2 seconds
        setInterval(() => {
            overlay.innerHTML = this.generateOverlayHTML();
        }, 2000);

        // Toggle overlay visibility with Ctrl+Shift+P
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                overlay.classList.toggle('show');
            }
        });
    }

    generateOverlayHTML() {
        const grades = this.gradeMetrics();
        return `
            <div class="perf-header">Performance Monitor</div>
            <div class="perf-metric">
                <span>LCP:</span> 
                <span class="perf-value perf-${grades.lcp}">
                    ${this.metrics.largestContentfulPaint ? Math.round(this.metrics.largestContentfulPaint) + 'ms' : 'N/A'}
                </span>
            </div>
            <div class="perf-metric">
                <span>FID:</span> 
                <span class="perf-value perf-${grades.fid}">
                    ${this.metrics.firstInputDelay ? Math.round(this.metrics.firstInputDelay) + 'ms' : 'N/A'}
                </span>
            </div>
            <div class="perf-metric">
                <span>CLS:</span> 
                <span class="perf-value perf-${grades.cls}">
                    ${this.metrics.cumulativeLayoutShift !== null ? this.metrics.cumulativeLayoutShift.toFixed(3) : 'N/A'}
                </span>
            </div>
            <div class="perf-metric">
                <span>FCP:</span> 
                <span class="perf-value perf-${grades.fcp}">
                    ${this.metrics.firstContentfulPaint ? Math.round(this.metrics.firstContentfulPaint) + 'ms' : 'N/A'}
                </span>
            </div>
            <div class="perf-overall perf-${grades.overall}">
                Overall: ${grades.overall.replace('_', ' ')}
            </div>
            <div class="perf-hint">Ctrl+Shift+P to toggle</div>
        `;
    }

    // Report metrics to console or analytics service
    reportMetrics() {
        const grades = this.gradeMetrics();
        
        if (process.env.NODE_ENV === 'development') {
            console.group('🚀 Performance Metrics');
            console.log('Core Web Vitals:', {
                LCP: this.metrics.largestContentfulPaint ? `${Math.round(this.metrics.largestContentfulPaint)}ms (${grades.lcp})` : 'N/A',
                FID: this.metrics.firstInputDelay ? `${Math.round(this.metrics.firstInputDelay)}ms (${grades.fid})` : 'N/A',
                CLS: this.metrics.cumulativeLayoutShift !== null ? `${this.metrics.cumulativeLayoutShift.toFixed(3)} (${grades.cls})` : 'N/A',
                FCP: this.metrics.firstContentfulPaint ? `${Math.round(this.metrics.firstContentfulPaint)}ms (${grades.fcp})` : 'N/A'
            });
            
            if (this.metrics.resources) {
                console.log('Resource Metrics:', this.metrics.resources);
            }
            
            console.log('Overall Grade:', grades.overall);
            console.groupEnd();
        }

        // Send to analytics service (placeholder)
        this.sendToAnalytics(this.metrics, grades);
    }

    sendToAnalytics(metrics, grades) {
        // Placeholder for analytics integration
        // Could integrate with Google Analytics, DataDog, etc.
        if (typeof gtag !== 'undefined') {
            gtag('event', 'web_vitals', {
                custom_map: {
                    'metric_lcp': 'largest_contentful_paint',
                    'metric_fid': 'first_input_delay',
                    'metric_cls': 'cumulative_layout_shift'
                },
                largest_contentful_paint: metrics.largestContentfulPaint,
                first_input_delay: metrics.firstInputDelay,
                cumulative_layout_shift: metrics.cumulativeLayoutShift,
                performance_grade: grades.overall
            });
        }
    }

    // Clean up observers
    disconnect() {
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        this.observers.clear();
    }
}

// Auto-initialize performance monitoring
if (typeof window !== 'undefined') {
    window.performanceMonitor = new PerformanceMonitor();
    
    // Add CSS for development overlay
    if (process.env.NODE_ENV === 'development') {
        const style = document.createElement('style');
        style.textContent = `
            .performance-overlay {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 12px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 12px;
                z-index: 10000;
                min-width: 200px;
                display: none;
            }
            .performance-overlay.show { display: block; }
            .perf-header { font-weight: bold; margin-bottom: 8px; }
            .perf-metric { display: flex; justify-content: space-between; margin: 4px 0; }
            .perf-value.perf-good { color: #4caf50; }
            .perf-value.perf-needs_improvement { color: #ff9800; }
            .perf-value.perf-poor { color: #f44336; }
            .perf-overall { margin-top: 8px; font-weight: bold; text-align: center; }
            .perf-overall.perf-good { color: #4caf50; }
            .perf-overall.perf-needs_improvement { color: #ff9800; }
            .perf-overall.perf-poor { color: #f44336; }
            .perf-hint { font-size: 10px; margin-top: 8px; opacity: 0.7; }
        `;
        document.head.appendChild(style);
        
        window.performanceMonitor.createOverlay();
    }
}

export { PerformanceMonitor };