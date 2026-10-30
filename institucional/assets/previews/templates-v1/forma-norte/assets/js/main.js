/**
 * VÉRTICE ARQUITETURA - Interactive Controllers
 */

document.addEventListener('DOMContentLoaded', () => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const loader=document.querySelector('.loading');if(loader)loader.style.display='none';
    document.body.classList.add('page-ready');initUseCaseAccordion();return;
  }
  initPreloader();
  initHeroViewport();
  initInkMaskScroll();
  initIntroTextScroll();
  initProblemsCardsScroll();
  initPartnerCarousel();
  initUseCaseAccordion();
});

/**
 * Preloader Animation Controller
 */
function initPreloader() {
  const loadingEl = document.querySelector('.loading');
  const percentText = document.querySelector('.loading-progress-txt-percent');
  const progressBar = document.querySelector('.loading-progress-bar-fill');
  const coordX = document.querySelector('[data-loading-control="x"]');
  const coordY = document.querySelector('[data-loading-control="y"]');
  if (!loadingEl) return;

  let progress = 0;
  const duration = 850; // Fast and snappy loading animation
  const startTime = performance.now();

  function updateLoading(now) {
    const elapsed = now - startTime;
    const rawProgress = Math.min(elapsed / duration, 1);
    
    // Smooth ease-out curve
    const easeProgress = 1 - Math.pow(1 - rawProgress, 3);
    progress = Math.floor(easeProgress * 100);

    if (percentText) percentText.textContent = progress;
    if (progressBar) progressBar.style.width = `${progress}%`;

    // Dynamic coordinates simulation during boot
    if (coordX) coordX.textContent = Math.floor(100 + easeProgress * 1031);
    if (coordY) coordY.textContent = Math.floor(80 + easeProgress * 950);

    if (rawProgress < 1) {
      requestAnimationFrame(updateLoading);
    } else {
      // Completed loading sequence quickly
      setTimeout(() => {
        loadingEl.classList.add('loaded');
        setTimeout(() => {
          loadingEl.style.display = 'none';
          document.body.classList.add('page-ready');
        }, 500);
      }, 120);
    }
  }

  requestAnimationFrame(updateLoading);
}

/**
 * Architectural Hero Viewport & 3D Tilt/Drag Interaction
 */
function initHeroViewport() {
  const wrap = document.querySelector('.home-hero-img-wrap');
  const inner = document.querySelector('.home-hero-img-inner');
  const lineH = document.querySelector('.crosshair-line-h');
  const lineV = document.querySelector('.crosshair-line-v');
  const plus = document.querySelector('.home-hero-img-plus');
  const coordX = document.querySelector('[data-control="x"]');
  const coordY = document.querySelector('[data-control="y"]');

  if (!wrap || !inner) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentTiltX = 0;
  let currentTiltY = 0;
  let targetTiltX = 0;
  let targetTiltY = 0;

  // Track Mouse movement for crosshairs and coordinates
  wrap.addEventListener('mouseenter', () => {
    if (lineH) lineH.style.opacity = '1';
    if (lineV) lineV.style.opacity = '1';
    if (plus) plus.style.opacity = '1';
  });

  wrap.addEventListener('mouseleave', () => {
    if (!isDragging) {
      if (lineH) lineH.style.opacity = '0';
      if (lineV) lineV.style.opacity = '0';
      if (plus) plus.style.opacity = '0';
      targetTiltX = 0;
      targetTiltY = 0;
    }
  });

  wrap.addEventListener('mousemove', (e) => {
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Crosshair positioning
    if (lineH) lineH.style.top = `${y}px`;
    if (lineV) lineV.style.left = `${x}px`;
    if (plus) {
      plus.style.left = `${x}px`;
      plus.style.top = `${y}px`;
    }

    // Precision architectural coordinate display (e.g., X: 428.1, Y: 92PX)
    if (coordX) coordX.textContent = (x * 1.5).toFixed(1);
    if (coordY) coordY.textContent = Math.round(y * 1.2);

    // Subtle perspective tilt on drag/hover
    if (isDragging) {
      const deltaX = (e.clientX - startX) * 0.08;
      const deltaY = (e.clientY - startY) * 0.08;
      targetTiltY = Math.max(-12, Math.min(12, deltaX));
      targetTiltX = Math.max(-10, Math.min(10, -deltaY));
    }
  });

  // Drag interaction
  wrap.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    wrap.style.cursor = 'grabbing';
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      wrap.style.cursor = 'crosshair';
      targetTiltX = 0;
      targetTiltY = 0;
    }
  });

  // Touch Support
  wrap.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isDragging = false;
    targetTiltX = 0;
    targetTiltY = 0;
  });

  wrap.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1) {
      const deltaX = (e.touches[0].clientX - startX) * 0.1;
      const deltaY = (e.touches[0].clientY - startY) * 0.1;
      targetTiltY = Math.max(-15, Math.min(15, deltaX));
      targetTiltX = Math.max(-12, Math.min(12, -deltaY));
    }
  }, { passive: true });

  // Smooth tilt rendering loop
  function renderTilt() {
    currentTiltX += (targetTiltX - currentTiltX) * 0.12;
    currentTiltY += (targetTiltY - currentTiltY) * 0.12;

    inner.style.transform = `perspective(1000px) rotateX(${currentTiltX.toFixed(2)}deg) rotateY(${currentTiltY.toFixed(2)}deg) scale(${isDragging ? 1.02 : 1})`;

    requestAnimationFrame(renderTilt);
  }

  renderTilt();
}

/**
 * Section 2: Fluid Organic Ink / Wave Scroll Mask Reveal (i1.png -> i2.png)
 * Organic wave reveal animation for architect portfolio showcase
 */
function initInkMaskScroll() {
  const section = document.querySelector('.home-intro');
  const path = document.getElementById('inkMaskPath');
  const wrap = document.querySelector('.home-intro-img-wrap');
  const svg = document.querySelector('.ink-mask-svg');
  const baseImg = document.getElementById('inkBaseImg');
  const overlayImg = document.getElementById('inkOverlayImg');
  if (!section || !path || !wrap || !svg) return;

  let currentProgress = 0;
  let targetProgress = 0;
  let isTicking = false;
  let viewBoxHeight = 1100;

  function updateDimensions() {
    const w = wrap.offsetWidth || 600;
    const h = wrap.offsetHeight || 700;
    viewBoxHeight = Math.max(800, Math.round((h / w) * 1000));
    svg.setAttribute('viewBox', `0 0 1000 ${viewBoxHeight}`);
    if (baseImg) {
      baseImg.setAttribute('height', viewBoxHeight);
    }
    if (overlayImg) {
      overlayImg.setAttribute('height', viewBoxHeight);
    }
    applyMaskPath(currentProgress);
  }

  function applyMaskPath(progress) {
    // When progress = 0: y1 = -80, y2 = -80 (completely hidden)
    // When progress = 1: y1 = viewBoxHeight + 150, y2 = viewBoxHeight + 350 (completely revealed)
    const travel = viewBoxHeight + 250;
    const y1 = (-80 + progress * travel).toFixed(1);
    const y2 = (-80 + progress * (travel + 180)).toFixed(1);

    path.setAttribute('d', `M 0 ${y1} Q 500 ${y2} 1000 ${y1} L 1000 -120 L 0 -120 Z`);
  }

  function calculateTargetProgress() {
    const rect = section.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Start reveal when the top of section enters 85% of viewport
    // Fully reveal when the section center reaches comfortable viewing position
    const startPoint = windowHeight * 0.85;
    const endPoint = windowHeight * 0.12;

    let p = (startPoint - rect.top) / (startPoint - endPoint);
    p = Math.max(0, Math.min(1, p));
    targetProgress = p;

    if (!isTicking) {
      isTicking = true;
      requestAnimationFrame(renderMask);
    }
  }

  function renderMask() {
    currentProgress += (targetProgress - currentProgress) * 0.14;

    if (Math.abs(targetProgress - currentProgress) < 0.001) {
      currentProgress = targetProgress;
      isTicking = false;
    } else {
      requestAnimationFrame(renderMask);
    }

    applyMaskPath(currentProgress);
  }

  window.addEventListener('scroll', calculateTargetProgress, { passive: true });
  window.addEventListener('resize', () => {
    updateDimensions();
    calculateTargetProgress();
  }, { passive: true });

  updateDimensions();
  calculateTargetProgress();
}

/**
 * Section 2: Kinetic Scroll Text Reveal for Architectural Manifesto
 */
function initIntroTextScroll() {
  const introContent = document.querySelector('.home-intro-content');
  const heading = document.querySelector('.heading-intro');
  const btn = document.querySelector('.home-intro-btn');
  const partnerWrap = document.querySelector('.home-intro-partner-wrap');
  if (!heading) return;

  // Split text into word spans while preserving natural wrapping
  const rawText = heading.textContent.trim();
  const words = rawText.split(/\s+/);
  heading.innerHTML = words
    .map((w) => `<span class="intro-word">${w}</span>`)
    .join(' ');
  heading.classList.add('is-split');

  const wordEls = heading.querySelectorAll('.intro-word');
  const totalWords = wordEls.length;

  let currentP = 0;
  let targetP = 0;
  let isTicking = false;

  function updateTarget() {
    const triggerEl = introContent || heading;
    const rect = triggerEl.getBoundingClientRect();
    const windowH = window.innerHeight;

    // Start text illumination when the text enters the bottom 85% of viewport
    // Complete full illumination when the text reaches comfortable reading height
    const startPoint = windowH * 0.85;
    const endPoint = windowH * 0.22;

    let p = (startPoint - rect.top) / (startPoint - endPoint);
    p = Math.max(0, Math.min(1, p));
    targetP = p;

    if (!isTicking) {
      isTicking = true;
      requestAnimationFrame(renderTextReveal);
    }
  }

  function renderTextReveal() {
    currentP += (targetP - currentP) * 0.16;

    if (Math.abs(targetP - currentP) < 0.001) {
      currentP = targetP;
      isTicking = false;
    } else {
      requestAnimationFrame(renderTextReveal);
    }

    // Word illumination scrub across progress range 0.04 -> 0.75
    for (let i = 0; i < totalWords; i++) {
      const start = 0.04 + (i / totalWords) * 0.65;
      const end = start + 0.10;
      let wP = (currentP - start) / (end - start);
      wP = Math.max(0, Math.min(1, wP));

      const opacity = 0.22 + 0.78 * wP;
      const translateY = (1 - wP) * 4;

      wordEls[i].style.opacity = opacity.toFixed(2);
      wordEls[i].style.transform = `translateY(${translateY.toFixed(1)}px)`;
      if (wP >= 0.85) {
        wordEls[i].style.color = 'var(--content--primary)';
      } else {
        wordEls[i].style.color = '';
      }
    }

    // Button reveal
    if (btn) {
      const btnP = Math.max(0, Math.min(1, (currentP - 0.60) / 0.22));
      btn.style.opacity = (0.25 + 0.75 * btnP).toFixed(2);
      btn.style.transform = `translateY(${((1 - btnP) * 8).toFixed(1)}px)`;
    }

    // Partner wrap reveal
    if (partnerWrap) {
      const partnerP = Math.max(0, Math.min(1, (currentP - 0.68) / 0.22));
      partnerWrap.style.opacity = (0.30 + 0.70 * partnerP).toFixed(2);
      partnerWrap.style.transform = `translateY(${((1 - partnerP) * 8).toFixed(1)}px)`;
    }
  }

  window.addEventListener('scroll', updateTarget, { passive: true });
  window.addEventListener('resize', updateTarget, { passive: true });

  // Initial calculation and post-loader checks
  updateTarget();
  setTimeout(updateTarget, 300);
  setTimeout(updateTarget, 900);
}

/**
 * Section 2: Client Carousel Controls with Prev/Next buttons & Touch Swiping
 */
function initPartnerCarousel() {
  const list = document.getElementById('partnerLogoList');
  const prevBtn = document.querySelector('.home-intro-control.item-prev');
  const nextBtn = document.querySelector('.home-intro-control.item-next');
  const container = document.querySelector('.home-intro-partner-inner');
  if (!list || !prevBtn || !nextBtn || !container) return;

  const items = list.querySelectorAll('.home-intro-logo-item');
  if (!items.length) return;

  let currentIndex = 0;

  function getStep() {
    const itemWidth = items[0].offsetWidth;
    const visibleCount = Math.max(1, Math.floor(container.offsetWidth / itemWidth));
    const maxIndex = Math.max(0, items.length - visibleCount);
    return { itemWidth, maxIndex };
  }

  function updateCarousel() {
    const { itemWidth, maxIndex } = getStep();
    if (currentIndex > maxIndex) currentIndex = maxIndex;
    if (currentIndex < 0) currentIndex = 0;

    list.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= maxIndex;
  }

  prevBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentIndex > 0) {
      currentIndex--;
      updateCarousel();
    }
  });

  nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const { maxIndex } = getStep();
    if (currentIndex < maxIndex) {
      currentIndex++;
      updateCarousel();
    }
  });

  // Mobile touch swipe support
  let startX = 0;
  let isSwiping = false;

  container.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isSwiping = true;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    isSwiping = false;
    const deltaX = e.changedTouches[0].clientX - startX;
    if (deltaX < -35) {
      nextBtn.click();
    } else if (deltaX > 35) {
      prevBtn.click();
    }
  }, { passive: true });

  window.addEventListener('resize', updateCarousel);
  updateCarousel();
}

/**
 * Section 4: Interactive Use Cases Accordion
 */
function initUseCaseAccordion() {
  const items = document.querySelectorAll('.home-usecase-faq-item');
  if (!items.length) return;

  items.forEach((item) => {
    const titleWrap = item.querySelector('.home-usecase-faq-item-title-wrap');
    if (!titleWrap) return;

    titleWrap.addEventListener('click', () => {
      const isAlreadyActive = item.classList.contains('active');

      // Close all accordion rows
      items.forEach((other) => other.classList.remove('active'));

      // If clicked item was closed, open it
      if (!isAlreadyActive) {
        item.classList.add('active');
      }
    });
  });
}

/**
 * Section 3: Clean Architectural Scroll Reveal for Problem Cards
 */
function initProblemsCardsScroll() {
  const cards = document.querySelectorAll('.home-problems-card');
  if (!cards.length) return;

  function checkReveal() {
    const triggerBottom = window.innerHeight * 0.90;
    cards.forEach((card) => {
      if (card.classList.contains('is-revealed')) return;
      const rect = card.getBoundingClientRect();
      if (rect.top <= triggerBottom) {
        card.classList.add('is-revealed');
      }
    });
  }

  // Activate animation class only via JS to ensure fallback visibility
  cards.forEach((card) => {
    card.classList.add('problem-card-animate');
  });

  // Use IntersectionObserver if available
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px 50px 0px'
    });

    cards.forEach((card) => observer.observe(card));
  }

  // Fallback scroll and resize listener
  window.addEventListener('scroll', checkReveal, { passive: true });
  window.addEventListener('resize', checkReveal, { passive: true });

  // Initial checks
  checkReveal();
  setTimeout(checkReveal, 350);
  setTimeout(checkReveal, 950);
}




