import { fetchTodaySchedule } from '../services/newsService.js';

/**
 * controller to handle requests for external news/shows
 * calls newsService and returns the top 4 shows
 */
export const getNews = async (req, res, next) => {
    try {
        // get data from frontend, US as deafult
        const country = req.query.country || 'US';

        const schedule = await fetchTodaySchedule(country);

        // take the top 4 shows
        const topShows = schedule.slice(0, 4);

        return res.status(200).json(topShows);
    } catch (error) {
        next(error);
    }
};