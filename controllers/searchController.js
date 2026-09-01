import Post from '../models/postModel.js';
import User from '../models/userModel.js';

// search posts by multiple criteria (text, author, group, type, date range)
export const searchPosts = async (req, res, next) => {
    try {
        // pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // build the search query based on provided filters
        const query = {};

        // search by post content (text)
        if (req.query.content && req.query.content.trim() !== "") {
            const regex = new RegExp(req.query.content.trim(), "i");
            query.content = { $regex: regex };
        }

        // search by author name
        if (req.query.author && req.query.author.trim() !== "") {
            const regex = new RegExp(req.query.author.trim(), "i");
            query.author = { $regex: regex };
        }

        // search by group name
        if (req.query.group && req.query.group.trim() !== "") {
            const regex = new RegExp(req.query.group.trim(), "i");
            query.group = { $regex: regex };
        }

        // filter by post type (text, image, video)
        if (req.query.type && req.query.type !== "all") {
            if (req.query.type === "text") {
                // text posts have no media or empty mediaUrl
                query.$or = [
                    { mediaUrl: "" },
                    { mediaUrl: { $exists: false } },
                    { mediaUrl: null }
                ];
            } else if (req.query.type === "image") {
                query.mediaType = "image";
            } else if (req.query.type === "video") {
                query.mediaType = "video";
            }
        }

        // filter by date range
        if (req.query.startDate || req.query.endDate) {
            query.createdAt = {};
            if (req.query.startDate) {
                const startDate = new Date(req.query.startDate);
                if (isNaN(startDate.getTime())) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Invalid start date format' 
                    });
                }
                query.createdAt.$gte = startDate;
            }
            if (req.query.endDate) {
                const endDate = new Date(req.query.endDate);
                if (isNaN(endDate.getTime())) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Invalid end date format' 
                    });
                }
                endDate.setHours(23, 59, 59, 999);
                query.createdAt.$lte = endDate;
            }
        }

        // execute the search query
        const totalPosts = await Post.countDocuments(query);
        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            posts: posts,
            currentPage: page,
            totalPages: Math.ceil(totalPosts / limit),
            totalResults: totalPosts,
            hasMore: (skip + posts.length) < totalPosts
        });
    } catch (error) {
        next(error);
    }
};

// search for groups and users by name, category, city, member count, and date
export const searchGroupsUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = {};

        // search by group/user name
        if (req.query.name && req.query.name.trim() !== "") {
            const regex = new RegExp(req.query.name.trim(), "i");
            query.groupName = { $regex: regex };
        }

        // search by category (if group model has this field)
        if (req.query.category && req.query.category.trim() !== "") {
            const regex = new RegExp(req.query.category.trim(), "i");
            query.category = { $regex: regex };
        }

        // search by city (if group model has this field)
        if (req.query.city && req.query.city.trim() !== "") {
            const regex = new RegExp(req.query.city.trim(), "i");
            query.city = { $regex: regex };
        }

        // filter by minimum member count
        if (req.query.minMembers && !isNaN(parseInt(req.query.minMembers))) {
            query.memberCount = { $gte: parseInt(req.query.minMembers) };
        }

        // filter by creation date range
        if (req.query.startDate || req.query.endDate) {
            query.createdAt = {};
            if (req.query.startDate) {
                const startDate = new Date(req.query.startDate);
                if (isNaN(startDate.getTime())) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Invalid start date format' 
                    });
                }
                query.createdAt.$gte = startDate;
            }
            if (req.query.endDate) {
                const endDate = new Date(req.query.endDate);
                if (isNaN(endDate.getTime())) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Invalid end date format' 
                    });
                }
                endDate.setHours(23, 59, 59, 999);
                query.createdAt.$lte = endDate;
            }
        }

        // execute the search query
        const totalResults = await Post.countDocuments(query);
        const results = await Post.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            results: results,
            currentPage: page,
            totalPages: Math.ceil(totalResults / limit),
            totalResults: totalResults,
            hasMore: (skip + results.length) < totalResults
        });
    } catch (error) {
        next(error);
    }
};

// get statistics about posts grouped by author (GroupBy query)
export const getPostStatsByAuthor = async (req, res, next) => {
    try {
        // aggregate posts by author and count them
        const stats = await Post.aggregate([
            {
                // group posts by author and count
                $group: {
                    _id: "$author",
                    postCount: { $sum: 1 },
                    lastPostDate: { $max: "$createdAt" }
                }
            },
            {
                // sort by post count in descending order
                $sort: { postCount: -1 }
            },
            {
                // limit to top 20 authors
                $limit: 20
            }
        ]);

        // handle case where no posts exist
        if (!stats || stats.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No posts found",
                stats: []
            });
        }

        return res.status(200).json({
            success: true,
            stats: stats,
            totalAuthors: stats.length
        });
    } catch (error) {
        next(error);
    }
};

// get statistics about posts grouped by type (GroupBy query)
export const getPostStatsByType = async (req, res, next) => {
    try {
        // aggregate posts by type and count them
        const stats = await Post.aggregate([
            {
                // add a field to determine post type if not already present
                $addFields: {
                    // determine post type based on mediaUrl and mediaType
                    postTypeDetected: {
                        $cond: [
                            {
                                $or: [
                                    { $eq: ["$mediaUrl", ""] },
                                    { $eq: ["$mediaUrl", null] },
                                    { $eq: [{ $type: "$mediaUrl" }, "missing"] }
                                ]
                            },
                            "text",
                            "$mediaType"
                        ]
                    }
                }
            },
            {
                // group posts by type and count
                $group: {
                    _id: "$postTypeDetected",
                    count: { $sum: 1 },
                    percentage: { $sum: 1 }
                }
            },
            {
                // sort by count in descending order
                $sort: { count: -1 }
            }
        ]);

        // calculate percentage for each post type
        const totalPosts = await Post.countDocuments({});

        // structure the stats with percentage
        const statsWithPercentage = stats.map(stat => ({
            type: stat._id || "unknown",
            count: stat.count,
            percentage: totalPosts > 0 ? ((stat.count / totalPosts) * 100).toFixed(2) : 0
        }));

        return res.status(200).json({
            success: true,
            stats: statsWithPercentage,
            totalPosts: totalPosts
        });
    } catch (error) {
        next(error);
    }
};
