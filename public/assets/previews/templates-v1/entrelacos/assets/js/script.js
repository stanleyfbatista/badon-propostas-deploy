// Script da página de vendas com Animações de Scroll
document.addEventListener('DOMContentLoaded', () => {
  // Rolagem suave ao clicar no indicador de rolagem
  const scrollIndicator = document.getElementById('scrollIndicator');
  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector('#about');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({
          top: window.innerHeight,
          behavior: 'smooth'
        });
      }
    });
  }

  // Efeito sutil de parallax no mouse para computadores na Hero
  const heroContent = document.querySelector('.hero-content');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && window.innerWidth > 992 && heroContent) {
    window.addEventListener('mousemove', (e) => {
      const mouseX = (e.clientX / window.innerWidth) - 0.5;
      const mouseY = (e.clientY / window.innerHeight) - 0.5;
      heroContent.style.transform = `translate3d(${mouseX * 10}px, ${mouseY * 8}px, 0)`;
    });
  }

  // ==========================================
  // SISTEMA DE ANIMAÇÃO AO ROLAR (SCROLL REVEAL)
  // ==========================================
  const revealElements = document.querySelectorAll('.reveal, [data-reveal]');

  if ('IntersectionObserver' in window) {
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.12
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    revealElements.forEach(el => {
      revealObserver.observe(el);
    });

    // Revela imediatamente os elementos que já estão no viewport inicial
    setTimeout(() => {
      revealElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('is-revealed');
        }
      });
    }, 80);
  } else {
    // Fallback caso não suporte IntersectionObserver
    revealElements.forEach(el => el.classList.add('is-revealed'));
  }

  // Microinteração de inclinação 3D sutil ao mover o mouse sobre os cards (Desktop)
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && window.innerWidth > 1024) {
    const interactiveCards = document.querySelectorAll('.target-card, .bonus-card, .pricing-card');
    interactiveCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        card.style.transform = `perspective(1000px) rotateX(${-(y / rect.height) * 3}deg) rotateY(${(x / rect.width) * 3}deg) translateY(-5px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }
});
