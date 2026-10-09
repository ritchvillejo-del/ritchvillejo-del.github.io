const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const preloader = document.querySelector('.preloader');
window.addEventListener('load', () => {
  window.setTimeout(() => preloader?.classList.add('hidden'), prefersReducedMotion ? 0 : 350);
});

const progressBar = document.querySelector('.scroll-progress i');
const header = document.getElementById('siteHeader');
const pointerGlow = document.querySelector('.pointer-glow');

function updateScrollUI() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
  if (progressBar) progressBar.style.width = `${progress}%`;
  header?.classList.toggle('scrolled', window.scrollY > 24);
}
window.addEventListener('scroll', updateScrollUI, { passive: true });
updateScrollUI();

if (!prefersReducedMotion && pointerGlow && window.matchMedia('(pointer:fine)').matches) {
  window.addEventListener('pointermove', (event) => {
    pointerGlow.style.left = `${event.clientX}px`;
    pointerGlow.style.top = `${event.clientY}px`;
  }, { passive: true });
} else if (pointerGlow) {
  pointerGlow.style.display = 'none';
}

const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');
function closeMenu() {
  nav?.classList.remove('open');
  document.body.classList.remove('menu-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}
menuToggle?.addEventListener('click', () => {
  const isOpen = nav?.classList.toggle('open');
  document.body.classList.toggle('menu-open', Boolean(isOpen));
  menuToggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
});
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

const revealItems = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
revealItems.forEach((item) => revealObserver.observe(item));

const navLinks = [...document.querySelectorAll('.nav a')];
const navSections = navLinks.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
  });
}, { rootMargin: '-36% 0px -54% 0px', threshold: 0.01 });
navSections.forEach((section) => sectionObserver.observe(section));

const parallaxItems = [...document.querySelectorAll('[data-parallax]')];
let parallaxTicking = false;
function updateParallax() {
  if (prefersReducedMotion) return;
  const viewportMid = window.innerHeight / 2;
  parallaxItems.forEach((item) => {
    const speed = Number(item.dataset.parallax || 0);
    const rect = item.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const distance = (rect.top + rect.height / 2) - viewportMid;
    const offset = Math.max(-30, Math.min(30, distance * speed * -0.11));
    item.style.translate = `0 ${offset}px`;
  });
  parallaxTicking = false;
}
window.addEventListener('scroll', () => {
  if (!parallaxTicking) {
    parallaxTicking = true;
    requestAnimationFrame(updateParallax);
  }
}, { passive: true });
updateParallax();

function addTilt(element, strength = 4) {
  if (!element || prefersReducedMotion || !window.matchMedia('(pointer:fine)').matches) return;
  element.addEventListener('pointermove', (event) => {
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    element.style.transform = `rotateY(${x * strength}deg) rotateX(${y * -strength}deg)`;
  });
  element.addEventListener('pointerleave', () => { element.style.transform = ''; });
}
addTilt(document.getElementById('portraitShell'), 6);
document.querySelectorAll('.tilt-surface').forEach((surface) => addTilt(surface, 3.5));

if (!prefersReducedMotion && window.matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll('.magnetic').forEach((button) => {
    button.addEventListener('pointermove', (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate(${x * 0.05}px, ${y * 0.06}px) translateY(-2px)`;
    });
    button.addEventListener('pointerleave', () => { button.style.transform = ''; });
  });
}

// Workflow screenshot lightbox
const workflowLightbox = document.getElementById('workflowLightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxClose = document.getElementById('lightboxClose');

function closeLightbox() {
  workflowLightbox?.classList.remove('open');
  workflowLightbox?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-workflow-image]').forEach((card) => {
  card.addEventListener('click', () => {
    if (!workflowLightbox || !lightboxImage) return;
    lightboxImage.src = card.dataset.workflowImage || '';
    if (lightboxTitle) lightboxTitle.textContent = card.dataset.workflowTitle || 'Workflow';
    workflowLightbox.classList.add('open');
    workflowLightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  });
});
lightboxClose?.addEventListener('click', closeLightbox);
workflowLightbox?.addEventListener('click', (event) => { if (event.target === workflowLightbox) closeLightbox(); });
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeLightbox(); });

// Video reel
const reelWindow = document.getElementById('reelWindow');
const reelTrack = document.getElementById('reelTrack');
const reelPrev = document.getElementById('reelPrev');
const reelNext = document.getElementById('reelNext');
let reelOffset = 0;
function getReelStep() {
  const card = reelTrack?.querySelector('.video-card');
  if (!card) return 408;
  const gap = parseFloat(getComputedStyle(reelTrack).gap || 16);
  return card.getBoundingClientRect().width + gap;
}
function getMaxReelOffset() {
  if (!reelTrack || !reelWindow) return 0;
  return Math.max(0, reelTrack.scrollWidth - reelWindow.clientWidth);
}
function renderReel() {
  if (!reelTrack || window.innerWidth <= 640) return;
  reelOffset = Math.max(0, Math.min(reelOffset, getMaxReelOffset()));
  reelTrack.style.transform = `translateX(${-reelOffset}px)`;
}
reelNext?.addEventListener('click', () => { reelOffset += getReelStep(); renderReel(); });
reelPrev?.addEventListener('click', () => { reelOffset -= getReelStep(); renderReel(); });
window.addEventListener('resize', renderReel);

// Employment timeline
const employmentTimeline = document.getElementById('employmentTimeline');
const employmentItems = document.querySelectorAll('.employment-item');
function updateEmploymentTimeline() {
  if (!employmentTimeline || !employmentItems.length) return;
  const rect = employmentTimeline.getBoundingClientRect();
  const viewportPoint = window.innerHeight * 0.6;
  const rawProgress = ((viewportPoint - rect.top) / Math.max(1, rect.height)) * 100;
  const progress = Math.max(0, Math.min(100, rawProgress));
  employmentTimeline.style.setProperty('--employment-progress', `${progress}%`);
  employmentItems.forEach((item) => {
    const itemRect = item.getBoundingClientRect();
    item.classList.toggle('timeline-active', itemRect.top + 80 < viewportPoint);
  });
}
window.addEventListener('scroll', updateEmploymentTimeline, { passive: true });
window.addEventListener('resize', updateEmploymentTimeline);
window.addEventListener('load', updateEmploymentTimeline);
updateEmploymentTimeline();

// Contact form
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
const formStartedAt = document.getElementById('formStartedAt');
let statusTimer;
if (formStartedAt) formStartedAt.value = String(Date.now());

function setFormStatus(message = '', type = '') {
  if (!formStatus) return;
  window.clearTimeout(statusTimer);
  formStatus.textContent = message;
  formStatus.className = `form-status${type ? ` ${type}` : ''}`;
  if (message && type !== 'sending') {
    statusTimer = window.setTimeout(() => {
      formStatus.textContent = '';
      formStatus.className = 'form-status';
    }, 8000);
  }
}
function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value); }

contactForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(contactForm).entries());

  if (!String(data.name || '').trim() || !String(data.email || '').trim() || !String(data.service || '').trim() || !String(data.message || '').trim()) {
    setFormStatus('Please complete all required fields before sending.', 'error'); return;
  }
  if (!isValidEmail(String(data.email))) { setFormStatus('Please enter a valid email address.', 'error'); return; }
  if (String(data.message || '').trim().length < 20) { setFormStatus('Please add a little more detail about the project or system.', 'error'); return; }

  if (submitButton) submitButton.disabled = true;
  setFormStatus('Sending your inquiry…', 'sending');

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data)
    });
    let result = {};
    try { result = await response.json(); } catch {}
    if (!response.ok) {
      if ([400, 429, 503].includes(response.status)) {
        setFormStatus(result.message || 'Please check your details and try again.', 'error');
        return;
      }
      throw new Error(`Unexpected response: ${response.status}`);
    }
    contactForm.reset();
    if (formStartedAt) formStartedAt.value = String(Date.now());
    setFormStatus(result.message || 'Thanks. Your inquiry has been sent.', 'success');
  } catch (error) {
    console.error('Contact form error:', error);
    setFormStatus('Unable to send right now. Please try again, or use the direct email link.', 'error');
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});
