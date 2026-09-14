const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const preloader = document.querySelector('.preloader');
window.addEventListener('load', () => {
  window.setTimeout(() => preloader?.classList.add('hidden'), prefersReducedMotion ? 0 : 450);
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

// Mobile navigation
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

// Reveal on scroll
const revealItems = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });

revealItems.forEach((item) => revealObserver.observe(item));

// Active navigation state
const navLinks = [...document.querySelectorAll('.nav a')];
const navSections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
    });
  });
}, { rootMargin: '-38% 0px -50% 0px', threshold: 0.01 });

navSections.forEach((section) => sectionObserver.observe(section));

// Scroll-linked floating elements
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
    const offset = Math.max(-32, Math.min(32, distance * speed * -0.12));
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

// Subtle 3D tilt. Kept intentionally restrained for a corporate feel.
function addTilt(element, strength = 5) {
  if (!element || prefersReducedMotion || !window.matchMedia('(pointer:fine)').matches) return;

  element.addEventListener('pointermove', (event) => {
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    element.style.transform = `rotateY(${x * strength}deg) rotateX(${y * -strength}deg)`;
  });

  element.addEventListener('pointerleave', () => {
    element.style.transform = '';
  });
}

addTilt(document.getElementById('portraitShell'), 7);
document.querySelectorAll('.tilt-surface').forEach((surface) => addTilt(surface, 3.5));

// Magnetic buttons
if (!prefersReducedMotion && window.matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll('.magnetic').forEach((button) => {
    button.addEventListener('pointermove', (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate(${x * 0.07}px, ${y * 0.08}px) translateY(-2px)`;
    });
    button.addEventListener('pointerleave', () => {
      button.style.transform = '';
    });
  });
}

// Video reel desktop controls
const reelWindow = document.getElementById('reelWindow');
const reelTrack = document.getElementById('reelTrack');
const reelPrev = document.getElementById('reelPrev');
const reelNext = document.getElementById('reelNext');
let reelOffset = 0;

function getReelStep() {
  const card = reelTrack?.querySelector('.video-card');
  if (!card) return 408;
  const gap = parseFloat(getComputedStyle(reelTrack).gap || 18);
  return card.getBoundingClientRect().width + gap;
}

function getMaxReelOffset() {
  if (!reelTrack || !reelWindow) return 0;
  return Math.max(0, reelTrack.scrollWidth - reelWindow.clientWidth);
}

function renderReel() {
  if (!reelTrack || window.innerWidth <= 680) return;
  reelOffset = Math.max(0, Math.min(reelOffset, getMaxReelOffset()));
  reelTrack.style.transform = `translateX(${-reelOffset}px)`;
}

reelNext?.addEventListener('click', () => {
  reelOffset += getReelStep();
  renderReel();
});

reelPrev?.addEventListener('click', () => {
  reelOffset -= getReelStep();
  renderReel();
});

window.addEventListener('resize', renderReel);

// Mouse-wheel horizontal movement only while holding Shift, to avoid hijacking page scroll.
reelWindow?.addEventListener('wheel', (event) => {
  if (window.innerWidth <= 680 || !event.shiftKey) return;
  event.preventDefault();
  reelOffset += event.deltaY || event.deltaX;
  renderReel();
}, { passive: false });

// System map activates as it enters the viewport.
const systemMap = document.getElementById('systemMap');
if (systemMap) {
  const systemObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => systemMap.classList.toggle('active', entry.isIntersecting));
  }, { threshold: 0.35 });
  systemObserver.observe(systemMap);
}


// Employment timeline progress and active milestones.
const employmentTimeline = document.getElementById('employmentTimeline');
const employmentItems = document.querySelectorAll('.employment-item');

function updateEmploymentTimeline() {
  if (!employmentTimeline || !employmentItems.length) return;

  const rect = employmentTimeline.getBoundingClientRect();
  const viewportPoint = window.innerHeight * 0.58;
  const rawProgress = ((viewportPoint - rect.top) / Math.max(1, rect.height)) * 100;
  const progress = Math.max(0, Math.min(100, rawProgress));
  employmentTimeline.style.setProperty('--employment-progress', `${progress}%`);

  employmentItems.forEach((item) => {
    const itemRect = item.getBoundingClientRect();
    const activationPoint = itemRect.top + Math.min(itemRect.height * 0.22, 120);
    item.classList.toggle('timeline-active', activationPoint < viewportPoint);
  });
}

window.addEventListener('scroll', updateEmploymentTimeline, { passive: true });
window.addEventListener('resize', updateEmploymentTimeline);
window.addEventListener('load', updateEmploymentTimeline);
updateEmploymentTimeline();

// Contact form with friendly public-facing errors.
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
let statusTimer;

function setFormStatus(message = '', type = '') {
  if (!formStatus) return;
  window.clearTimeout(statusTimer);
  formStatus.textContent = message;
  formStatus.className = `form-status${type ? ` ${type}` : ''}`;

  if (message && type !== 'sending') {
    statusTimer = window.setTimeout(() => {
      formStatus.textContent = '';
      formStatus.className = 'form-status';
    }, 6500);
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

contactForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const submitButton = contactForm.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(contactForm).entries());

  if (!String(data.name || '').trim() || !String(data.email || '').trim() || !String(data.service || '').trim() || !String(data.message || '').trim()) {
    setFormStatus('Please complete all fields before sending.', 'error');
    return;
  }

  if (!isValidEmail(String(data.email))) {
    setFormStatus('Please enter a valid email address.', 'error');
    return;
  }

  if (submitButton) submitButton.disabled = true;
  setFormStatus('Sending your inquiry…', 'sending');

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    let result = {};
    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!response.ok) {
      if (response.status === 400) {
        setFormStatus(result.message || 'Please check your details and try again.', 'error');
        return;
      }
      throw new Error(`Unexpected response: ${response.status}`);
    }

    contactForm.reset();
    setFormStatus('Thanks. Your project inquiry has been sent.', 'success');
  } catch (error) {
    console.error('Contact form error:', error);
    setFormStatus('Unable to send right now. Please try again in a moment.', 'error');
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});
