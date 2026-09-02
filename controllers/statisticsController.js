import User from '../models/userModel.js';

// helper function that returns aggrigation for the mongoDB. 
// it groups users by there city field and calculates the total fot each city
const cityPipeline = match => [

    // filter documents based on provided conditions (e.g. specific IDs or usernames)
    { $match: match },

    // format the city field 
    {
        $project: {
            city: {
                $let: {
                    vars: {
                        value: { $trim: { input: { $ifNull: ['$city', ''] } } }
                    }, in: { $cond: [{ $eq: ['$$value', ''] }, 'not specified', '$$value'] }
                }
            }
        }
    },

    // groupby city name and increment the count for each user
    { $group: { _id: '$city', count: { $sum: 1 } } },

    // reshape the output to exclude default '_id' and define city field
    { $project: { _id: 0, city: '$_id', count: 1 } },

    // sort results descending by count, then ascending alphabetically by city
    { $sort: { count: -1, city: 1 } }];

// GET: group the logged-in user's friends by profile city
export const getFriendsByCity = async (req, res, next) => {
    try {
        // Retrieve the current user from the database using their session ID
        const user = await User.findById(req.session.user.id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        // Extract the friends list and standardize the usernames (lowercase and trimmed) for matching
        const friendUsernames = (user.friends || []).map(username => String(username).toLowerCase().trim());

        // If the user has no friends, return an empty dataset immediately to avoid unnecessary DB queries
        if (!friendUsernames.length) return res.json({ success: true, data: [], totalFriends: 0 });

        // Run the aggregation pipeline to find and group the matching friends
        const data = await User.aggregate(cityPipeline({ username: { $in: friendUsernames } }));
        res.json({ success: true, data, totalFriends: data.reduce((sum, item) => sum + item.count, 0) });
    } catch (error) {
        next(error); // Pass any errors to the global error handling middleware
    }
};
// GET: group members of a managed group by profile city
export const getGroupMembersByCity = async (req, res, next) => {
    try {
        // Retrieve the group object (assumed to be attached to 'req' by a previous routing middleware)
        const group = req.group;
        const memberIds = group.members || [];

        // If the group has members, run the aggregation pipeline matching their User IDs; otherwise, return an empty array
        const data=memberIds.length ? await User.aggregate(cityPipeline({_id: {$in:memberIds} })):[];
        res.json({
            success: true,
            data,
            groupName: group.name,
            totalMembers: data.reduce((sum, item) => sum + item.count, 0)
        });
    }

    catch (error) {
        next(error);
    }
};
