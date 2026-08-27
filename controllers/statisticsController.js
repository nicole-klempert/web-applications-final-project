import Group from '../models/groupModel.js';
import Post from '../models/postModel.js';


/*
 * ==================================================
 * AGGREGATION 1
 * POSTS PER GROUP
 * ==================================================
 *
 * Returns the number of posts that belong to each group.
 *
 * Uses:
 * - $match
 * - $group
 * - $lookup
 * - $unwind
 * - $project
 * - $sort
 *
 * GET /groups/statistics/posts-per-group
 */
export const getPostsPerGroup = async (req, res, next) => {
    try {
        const results =
            await Post.aggregate([
                /*
                 * Only group posts.
                 * Regular Feed posts have group: null.
                 */
                {
                    $match: {
                        group: {
                            $ne: null
                        }
                    }
                },
                /*
                 * Group all posts by their Group ObjectId
                 * and count how many posts each group has.
                 */
                {
                    $group: {

                        _id:
                            "$group",

                        postCount: {
                            $sum: 1
                        }
                    }
                },


                /*
                 * The $group stage gives us only the
                 * group ObjectId.
                 *
                 * Use $lookup to get the actual group
                 * information, including its name.
                 */
                {
                    $lookup: {
                        from:
                            Group.collection.name,
                        localField:
                            "_id",
                        foreignField:
                            "_id",
                        as:
                            "group"
                    }
                },


                /*
                 * Convert the group array returned by
                 * $lookup into a single object.
                 */
                {
                    $unwind:
                        "$group"
                },


                /*
                 * Return only the fields needed by
                 * the statistics page.
                 */
                {
                    $project: {
                        _id: 0,
                        groupId:
                            "$group._id",
                        groupName:
                            "$group.name",
                        category:
                            "$group.category",
                        city:
                            "$group.city",
                        postCount: 1
                    }
                },


                /*
                 * Highest number of posts first.
                 */
                {
                    $sort: {
                        postCount: -1,
                        groupName: 1
                    }
                }

            ]);


        /*
         * No data is not an error.
         * Return an empty array so the frontend
         * can display a proper "No data" message.
         */
        if (results.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message:
                    "No group posts found."
            });
        }
        return res.status(200).json({
            success: true,
            data:
                results
        });
    } catch (error) {
        next(error);
    }
};



/*
 * ==================================================
 * AGGREGATION 2
 * UNIQUE GROUP MEMBERS PER CITY
 * ==================================================
 *
 * Returns the number of unique users who belong
 * to groups in each city.
 *
 * If the same user belongs to two groups in the
 * same city, the user is counted only once.
 *
 * Uses:
 * - $match
 * - $unwind
 * - $group
 * - $project
 * - $sort
 *
 * GET /groups/statistics/members-per-city
 */
export const getMembersPerCity = async (req, res, next) => {
    try {
        const results =
            await Group.aggregate([
                /*
                 * Ignore groups that do not have
                 * a city.
                 */
                {
                    $match: {
                        city: {
                            $exists: true,
                            $ne: ""
                        }
                    }
                },
                /*
                 * Create one aggregation document
                 * for every member of every group.
                 */
                {
                    $unwind:
                        "$members"
                },

                /*
                 * Group by city.
                 *
                 * $addToSet is used so the same user
                 * is counted only once per city.
                 */
                {
                    $group: {
                        _id: {
                            $toLower:
                                "$city"
                        },
                        city: {
                            $first:
                                "$city"
                        },
                        members: {
                            $addToSet:
                                "$members"
                        },
                        groupIds: {
                            $addToSet:
                                "$_id"
                        }
                    }
                },
                /*
                 * Count the unique members and groups.
                 */
                {
                    $project: {
                        _id: 0,
                        city: 1,
                        memberCount: {
                            $size:
                                "$members"
                        },
                        groupCount: {
                            $size:
                                "$groupIds"
                        }
                    }
                },


                /*
                 * Highest member count first.
                 */
                {
                    $sort: {
                        memberCount: -1,
                        city: 1
                    }
                }
            ]);


        /*
         * No statistics available.
         */
        if (results.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message:
                    "No group location data found."
            });
        }

        return res.status(200).json({
            success: true,
            data:
                results
        });

    } catch (error) {
        next(error);
    }
};