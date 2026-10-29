'use strict';
const config = window.SITE_CONFIG || {};
const phone = String(config.whatsapp || '').replace(/\D/g, '');
const hasWhatsApp = /^\d{12,15}$/.test(phone);
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu({restoreFocus = false} = {}) {
  const wasOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.querySelector('.sr-only').textContent = 'Abrir menu';
  navigation.classList.remove('open');
  if (wasOpen && restoreFocus) menuToggle.focus({preventScroll:true});
}
menuToggle.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(expanded)); menuToggle.querySelector('.sr-only').textContent = expanded ? 'Fechar menu' : 'Abrir menu'; navigation.classList.toggle('open', expanded);
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const wasOpen = navigation.classList.contains('open');
  closeMenu();
  if (!wasOpen) return;
  const section = document.querySelector(link.getAttribute('href'));
  const heading = section?.querySelector('h1, h2');
  if (heading) {
    heading.tabIndex = -1;
    // Let the native anchor update the URL and scroll before moving focus.
    requestAnimationFrame(() => heading.focus({preventScroll:true}));
  }
}));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) {
    event.preventDefault();
    closeMenu({restoreFocus:true});
  }
});
const header = menuToggle.closest('.header');
header.querySelector('.brand').addEventListener('click', () => closeMenu());
document.addEventListener('click', event => {
  if (!header.contains(event.target)) closeMenu();
});
document.addEventListener('focusin', event => {
  if (!header.contains(event.target)) closeMenu();
});
window.matchMedia('(max-width: 980px)').addEventListener('change', event => {
  const focusWasInNavigation = navigation.contains(document.activeElement);
  closeMenu();
  if (event.matches && focusWasInNavigation) menuToggle.focus({preventScroll:true});
});

const privacyDialog = document.querySelector('#privacy-dialog');
let focusReturn = null;
function openDialog(dialog) { focusReturn = document.activeElement; dialog.showModal(); document.body.classList.add('modal-open'); }
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.modal-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { const b = dialog.getBoundingClientRect(); if(event.target === dialog && (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom)) dialog.close(); });
  dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); focusReturn?.focus({preventScroll:true}); });
});
document.querySelector('.privacy-button').addEventListener('click', event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openDialog(privacyDialog);
});

const whatsappLink = document.querySelector('.whatsapp-cta');
if (hasWhatsApp) {
  whatsappLink.href = `https://wa.me/${phone}?text=${encodeURIComponent('Olá, Davi! Gostaria de conversar sobre uma obra com a Davi Guedes Engenharia.')}`;
  whatsappLink.target = '_blank'; whatsappLink.rel = 'noopener noreferrer';
  document.querySelector('[data-contact="phone"]').href = `tel:+${phone}`;
  if (/^55\d{11}$/.test(phone)) document.querySelector('[data-contact="phone"]').textContent = `(${phone.slice(2,4)}) ${phone.slice(4,9)}-${phone.slice(9)}`;
}
if (config.email) {
  const emailLink = document.querySelector('[data-contact="email"]');
  emailLink.href = `mailto:${config.email}`;
  emailLink.textContent = config.email;
}
if (config.instagram && /^https:\/\/(www\.)?instagram\.com\//.test(config.instagram)) document.querySelector('[data-contact="instagram"]').href = config.instagram;
for (const field of ['legalName', 'cnpj']) {
  if (config[field]) document.querySelector(`[data-company="${field}"]`).textContent = config[field];
}

// Project photographs supplied and identified by the client as works by Davi Guedes.
const photoDialog = document.querySelector('#photo-dialog');
const photoImage = document.querySelector('#photo-full');
const photoButtons = [...document.querySelectorAll('[data-photo]')];
const photos = window.SITE_WORKS || [];
let currentPhoto = 0;
function displayPhoto(index) {
  currentPhoto = (index + photos.length) % photos.length;
  const photo = photos[currentPhoto];
  window.SITE_IMAGES.set(photoImage, {...photo, sizes: '(min-width: 1550px) 1400px, 92vw'});
  document.querySelector('#photo-title').textContent = photo.title;
  document.querySelector('#photo-count').textContent = `${String(currentPhoto + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
  photoDialog.classList.remove('photo-changing');
  requestAnimationFrame(() => photoDialog.classList.add('photo-changing'));
}
photoButtons.forEach(card => card.addEventListener('click', () => { displayPhoto(Number(card.dataset.photo)); openDialog(photoDialog); }));
document.querySelector('#photo-prev').addEventListener('click', () => displayPhoto(currentPhoto - 1));
document.querySelector('#photo-next').addEventListener('click', () => displayPhoto(currentPhoto + 1));
document.addEventListener('keydown', event => {
  if (!photoDialog.open) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); displayPhoto(currentPhoto + (event.key === 'ArrowRight' ? 1 : -1)); }
});


// An editorial contact sheet: no automatic slideshow and no invented project metadata.
const workMain = document.querySelector('.work-main');
const workImage = document.querySelector('#work-image');
const workThumbs = [...document.querySelectorAll('[data-work]')];
let selectedWork = 0;
let selectionVersion = 0;
function selectWork(index, moveFocus = false) {
  selectedWork = (index + photos.length) % photos.length;
  const photo = photos[selectedWork];
  const version = ++selectionVersion;
  workThumbs.forEach((button, i) => {
    button.setAttribute('aria-pressed', String(i === selectedWork));
    button.tabIndex = i === selectedWork ? 0 : -1;
  });
  if (moveFocus) workThumbs[selectedWork].focus({preventScroll:true});
  const strip = document.querySelector('.work-thumbs');
  if (strip.scrollWidth > strip.clientWidth) {
    const thumb = workThumbs[selectedWork];
    const left = strip.scrollLeft + thumb.getBoundingClientRect().left - strip.getBoundingClientRect().left - (strip.clientWidth - thumb.clientWidth) / 2;
    strip.scrollTo({left,behavior:'instant'});
  }
  const preview = new Image();
  window.SITE_IMAGES.set(preview, {...photo, sizes: workImage.sizes});
  const apply = () => {
    if (version !== selectionVersion) return;
    workMain.dataset.photo = String(selectedWork);
    workMain.setAttribute('aria-label', `Ampliar imagem: ${photo.title}`);
    window.SITE_IMAGES.set(workImage, {...photo, sizes: workImage.sizes});
    document.querySelector('#work-number').textContent = String(selectedWork + 1);
    document.querySelector('#work-category').textContent = photo.category;
    document.querySelector('#work-title').textContent = photo.title;
    document.querySelector('#work-detail').textContent = photo.detail;
    document.querySelector('#work-announcement').textContent = `Imagem ${selectedWork + 1} de ${photos.length}: ${photo.title}`;
    workMain.classList.remove('is-changing');
    workMain.removeAttribute('aria-busy');
  };
  workMain.classList.add('is-changing');
  workMain.setAttribute('aria-busy', 'true');
  preview.decode().then(apply).catch(() => {
    if (version !== selectionVersion) return;
    workMain.classList.remove('is-changing');workMain.removeAttribute('aria-busy');
    document.querySelector('#work-announcement').textContent = 'Não foi possível carregar a foto. Selecione outra imagem para continuar.';
  });
}
workThumbs.forEach((button, i) => {
  button.addEventListener('click', () => selectWork(i));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    selectWork(event.key === 'Home' ? 0 : event.key === 'End' ? photos.length - 1 : selectedWork + (event.key === 'ArrowRight' ? 1 : -1), true);
  });
});
document.querySelector('#work-prev').addEventListener('click', () => selectWork(selectedWork - 1));
document.querySelector('#work-next').addEventListener('click', () => selectWork(selectedWork + 1));

// The complete construction sequence stays in the document; tabs expose one phase at a time.
const phaseTabs = [...document.querySelectorAll('.journey-tabs [role="tab"]')];
function selectPhase(index, focus = false) {
  phaseTabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  });
  if (focus) phaseTabs[index].focus({preventScroll: true});
  const strip = document.querySelector('.journey-tabs');
  const selected = phaseTabs[index];
  if (strip.scrollWidth > strip.clientWidth) {
    const offset = selected.getBoundingClientRect().left - strip.getBoundingClientRect().left;
    strip.scrollTo({left: strip.scrollLeft + offset - (strip.clientWidth - selected.clientWidth) / 2, behavior: 'instant'});
  }
}
phaseTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectPhase(index));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? phaseTabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + phaseTabs.length) % phaseTabs.length;
    selectPhase(next, true);
  });
});
