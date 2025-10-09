// public/js/nearby.js
// Busca centros de ayuda cercanos usando la API del backend (/api/nearby)
const findBtn = document.getElementById('find-centers');
const centersList = document.getElementById('centers-list');
const radiusSelect = document.getElementById('radius-select');

function createCard(place) {
	const card = document.createElement('article');
	card.className = 'card';

	const title = document.createElement('h3');
	title.textContent = place.name || 'Centro de ayuda';
	card.appendChild(title);

	const meta = document.createElement('div');
	meta.className = 'center-meta';

	const addr = document.createElement('p');
	addr.textContent = place.address || '';
	meta.appendChild(addr);

	if (place.distance != null) {
		const dist = document.createElement('span');
		const d = place.distance < 1000 ? `${Math.round(place.distance)} m` : `${(place.distance/1000).toFixed(1)} km`;
		dist.className = 'center-distance';
		dist.textContent = d;
		meta.appendChild(dist);
	}

	card.appendChild(meta);

	if (place.opening) {
		const hours = document.createElement('p');
		hours.textContent = 'Horario: ' + place.opening;
		hours.className = 'center-hours';
		card.appendChild(hours);
	}

	const actions = document.createElement('div');
	actions.className = 'center-actions';
	if (place.phone) {
		const phoneBtn = document.createElement('a');
		phoneBtn.className = 'btn phone-btn';
		phoneBtn.href = `tel:${place.phone}`;
		phoneBtn.textContent = place.phone;
		actions.appendChild(phoneBtn);
	} else {
		const noPhone = document.createElement('span');
		noPhone.className = 'muted';
		noPhone.textContent = 'Teléfono no disponible';
		actions.appendChild(noPhone);
	}
	card.appendChild(actions);

	return card;
}

async function findNearby() {
	centersList.innerHTML = '';
	if (!navigator.geolocation) {
		centersList.textContent = 'Geolocalización no soportada por tu navegador.';
		return;
	}

	findBtn.disabled = true;
	findBtn.textContent = 'Buscando...';

	navigator.geolocation.getCurrentPosition(async (pos) => {
		const lat = pos.coords.latitude;
		const lon = pos.coords.longitude;
		const radius = parseInt(radiusSelect.value, 10) || 5000;

		try {
			const resp = await fetch(`/api/nearby?lat=${lat}&lon=${lon}&radius=${radius}`);
			if (!resp.ok) throw new Error('Error al consultar centros');
			const data = await resp.json();
			if (!data || !data.length) {
				centersList.textContent = 'No se encontraron centros cercanos.';
			} else {
				data.forEach(place => centersList.appendChild(createCard(place)));
			}
		} catch (e) {
			centersList.textContent = 'Error buscando centros: ' + e.message;
		}

		findBtn.disabled = false;
		findBtn.textContent = 'Buscar centros cercanos';
	}, (err) => {
		centersList.textContent = 'Permiso de ubicación denegado o error: ' + err.message;
		findBtn.disabled = false;
		findBtn.textContent = 'Buscar centros cercanos';
	}, { enableHighAccuracy: false, timeout: 10000 });
}

if (findBtn) findBtn.addEventListener('click', findNearby);

console.log('[MindCare] nearby.js cargado');
