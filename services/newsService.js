/**
 * service to interact with the external TVMaze API.
 * fulfills the project requirement to consume an external web service on the backend.
 */

/**
 * fetches today's tv schedule from TVMaze US schedule.
 * @returns {Promise<Array>} list of shows from TVMaze.
 */
export const fetchTodaySchedule = async () => {
    try {
        const response = await fetch('https://api.tvmaze.com/schedule?country=US');
        if (!response.ok) {
            throw new Error(`TVMaze API responded with status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[newsService Error] Failed to fetch from TVMaze:', error);
        throw error;
    }
};
