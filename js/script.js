// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.getElementById('getImagesButton');
const animationToggleButton = document.getElementById('animationToggleButton');
const gallery = document.getElementById('gallery');
const spaceFactText = document.getElementById('spaceFactText');
const GALLERY_ITEM_COUNT = 9;

// Keep the animation button label in sync with the current motion state.
function updateAnimationButtonLabel() {
	const areAnimationsPaused = document.body.classList.contains('animations-paused');
	animationToggleButton.textContent = areAnimationsPaused
		? 'Play Animation'
		: 'Pause Animation';
}

// Space facts shown in the "Did You Know?" banner.
const spaceFacts = [
	'The Sun contains about 99.8% of the total mass in our solar system.',
	'One day on Venus is longer than one year on Venus.',
	'Neutron stars can spin more than 600 times every second.',
	'The footprints left on the Moon can last for millions of years.',
	'Jupiter has the shortest day of any planet in our solar system (about 10 hours).',
	'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
	'Saturn is so low-density that it would float in a giant enough ocean of water.',
];

// Read the key from js/config.js. Fallback to DEMO_KEY if missing.
const NASA_API_KEY = window.NASA_API_KEY || 'DEMO_KEY';
const APOD_BASE_URL = 'https://api.nasa.gov/planetary/apod';

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

function showRandomSpaceFact() {
	const randomIndex = Math.floor(Math.random() * spaceFacts.length);
	spaceFactText.textContent = spaceFacts[randomIndex];
}

// Convert a Date object into YYYY-MM-DD for NASA's API.
function formatDate(date) {
	return date.toISOString().split('T')[0];
}

// Build a guaranteed 9-day range from the selected start date.
// We also update the end date input so the UI always matches what we fetch.
function getNineDayRange() {
	const selectedStartDate = new Date(startInput.value);
	const selectedEndDate = new Date(endInput.value);
	const today = new Date();

	const startDate = new Date(selectedStartDate);
	let endDate = new Date(selectedEndDate);

	// If the user selected exactly 9 consecutive days, use it directly.
	const dayDifference = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
	const hasValidNineDaySelection = dayDifference === 8;

	// Otherwise, normalize to 9 days from the selected start date.
	if (!hasValidNineDaySelection) {
		endDate = new Date(startDate);
		endDate.setDate(startDate.getDate() + 8);
	}

	// If the 9-day window would go beyond today, shift the window back
	// so we still return exactly 9 consecutive days.
	if (endDate > today) {
		endDate = new Date(today);
		startDate.setTime(endDate.getTime());
		startDate.setDate(endDate.getDate() - 8);
	}

	// Keep the date inputs visually in sync with the normalized range.
	startInput.value = formatDate(startDate);
	endInput.value = formatDate(endDate);

	return {
		startDate: formatDate(startDate),
		endDate: formatDate(endDate),
	};
}

function showLoadingState() {
	gallery.innerHTML = '';

	// Create a loading message while API data is being fetched.
	const loadingMessage = document.createElement('div');
	loadingMessage.id = 'loadingMessage';
	loadingMessage.className = 'placeholder loading-message';
	loadingMessage.innerHTML = `
		<div class="placeholder-icon">🚀</div>
		<p>Loading 9 days of space images...</p>
	`;

	gallery.appendChild(loadingMessage);
}

function clearLoadingState() {
	const loadingMessage = document.getElementById('loadingMessage');
	if (loadingMessage) {
		loadingMessage.remove();
	}
}

function showErrorState(message) {
	gallery.innerHTML = `
		<div class="placeholder">
			<div class="placeholder-icon">⚠️</div>
			<p>${message}</p>
		</div>
	`;
}

function renderGallery(apodItems) {
	if (!Array.isArray(apodItems) || apodItems.length < GALLERY_ITEM_COUNT) {
		showErrorState('No images found for this date range. Try another date.');
		return;
	}

	const sortedItems = [...apodItems]
		.sort((a, b) => new Date(b.date) - new Date(a.date))
		.slice(0, GALLERY_ITEM_COUNT);

	gallery.innerHTML = sortedItems
		.map((item) => {
			const isVideo = item.media_type === 'video';

			// Build media section differently for images vs videos.
			let mediaMarkup = '';

			if (isVideo) {
				const thumbnailUrl = item.thumbnail_url || '';

				mediaMarkup = thumbnailUrl
					? `
						<div class="video-thumb-wrap">
							<img src="${thumbnailUrl}" alt="${item.title}" loading="lazy" />
							<span class="video-badge">VIDEO</span>
						</div>
					`
					: `<div class="video-placeholder">🎬 Video entry</div>`;
			} else {
				const imageUrl = item.url || item.hdurl;
				mediaMarkup = `<img src="${imageUrl}" alt="${item.title}" loading="lazy" />`;
			}

			const videoLinkMarkup = isVideo
				? `<a class="video-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Watch Video</a>`
				: '';

			return `
				<article class="card">
					${mediaMarkup}
					<div class="card-content">
						<h2>${item.title}</h2>
						<p class="date">${item.date}</p>
						${videoLinkMarkup}
					</div>
				</article>
			`;
		})
		.join('');
}

async function fetchApodForNineDays() {
	try {
		showLoadingState();

		const { startDate, endDate } = getNineDayRange();
		const requestUrl = `${APOD_BASE_URL}?api_key=${NASA_API_KEY}&start_date=${startDate}&end_date=${endDate}&thumbs=true`;

		const response = await fetch(requestUrl);
		if (!response.ok) {
			throw new Error(`API request failed with status ${response.status}`);
		}

		const apodData = await response.json();
		renderGallery(apodData);
	} catch (error) {
		showErrorState('Could not load NASA images right now. Please try again.');
		console.error('APOD fetch error:', error);
	} finally {
		// Remove loading message after fetch finishes (success or error).
		clearLoadingState();
	}
}

// When the user clicks the button, fetch a 9-day APOD range.
getImagesButton.addEventListener('click', fetchApodForNineDays);

// Toggle space-travel animations on/off.
animationToggleButton.addEventListener('click', () => {
	document.body.classList.toggle('animations-paused');
	updateAnimationButtonLabel();
});

// Show a random fact as soon as the page loads.
showRandomSpaceFact();

// Default: animation is on when the page opens.
document.body.classList.add('animations-enabled');
document.body.classList.remove('animations-paused');
updateAnimationButtonLabel();
