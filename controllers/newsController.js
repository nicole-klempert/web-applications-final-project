import { fetchTodaySchedule } from '../services/newsService.js';

/**
 * controller to handle requests for external news/shows.
 * calls newsService and returns the top 4 shows.
 */
export const getNews = async (req, res, next) => {
    try {
        const schedule = await fetchTodaySchedule();

        // take the top 4 shows (just as the frontend did)
        const topShows = schedule.slice(0, 4);

        return res.status(200).json(topShows);
    } catch (error) {
        next(error);
    }
};
