// Lógica de Tema (Modo Claro por defecto, Modo Oscuro opcional)
function setTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('preferredTheme', theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

// Lógica de Internacionalización
function setLanguage(lang) {
    if (!translations[lang]) return;
    localStorage.setItem('preferredLang', lang);
    
    document.documentElement.lang = lang;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });

    // Actualizar título y meta tags si lo deseas
    // (Opcional, pero recomendado para SEO)
    if (lang === 'en') {
        document.title = "Jose Ferrús Aparicio | Agentic Software Engineer - Available for Remote Work";
        document.querySelector('meta[name="description"]').setAttribute("content", "Professional portfolio of Jose Ferrús Aparicio, Agentic Software Engineer specialized in service-oriented architectures and use of AI agents for software generation. Available for remote work in Spain and hybrid or on-site in Valencia.");
    } else if (lang === 'ca') {
        document.title = "Jose Ferrús Aparicio | Agentic Software Engineer - Disponible per a treball remot";
        document.querySelector('meta[name="description"]').setAttribute("content", "Portfoli professional de Jose Ferrús Aparicio, Agentic Software Engineer especialitzat en arquitectures orientades a serveis i ús d'agents d'IA per a la generació de programari. Disponible per a treball remot a Espanya i híbrid o presencial a València.");
    } else {
        document.title = "Jose Ferrús Aparicio | Agentic Software Engineer - Disponible para trabajo remoto";
        document.querySelector('meta[name="description"]').setAttribute("content", "Portfolio profesional de Jose Ferrús Aparicio, Agentic Software Engineer especializado en arquitecturas orientadas a servicios y uso de agentes de IA para la generación de software. Disponible para trabajo remoto en España e híbrido o presencial en Valencia.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Init Theme (Light by default)
    const savedTheme = localStorage.getItem('preferredTheme') || 'light';
    setTheme(savedTheme);

    // Current Year for Footer
    document.getElementById('year').textContent = new Date().getFullYear();

    // Init Language
    const savedLang = localStorage.getItem('preferredLang');
    const userLang = navigator.language.split('-')[0];
    const initialLang = savedLang || (translations[userLang] ? userLang : 'es');
    setLanguage(initialLang);

    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Intersection Observer for Scroll Animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('section-visible');
                
                // Animate progress bars if they exist within the visible section
                const progressBars = entry.target.querySelectorAll('.progress');
                progressBars.forEach(bar => {
                    const width = bar.getAttribute('data-width');
                    bar.style.width = width;
                });
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.section-hidden').forEach(section => {
        observer.observe(section);
    });

    // Smooth Scrolling for Nav Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (!href || href === '#') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            const target = document.querySelector(href);
            if (target) {
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Typing Effect Logic
    // Though we have a static text with CSS blinking cursor, we can make it dynamic if desired.
    // For now, it stays static but looks animated.
});
