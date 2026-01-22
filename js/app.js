const backendUrl = "https://hitchhiker-backend.onrender.com";

/* ---------------- MAP SETUP ---------------- */

const map = L.map("map").setView([53.3498, -6.2603], 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

// Center near user
map.locate({ setView: true, maxZoom: 13 });

map.on("locationfound", e => {
  L.circle(e.latlng, {
    radius: e.accuracy,
    color: "blue",
    fillOpacity: 0.1
  }).addTo(map);
});

/* ---------------- ROUTING ---------------- */

let activeLayer = null;

async function getRoute(start, end) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  const data = await res.json();
  return data.routes[0].geometry;
}

function showRoute(geometry) {
  if (activeLayer) map.removeLayer(activeLayer);
  activeLayer = L.geoJSON(geometry).addTo(map);
  map.fitBounds(activeLayer.getBounds());
}

/* ---------------- GEOCODING ---------------- */

async function searchAddress(query) {
  if (query.length < 3) return [];

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
    {
      headers: { "User-Agent": "HitchhikerApp/1.0" }
    }
  );

  return res.json();
}

function setupAutocomplete(inputId, resultsId) {
  const input = document.getElementById(inputId);
  const resultsDiv = document.getElementById(resultsId);

  input.addEventListener("input", async () => {
    resultsDiv.innerHTML = "";
    const results = await searchAddress(input.value);

    results.forEach(r => {
      const div = document.createElement("div");
      div.className = "result";
      div.textContent = r.display_name;

      div.onclick = () => {
        input.value = r.display_name;
        input.dataset.lat = r.lat;
        input.dataset.lng = r.lon;
        resultsDiv.innerHTML = "";
      };

      resultsDiv.appendChild(div);
    });
  });
}

setupAutocomplete("startInput", "startResults");
setupAutocomplete("endInput", "endResults");

function getSelectedPoint(inputId) {
  const input = document.getElementById(inputId);
  if (!input.dataset.lat) {
    throw new Error("Please select an address from the list");
  }
  return {
    lat: +input.dataset.lat,
    lng: +input.dataset.lng
  };
}

/* ---------------- ROUTES LIST ---------------- */

const routesDiv = document.getElementById("routes");

async function loadRoutes() {
  routesDiv.innerHTML = "";
  const res = await fetch(`${backendUrl}/routes`);
  const routes = await res.json();

  routes.forEach(route => {
    const div = document.createElement("div");
    div.className = "route";

    const label = document.createElement("span");
    label.textContent = "Route";
    label.onclick = async () => {
      const geometry = await getRoute(route.start, route.end);
      showRoute(geometry);
    };

    const del = document.createElement("button");
    del.textContent = "✕";
    del.onclick = async () => {
      await fetch(`${backendUrl}/routes/${route.id}`, {
        method: "DELETE"
      });
      loadRoutes();
    };

    div.append(label, del);
    routesDiv.appendChild(div);
  });
}

/* ---------------- CREATE ROUTE ---------------- */

document.getElementById("createBtn").onclick = async () => {
  try {
    const start = getSelectedPoint("startInput");
    const end = getSelectedPoint("endInput");

    const geometry = await getRoute(start, end);
    showRoute(geometry);

    await fetch(`${backendUrl}/routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start,
        end,
        createdAt: Date.now()
      })
    });

    loadRoutes();
  } catch (err) {
    alert(err.message);
  }
};

/* ---------------- INIT ---------------- */

loadRoutes();
