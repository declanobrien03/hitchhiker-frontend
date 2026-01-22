const backendUrl = "https://hitchhiker-backend.onrender.com";

const map = L.map("map").setView([53.3498, -6.2603], 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

map.locate({ setView: true, maxZoom: 13 });

let activeLayer = null;
const routesDiv = document.getElementById("routes");

async function geocode(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
  );
  const data = await res.json();
  if (!data[0]) throw new Error("Location not found");
  return { lat: +data[0].lat, lng: +data[0].lon };
}

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

document.getElementById("createBtn").onclick = async () => {
  try {
    const start = await geocode(
      document.getElementById("startInput").value
    );
    const end = await geocode(
      document.getElementById("endInput").value
    );

    const geometry = await getRoute(start, end);
    showRoute(geometry);

    await fetch(`${backendUrl}/routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start, end, createdAt: Date.now() })
    });

    loadRoutes();
  } catch (err) {
    alert(err.message);
  }
};

loadRoutes();
