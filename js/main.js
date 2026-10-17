/* Endes Miklós – Autórádió kikódolás
   Loaded in <head> without defer: the "js" class must be set before first paint
   so scroll-reveal elements don't flash. Everything else waits for the DOM. */

document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  const PHONE = '36203168440';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* Header border once the page scrolls; mobile call bar after the hero
     (on pages without a hero it shows right away). */
  const header = $('.header');
  const callbar = $('#callbar');
  const hero = $('.hero');
  const onScroll = () => {
    if (header) header.dataset.scrolled = String(scrollY > 8);
    if (callbar) callbar.dataset.visible = String(!hero || scrollY > hero.offsetHeight * 0.6);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile menu: closes on link tap, outside tap, Escape, or resize to desktop */
  const menuBtn = $('.menu-btn');
  const menu = $('#mobile-menu');
  if (menuBtn && menu) {
    const setMenu = (open) => {
      menu.dataset.open = String(open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Menü bezárása' : 'Menü megnyitása');
    };
    menuBtn.addEventListener('click', () => setMenu(menu.dataset.open !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('click', (e) => {
      if (menu.dataset.open === 'true' && !e.target.closest('#mobile-menu, .menu-btn')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.dataset.open === 'true') { setMenu(false); menuBtn.focus(); }
    });
    matchMedia('(min-width: 761px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  /* Scroll reveal — once per element */
  const revealer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.dataset.visible = 'true';
      revealer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -80px 0px' });
  $$('[data-reveal]').forEach((el) => revealer.observe(el));

  /* Toast + clipboard */
  const toast = $('#toast');
  const toastText = $('#toast-text');
  let toastTimer;
  const showToast = (text, ms = 2000) => {
    if (!toast) return;
    toastText.textContent = text;
    toast.dataset.visible = 'true';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.dataset.visible = 'false'; }, ms);
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  };

  $$('[data-copy]').forEach((btn) => {
    let resetTimer;
    btn.addEventListener('click', async () => {
      await copyText(btn.dataset.copy);
      btn.dataset.copied = 'true';
      showToast(btn.dataset.copyLabel);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { btn.dataset.copied = 'false'; }, 1600);
    });
  });

  /* Chat links: each platform gets the URL that opens the conversation on the
     first click. Phones: universal links / app schemes open the app directly,
     in the same tab (no empty tab left behind). Desktop: skip the wa.me
     redirect hop, which can land on a consent/login page instead. */
  const isPhone = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  const chatUrls = {
    whatsapp: isPhone ? `https://wa.me/${PHONE}` : `https://web.whatsapp.com/send?phone=${PHONE}`,
    viber: `viber://chat?number=%2B${PHONE}`,
  };

  $$('[data-chat]').forEach((a) => {
    const kind = a.dataset.chat;
    a.href = chatUrls[kind];
    if (kind === 'viber' || isPhone) {
      a.removeAttribute('target');
    } else {
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });

  /* viber:// silently does nothing when Viber isn't installed. If the page
     still has focus shortly after the click, the app didn't open — say so
     (the number is already on the clipboard). */
  $$('[data-chat="viber"]').forEach((a) => {
    a.addEventListener('click', () => {
      // Copy inside the click so it still counts as a user gesture.
      copyText('+' + PHONE);
      let left = false;
      const onBlur = () => { left = true; };
      addEventListener('blur', onBlur, { once: true });
      document.addEventListener('visibilitychange', onBlur, { once: true });
      setTimeout(() => {
        removeEventListener('blur', onBlur);
        document.removeEventListener('visibilitychange', onBlur);
        if (left || document.hidden) return;
        showToast('Nem nyílt meg a Viber – a szám (+36 20 316 8440) kimásolva', 4000);
      }, 1500);
    });
  });

  /* Google map: loads only on click, so no Google cookies without consent. */
  $$('.map-load-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = btn.dataset.src;
      iframe.title = btn.dataset.title;
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.allowFullscreen = true;
      btn.closest('.map-load').replaceWith(iframe);
    });
  });

  /* Radio faceplate — a short explanatory loop:
     locked (CODE blinks) → decoding (digits scramble, lock in one by one on presets 1–4,
     progress fills, tuning knob turns) → confirm on preset 6 → unlock flash →
     playing (FM 98.6, equalizer, sound waves, glow).
     Pauses while off-screen or while the tab is hidden. */
  const stage = $('.stage');
  const radio = $('#radio');
  if (!stage || !radio) return;

  const lcd = $('#lcd');
  const caption = $('#caption');
  const progress = $('#progress');
  const flash = $('#lcd-flash');
  const knobLeft = $('#knob-left');
  const knobRight = $('#knob-right');
  const presets = radio.querySelectorAll('.preset');
  const flags = Object.fromEntries([...radio.querySelectorAll('[data-lcd-flag]')].map((el) => [el.dataset.lcdFlag, el]));

  let inView = true;
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    stage.dataset.paused = String(!inView);
  }).observe(stage);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const wait = async (ms) => {
    await sleep(ms);
    while (document.hidden || !inView) await sleep(250);
  };

  const setFlags = (on) => {
    for (const [key, el] of Object.entries(flags)) el.dataset.on = String(on.includes(key));
  };

  const swap = async (text) => {
    lcd.dataset.swapping = 'true';
    await sleep(180);
    lcd.textContent = text;
    lcd.dataset.swapping = 'false';
  };

  const press = async (i, hold = 110) => {
    presets[i].dataset.pressed = 'true';
    await sleep(hold);
    presets[i].dataset.pressed = 'false';
  };

  const turn = (knob, deg) => { knob.style.transform = `rotate(${deg}deg)`; };
  const randomDigit = () => String(Math.floor(Math.random() * 10));

  /* Tilt toward the pointer, eased every frame (spring-like), desktop only */
  const tilt = $('#tilt');
  const sheen = $('#sheen');
  if (!reduceMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const area = $('.hero') || stage;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const frame = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      tilt.style.transform = `perspective(1000px) rotateX(${(-y * 9).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg)`;
      sheen.style.transform = `translateX(${(x * 18).toFixed(2)}%)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(frame) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    area.addEventListener('pointermove', (e) => {
      const r = radio.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.9)));
      ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 2.5)));
      kick();
    });
    area.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
  }

  (async function run() {
    while (true) {
      /* Locked */
      stage.dataset.state = 'locked';
      setFlags(['code', 'safe']);
      caption.textContent = 'Zárolva – kódra vár';
      progress.style.transform = 'scaleX(0)';
      turn(knobLeft, 0);
      turn(knobRight, 0);
      await swap('CODE');
      await wait(2000);

      /* Decoding */
      stage.dataset.state = 'decoding';
      setFlags(['code']);
      caption.textContent = 'Kód visszafejtése…';
      lcd.dataset.swapping = 'true';
      await sleep(180);
      lcd.innerHTML = '<span class="d">-</span><span class="d">-</span><span class="d">-</span><span class="d">-</span>';
      lcd.dataset.swapping = 'false';
      const spans = lcd.querySelectorAll('.d');
      await wait(300);

      for (let i = 0; i < 4; i++) {
        const until = performance.now() + (i === 0 ? 650 : 420);
        while (performance.now() < until) {
          for (let j = i; j < 4; j++) spans[j].textContent = randomDigit();
          await wait(45);
        }
        spans[i].textContent = String(1 + Math.floor(Math.random() * 9));
        spans[i].dataset.locked = 'true';
        progress.style.transform = `scaleX(${(i + 1) / 4})`;
        turn(knobRight, (i + 1) * 75);
        press(i, 140);
        await wait(120);
      }

      /* Confirm + unlock */
      await wait(500);
      await press(5, 420);
      flash.dataset.on = 'false';
      void flash.offsetWidth; // restart the flash animation
      flash.dataset.on = 'true';
      stage.dataset.state = 'playing';
      setFlags(['fm', 'st']);
      turn(knobLeft, 140);
      caption.textContent = 'Kikódolva – szól a rádió';
      await swap('FM 98.6');
      await wait(5600);
    }
  })();
});
