//service to interact with the external TVMaze API

/**
 * fetches today's tv schedule from TVMaze US schedule
 * @param {string} country - The country code to fetch the schedule for.
 * @returns {Promise<Array>} list of shows from TVMaze.
 */

export const fetchTodaySchedule = async (country) => {
    try {
        // usage of dynamic data in request
        const response = await fetch(`https://api.tvmaze.com/schedule?country=${country}`);
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