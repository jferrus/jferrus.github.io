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
        document.title = "Jose Ferrús Aparicio | Software Engineer in Valencia";
        document.querySelector('meta[name="description"]').setAttribute("content", "Professional portfolio of Jose Ferrús Aparicio, Software Engineer based in Valencia, Spain.");
    } else if (lang === 'ca') {
        document.title = "Jose Ferrús Aparicio | Enginyer de Programari a València";
        document.querySelector('meta[name="description"]').setAttribute("content", "Portfoli professional de Jose Ferrús Aparicio, Enginyer de Programari establert a València, Espanya.");
    } else if (lang === 'fr') {
        document.title = "Jose Ferrús Aparicio | Ingénieur Logiciel à Valence";
        document.querySelector('meta[name="description"]').setAttribute("content", "Portfolio professionnel de Jose Ferrús Aparicio, Ingénieur Logiciel basé à Valence, Espagne.");
    } else {
        document.title = "Jose Ferrús Aparicio | Ingeniero de Software en Valencia";
        document.querySelector('meta[name="description"]').setAttribute("content", "Portfolio profesional de Jose Ferrús Aparicio, Ingeniero de Software radicado en Valencia, España, con 4 años de experiencia en desarrollo backend y frontend.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
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
            const target = document.querySelector(this.getAttribute('href'));
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
