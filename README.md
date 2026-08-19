# 🌤️ SkyView Weather App

A responsive weather web application built with **HTML, CSS, and Vanilla JavaScript**.

SkyView allows users to search for a location and view current weather information through a clean, responsive, and user-friendly interface.

🔗 **Live Demo:** https://skyview-weatherapp.pages.dev/

---

## ✨ Features

- 🌍 Search for weather information by location
- 🌡️ Display current weather conditions
- 💨 Display relevant weather information and details
- 📱 Fully responsive design
- 🎨 Clean and user-friendly interface
- ⚡ Fast and lightweight front-end
- 🔒 API requests are handled securely through Cloudflare Pages Functions
- 🚫 API secrets are not exposed in the client-side code

---

## 🛠️ Technologies

### Front-End
- HTML5
- CSS3
- Vanilla JavaScript

### Tools & Services
- Git
- GitHub
- Cloudflare Pages
- Cloudflare Pages Functions
- Weather API

---

## 🧩 How It Works

SkyView uses JavaScript to handle user interactions and request weather data.

Instead of exposing the API key directly in the browser, the weather request is handled through a **Cloudflare Pages Function**.

The general flow is:

```text
User
  ↓
SkyView Front-End
  ↓
/api/weather
  ↓
Cloudflare Pages Function
  ↓
Weather API
  ↓
Weather Data
  ↓
SkyView UI
