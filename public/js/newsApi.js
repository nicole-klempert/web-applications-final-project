// --- Web Service Request (AJAX via fetch API) ---
// Fetching real-time TV and entertainment schedule from TVMaze API (100% free, no key needed)
async function fetchNews() {
    const newsContainer = document.getElementById("dynamic-news-container");
    if (!newsContainer) return;

    try {
        const response = await fetch('https://api.tvmaze.com/schedule?country=US');
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();

        // get top 4 shows airing today
        const shows = data.slice(0, 4);

        newsContainer.innerHTML = ''; // clear loading state

        shows.forEach(item => {
            const showName = item.show.name;
            const network = item.show.network ? item.show.network.name : "Streaming";
            const url = item.show.url;

            // Formatting real entertainment data 
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
    // Initial fetch on page load with a slight delay to ensure DOM is ready
    setTimeout(() => {
        fetchNews();
    }, 600);
});