// Shared JavaScript across all pages

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Queasy App loaded');
    
    // Add fade-in class to all feature cards and steps
    document.querySelectorAll('.feature-card, #how-it-works > div > div > div').forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });

    // Add magnetic effect to buttons
    document.querySelectorAll('a').forEach(button => {
        if (button.classList.contains('btn-magnetic') || button.textContent.includes('Start') || button.textContent.includes('Sign')) {
            button.addEventListener('mousemove', (e) => {
                const rect = button.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const deltaX = (x - centerX) * 0.1;
                const deltaY = (y - centerY) * 0.1;
                
                button.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.05)`;
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translate(0px, 0px) scale(1)';
            });
        }
    });

    // Add typing effect to hero subtitle
    const heroSubtitle = document.querySelector('#hero p');
    if (heroSubtitle) {
        const text = heroSubtitle.textContent;
        heroSubtitle.textContent = '';
        
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                heroSubtitle.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 50);
            }
        };
        
        setTimeout(typeWriter, 1000);
    }

    // Add confetti effect to CTA buttons
    document.querySelectorAll('a[href="#"]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Simple confetti effect
            for (let i = 0; i < 50; i++) {
                setTimeout(() => {
                    const confetti = document.createElement('div');
                    confetti.className = 'absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full';
                    confetti.style.left = Math.random() * 100 + 'vw';
                    confetti.style.top = '-10px';
                    confetti.style.animation = `fall ${Math.random() * 2 + 1}s linear forwards`;
                    document.body.appendChild(confetti);
                    
                    setTimeout(() => {
                        confetti.remove();
                    }, 3000);
                }, i * 30);
            }
        });
    });

    // Add scroll progress indicator
    const progressBar = document.createElement('div');
    progressBar.className = 'fixed top-0 left-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 transform origin-left transition-transform duration-100 z-50';
    progressBar.style.width = '100%';
    progressBar.style.transform = 'scaleX(0)';
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const winHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;
        const scrollTop = window.pageYOffset;
        const scrollPercent = scrollTop / (docHeight - winHeight);
        progressBar.style.transform = `scaleX(${scrollPercent})`;
    });
});

// Fall animation for confetti
const style = document.createElement('style');
style.textContent = `
    @keyframes fall {
        to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);