(() => {
  // Elements
  const c1 = document.querySelector('[data-local-name="1"]');
  const c2 = document.querySelector('[data-local-name="2"]');
  const c3 = document.querySelector('[data-local-name="3"]');
  const c4 = document.querySelector('[data-local-name="4"]');
  const c5 = document.querySelector('[data-local-name="5"]');

  const card1 = document.querySelector('.local-jqpwh3');
  const card2 = document.querySelector('.local-1lx34zx');
  const card3 = document.querySelector('.local-1r0jf92');
  const cardsWrapper = document.querySelector('.local-1jtbx9g');

  const lines = Array.from(document.querySelectorAll('[data-local-name="About Section"] .line'));
  const badge = document.querySelector('[data-local-name="About Section"] .local-1i8ahkj-container');
  const textWrapper = document.querySelector('[data-local-name="About Section"] .local-u6q2hj');
  const hero = document.querySelector('[data-local-name="Hero Section"]');
  const invitation = document.querySelector('.care-invitation');
  const invitationImage = invitation && invitation.querySelector('.care-invitation__image');
  const invitationContent = invitation && invitation.querySelector('.care-invitation__content');
  const invitationPanels = invitation ? Array.from(invitation.querySelectorAll('.care-invitation__panel')) : [];
  const invitationPanelTravel = [254, 352, 629, 352, 202];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  let scheduled = false;

  function update() {
    scheduled = false;
    const y = window.scrollY || window.pageYOffset || 0;
    const vh = window.innerHeight;

    // 0. Entrada da chamada final, acompanhando o scroll da página.
    if (invitation && invitationImage && invitationContent && invitationPanels.length === 5) {
      const sectionTop = invitation.getBoundingClientRect().top;
      const progress = reducedMotion ? 1 : clamp((vh - sectionTop) / vh, 0, 1);
      const exitProgress = reducedMotion ? 1 : clamp(-sectionTop / (vh * 0.55), 0, 1);
      const contentProgress = reducedMotion ? 1 : clamp((progress - 0.55) / 0.45, 0, 1);
      invitationImage.style.transform = `scale(${1.12 - 0.12 * progress})`;
      invitationContent.style.opacity = String(contentProgress);
      invitationContent.style.transform = `translateY(${48 * (1 - contentProgress)}px)`;
      const transitionHeight = invitation.querySelector('.care-invitation__transition').offsetHeight;
      invitationPanels.forEach((panel, index) => {
        const travel = invitationPanelTravel[index] * progress + (transitionHeight + 30) * exitProgress;
        panel.style.transform = `translateY(${-travel}px)`;
      });
    }

    // 1. Cross / staircase transition between Hero & Brand Section
    const heroH = (hero && hero.offsetHeight) || 834;
    const crossProgress = reducedMotion ? 1 : clamp(y / heroH, 0, 1);
    if (c1) c1.style.transform = `translateY(${-254 * crossProgress}px)`;
    if (c2) c2.style.transform = `translateY(${-352 * crossProgress}px)`;
    if (c3) c3.style.transform = `translateY(${-629 * crossProgress}px)`;
    if (c4) c4.style.transform = `translateY(${-352 * crossProgress}px)`;
    if (c5) c5.style.transform = `translateY(${-202 * crossProgress}px)`;

    // 2. Badge & Title reveal
    if (badge) {
      const bRect = badge.getBoundingClientRect();
      const bp = reducedMotion ? 1 : clamp((vh * 0.92 - bRect.top) / (vh * 0.35), 0, 1);
      badge.style.opacity = bp;
      badge.style.transform = `translateY(${80 * (1 - bp)}px)`;
    }
    if (textWrapper) {
      const tRect = textWrapper.getBoundingClientRect();
      const tp = reducedMotion ? 1 : clamp((vh * 0.9 - tRect.top) / (vh * 0.35), 0, 1);
      textWrapper.style.opacity = tp;
      textWrapper.style.transform = `translateY(${80 * (1 - tp)}px)`;
    }

    // 3. Text lines gradient scrub
    lines.forEach((line) => {
      const lRect = line.getBoundingClientRect();
      const lp = reducedMotion ? 1 : clamp((vh * 0.75 - lRect.top) / (vh * 0.25), 0, 1);
      line.style.backgroundPosition = `${-100 * lp}% 0%`;
    });

    // 4. Block 2 3D Card unfolding animation
    if (cardsWrapper && card1 && card2 && card3) {
      const cwRect = cardsWrapper.getBoundingClientRect();
      const cp = reducedMotion ? 1 : clamp((vh * 0.85 - cwRect.top) / (vh * 0.45), 0, 1);
      if (cp >= 0.999) {
        card1.style.transform = 'perspective(1200px)';
        card2.style.transform = 'perspective(1200px)';
        card3.style.transform = 'perspective(1200px)';
      } else {
        const cr = 1 - cp;
        const scale = 0.5 + 0.5 * cp;
        card1.style.transform = `perspective(1200px) translateX(${200 * cr}px) scale(${scale}) rotate(${10 * cr}deg) rotateY(${90 * cr}deg)`;
        card2.style.transform = `perspective(1200px) translateX(${40 * cr}px) scale(${scale}) rotate(${10 * cr}deg) rotateY(${90 * cr}deg) skewX(${20 * cr}deg)`;
        card3.style.transform = `perspective(1200px) translateX(${-200 * cr}px) scale(${scale}) rotate(${-10 * cr}deg) rotateY(${90 * cr}deg)`;
      }
    }
  }

  function onScroll() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();

  // Serviços: cada tópico selecionado atualiza a imagem e a descrição.
  const serviceSection = document.querySelector('.care-services');
  if (serviceSection) {
    const serviceImage = serviceSection.querySelector('.care-services__image');
    const serviceItems = Array.from(serviceSection.querySelectorAll('.care-services__item'));

    serviceItems.forEach((item) => {
      const trigger = item.querySelector('.care-services__trigger');
      trigger.addEventListener('click', () => {
        serviceItems.forEach((other) => {
          const active = other === item;
          other.classList.toggle('is-active', active);
          other.querySelector('.care-services__trigger').setAttribute('aria-pressed', String(active));
        });

        const nextImage = item.dataset.image;
        if (serviceImage.getAttribute('src') === nextImage) return;
        serviceImage.classList.add('is-changing');
        window.setTimeout(() => {
          serviceImage.src = nextImage;
          serviceImage.alt = item.dataset.alt;
          serviceImage.classList.remove('is-changing');
        }, 140);
      });
    });
  }

  // Revela os elementos da seção 4 conforme entram na área visível.
  const resultReveals = Array.from(document.querySelectorAll('.care-results__reveal'));
  if (resultReveals.length) {
    if (reducedMotion || !('IntersectionObserver' in window)) {
      resultReveals.forEach((element) => element.classList.add('is-visible'));
    } else {
      document.documentElement.classList.add('js-reveal-ready');
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      resultReveals.forEach((element) => revealObserver.observe(element));
    }
  }

})();


