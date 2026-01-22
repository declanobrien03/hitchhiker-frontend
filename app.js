const backendUrl = "https://hitchhiker-backend.onrender.com";

const map = L.map("map").setView([53.3498, -6.2603], 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

let points = [];
let layers = [];

function clearMap() {
  layers.forEach(l => map.removeLayer(l));
  layers = [];
  points = [];
}

document.getElementById("clearBtn").onclick = clearMap;

async function getRoute(start, end) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  const data = await res.json();
  return data.routes[0].geometry;
}

map.on("click", async e => {
  points.push(e.latlng);

  const marker = L.marker(e.latlng).addTo(map);
  layers.push(marker);

  if (points.length === 2) {
    const routeGeometry = await getRoute(points[0], points[1]);

    const routeLayer = L.geoJSON(routeGeometry).addTo(map);
    layers.push(routeLayer);

    // save route to backend
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
