# Autoradio

Endes Miklós – autórádió kikódolás, Dunaharaszti. Statikus weboldal, build nélkül.

```
index.html              főoldal                 → /
impresszum/index.html   impresszum              → /impresszum/
adatvedelem/index.html  adatvédelmi tájékoztató → /adatvedelem/
sutik/index.html        süti-tájékoztató        → /sutik/
css/styles.css          közös stílus
js/main.js              közös szkript (chat-linkek, térkép, animációk)
fonts/                  saját tárhelyről kiszolgált betűtípusok (Manrope, JetBrains Mono – OFL)
```

- GitHub Pages-en fut, a telepítést a `.github/workflows/pages.yml` GitHub Actions workflow végzi minden `main`-re pusholt változásnál.
- Külső kérés csak kattintásra történik (Google Térkép, Messenger, WhatsApp, Viber) – az oldal nem használ sütit.
- Kapcsolati adatok csere esetén: keress rá a `36203168440` / `autoradiocodeservice@gmail.com` szövegekre a HTML-ekben és a `js/main.js`-ben.
- Élesítés előtt az impresszumban és az adatvédelmi tájékoztatóban ki kell tölteni a `KITÖLTENDŐ` jelölésű mezőket.
