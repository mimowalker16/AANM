/**
 * Site AANM — JavaScript principal
 * Handles: Navbar, Hero Carousel, Stats Counter, Testimonials, Events Carousel, Scroll Reveals, Mobile Optimizations
 */

import './style.css';

/* ============================================
   MAIN INITIALIZATION
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 AANM: Starting initialization...');
    
    // Initialize all components
    initNavbar();
    initHeroCarousel();
    initStatsCounter();
    initTestimonials();
    initEventsCarousel();
    initScrollReveal();
    initMobileOptimizations();
    
    // Test animations
    testAnimations();
    
    console.log('✅ AANM: Initialization complete!');
});

/* ============================================
   ANIMATION TEST
   ============================================ */
function testAnimations() {
    // Test if reveal elements exist
    const revealElements = document.querySelectorAll('.reveal');
    console.log('🎬 Trouvé', revealElements.length, 'reveal elements');
    
    // Test if scroll reveal is working after 2 seconds
    setTimeout(() => {
        const visibleElements = document.querySelectorAll('.reveal--visible');
        console.log('✨ Animated', visibleElements.length, 'elements visible');
    }, 2000);
    
    // Test button hover animations
    const buttons = document.querySelectorAll('.btn');
    console.log('🔘 Trouvé', buttons.length, 'buttons for hover animations');
}

/* ============================================
   NAVBAR
   ============================================ */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    const navOverlay = document.getElementById('navOverlay');

    if (!navbar) return;

    // Scroll behavior
    const handleScroll = () => {
        if (window.scrollY > 60) {
            navbar.classList.remove('navbar--transparent');
            navbar.classList.add('navbar--scrolled');
        } else {
            navbar.classList.add('navbar--transparent');
            navbar.classList.remove('navbar--scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Mobile toggle
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('navbar__toggle--open');
            navLinks.classList.toggle('navbar__links--open');
            navOverlay?.classList.toggle('navbar__overlay--visible');
            document.body.style.overflow = navLinks.classList.contains('navbar__links--open') ? 'hidden' : '';
        });

        navOverlay?.addEventListener('click', () => {
            navToggle.classList.remove('navbar__toggle--open');
            navLinks.classList.remove('navbar__links--open');
            navOverlay.classList.remove('navbar__overlay--visible');
            document.body.style.overflow = '';
        });
    }
}

/* ============================================
   HERO CAROUSEL
   ============================================ */
function initHeroCarousel() {
    const carousel = document.getElementById('heroCarousel');
    const indicators = document.getElementById('heroIndicators');
    if (!carousel || !indicators) return;

    const slides = carousel.querySelectorAll('.hero__slide');
    const dots = indicators.querySelectorAll('.hero__dot');
    let currentSlide = 0;
    let autoplayInterval;

    function goToSlide(index) {
        slides[currentSlide].classList.remove('hero__slide--active');
        dots[currentSlide].classList.remove('hero__dot--active');
        currentSlide = index;
        slides[currentSlide].classList.add('hero__slide--active');
        dots[currentSlide].classList.add('hero__dot--active');
    }

    function nextSlide() {
        goToSlide((currentSlide + 1) % slides.length);
    }

    function startAutoplay() {
        autoplayInterval = setInterval(nextSlide, 5000);
    }

    function resetAutoplay() {
        clearInterval(autoplayInterval);
        startAutoplay();
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            goToSlide(index);
            resetAutoplay();
        });
    });

    startAutoplay();
}

/* ============================================
   STATS COUNTER ANIMATION
   ============================================ */
function initStatsCounter() {
    const statNumbers = document.querySelectorAll('.stat__number[data-target]');
    if (!statNumbers.length) return;

    let hasAnimated = false;

    const animateCount = (el) => {
        const target = parseInt(el.getAttribute('data-target'));
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 2000;
        const startTime = performance.now();

        function step(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Easing: ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(target * eased);
            el.textContent = current + suffix;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = target + suffix;
            }
        }

        requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting && !hasAnimated) {
                hasAnimated = true;
                statNumbers.forEach((el) => animateCount(el));
            }
        });
    }, { threshold: 0.3 });

    const statsSection = document.getElementById('stats');
    if (statsSection) observer.observe(statsSection);
}

/* ============================================
   TESTIMONIALS CAROUSEL
   ============================================ */
function initTestimonials() {
    const carousel = document.getElementById('testimonialCarousel');
    const dotsContainer = document.getElementById('testimonialDots');
    const prevBtn = document.getElementById('testimonialPrev');
    const nextBtn = document.getElementById('testimonialNext');
    if (!carousel || !dotsContainer) return;

    const slides = carousel.querySelectorAll('.testimonial-slide');
    const dots = dotsContainer.querySelectorAll('.testimonials__dot');
    let currentSlide = 0;
    let autoplayInterval;

    function goToSlide(index) {
        slides[currentSlide].classList.remove('testimonial-slide--active');
        dots[currentSlide].classList.remove('testimonials__dot--active');
        currentSlide = index;
        slides[currentSlide].classList.add('testimonial-slide--active');
        dots[currentSlide].classList.add('testimonials__dot--active');
    }

    function nextSlide() {
        goToSlide((currentSlide + 1) % slides.length);
    }

    function prevSlide() {
        goToSlide((currentSlide - 1 + slides.length) % slides.length);
    }

    function startAutoplay() {
        autoplayInterval = setInterval(nextSlide, 6000);
    }

    function resetAutoplay() {
        clearInterval(autoplayInterval);
        startAutoplay();
    }

    // Dots navigation
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            goToSlide(index);
            resetAutoplay();
        });
    });

    // Arrow buttons
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetAutoplay();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoplay();
        });
    }

    startAutoplay();
}

/* ============================================
   EVENTS CAROUSEL
   ============================================ */
function initEventsCarousel() {
    const track = document.getElementById('eventsTrack');
    const leftBtn = document.getElementById('eventsLeft');
    const rightBtn = document.getElementById('eventsRight');
    const dotsContainer = document.getElementById('eventsDots');
    if (!track || !leftBtn || !rightBtn) return;

    const cards = track.querySelectorAll('.event-card');
    const dots = dotsContainer?.querySelectorAll('.events__dot') || [];
    let currentIndex = 0;
    const cardWidth = 436; // 420px card + 16px gap

    function updateCarousel() {
        const offset = currentIndex * cardWidth;
        track.style.transform = `translateX(-${offset}px)`;
        
        // Update dots
        dots.forEach((dot, index) => {
            if (index === currentIndex) {
                dot.classList.add('events__dot--active');
            } else {
                dot.classList.remove('events__dot--active');
            }
        });
    }

    function goToSlide(index) {
        currentIndex = Math.max(0, Math.min(index, cards.length - 1));
        updateCarousel();
    }

    rightBtn.addEventListener('click', () => {
        if (currentIndex < cards.length - 1) {
            goToSlide(currentIndex + 1);
        }
    });

    leftBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            goToSlide(currentIndex - 1);
        }
    });

    // Dots navigation
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            goToSlide(index);
        });
    });

    // Touch/drag support
    let isDragging = false;
    let startX, startTransform;

    track.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startTransform = currentIndex * cardWidth;
        track.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = startX - e.clientX;
        const offset = startTransform + dx;
        track.style.transform = `translateX(-${offset}px)`;
    });

    document.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        track.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        
        const dx = startX - e.clientX;
        if (Math.abs(dx) > 50) {
            if (dx > 0 && currentIndex < cards.length - 1) {
                goToSlide(currentIndex + 1);
            } else if (dx < 0 && currentIndex > 0) {
                goToSlide(currentIndex - 1);
            } else {
                updateCarousel();
            }
        } else {
            updateCarousel();
        }
    });

    // Touch events
    let touchStartX;
    track.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        startTransform = currentIndex * cardWidth;
        track.style.transition = 'none';
    }, { passive: true });

    track.addEventListener('touchmove', (e) => {
        const dx = touchStartX - e.touches[0].clientX;
        const offset = startTransform + dx;
        track.style.transform = `translateX(-${offset}px)`;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
        track.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        const dx = touchStartX - e.changedTouches[0].clientX;
        
        if (Math.abs(dx) > 50) {
            if (dx > 0 && currentIndex < cards.length - 1) {
                goToSlide(currentIndex + 1);
            } else if (dx < 0 && currentIndex > 0) {
                goToSlide(currentIndex - 1);
            } else {
                updateCarousel();
            }
        } else {
            updateCarousel();
        }
    }, { passive: true });
}

/* ============================================
   SCROLL REVEAL ANIMATIONS
   ============================================ */
function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const revealEl = (el) => {
        // requestAnimationFrame ensures the browser has painted opacity:0
        // before we add the class — without this, fast-firing observers
        // batch start+end state into one frame and the transition never plays
        requestAnimationFrame(() => {
            el.classList.add('reveal--visible');
        });
    };

    if (!('IntersectionObserver' in window)) {
        elements.forEach(revealEl);
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                revealEl(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        // No negative rootMargin — it was preventing elements near the
        // viewport bottom from ever triggering
    });

    elements.forEach((el) => observer.observe(el));

    // Safety net: after 4s, reveal anything still hidden
    // (guards against edge cases where observer never fires)
    setTimeout(() => {
        document.querySelectorAll('.reveal:not(.reveal--visible)').forEach(revealEl);
    }, 4000);
}

/* ============================================
   MOBILE OPTIMIZATIONS
   ============================================ */
function initMobileOptimizations() {
    // Add mobile class to body for CSS targeting
    if (window.innerWidth <= 768) {
        document.body.classList.add('mobile');
    }

    // Enhanced touch interactions
    addTouchEnhancements();
    
    // Mobile-specific loading states
    initMobileLoadingStates();
    
    // Optimize viewport for mobile
    optimizeVoirport();
    
    // Handle orientation changes
    handleOrientationChange();
    
    // Improve form interactions on mobile
    enhanceMobileForms();
    
    // Add swipe gestures for carousels
    addSwipeGestures();
}

function addTouchEnhancements() {
    // Add touch feedback to interactive elements
    const touchElements = document.querySelectorAll('.btn, .lab-contact, .action-btn, .search-btn, .lab-card, .result-card');
    
    touchElements.forEach(element => {
        element.addEventListener('touchstart', function() {
            this.classList.add('touch-active');
        }, { passive: true });
        
        element.addEventListener('touchend', function() {
            setTimeout(() => {
                this.classList.remove('touch-active');
            }, 150);
        }, { passive: true });
        
        element.addEventListener('touchcancel', function() {
            this.classList.remove('touch-active');
        }, { passive: true });
    });
}

function initMobileLoadingStates() {
    // Add mobile loading indicators for async operations
    const loadingElements = document.querySelectorAll('[data-mobile-loading]');
    
    loadingElements.forEach(element => {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'mobile-loading';
        loadingDiv.textContent = 'Chargement...';
        loadingDiv.style.display = 'none';
        
        element.parentNode.insertBefore(loadingDiv, element.nextSibling);
    });
}

function optimizeVoirport() {
    // Prevent zoom on input focus for iOS
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type !== 'range' && input.type !== 'checkbox' && input.type !== 'radio') {
            if (window.innerWidth <= 768) {
                input.style.fontSize = '16px';
            }
        }
    });
}

function handleOrientationChange() {
    let orientationChangeTimeout;
    
    window.addEventListener('orientationchange', () => {
        clearTimeout(orientationChangeTimeout);
        
        // Hide content during orientation change to prevent layout issues
        document.body.style.opacity = '0.8';
        
        orientationChangeTimeout = setTimeout(() => {
            // Re-calculate layouts after orientation change
            if (window.map && typeof window.map.invalidateSize === 'function') {
                window.map.invalidateSize();
            }
            
            // Restore visibility
            document.body.style.opacity = '';
            
            // Trigger resize events for responsive components
            window.dispatchEvent(new Event('resize'));
        }, 100);
    });
}

function enhanceMobileForms() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        // Add mobile-friendly validation
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // Add real-time validation feedback
            input.addEventListener('blur', function() {
                if (this.validity && !this.validity.valid) {
                    this.classList.add('error');
                } else {
                    this.classList.remove('error');
                }
            });
            
            // Clear error state on focus
            input.addEventListener('focus', function() {
                this.classList.remove('error');
            });
        });
        
        // Smooth scroll to first error on submission
        form.addEventListener('submit', function(e) {
            const firstError = this.querySelector('.error, :invalid');
            if (firstError) {
                e.preventDefault();
                firstError.scrollIntoVoir({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                firstError.focus();
            }
        });
    });
}

function addSwipeGestures() {
    const carousels = document.querySelectorAll('.hero__carousel, .testimonials__track');
    
    carousels.forEach(carousel => {
        let startX = 0;
        let startY = 0;
        let distanceX = 0;
        let distanceY = 0;
        
        carousel.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        carousel.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;
            
            distanceX = e.touches[0].clientX - startX;
            distanceY = e.touches[0].clientY - startY;
        }, { passive: true });
        
        carousel.addEventListener('touchend', () => {
            if (!startX || !startY) return;
            
            // Only trigger swipe if horizontal movement is greater than vertical
            if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > 50) {
                if (distanceX > 0) {
                    // Swipe right - previous slide
                    carousel.dispatchEvent(new CustomEvent('swipe-right'));
                } else {
                    // Swipe left - next slide
                    carousel.dispatchEvent(new CustomEvent('swipe-left'));
                }
            }
            
            startX = 0;
            startY = 0;
            distanceX = 0;
            distanceY = 0;
        }, { passive: true });
    });
}

// Add CSS for touch feedback
const style = document.createElement('style');
style.textContent = `
    .touch-active {
        transform: scale(0.98);
        opacity: 0.8;
        transition: all 0.1s ease;
    }
    
    .error {
        border-color: #d32f2f !important;
        box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.2);
    }
    
    @media (max-width: 768px) {
        .mobile .container {
            padding-left: 1rem;
            padding-right: 1rem;
        }
        
        .mobile input:focus,
        .mobile select:focus,
        .mobile textarea:focus {
            transform: none;
            zoom: 1;
        }
    }
`;
document.head.appendChild(style);
