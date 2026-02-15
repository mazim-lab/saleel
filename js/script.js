document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            const target = document.querySelector(a.getAttribute('href'));
            if (target) {
                const offset = 80;
                window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
            }
        });
    });

    // Header blur on scroll
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        header.style.borderBottomColor = window.scrollY > 50 
            ? 'rgba(255,255,255,0.08)' 
            : 'rgba(255,255,255,0.06)';
    });

    // Intersection Observer for fade-in
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.pricing-card, .step, .why-card, .testimonial-card, .blog-card, .stat').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(16px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });

    // Add visible class styles
    const style = document.createElement('style');
    style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
    document.head.appendChild(style);

    // Stagger animations
    document.querySelectorAll('.pricing-grid, .steps-grid, .why-cards, .testimonial-grid, .blog-grid, .about-stats').forEach(grid => {
        const children = grid.children;
        Array.from(children).forEach((child, i) => {
            child.style.transitionDelay = `${i * 0.1}s`;
        });
    });

    // Mobile menu toggle
    const toggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggle) {
        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});
