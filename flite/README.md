# FLITEDECK — landing page recreation

A faithful, self-contained recreation of the [flite.bike](https://flite.bike/) landing
page for **FLITEDECK**, the world's first smart handlebar — an intelligent carbon cockpit
with an integrated computer, GPS, the largest touchscreen in cycling and a suite of sensors.

> **Note:** This environment's network policy blocked direct access to `flite.bike`, so the
> live HTML/CSS could not be scraped. This page was rebuilt from the product's public
> specifications and the real FLITEDECK design language (dark, high-tech, product-hero led).
> It is a demonstration and is not affiliated with FLITE.

## Stack
- Plain HTML, CSS and a small amount of vanilla JS — no build step, no dependencies.
- Google Fonts: Space Grotesk (display) + Inter (body).
- The handlebar/cockpit and on-screen UI are rendered entirely in CSS + inline SVG
  (no proprietary product imagery is used).

## Sections
1. Sticky navigation with mobile menu
2. Hero with animated cockpit/screen mockup
3. Scrolling feature marquee
4. Intro statement
5. Feature grid (touchscreen, GPS, radar, theft alarm, light, bell)
6. Display showcase with live-data mockup
7. Connectivity chips (GPS, Wi-Fi, Bluetooth, ANT+, 5G eSIM, …)
8. Engineering spec grid
9. Pre-order call-to-action
10. Footer

## Run it
Just open the file — no server required:

```bash
open flite/index.html      # macOS
xdg-open flite/index.html  # Linux
```

Or serve locally:

```bash
cd flite && python3 -m http.server 8080
# visit http://localhost:8080
```

## Features
- Fully responsive (desktop → mobile breakpoints at 900px / 560px)
- Scroll-reveal animations with staggering (`IntersectionObserver`)
- `prefers-reduced-motion` respected
- Accessible: semantic landmarks, ARIA labels, keyboard-reachable nav
