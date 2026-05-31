const preloader = document.querySelector('.preloader');
const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const links = document.querySelectorAll('.nav-links a');
const revealItems = document.querySelectorAll('.reveal, .skill-card');
const typingTarget = document.getElementById('typing');

window.addEventListener('load', () => {
  setTimeout(() => preloader.classList.add('done'), 650);
});

const phrases = [
  'Inbox organized.',
  'Tasks handled.',
  'Clients aided.',
  'Systems updated.'
];

let phraseIndex = 0;
let letterIndex = 0;
let isDeleting = false;

function typeHeroText() {
  if (!typingTarget) return;

  const currentPhrase = phrases[phraseIndex];
  typingTarget.textContent = currentPhrase.slice(0, letterIndex);

  if (!isDeleting && letterIndex < currentPhrase.length) {
    letterIndex += 1;
    setTimeout(typeHeroText, 70);
    return;
  }

  if (!isDeleting && letterIndex === currentPhrase.length) {
    isDeleting = true;
    setTimeout(typeHeroText, 1200);
    return;
  }

  if (isDeleting && letterIndex > 0) {
    letterIndex -= 1;
    setTimeout(typeHeroText, 35);
    return;
  }

  isDeleting = false;
  phraseIndex = (phraseIndex + 1) % phrases.length;
  setTimeout(typeHeroText, 300);
}

if (typingTarget) typeHeroText();

document.addEventListener('mousemove', (event) => {
  document.documentElement.style.setProperty('--mx', `${event.clientX}px`);
  document.documentElement.style.setProperty('--my', `${event.clientY}px`);
});

menuToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

links.forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');

    if (entry.target.classList.contains('skill-card')) {
      entry.target.style.setProperty('--level', entry.target.dataset.level);
    }
  });
}, { threshold: 0.18 });

revealItems.forEach((item) => observer.observe(item));

const sections = document.querySelectorAll('main section[id]');
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    links.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
    });
  });
}, { rootMargin: '-45% 0px -45% 0px' });

sections.forEach((section) => navObserver.observe(section));

// The profile card stays still so only the hero text moves.

window.addEventListener('scroll', () => {
  header.classList.toggle('compact', window.scrollY > 24);
});


const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');

if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const formData = Object.fromEntries(new FormData(contactForm).entries());

    if (submitButton) submitButton.disabled = true;
    if (formStatus) formStatus.textContent = 'Sending your message...';

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Message failed. Please try again.');
      }

      contactForm.reset();
      if (formStatus) formStatus.textContent = 'Message sent. Thank you for reaching out.';
    } catch (error) {
      if (formStatus) formStatus.textContent = error.message;
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

const educationTimeline = document.querySelector('.timeline');
const educationItems = document.querySelectorAll('.timeline-item');

function updateEducationTimeline() {
  if (!educationTimeline) return;

  const rect = educationTimeline.getBoundingClientRect();
  const viewportPoint = window.innerHeight * 0.58;
  const rawProgress = ((viewportPoint - rect.top) / rect.height) * 100;
  const progress = Math.max(0, Math.min(100, rawProgress));

  educationTimeline.style.setProperty('--timeline-progress', `${progress}%`);

  educationItems.forEach((item) => {
    const itemRect = item.getBoundingClientRect();
    const itemMiddle = itemRect.top + itemRect.height * 0.35;
    item.classList.toggle('timeline-active', itemMiddle < viewportPoint);
  });
}

window.addEventListener('scroll', updateEducationTimeline, { passive: true });
window.addEventListener('resize', updateEducationTimeline);
window.addEventListener('load', updateEducationTimeline);
updateEducationTimeline();
