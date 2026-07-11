// ===========================================================
// MZ TV — shared behaviour: scroll reveals, mobile nav, misc UI
// ===========================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Mobile nav toggle ---------- */
  const toggle = document.querySelector('.nav__toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('is-open');
      toggle.textContent = nav.classList.contains('is-open') ? '✕' : '☰';
    });
  }

  /* ---------- Scroll reveal animations ---------- */
  const revealEls = document.querySelectorAll(
    '.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-clip'
  );

  // Assign stagger index within each parent that has .stagger
  document.querySelectorAll('.stagger').forEach(group => {
    Array.from(group.children).forEach((child, i) => {
      child.style.setProperty('--i', i);
    });
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- Sticky header shadow on scroll ---------- */
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.boxShadow = window.scrollY > 10
        ? '0 12px 30px -20px rgba(0,0,0,.8)'
        : 'none';
    }, { passive: true });
  }

  /* ---------- Active nav link highlight ---------- */
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__links a').forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    if (href === path) a.classList.add('active');
  });

  /* ---------- Background image carousels (hero + today's matches) ---------- */
  function mzInitBgCarousel(containerId, layerSelector, intervalMs) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const layers = container.querySelectorAll(layerSelector);
    if (layers.length < 2) return;
    let idx = Array.from(layers).findIndex(l => l.classList.contains('is-active'));
    if (idx === -1) idx = 0;
    setInterval(() => {
      layers[idx].classList.remove('is-active');
      idx = (idx + 1) % layers.length;
      layers[idx].classList.add('is-active');
    }, intervalMs);
  }

  mzInitBgCarousel('heroBgCarousel', '.hero__bg', 6000);
  mzInitBgCarousel('matchesBg', '.matches-bg__layer', 4000);
});
