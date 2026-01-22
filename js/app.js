import L from "https://cdn.skypack.dev/leaflet";

const API_URL = "https://hitchhiker-backend.onrender.com";

const map = L.map("map").fitWorld();
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
map.locate({ setView: true, maxZoom: 13 });

const routesList = document.getElementById("routes-list");

async function loadRoutes() {
  const res = await fetch(`${API_URL}/routes`);
  const routes = await res.json();
  routesList.innerHTML = "";
  routes.forEach(addRouteToUI);
}

function addRouteToUI(route) {
  const li = document.createElement("li");
  li.textContent = `${route.start.name || "Start"} → ${route.end.name || "End"}`;

  const delBtn = document.createElement("button");
  delBtn.textContent = "Delete";
  delBtn.onclick = async () => {
    await fetch(`${API_URL}/routes/${route.id}`, { method: "DELETE" });
    li.remove();
  };

  li.appendChild(delBtn);
  routesList.appendChild(li);

  if (route.start.lat && route.start.lng && route.end.lat && route.end.lng) {
    L.polyline([
      [route.start.lat, route.start.lng],
      [route.end.lat, route.end.lng]
    ], { color: "blue" }).addTo(map);
  }
}

document.getElementById("add-route").addEventListener("click", async () => {
  const startInput = document.getElementById("start").value;
  const endInput = document.getElementById("end").value;

  if (!startInput || !endInput) return alert("Please enter both start and end locations.");

  const [startRes, endRes] = await Promise.all([
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startInput)}`),
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endInput)}`)
  ]);

  const [startData, endData] = await Promise.all([startRes.json(), endRes.json()]);

  if (!startData[0] || !endData[0]) return alert("Address not found.");

  const route = {
    start: {
      name: startData[0].display_name,
      lat: parseFloat(startData[0].lat),
      lng: parseFloat(startData[0].lon)
    },
    end: {
      name: endData[0].display_name,
      lat: parseFloat(endData[0].lat),
      lng: parseFloat(endData[0].lon)
    },
    createdAt: Date.now()
  };

  const res = await fetch(`${API_URL}/routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(route)
  });

  const savedRoute = await res.json();
  addRouteToUI(savedRoute);
});

loadRoutes();
