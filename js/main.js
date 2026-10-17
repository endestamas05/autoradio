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
     in the same tab (no empty tab left behind). Desktop: skip the m.me and
     wa.me redirect hops, which can land on a consent/login page instead. */
  const isPhone = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  const chatUrls = {
    messenger: isPhone ? 'https://m.me/miklos.endes' : 'https://www.messenger.com/t/miklos.endes',
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

  /* Radio faceplate: CODE → digits typed via presets 1–4 → OK → FM.
     Pauses while off-screen or while the tab is hidden. */
  const radio = $('#radio');
  if (!radio) return;

  const lcd = $('#lcd');
  const led = $('#led');
  const caption = $('#caption');
  const presets = radio.querySelectorAll('.preset');
  const flags = Object.fromEntries([...radio.querySelectorAll('[data-lcd-flag]')].map((el) => [el.dataset.lcdFlag, el]));

  let inView = true;
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; }).observe(radio);

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

  const press = async (i, hold = 90) => {
    presets[i].dataset.pressed = 'true';
    await sleep(hold);
    presets[i].dataset.pressed = 'false';
  };

  (async function run() {
    while (true) {
      setFlags(['code']);
      led.dataset.on = 'false';
      caption.textContent = 'Kódra vár…';
      await swap('CODE');
      await wait(1500);

      const digits = ['-', '-', '-', '-'];
      await swap(digits.join(''));
      await wait(400);

      caption.textContent = 'Kód beírása…';
      for (let i = 0; i < 4; i++) {
        const target = 1 + Math.floor(Math.random() * 9);
        for (let v = 0; v <= target; v++) {
          digits[i] = String(v);
          lcd.textContent = digits.join('');
          await press(i, 70);
          await wait(reduceMotion ? 40 : 75);
        }
        await wait(260);
      }

      await wait(400);
      await press(5, 500);
      setFlags(['fm', 'st']);
      await swap('FM 98.6');
      led.dataset.on = 'true';
      caption.textContent = 'Kikódolva – szól a rádió';
      await wait(3800);
    }
  })();
});
