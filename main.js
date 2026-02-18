/**
 * AANM Website — Main JavaScript
 * Handles: Navbar, Hero Carousel, Stats Counter, Testimonials, Events Carousel, Scroll Reveals
 */

import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initHeroCarousel();
    initStatsCounter();
    initTestimonials();
    initEventsCarousel();
    initScrollReveal();
});

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

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal--visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px',
    });

    elements.forEach((el) => observer.observe(el));
}
