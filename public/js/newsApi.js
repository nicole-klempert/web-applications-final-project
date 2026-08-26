// Fetching real-time TV and entertainment schedule from TVMaze API 
async function fetchNews() {
    const newsContainer = document.getElementById("dynamic-news-container");
    if (!newsContainer) return;

    // active load before request
    newsContainer.innerHTML = '<div style="padding:20px; text-align:center;">Loading entertainment updates...</div>';

    try {
        // passing data to web service
        const countryCode = 'US';

        // fetch from backend proxy route instead of directly querying external api
        const response = await fetch(`/api/news?country=${countryCode}`);
        if (!response.ok) throw new Error("Network response was not ok");
        const shows = await response.json();

        newsContainer.innerHTML = ''; // clear loading state

        shows.forEach(item => {
            const showName = item.show.name;
            const network = item.show.network ? item.show.network.name : "Streaming";
            const url = item.show.url;

            // Formatting entertainment data
            const newsHTML = `
                <a href="${url}" target="_blank" class="news-item">
                    <strong>${showName}</strong>
                    <span>Airing Today on ${network} · TV & Entertainment</span>
                </a>
            `;
            newsContainer.insertAdjacentHTML('beforeend', newsHTML);
        });
    } catch (error) {
        console.error("Failed to fetch news service:", error);
        newsContainer.innerHTML = '<div style="padding:20px; color:#ef4444; text-align:center;">Failed to load updates.</div>';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Initial fetch on page load 
    fetchNews();
});