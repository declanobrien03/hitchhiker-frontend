const backendUrl = "https://hitchhiker-backend.onrender.com";

const map = L.map("map");

// Default fallback
map.setView([53.3498, -6.2603], 12);

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

let points = [];

async function getRoute(start, end) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  const data = await res.json();
  return data.routes[0].geometry;
}

async function drawSavedRoute(route) {
  const geometry = await getRoute(route.start, route.end);
  L.geoJSON(geometry).addTo(map);
}

async function loadRoutes() {
  const res = await fetch(`${backendUrl}/routes`);
  const routes = await res.json();
  routes.forEach(drawSavedRoute);
}

map.on("click", async e => {
  points.push(e.latlng);
  L.marker(e.latlng).addTo(map);

  if (points.length === 2) {
    const geometry = await getRoute(points[0], points[1]);
    L.geoJSON(geometry).addTo(map);

    await fetch(`${backendUrl}/routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start: points[0],
        end: points[1],
        createdAt: Date.now()
      })
    });

    points = [];
  }
});

// load existing routes
loadRoutes();
