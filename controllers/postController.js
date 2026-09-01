import Post from '../models/postModel.js';
import User from '../models/userModel.js';
import Group from '../models/groupModel.js';
import { sharePost as shareToFacebookAPI } from '../services/facebookService.js';

// Normalize location data to ensure it has valid latitude and longitude
const normalizeLocation = location => {
    if (!location) return undefined;

    // Ensure latitude and longitude are numbers and within valid ranges
    const latitude = Number(location.latitude), longitude = Number(location.longitude);

    // Validate latitude and longitude ranges
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return undefined;
    return { name: String(location.name || '').trim(), address: String(location.address || '').trim(), latitude, longitude };
};

const accessiblePostQuery = async userId => {
    // take all public groups and groups where the user is a member, and return posts that are either in those groups or have no group
    const groupQuery = userId
        ? { $or: [{ members: userId }, { isPublic: { $ne: false } }] }
        : { isPublic: { $ne: false } };

    // Find accessible groups and get their IDs
    const groups = await Group.find(groupQuery).select('_id');
    return { $or: [{ group: null }, { group: { $exists: false } }, { group: { $in: groups.map(group => group._id) } }] };
};

// Calculate the distance between two geographic coordinates in meters using the Haversine formula
const distanceInMeters = (a, b) => {
    const toRadians = value => value * Math.PI / 180, R = 6371000;
    const dLat = toRadians(b.latitude - a.latitude), dLng = toRadians(b.longitude - a.longitude), lat1 = toRadians(a.latitude), lat2 = toRadians(b.latitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

// GET /posts 
export const getPosts = async (req, res, next) => {
    try {
        // Pagination parameters with defaults
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;
        const query = {};

        // Ensure query.$and is initialized safely
        query.$and = [];
        const currentUserId = req.session?.user?.id;

        // save the groups where the current user is a member for filtering later
        const memberGroups = currentUserId ? await Group.find({ members: currentUserId }).select('_id name') : [];
        const memberGroupIds = memberGroups.map(group => group._id);

        // filter posts based on accessible groups (public or member)
        const accessibleGroupsQuery = currentUserId
            ? { $or: [{ members: currentUserId }, { isPublic: { $ne: false } }] }
            : { isPublic: { $ne: false } };

        // Find accessible groups and get their IDs
        const accessibleGroups = await Group.find(accessibleGroupsQuery).select('_id');
        const accessibleGroupIds = accessibleGroups.map(group => group._id);

        // Add a filter to the query to include posts that are either not associated with any group or belong to accessible groups
        query.$and.push({ $or: [{ group: null }, { group: { $exists: false } }, { group: { $in: accessibleGroupIds } }] });

        // text search across content and author fields
        if (req.query.search && req.query.search.trim() !== "") {
            const regex = new RegExp(req.query.search.trim(), "i");
            query.$and.push({ $or: [{ content: { $regex: regex } }, { author: { $regex: regex } }] });
        }

        // filter by author if explicitly provided
        if (req.query.author && req.query.author.trim() !== "") {
            const authorRegex = new RegExp(req.query.author.trim(), "i");
            const authorFilter = { author: { $regex: authorRegex } };
            query.$and = query.$and || [];
            query.$and.push(authorFilter);
        }

        // filter by group if explicitly provided
        if (req.query.group && req.query.group.trim() !== "") {
            const groupRegex = new RegExp(req.query.group.trim(), "i");
            const matchingGroups = await Group.find({ name: { $regex: groupRegex } }).select('_id');
            const groupFilter = { group: { $in: matchingGroups.map(group => group._id) } };
            query.$and = query.$and || [];
            query.$and.push(groupFilter);
        }

        // filter by date range if startDate or endDate is provided
        if (req.query.startDate || req.query.endDate) {
            query.createdAt = {};

            // if startDate is provided, set the lower bound for createdAt
            if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
            // if endDate is provided, set the upper bound for createdAt, adjust it to include the entire day
            if (req.query.endDate) {
                const end = new Date(req.query.endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // filter by post type
        if (req.query.type && req.query.type !== "all") {
            if (req.query.type === "text") {
                query.$and.push({ $or: [{ mediaUrl: "" }, { mediaUrl: { $exists: false } }, { mediaUrl: null }] });
            } else if (req.query.type === "image") {
                query.mediaType = "image";
            } else if (req.query.type === "video") {
                query.mediaType = "video";
            }
        }

        // Feed Scope filtering (Friends + Groups Multi-select logic)
        const { feedScopes, currentUser } = req.query;

        // if feedScopes is provided and not equal to 'all', filter posts based on the specified scopes (friends and/or groups)
        if (feedScopes && feedScopes !== 'all') {
            const scopesArray = feedScopes.split(",");
            const scopeConditions = [];

            // add currentUser's friends and currentUser itself to the filter if 'friends' scope is selected
            if (scopesArray.includes('friends') && currentUser) {
                // currentUser's friends + currentUser itself
                const user = await User.findByUsername(currentUser);
                const authorsList = [...((user && user.friends) ? user.friends : []), currentUser];
                scopeConditions.push({ author: { $in: authorsList } });
            }

            if (scopesArray.includes('groups')) {
                // Placeholder for groups: expects a groupId
                scopeConditions.push({ group: { $in: memberGroupIds } });
            }

            if (scopeConditions.length > 0) {
                // Return posts that match EITHER friends OR groups
                query.$and.push({ $or: scopeConditions });
            }
        }

        // Clean up empty $and array to prevent MongoDB errors
        if (query.$and.length === 0) {
            delete query.$and;
        }

        // Count total posts matching the query for pagination
        const totalPosts = await Post.countDocuments(query);
        const posts = await Post.find(query)
            .populate('group', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Return the paginated posts along with pagination metadata
        return res.status(200).json({
            success: true,
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalPosts / limit),
            hasMore: (skip + posts.length) < totalPosts
        });
    } catch (error) {
        next(error);
    }
};

// GET /posts/map
export const getMapPosts = async (req, res, next) => {
    try {
        // Get accessible posts based on the current user's session
        const access = await accessiblePostQuery(req.session?.user?.id);
        const radius = Math.min(Math.max(Number(req.query.radius) || 500, 50), 5000);
        let center = null;

        // if a postId is provided, use its location as the center for filtering nearby posts
        if (req.query.postId) {
            const selected = await Post.findOne({ _id: req.query.postId, ...access }).select('location');

            // Validate that the selected post has a valid location
            if (!selected || !Number.isFinite(selected.location?.latitude) || !Number.isFinite(selected.location?.longitude)) {
                return res.status(404).json({ success: false, error: 'Post location not found' });
            }

            // Set the center coordinates based on the selected post's location
            center = {
                latitude: selected.location.latitude,
                longitude: selected.location.longitude
            };
        }

        // Fetch posts that are accessible and have valid location data
        const posts = await Post.find({
            ...access,
            'location.latitude': { $ne: null },
            'location.longitude': { $ne: null }
        })
            .populate('group', 'name')
            .sort({ createdAt: -1 })
            .limit(300);

        // Filter posts based on the distance from the center if a center is defined
        const visible = center ? posts.filter(post => distanceInMeters(center, post.location) <= radius) : posts;

        // Return the filtered posts along with the center and radius information
        res.json({
            success: true,
            center,
            posts: visible,
            radius
        });
    } catch (error) {
        next(error);
    }
};

// GET /posts/:postId
export const getPostById = async (req, res, next) => {
    try {

        // Fetch the post by ID and populate the group name
        const post = await Post.findById(req.params.postId).populate('group', 'name');

        // If the post is not found, return a 404 error
        if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
        return res.status(200).json({ success: true, post });
    } catch (error) {
        next(error);
    }
};

// POST /posts
export const createPost = async (req, res, next) => {
    try {
        // Destructure the required fields from the request body
        const { authorProfilePic, content, mediaUrl, mediaType, shareToFacebook, groupId, location } = req.body;
        let group = null;

        // If a groupId is provided, validate the group and check if the user is a member
        if (groupId) {
            group = await Group.findById(groupId);

            // If the group is not found, return a 404 error
            if (!group) {
                return res.status(404).json({ success: false, error: 'Group not found' });
            }

            // Check if the current user is a member of the group; if not, return a 403 error
            if (!(group.members || []).some(member => String(member) === String(req.session.user.id))) {
                return res.status(403).json({ success: false, error: 'Only group members can publish posts in this group' });
            }
        }

        // Create a new post instance with the provided data and default values
        const newPost = new Post({
            author: req.session.user.username || "Anonymous",
            authorProfilePic: authorProfilePic || "",
            content: content || "",
            mediaUrl: mediaUrl || "",
            mediaType: mediaType || "",
            postType: mediaType || "text",
            group: group ? group._id : null,
            location: normalizeLocation(location),
            likedBy: [],
            comments: []
        });
        const savedPost = await newPost.save();

        let sharedToFacebook = false;
        let fbPostId = null;

        // If the user opted to share the post to Facebook and the content is not empty, call the Facebook sharing service
        if (shareToFacebook && content && content.trim() !== "") {
            const fbResult = await shareToFacebookAPI(content.trim());

            // If the Facebook sharing was successful, update the flags accordingly
            if (fbResult.success) {
                sharedToFacebook = true;
                fbPostId = fbResult.id;
            }
        }

        await savedPost.populate('group', 'name');

        // Return the newly created post along with the Facebook sharing status
        return res.status(201).json({
            success: true,
            post: savedPost,
            sharedToFacebook,
            fbPostId
        });
    } catch (error) {
        next(error);
    }
};

// POST /posts/:postId/comments
export const addComment = async (req, res, next) => {
    try {
        // Destructure the required fields from the request body
        const { author, authorProfilePic = "", text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ success: false, error: "Comment text is required" });

        // Fetch the post by ID to add the comment
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ success: false, error: "Post not found" });

        // Add the new comment to the post's comments array with author details and timestamp
        post.comments.push({
            author: author || "User",
            authorProfilePic: authorProfilePic || "",
            authorInitials: author ? author.substring(0, 2).toUpperCase() : "US",
            text: text.trim(),
            createdAt: new Date()
        });
        await post.save();
        return res.status(201).json({ success: true, comment: post.comments[post.comments.length - 1] });
    } catch (error) {
        next(error);
    }
};

// DELETE /posts/:postId/comments/:commentId
export const deleteComment = async (req, res, next) => {
    try {

        // Fetch the post by ID to delete the comment
        const post = await Post.findById(req.params.postId);

        // If the post is not found, return a 404 error
        if (!post) return res.status(404).json({ success: false, error: "Post not found" });
        post.comments = post.comments.filter(c => c._id.toString() !== req.params.commentId);
        await post.save();

        // Return a success response after deleting the comment
        return res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

// POST /posts/:postId/like
export const toggleLike = async (req, res, next) => {
    try {
        // Destructure the username from the request body
        const { username } = req.body;
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ success: false, error: "Post not found" });

        // Check if the username is already in the likedBy array; if not, add it, otherwise remove it
        const idx = post.likedBy.indexOf(username);
        const isLiked = idx === -1;
        isLiked ? post.likedBy.push(username) : post.likedBy.splice(idx, 1);
        post.likes = post.likedBy.length;
        await post.save();

        // Return the updated likes count and likedBy array along with the like status
        return res.status(200).json({ success: true, likes: post.likes, likedBy: post.likedBy, isLiked });
    } catch (error) {
        next(error);
    }
};

// PUT /posts/:postId
export const updatePost = async (req, res, next) => {
    try {

        // Destructure the fields to be updated from the request body
        const { content, mediaUrl, mediaType, username, location } = req.body;
        const post = await Post.findById(req.params.postId);

        // If the post is not found, return a 404 error
        if (!post) return res.status(404).json({ success: false, error: "Post not found" });

        // check if the username matches the post author (case-insensitive)
        if (username && post.author.toLowerCase() !== username.toLowerCase()) {
            return res.status(403).json({ success: false, error: "403 Forbidden: You are not authorized to edit this post" });
        }

        // Update the post fields only if they are provided in the request body 
        if (content !== undefined) post.content = content;

        // Update mediaUrl and mediaType if they are provided, and adjust postType accordingly
        if (mediaUrl !== undefined) post.mediaUrl = mediaUrl;

        // Update mediaType and postType if mediaType is provided
        if (mediaType !== undefined) {
            post.mediaType = mediaType;
            post.postType = mediaType || "text";
        }

        // Update location if it is provided in the request body, allowing for null to clear the location
        if (Object.prototype.hasOwnProperty.call(req.body, "location")) {

            // If location is explicitly set to null, clear the location field
            if (location === null) {
                post.location = {
                    name: "",
                    address: "",
                    latitude: null,
                    longitude: null
                };
            } else {
                const normalizedLocation = normalizeLocation(location);

                // If the normalized location is invalid, return a 400 error
                if (!normalizedLocation) {
                    return res.status(400).json({ success: false, error: "Invalid post location" });
                }

                post.location = normalizedLocation;
            }
        }

        await post.save();
        return res.status(200).json({ success: true, post });
    } catch (error) {
        next(error);
    }
};

// DELETE /posts/:postId
export const deletePost = async (req, res, next) => {
    try {
        // Fetch the post by ID to delete it
        const post = req.post || await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ success: false, error: "Post not found" });

        // check ownership on the server side - return 403 if the user is not the owner
        if (post.author.toLowerCase() !== req.user.username.toLowerCase()) {
            return res.status(403).json({ success: false, error: "403 Forbidden: You are not authorized to delete this post" });
        }

        await Post.findByIdAndDelete(req.params.postId);
        return res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};