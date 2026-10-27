/* =====================================================================
   NEW NAILS — Brest · mise en scène (GSAP + ScrollTrigger + Lenis)
   Règles : easings doux (expo / power3), transform + opacity en priorité,
   version allégée sur mobile, respect de prefers-reduced-motion.
   Si GSAP n'est pas chargé, le site reste lisible (classe .js retirée).
   ===================================================================== */
(() => {
  'use strict';

  const html = document.documentElement;
  if (!window.gsap || !window.ScrollTrigger) { html.classList.remove('js'); return; }

  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------- Utilitaires ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const NS = 'http://www.w3.org/2000/svg';
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* ---------- Découpage de texte ---------- */
  // Mots : chaque mot est masqué (.sw) et son contenu (.sw__i) peut monter.
  function splitWords(el) {
    const inners = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/([ \t\n\r]+)/).forEach((part) => {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'sw';
            const i = document.createElement('span'); i.className = 'sw__i'; i.textContent = part;
            w.appendChild(i); frag.appendChild(w); inners.push(i);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && !child.hasAttribute('data-word-unit')) {
          walk(child);
        }
      });
    };
    walk(el);
    return inners;
  }

  // Lettres : copie lisible pour les lecteurs d'écran + version visuelle aria-hidden.
  function splitChars(el) {
    const text = el.textContent;
    el.textContent = '';
    const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = text;
    const vis = document.createElement('span'); vis.className = 'chars'; vis.setAttribute('aria-hidden', 'true');
    const chars = [];
    const masks = [];
    text.split(' ').forEach((word, wi, arr) => {
      const w = document.createElement('span'); w.className = 'scw';
      Array.from(word).forEach((ch) => {
        const m = document.createElement('span'); m.className = 'scm';
        const c = document.createElement('span'); c.className = 'sc'; c.textContent = ch;
        m.appendChild(c); w.appendChild(m); chars.push(c); masks.push(m);
      });
      vis.appendChild(w);
      if (wi < arr.length - 1) vis.appendChild(document.createTextNode(' '));
    });
    el.append(sr, vis);
    return { chars, masks };
  }

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  html.style.overflow = 'hidden'; // pendant le loader

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: easeOutQuart });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- Menu mobile ---------- */
  const header = $('[data-header]');
  const menu = $('[data-menu]');
  const burger = $('.burger');
  let menuOpen = false;

  function openMenu() {
    if (menuOpen) return;
    menuOpen = true;
    menu.classList.add('is-open');
    html.classList.add('menu-open');
    menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Fermer le menu');
    lenis && lenis.stop();
    html.style.overflow = 'hidden';
    gsap.fromTo('.menu__panel', { yPercent: -125 }, { yPercent: 0, duration: reduce ? 0.01 : 1.1, ease: 'expo.out' });
    gsap.fromTo('.menu__t', { yPercent: 120, rotation: 5 }, { yPercent: 0, rotation: 0, duration: reduce ? 0.01 : 1.2, ease: 'expo.out', stagger: 0.06, delay: reduce ? 0 : 0.2 });
    gsap.fromTo('.menu__foot', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: reduce ? 0.01 : 0.9, ease: 'expo.out', delay: reduce ? 0 : 0.5 });
    gsap.to(header, { yPercent: 0, duration: 0.4, overwrite: 'auto' });
    const first = $('.menu__nav a');
    first && setTimeout(() => first.focus({ preventScroll: true }), 350);
  }

  function closeMenu(fast) {
    if (!menuOpen) return;
    menuOpen = false;
    html.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Ouvrir le menu');
    lenis ? lenis.start() : (html.style.overflow = '');
    if (lenis) html.style.overflow = '';
    gsap.to('.menu__panel', {
      yPercent: -125, duration: fast || reduce ? 0.01 : 0.85, ease: 'expo.inOut',
      onComplete: () => { menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true'); },
    });
  }

  burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { closeMenu(); burger.focus(); } });
  matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) closeMenu(true); });

  /* ---------- Ancres ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu(true);
    if (id === '#top') { lenis ? lenis.scrollTo(0, { duration: 1.8, easing: easeOutQuart }) : window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }
    else { scrollToTarget(target); }
    history.replaceState(null, '', id);
    if (id !== '#top') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  });

  /* ---------- Découpe des titres (avant tout ScrollTrigger) ---------- */
  const heroChars = $$('.hero [data-chars]').flatMap((el) => splitChars(el).chars);
  const ctaPhone = $('.cta [data-chars]') ? splitChars($('.cta [data-chars]')) : { chars: [], masks: [] };
  const footerWord = $('[data-footer-word] [data-chars]') ? splitChars($('[data-footer-word] [data-chars]')) : { chars: [], masks: [] };
  const headings = reduce ? [] : $$('[data-words]').filter((el) => !el.classList.contains('manifesto__text')).map((el) => ({ el, words: splitWords(el) }));
  const manifesto = $('.manifesto__text');
  const manifestoWords = manifesto && !reduce ? splitWords(manifesto) : [];

  /* ---------- Intro du hero (construite en pause, jouée après le loader) ---------- */
  function buildHeroIntro() {
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    tl.from(heroChars, { yPercent: 125, rotation: 8, duration: 1.6, stagger: 0.07 }, 0)
      .to('.hero .frame__curtain', { scaleY: 0, duration: 1.5, stagger: 0.18, ease: 'expo.inOut' }, 0.15)
      .from('.hero .frame img', { scale: 1.45, duration: 2.2, stagger: 0.18 }, 0.15)
      .from('.hero__lead', { y: 38, opacity: 0, duration: 1.3 }, 0.7)
      .from('.hero__cta .btn', { y: 38, opacity: 0, duration: 1.2, stagger: 0.1 }, 0.85)
      .from('.hero__sparks > *', { scale: 0, opacity: 0, duration: 1.3, stagger: 0.08, ease: 'back.out(2.2)' }, 0.8)
      .from('.badge', { scale: 0, rotation: -140, duration: 1.5 }, 0.9)
      .from('.hero__scroll', { opacity: 0, y: 24, duration: 1.1 }, 1.3)
      .from('.hero .echo', { opacity: 0, duration: 1.8 }, 0.4)
      .from(header, { yPercent: -170, duration: 1.3 }, 0.55);
    return tl;
  }
  const heroIntro = reduce ? null : buildHeroIntro();

  /* ---------- Loader ---------- */
  function preload() {
    const imgs = $$('.hero img').map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()));
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve();
    return Promise.race([Promise.all([...imgs, fonts]), new Promise((r) => setTimeout(r, 4500))]);
  }

  function runLoader() {
    const loader = $('[data-loader]');
    return new Promise((resolve) => {
      if (!loader || reduce) {
        loader && loader.remove();
        heroIntro && heroIntro.progress(1);
        html.style.overflow = '';
        lenis && lenis.start();
        return resolve();
      }
      const nail = $('[data-loader-nail]', loader);
      const num = $('[data-loader-num]', loader);
      const liquid = $('.loader__liquid', loader);
      const wave = $('.loader__wave', loader);
      const fill = $('.loader__fill', loader);
      const stroke = $('.loader__stroke', loader);
      const chrome = $$('.loader__brand, .loader__foot, .loader__count', loader);
      const counter = { v: 0 };
      const paint = () => { num.textContent = Math.round(counter.v); };

      gsap.set(liquid, { y: 150 });
      gsap.to(wave, { x: -80, duration: 1.1, ease: 'none', repeat: -1 });

      const phase1 = gsap.timeline();
      phase1
        .from(nail, { scale: 0.7, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0)
        .from(chrome, { opacity: 0, y: 12, duration: 0.8, stagger: 0.1, ease: 'expo.out' }, 0.15)
        .to(liquid, { y: 64, duration: 1.3, ease: 'power2.out' }, 0.25)
        .to(counter, { v: 64, duration: 1.3, ease: 'power2.out', onUpdate: paint }, 0.25);

      const phase1Done = new Promise((r) => phase1.eventCallback('onComplete', r));

      Promise.all([phase1Done, preload()]).then(() => {
        const phase2 = gsap.timeline({
          onComplete: () => {
            loader.remove();
            html.style.overflow = '';
            lenis && lenis.start();
            resolve();
          },
        });
        phase2
          .to(liquid, { y: -18, duration: 0.8, ease: 'power2.inOut' }, 0)
          .to(counter, { v: 100, duration: 0.8, ease: 'power2.inOut', onUpdate: paint }, 0)
          .to(chrome, { opacity: 0, duration: 0.35, ease: 'power2.out' }, 0.9)
          .to(stroke, { opacity: 0, duration: 0.3 }, 0.9)
          .to(fill, { fill: '#F7EEEF', duration: 0.5, ease: 'power1.inOut' }, 0.9)
          .to(nail, { scale: 48, duration: 1.35, ease: 'expo.in' }, 1.0)
          .add(() => heroIntro && heroIntro.play(), 1.75)
          .to(loader, { opacity: 0, duration: 0.5, ease: 'power1.out' }, 2.15);
      });
    });
  }

  /* ---------- Barre de progression + en-tête (cache / réapparaît) ---------- */
  function initChrome() {
    gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

    let hidden = false;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        if (menuOpen) return;
        const y = self.scroll();
        if (self.direction === 1 && y > 180 && !hidden) {
          hidden = true;
          gsap.to(header, { yPercent: -170, duration: 0.8, ease: 'power3.inOut', overwrite: 'auto' });
        } else if ((self.direction === -1 || y <= 180) && hidden) {
          hidden = false;
          gsap.to(header, { yPercent: 0, duration: 0.9, ease: 'expo.out', overwrite: 'auto' });
        }
      },
    });

    // bouton flottant mobile : visible après le hero, masqué pendant l'appel à l'action
    const fab = $('[data-fab]');
    if (fab) {
      let past = false, onCta = false;
      const sync = () => fab.classList.toggle('is-on', past && !onCta && !menuOpen);
      ScrollTrigger.create({ trigger: '.hero', start: 'bottom 70%', end: 'max', onToggle: (s) => { past = s.isActive; sync(); } });
      ScrollTrigger.create({ trigger: '#rendez-vous', start: 'top 75%', end: 'bottom top', onToggle: (s) => { onCta = s.isActive; sync(); } });
    }
  }

  /* ---------- Curseur ---------- */
  function initCursor() {
    if (!finePointer || reduce) return;
    const cur = $('.cursor'); const ring = $('.cursor__ring', cur); const label = $('.cursor__label', cur);
    const xTo = gsap.quickTo(cur, 'x', { duration: 0.4, ease: 'power3' });
    const yTo = gsap.quickTo(cur, 'y', { duration: 0.4, ease: 'power3' });
    let shown = false;
    window.addEventListener('pointermove', (e) => {
      if (!shown) { shown = true; gsap.set(cur, { x: e.clientX, y: e.clientY }); gsap.to(cur, { opacity: 1, duration: 0.5 }); }
      xTo(e.clientX); yTo(e.clientY);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { shown = false; gsap.to(cur, { opacity: 0, duration: 0.3 }); });

    const SEL = 'a, button, label, [data-cursor]';
    const reset = () => {
      cur.classList.remove('is-hover', 'has-label');
      gsap.to(ring, { scale: 1, duration: 0.6, ease: 'expo.out' });
      gsap.to(label, { opacity: 0, duration: 0.2 });
    };
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest(SEL);
      if (!t) return;
      const holder = t.closest('[data-cursor]');
      cur.classList.add('is-hover');
      if (holder) {
        label.textContent = holder.dataset.cursor;
        cur.classList.add('has-label');
        gsap.to(ring, { scale: 2.9, duration: 0.6, ease: 'expo.out' });
        gsap.to(label, { opacity: 1, duration: 0.3, delay: 0.1 });
      } else {
        gsap.to(ring, { scale: 1.7, duration: 0.5, ease: 'expo.out' });
      }
    });
    document.addEventListener('pointerout', (e) => {
      const t = e.target.closest(SEL);
      if (!t || (e.relatedTarget && t.contains(e.relatedTarget))) return;
      reset();
    });
  }

  /* ---------- Boutons magnétiques + origine du remplissage ---------- */
  function initMagnetic() {
    $$('[data-magnetic]').forEach((el) => {
      const setOrigin = (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--fx', ((e.clientX - r.left) / r.width) * 100 + '%');
        el.style.setProperty('--fy', ((e.clientY - r.top) / r.height) * 100 + '%');
      };
      el.addEventListener('pointerenter', setOrigin);
      el.addEventListener('pointerleave', setOrigin);
      if (!finePointer || reduce) return;
      const xt = gsap.quickTo(el, 'x', { duration: 1, ease: 'elastic.out(1, 0.45)' });
      const yt = gsap.quickTo(el, 'y', { duration: 1, ease: 'elastic.out(1, 0.45)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xt((e.clientX - r.left - r.width / 2) * 0.28);
        yt((e.clientY - r.top - r.height / 2) * 0.38);
      });
      el.addEventListener('pointerleave', () => { xt(0); yt(0); });
    });
  }

  /* ---------- Inclinaison 3D + reflet qui suit la souris ---------- */
  function initTilt() {
    if (!finePointer || reduce) return;
    $$('[data-tilt]').forEach((el) => {
      const max = parseFloat(el.dataset.tilt) || 8;
      const glare = $('.card__glare i', el);
      gsap.set(el, { transformPerspective: 1000 });
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power3' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width; const py = (e.clientY - r.top) / r.height;
        rx((0.5 - py) * max * 2); ry((px - 0.5) * max * 2);
        if (glare) gsap.to(glare, { x: px * r.width, y: py * r.height, opacity: 0.55, duration: 0.4, ease: 'power3', overwrite: 'auto' });
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); glare && gsap.to(glare, { opacity: 0, duration: 0.7, overwrite: 'auto' }); });
    });
  }

  /* ---------- Vague de lettres au survol ---------- */
  function charWave(container, masks, { radius = 170, amp = 26 } = {}) {
    if (!finePointer || reduce || !masks.length) return;
    const to = masks.map((m) => ({ y: gsap.quickTo(m, 'y', { duration: 0.6, ease: 'power3' }), r: gsap.quickTo(m, 'rotation', { duration: 0.6, ease: 'power3' }) }));
    container.addEventListener('pointermove', (e) => {
      masks.forEach((m, i) => {
        const b = m.getBoundingClientRect();
        const d = e.clientX - (b.left + b.width / 2);
        const k = Math.max(0, 1 - Math.abs(d) / radius);
        to[i].y(-k * amp);
        to[i].r(k * (d > 0 ? -4 : 4));
      });
    });
    container.addEventListener('pointerleave', () => to.forEach((t) => { t.y(0); t.r(0); }));
  }

  /* ---------- Hero : parallax multicouche, souris, idle ---------- */
  function initHero(mm) {
    const hero = $('[data-hero]');
    if (!hero || reduce) return;

    mm.add('(min-width: 900px)', () => {
      $$('[data-scroll]', hero).forEach((el) => {
        const f = parseFloat(el.dataset.scroll);
        gsap.to(el, { y: () => f * hero.offsetHeight, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
      });
    });
    mm.add('(max-width: 899px)', () => {
      $$('[data-scroll]', hero).forEach((el) => {
        const f = parseFloat(el.dataset.scroll) * 0.45;
        gsap.to(el, { y: () => f * hero.offsetHeight, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
      });
    });

    if (finePointer) {
      const layers = $$('.px', hero).map((el) => ({
        d: parseFloat(el.dataset.px) || 20,
        x: gsap.quickTo(el, 'x', { duration: 1.3, ease: 'power3' }),
        y: gsap.quickTo(el, 'y', { duration: 1.3, ease: 'power3' }),
      }));
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5; const ny = (e.clientY - r.top) / r.height - 0.5;
        layers.forEach((l) => { l.x(nx * -l.d); l.y(ny * -l.d); });
      });
      hero.addEventListener('pointerleave', () => layers.forEach((l) => { l.x(0); l.y(0); }));
    }

    // vie du hero une fois l'intro jouée : flottement, Ken Burns, étincelles
    const idle = () => {
      $$('.hframe .frame', hero).forEach((f, i) => gsap.to(f, { y: i ? 14 : -14, rotation: i ? -1.6 : 1.4, duration: 4.5 + i * 1.2, ease: 'sine.inOut', repeat: -1, yoyo: true }));
      $$('.hframe img', hero).forEach((img, i) => gsap.to(img, { scale: 1.1, duration: 9 + i * 2, ease: 'sine.inOut', repeat: -1, yoyo: true }));
      $$('.spark, .drop', hero).forEach((s, i) => gsap.to(s, { scale: 1.35, rotation: i % 2 ? 25 : -25, duration: 1.4 + (i % 4) * 0.4, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: i * 0.17 }));
      $$('.drop', hero).forEach((d, i) => gsap.to(d, { x: i ? -10 : 12, duration: 3.4, ease: 'sine.inOut', repeat: -1, yoyo: true }));
    };
    heroIntro && heroIntro.eventCallback('onComplete', idle);
  }

  /* ---------- Bandeaux : vitesse + sens liés au scroll ---------- */
  function initMarquees() {
    const tracks = $$('[data-marquee]');
    if (!tracks.length || reduce) return;
    const state = tracks.map((track) => ({ track, dir: parseFloat(track.dataset.marquee) < 0 ? -1 : 1, x: 0, w: 1 }));

    const build = () => {
      state.forEach((s) => {
        const sets = $$('.band__set', s.track);
        sets.slice(1).forEach((n) => n.remove());
        const first = sets[0];
        s.w = first.offsetWidth || 1;
        const copies = Math.ceil((window.innerWidth * 1.25) / s.w) + 1;
        for (let i = 0; i < copies; i++) { const c = first.cloneNode(true); c.setAttribute('aria-hidden', 'true'); s.track.appendChild(c); }
      });
    };
    build();
    window.addEventListener('resize', debounce(build, 250));

    let active = true; let dirTarget = 1; let dirSmooth = 1;
    ScrollTrigger.create({ trigger: '.bands', start: 'top bottom', end: 'bottom top', onToggle: (s) => { active = s.isActive; } });
    const watcher = ScrollTrigger.create({ start: 0, end: 'max' });

    gsap.ticker.add((time, dt) => {
      if (!active) return;
      const vel = watcher.getVelocity();
      if (vel > 30) dirTarget = 1; else if (vel < -30) dirTarget = -1;
      dirSmooth += (dirTarget - dirSmooth) * 0.06;
      const speed = 70 + Math.min(Math.abs(vel) * 0.28, 900);
      state.forEach((s) => {
        s.x += s.dir * dirSmooth * speed * (dt / 1000);
        gsap.set(s.track, { x: gsap.utils.wrap(-s.w, 0, s.x) });
      });
    });
  }

  /* ---------- Manifeste : mots qui s'allument au scroll ---------- */
  function initManifesto() {
    if (!manifesto || reduce) return;
    const units = $$('.sw__i, [data-word-unit]', manifesto);
    gsap.fromTo(units, { opacity: 0.2 }, {
      opacity: 1, ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: manifesto, start: 'top 82%', end: 'bottom 58%', scrub: 0.6 },
    });
    $$('.chip', manifesto).forEach((chip, i) => {
      gsap.fromTo(chip, { yPercent: 22, rotation: i % 2 ? 9 : -9 }, {
        yPercent: -22, rotation: i % 2 ? -9 : 9, ease: 'none',
        scrollTrigger: { trigger: chip, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
    $$('[data-reveal]').forEach((el, i) => {
      gsap.from(el, { y: 60, opacity: 0, duration: 1.3, ease: 'expo.out', delay: (i % 3) * 0.12, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }

  /* ---------- Rituel : section pinnée, storytelling étape par étape ---------- */
  function initRitual(mm) {
    const sec = $('[data-ritual]');
    if (!sec || reduce) return;
    const pin = $('[data-ritual-pin]', sec);
    const steps = $$('.step', sec);
    const layers = $$('[data-rlayer]', sec);
    const roll = $('[data-ritual-roll]', sec);
    const rail = $$('[data-ritual-rail] li svg', sec);
    const bgs = $$('.rbg', sec);
    const n = steps.length;

    mm.add('(min-width: 900px)', () => {
      sec.classList.add('is-pinned');
      gsap.set(steps, { opacity: 0, y: 40 });
      gsap.set(steps[0], { opacity: 1, y: 0 });
      layers.forEach((l, i) => {
        gsap.set(l, { clipPath: i ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 0% 0%)' });
        gsap.set($('img', l), { scale: i ? 1.3 : 1 });
      });
      gsap.set(rail, { opacity: 0.18 });
      gsap.set(rail[0], { opacity: 1, fill: '#B3164F', scale: 1.25, transformOrigin: '50% 50%' });

      const tl = gsap.timeline({
        defaults: { ease: 'power3.inOut' },
        scrollTrigger: {
          trigger: pin, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * n * 0.85),
          pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 2,
        },
      });
      const unit = 1.7;
      for (let i = 1; i < n; i++) {
        const t = i * unit;
        tl.to(steps[i - 1], { opacity: 0, y: -40, duration: 0.5 }, t - 0.15)
          .to(steps[i], { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, t + 0.2)
          .to(layers[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 1 }, t - 0.15)
          .to($('img', layers[i]), { scale: 1, duration: 1.3, ease: 'power2.out' }, t - 0.15)
          .to($('img', layers[i - 1]), { scale: 1.12, duration: 1 }, t - 0.15)
          .to(roll, { yPercent: -(100 / n) * i, duration: 0.9 }, t - 0.15)
          .to(rail[i], { opacity: 1, fill: '#B3164F', scale: 1.25, duration: 0.4 }, t)
          .to(rail[i - 1], { opacity: 0.28, scale: 1, duration: 0.4 }, t);
        if (bgs[i - 1]) tl.to(bgs[i - 1], { opacity: 1, duration: 0.9 }, t - 0.15);
      }
      tl.to({}, { duration: 0.9 }, n * unit - 0.5); // temps de lecture de la dernière étape
      return () => sec.classList.remove('is-pinned');
    });

    mm.add('(max-width: 899px)', () => {
      steps.forEach((s) => gsap.from(s, { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 88%', once: true } }));
      layers.forEach((l, i) => {
        gsap.from(l, { clipPath: 'circle(0% at 50% 60%)', duration: 1.5, ease: 'expo.out', delay: (i % 2) * 0.15, scrollTrigger: { trigger: l, start: 'top 92%', once: true } });
      });
    });
  }

  /* ---------- Prestations : défilement horizontal piloté par le scroll ---------- */
  function initServices(mm) {
    const sec = $('[data-services]');
    if (!sec || reduce) return;
    const pin = $('[data-services-pin]', sec);
    const track = $('[data-services-track]', sec);
    const bar = $('[data-services-bar]', sec);
    const ghost = $('[data-ghost]', sec);

    mm.add('(min-width: 900px)', () => {
      sec.classList.add('is-hscroll');
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, anticipatePin: 1,
          invalidateOnRefresh: true, refreshPriority: 1,
          onUpdate: (self) => gsap.set(bar, { scaleX: self.progress }),
        },
      });
      gsap.to(ghost, { x: () => -dist() * 0.4, ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), scrub: 0.8, invalidateOnRefresh: true } });
      $$('.card', track).forEach((card, i) => {
        gsap.from(card, {
          y: 90, rotation: i % 2 ? 5 : -5, opacity: 0, duration: 1.2, ease: 'expo.out',
          scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 94%', toggleActions: 'play none none reverse' },
        });
      });
      return () => sec.classList.remove('is-hscroll');
    });

    mm.add('(max-width: 899px)', () => {
      $$('.card', track).forEach((card, i) => {
        gsap.from(card, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', delay: i * 0.05, scrollTrigger: { trigger: sec, start: 'top 75%', once: true } });
      });
    });
  }

  /* ---------- Composer son set (aperçu en direct + estimation) ---------- */
  function initCompose() {
    const root = $('[data-compose]');
    if (!root) return;
    const form = $('[data-form]', root);
    const g = $('[data-nails]', root);
    const totalEl = $('[data-total]', root);
    const noteEl = $('[data-total-note]', root);
    const recapEl = $('[data-recap]', root);
    const smsEl = $('[data-compose-sms]', root);

    const NAIL = 'M50,0 C58,0 64,4.2 70,14 C86,39.2 100,70 100,95.2 L100,126 C100,134.4 97,140 90,140 L10,140 C3,140 0,134.4 0,126 L0,95.2 C0,70 14,39.2 30,14 C36,4.2 42,0 50,0Z';
    // une main stylisée : cinq doigts en éventail autour du centre de la paume
    const PALM = { x: 320, y: 512 };
    const fingers = [
      { a: 63, len: 214, w: 92 },   // pouce
      { a: -41, len: 266, w: 68 },  // auriculaire
      { a: -17, len: 334, w: 78 },  // annulaire
      { a: 18, len: 324, w: 78 },   // index
      { a: 0, len: 370, w: 82 },    // majeur
    ];
    const mk = (name, attrs, parent) => {
      const n = document.createElementNS(NS, name);
      Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k]));
      parent && parent.appendChild(n);
      return n;
    };
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const GOLDS = ['#E6C98F', '#FFF3D1', '#FFFFFF', '#C9A468'];

    const nails = fingers.map((f) => {
      const anchor = mk('g', { transform: `translate(${PALM.x} ${PALM.y})` }, g);
      const outer = mk('g', {}, anchor);
      const float = outer;
      mk('rect', { x: -f.w / 2, y: -f.len, width: f.w, height: f.len + 60, rx: f.w / 2, fill: 'url(#gSkin)', stroke: 'rgba(42,18,32,.09)', 'stroke-width': 1.2 }, outer);
      const nw = f.w * 0.82;
      const sx = nw / 100;
      const body = mk('g', { transform: `translate(${(-nw / 2).toFixed(2)} ${-f.len - 34}) scale(${sx.toFixed(4)} ${(sx * 1.24).toFixed(4)})` }, outer);
      const clip = mk('g', { 'clip-path': 'url(#nailClip)' }, body);
      const base = mk('path', { d: NAIL, fill: '#E9C1B6' }, clip);
      const french = mk('path', { d: 'M-2,-2 H102 V52 C84,40 66,34 50,34 C34,34 16,40 -2,52Z', fill: '#FFF9F6', opacity: 0 }, clip);
      const boomer = mk('rect', { width: 100, height: 140, fill: 'url(#gBoomer)', opacity: 0 }, clip);
      const colors = mk('rect', { width: 100, height: 140, fill: 'url(#gColors)', opacity: 0 }, clip);
      const cat = mk('rect', { width: 100, height: 140, fill: 'url(#gCat)', opacity: 0 }, clip);
      const glitter = mk('g', { opacity: 0 }, clip);
      const dots = [];
      for (let i = 0; i < 46; i++) {
        const y = Math.pow(rnd(), 1.5) * 132 + 4;
        dots.push(mk('circle', { cx: (6 + rnd() * 88).toFixed(1), cy: y.toFixed(1), r: (1.3 + rnd() * 2.6).toFixed(2), fill: GOLDS[Math.floor(rnd() * GOLDS.length)] }, glitter));
      }
      mk('path', { d: 'M21 80C22 58 31 36 46 15', fill: 'none', stroke: '#fff', 'stroke-width': 5.5, 'stroke-linecap': 'round', opacity: 0.55 }, clip);
      mk('path', { d: 'M20 96C20.500 91 21 88 22 84', fill: 'none', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.5 }, clip);
      mk('path', { d: NAIL, fill: 'none', stroke: 'rgba(42,18,32,.16)', 'stroke-width': 1 }, body);
      return { outer, float, base, dots, layers: { french, boomer, colors, cat, glitter } };
    });
    // la paume recouvre la naissance des doigts
    mk('ellipse', { cx: PALM.x, cy: PALM.y + 44, rx: 140, ry: 118, fill: 'url(#gSkin)', stroke: 'rgba(42,18,32,.09)', 'stroke-width': 1.2 }, g);
    nails.forEach((n, i) => gsap.set(n.outer, { rotation: fingers[i].a, svgOrigin: '0 0' }));

    const twinkle = gsap.to(nails.flatMap((n) => n.dots), { opacity: 0.2, duration: 1.1, ease: 'sine.inOut', repeat: -1, yoyo: true, stagger: { each: 0.018, from: 'random' }, paused: true });
    if (!reduce) {
      nails.forEach((n, i) => gsap.to(n.outer, { rotation: fingers[i].a + (i % 2 ? 1.6 : -1.6), duration: 3 + i * 0.45, ease: 'sine.inOut', repeat: -1, yoyo: true }));
      gsap.from(nails.map((n) => n.outer), { scale: 0.2, opacity: 0, duration: 1.5, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: root, start: 'top 70%', once: true } });
    }

    const COMPANION = { '#E9C1B6': '#E8407E', '#F2B5C4': '#E8407E', '#EF4F8B': '#B58BE0', '#C23A4B': '#F0A47A', '#F0A47A': '#E8407E' };
    const stopColors = $$('#gColors stop');
    const total = { v: 0 };
    let shownTotal = null;

    const read = () => {
      const f = new FormData(form);
      const pick = (name) => form.querySelector(`input[name="${name}"]:checked`);
      const tech = pick('tech'); const color = pick('color'); const finish = pick('finish');
      return {
        tech: +tech.value, techLabel: tech.dataset.label,
        color: color.value, colorLabel: color.dataset.label,
        finish: finish.dataset.finish, finishLabel: finish.dataset.label, finishPrice: +finish.value,
        depose: f.has('depose'), art: f.has('art'),
      };
    };

    const update = (instant) => {
      const s = read();
      const d = instant || reduce ? 0 : 0.7;
      stopColors.forEach((st) => st.setAttribute('stop-color', COMPANION[s.color] || '#E8407E'));
      nails.forEach((n, i) => {
        gsap.to(n.base, { fill: s.color, duration: d, delay: instant ? 0 : i * 0.05, ease: 'power2.out', overwrite: 'auto' });
        Object.keys(n.layers).forEach((k) => {
          const on = (s.finish === 'french' && k === 'french') || (s.finish === 'boomer' && k === 'boomer') ||
            (s.finish === 'colors' && k === 'colors') || (s.finish === 'cat' && k === 'cat') || (s.finish === 'glitter' && k === 'glitter');
          gsap.to(n.layers[k], { opacity: on ? 1 : 0, duration: d * 0.8, delay: instant ? 0 : i * 0.04, overwrite: 'auto' });
        });
      });
      s.finish === 'glitter' ? twinkle.play() : twinkle.pause();

      const sum = s.tech + s.finishPrice + (s.depose ? 15 : 0);
      if (instant || reduce) { totalEl.textContent = sum; total.v = sum; }
      else gsap.to(total, { v: sum, duration: 0.8, ease: 'power3.out', onUpdate: () => { totalEl.textContent = Math.round(total.v); } });
      shownTotal = sum;
      noteEl.textContent = s.art ? 'hors nail art (sur devis)' : '';
      const parts = [s.techLabel, s.colorLabel, s.finishLabel];
      if (s.depose) parts.push('Dépose'); if (s.art) parts.push('Nail art');
      recapEl.textContent = parts.join(' · ');
      const msg = `Bonjour, je souhaiterais prendre rendez-vous pour : ${parts.join(', ')} (estimation ${sum} €). Merci !`;
      smsEl.setAttribute('href', 'sms:+33768720011?&body=' + encodeURIComponent(msg));
    };
    form.addEventListener('change', () => update(false));
    update(true);
  }

  /* ---------- Chiffres clés ---------- */
  function initStats() {
    if (reduce) return;
    $$('[data-stat]').forEach((li, i) => {
      const path = $('.stat__path', li);
      path.setAttribute('pathLength', '1');
      const numEl = $('[data-count]', li);
      const target = parseFloat(numEl.dataset.count);
      const obj = { v: 0 };
      numEl.textContent = '0';
      const tl = gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 85%', once: true }, delay: (i % 4) * 0.08 });
      tl.to(path, { strokeDashoffset: 0, duration: 2.4, ease: 'power3.inOut' }, 0)
        .to(obj, { v: target, duration: 2.4, ease: 'power3.out', onUpdate: () => { numEl.textContent = Math.round(obj.v); } }, 0.1)
        .from($$('.stat__label, .stat__num small', li), { opacity: 0, y: 18, duration: 1.1, ease: 'expo.out', stagger: 0.1 }, 0.5);
    });
  }

  /* ---------- Galerie : masques circulaires, parallax interne, colonnes ---------- */
  function initGallery(mm) {
    const figs = $$('.gallery .g');
    if (!figs.length || reduce) return;
    figs.forEach((fig) => {
      const wrap = $('.g__img', fig); const img = $('img', fig);
      if (wrap) {
        gsap.fromTo(wrap, { clipPath: 'circle(0% at 50% 62%)' }, { clipPath: 'circle(80% at 50% 50%)', duration: 1.7, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 88%', once: true } });
        gsap.fromTo(img, { yPercent: -7, scale: 1.16 }, { yPercent: 7, scale: 1.16, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
      } else {
        gsap.from(fig, { y: 60, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 90%', once: true } });
      }
    });
    mm.add('(min-width: 900px)', () => {
      figs.forEach((fig) => {
        const sp = parseFloat(fig.dataset.speed) || 0;
        gsap.fromTo(fig, { y: sp * 700 }, { y: -sp * 700, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });
  }

  /* ---------- Avis : carrousel animé (glisser, flèches, clavier, auto) ---------- */
  function initReviews() {
    const root = $('[data-carousel]');
    if (!root) return;
    const stage = $('[data-stage]', root);
    const cards = $$('.review', stage);
    const n = cards.length;
    const dotsWrap = $('[data-dots]', root);
    let idx = 0; let timer = null; let paused = false; let inView = false;
    let dragging = false; let startX = 0; let moved = 0;

    const dots = cards.map((c, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'dot'; b.setAttribute('aria-label', `Avis ${i + 1} sur ${n}`);
      b.addEventListener('click', () => go(i));
      dotsWrap.appendChild(b);
      return b;
    });

    const stepPx = () => Math.min(cards[0].offsetWidth * 0.8, root.clientWidth * 0.58);
    function layout(instant) {
      const st = stepPx();
      cards.forEach((c, i) => {
        let off = i - idx;
        if (off > n / 2) off -= n; if (off < -n / 2) off += n;
        const a = Math.abs(off);
        gsap.to(c, {
          x: off * st, scale: a === 0 ? 1 : 0.86, rotation: off * 2.4, opacity: a === 0 ? 1 : a === 1 ? 0.4 : 0, zIndex: 10 - a,
          duration: instant || reduce ? 0 : 1.1, ease: 'expo.out', overwrite: true,
        });
        c.style.pointerEvents = a === 0 ? 'auto' : 'none';
      });
      dots.forEach((d, i) => d.setAttribute('aria-current', i === idx ? 'true' : 'false'));
    }
    function go(i) { idx = (i + n) % n; layout(false); restart(); }

    $('[data-prev]', root).addEventListener('click', () => go(idx - 1));
    $('[data-next]', root).addEventListener('click', () => go(idx + 1));
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    });

    stage.addEventListener('pointerdown', (e) => { if (e.button) return; dragging = true; startX = e.clientX; moved = 0; });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      moved = e.clientX - startX;
      gsap.to(cards[idx], { x: moved * 0.7, rotation: moved * 0.02, duration: 0.25, ease: 'power3', overwrite: 'auto' });
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(moved) > 70) go(idx + (moved < 0 ? 1 : -1)); else layout(false);
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    const tick = () => { if (!paused && inView && !document.hidden && !dragging) go(idx + 1); };
    function restart() { clearInterval(timer); if (!reduce) timer = setInterval(tick, 8000); }
    root.addEventListener('pointerenter', () => { paused = true; });
    root.addEventListener('pointerleave', () => { paused = false; });
    root.addEventListener('focusin', () => { paused = true; });
    root.addEventListener('focusout', () => { paused = false; });
    ScrollTrigger.create({ trigger: root, start: 'top 85%', end: 'bottom 15%', onToggle: (s) => { inView = s.isActive; } });
    window.addEventListener('resize', debounce(() => layout(true), 150));

    layout(true);
    restart();
    if (!reduce) gsap.from(root.closest('.reviews').querySelector('.reviews__stage'), { y: 70, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: root, start: 'top 85%', once: true } });
  }

  /* ---------- Appel à l'action ---------- */
  function initCta() {
    const cta = $('[data-cta]');
    if (!cta) return;
    charWave($('.cta__tel', cta), ctaPhone.masks, { radius: 190, amp: 30 });
    if (reduce) return;
    gsap.from(ctaPhone.chars, { yPercent: 115, rotation: 6, duration: 1.5, ease: 'expo.out', stagger: 0.045, scrollTrigger: { trigger: '.cta__tel', start: 'top 88%', once: true } });
    gsap.from($$('.cta__sub, .cta__row .btn', cta), { y: 40, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.cta__sub', start: 'top 92%', once: true } });
    $$('[data-scroll]', cta).forEach((el) => {
      const f = parseFloat(el.dataset.scroll);
      gsap.fromTo(el, { y: -f * 260 }, { y: f * 260, ease: 'none', scrollTrigger: { trigger: cta, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('.cta .spark').forEach((s, i) => gsap.to(s, { scale: 1.4, rotation: 40, duration: 1.6 + i, ease: 'sine.inOut', repeat: -1, yoyo: true }));
  }

  /* ---------- Nous trouver : statut d'ouverture + jour courant ---------- */
  function initFind() {
    const wrap = $('[data-status]');
    if (!wrap) return;
    const text = $('[data-status-text]', wrap);
    const OPEN = 9 * 60; const CLOSE = 17 * 60 + 30;
    let day; let mins;
    try {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      const get = (t) => parts.find((p) => p.type === t).value;
      day = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[get('weekday')];
      mins = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10);
    } catch (err) { return; }

    $$('[data-hours] tr').forEach((tr) => {
      const today = parseInt(tr.dataset.day, 10) === day;
      tr.classList.toggle('is-today', today);
      if (today) tr.setAttribute('aria-current', 'date');
    });

    const openDay = day >= 1 && day <= 6;
    if (openDay && mins >= OPEN && mins < CLOSE) {
      wrap.classList.add('is-open');
      text.textContent = 'Ouvert maintenant · jusqu’à 17 h 30';
    } else if (openDay && mins < OPEN) {
      text.textContent = 'Fermé · ouvre aujourd’hui à 9 h';
    } else {
      const next = day === 6 ? 'lundi' : 'demain';
      text.textContent = `Fermé · réouverture ${next} à 9 h`;
    }
    if (reduce) return;
    gsap.from('.find__map', { y: 80, opacity: 0, duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: '.find__map', start: 'top 90%', once: true } });
    gsap.from($$('.find__info > *:not(h2):not(.eyebrow)'), { y: 34, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.find__info', start: 'top 75%', once: true } });
  }

  /* ---------- Footer ---------- */
  function initFooter() {
    const word = $('[data-footer-word]');
    const yr = $('[data-year]'); if (yr) yr.textContent = new Date().getFullYear();
    if (!word) return;
    charWave(word, footerWord.masks, { radius: 260, amp: 34 });
    if (reduce) return;
    gsap.from(footerWord.chars, { yPercent: 115, duration: 1.7, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: word, start: 'top 92%', once: true } });
    gsap.from($$('.footer__top > *'), { y: 40, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.footer__top', start: 'top 88%', once: true } });
  }

  /* ---------- Titres (apparition mot par mot) ---------- */
  function initHeadings() {
    headings.forEach(({ el, words }) => {
      gsap.from(words, { yPercent: 120, rotation: 5, duration: 1.4, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    // petits éléments d'accompagnement
    $$('.eyebrow').forEach((el) => gsap.from(el, { opacity: 0, x: -20, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } }));
  }

  /* ---------- Orchestration ---------- */
  const mm = gsap.matchMedia();

  initChrome();
  initHero(mm);
  initMarquees();
  initManifesto();
  initRitual(mm);     // sections pinnées créées dans l'ordre de la page
  initServices(mm);
  initCompose();
  initStats();
  initGallery(mm);
  initReviews();
  initCta();
  initFind();
  initFooter();
  initHeadings();
  initCursor();
  initMagnetic();
  initTilt();

  runLoader().then(() => {
    ScrollTrigger.refresh();
    if (location.hash && location.hash.length > 1) {
      const t = $(location.hash);
      t && setTimeout(() => scrollToTarget(t), 300);
    }
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
