// Get navbar element
const nav = document.querySelector('nav');

// Mobile menu toggle
const mobileBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileBtn && navLinks) {
    // Toggle mobile menu
    mobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = navLinks.classList.toggle('active');
        
        // Update menu icon
        const icon = mobileBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-feather', isActive ? 'x' : 'menu');
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
        
        // Prevent body scroll when menu is open
        if (isActive) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (nav && !nav.contains(e.target) && navLinks.classList.contains('active')) {
            closeMenu();
        }
    });

    // Close mobile menu when clicking on a link
    navLinks.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && window.innerWidth <= 768) {
            closeMenu();
        }
    });

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth > 768 && navLinks.classList.contains('active')) {
                closeMenu();
            }
        }, 250);
    });

    // Helper function to close menu
    function closeMenu() {
        navLinks.classList.remove('active');
        const icon = mobileBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-feather', 'menu');
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
        document.body.style.overflow = '';
    }

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('active')) {
            closeMenu();
        }
    });
}