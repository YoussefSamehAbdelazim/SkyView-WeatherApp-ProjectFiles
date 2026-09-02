# 🌤️ SkyView Weather

> A responsive weather web application that provides current weather conditions and forecasts through city search or automatic location detection.

## 🔗 Live Demo

🌐 https://skyview-weatherapp.pages.dev/

---

## 📌 About the Project

**SkyView Weather** is a responsive web application built to make weather information easy to access and understand.

Users can:

- 🔎 Search for weather information by city name.
- 📍 Use their current location to get local weather automatically.
- 🌡️ View current weather conditions and detailed measurements.
- 📅 Check hourly and multi-day forecasts.
- 🌅 View sunrise and sunset information.
- 🌙 View additional weather and astronomical details when available.
- 🎨 Switch between themes and use a responsive interface across different screen sizes.

The project focuses on combining a clean user experience with practical web technologies such as API integration, browser geolocation, caching, and server-side API key protection.

---

## ✨ Features

- 🌍 Search weather by city or location name.
- 📍 Automatic location detection using the Browser Geolocation API.
- 🌡️ Current temperature and “feels like” temperature.
- 💧 Humidity and other weather details.
- 💨 Wind information.
- 📊 Pressure and visibility information.
- ☀️ UV index and cloud coverage.
- 🌬️ Air-quality information when available.
- ⏱️ Hourly forecast.
- 📅 Multi-day forecast.
- 🌅 Sunrise and sunset information.
- 🌙 Additional astronomical information when provided by the weather service.
- 🔄 Temperature unit switching.
- 🎨 Theme support.
- 📱 Responsive design.
- 💡 Search suggestions.
- ⚡ Client-side caching.
- 🔒 API key protection through Cloudflare Pages Functions.
- 🚫 Rate limiting and request validation on the server-side function.
- ⏳ Request timeout handling.
- ⚠️ User-friendly error handling.

---

## 🛠️ Technologies

### Front-End

- **HTML5** — Application structure and semantic content.
- **CSS3** — Styling, themes, animations, and responsive design.
- **Vanilla JavaScript** — Application logic, events, API requests, geolocation, caching, and UI updates.

### APIs and Services

- **WeatherAPI** — Weather data source.
- **Browser Geolocation API** — Retrieves the user's current latitude and longitude.
- **Cloudflare Pages** — Hosting and deployment.
- **Cloudflare Pages Functions** — Server-side API layer used to protect the WeatherAPI key.
- **Git & GitHub** — Version control and source code hosting.

---

## 🧩 Project Structure

```text
SkyView-Weather/
│
├── index.html
│
├── css/
│   ├── main.css
│   ├── components.css
│   ├── themes.css
│   └── responsive.css
│
├── js/
│   ├── app.js
│   ├── ui.js
│   └── weather.js
│
├── functions/
│   └── api/
│       └── weather.js
│
├── _routes.json
└── README.md
```

### JavaScript Responsibilities

- **`app.js`**  
  Handles application flow, events, search actions, location requests, and application state.

- **`ui.js`**  
  Handles rendering and updating weather information in the user interface.

- **`weather.js`**  
  Handles weather requests, search suggestions, weather helpers, and client-side caching.

### Server-side Function

- **`functions/api/weather.js`**  
  Acts as a server-side layer between the browser and WeatherAPI. It validates requests, applies rate limiting and caching, protects the API key, handles upstream errors, and returns JSON responses to the front-end.

---

## 🔄 How It Works

### Search Flow

```text
User enters a city
        ↓
JavaScript validates the input
        ↓
Request to /api/weather
        ↓
Cloudflare Pages Function
        ↓
WeatherAPI
        ↓
JSON response
        ↓
JavaScript updates the UI
```

### Location Flow

```text
User clicks "My Location"
        ↓
Browser Geolocation API
        ↓
Latitude + Longitude
        ↓
/api/weather
        ↓
Cloudflare Pages Function
        ↓
WeatherAPI
        ↓
Weather data
        ↓
UI update
```

---

## 📍 Location Integration

SkyView uses the browser's built-in **Geolocation API**.

The application first checks whether geolocation is supported by the browser. After the user grants permission, the browser provides:

- **Latitude**
- **Longitude**

The coordinates are then formatted and used to request weather data for the user's current location.

If location access is unavailable or denied, the application handles the error and falls back to a default weather flow or allows the user to search manually.

---

## 🔐 API Key Protection

The WeatherAPI key is **not stored in the front-end JavaScript**.

Instead, the front-end sends requests to:

```text
/api/weather
```

The Cloudflare Pages Function receives the request and reads the API key from an environment variable:

```text
WEATHER_API_KEY
```

The function then communicates with WeatherAPI server-side.

This architecture prevents the API key from being directly exposed in the public front-end code.

---

## ⚡ Performance and Reliability

### Client-side Caching

Weather requests are cached temporarily. If the same location is requested again while the cached data is still valid, the application can reuse the cached response instead of sending another request.

Benefits:

- Faster responses.
- Fewer API requests.
- Reduced unnecessary network usage.

### Server-side Protection

The Cloudflare Function includes mechanisms such as:

- Input validation.
- Rate limiting.
- Short-term in-memory caching.
- Request timeout handling.
- Upstream error handling.

---

## 🚀 Running the Project

### Local Front-End Preview

You can open `index.html` in a browser to inspect the interface.

However, the `/api/weather` endpoint depends on the Cloudflare Pages Function and the `WEATHER_API_KEY` environment variable. For the full API flow, deploy the project through Cloudflare Pages or use a compatible local development setup.

### Required Environment Variable

```text
WEATHER_API_KEY=your_weatherapi_key
```

> Never commit a real API key to the public repository.

---

## 🎯 Future Improvements

Possible next steps for SkyView include:

- ⭐ Favorite cities.
- 👤 User accounts and synchronization.
- 🗺️ Interactive weather maps.
- 🔔 Severe weather alerts.
- 📲 Progressive Web App (PWA) support.
- 📡 Offline support with Service Workers.
- 🧠 Personalized weather recommendations.
- 📈 Weather history and charts.
- 🌐 Additional language options.
- 🗃️ Persistent user preferences.

---

## 👨‍💻 Author

**Youssef Sameh Abdelazim**

---

## 📄 License

See the included `LICENCE` file for project licensing information.
