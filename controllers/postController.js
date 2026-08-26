import Post from '../models/postModel.js';
import User from '../models/userModel.js';

// GET /posts 
export const getPosts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;
        const query = {};

        // Ensure query.$and is initialized safely
        query.$and = [];

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
            const groupFilter = { group: { $regex: groupRegex } };
            query.$and = query.$and || [];
            query.$and.push(groupFilter);
        }

        // filter by date range if startDate or endDate is provided
        if (req.query.startDate || req.query.endDate) {
            query.createdAt = {};
            if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
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
        if (feedScopes && feedScopes !== 'all' && currentUser) {
            const scopesArray = feedScopes.split(",");
            const user = await User.findByUsername(currentUser);
            const scopeConditions = [];

            if (scopesArray.includes('friends')) {
                // currentUser's friends + currentUser itself
                const authorsList = [...((user && user.friends) ? user.friends : []), currentUser];
                scopeConditions.push({ author: { $in: authorsList } });
            }

            if (scopesArray.includes('groups')) {
                // Placeholder for groups: expects a groupId
                scopeConditions.push({ groupId: { $exists: true } });
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

        // Clean up empty $and array to prevent MongoDB errors
        if (query.$and.length === 0) {
            delete query.$and;
        }

        const totalPosts = await Post.countDocuments(query);
        const posts = await Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);

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

export const getPostById = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
        return res.status(200).json({ success: true, post });
    } catch (error) {
        next(error);
    }
};

export const createPost = async (req, res, next) => {
    try {
        const { author, authorProfilePic, content, mediaUrl, mediaType } = req.body;
        const newPost = new Post({
            author: author || "Anonymous",
            authorProfilePic: authorProfilePic || "",
            content: content || "",
            mediaUrl: mediaUrl || "",
            mediaType: mediaType || "",
            postType: mediaType || "text",
            likedBy: [],
            comments: []
        });
        const savedPost = await newPost.save();
        return res.status(201).json({ success: true, post: savedPost });
    } catch (error) {
        next(error);
    }
};

export const addComment = async (req, res, next) => {
    try {
        const { author, authorProfilePic = "", text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ success: false, error: "Comment text is required" });

        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ success: false, error: "Post not found" });

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

export const deleteComment = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ success: false, error: "Post not found" });
        post.comments = post.comments.filter(c => c._id.toString() !== req.params.commentId);
        await post.save();
        return res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

export const toggleLike = async (req, res, next) => {
    try {
        const { username } = req.body;
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ success: false, error: "Post not found" });

        const idx = post.likedBy.indexOf(username);
        const isLiked = idx === -1;
        isLiked ? post.likedBy.push(username) : post.likedBy.splice(idx, 1);
        post.likes = post.likedBy.length;
        await post.save();

        return res.status(200).json({ success: true, likes: post.likes, likedBy: post.likedBy, isLiked });
    } catch (error) {
        next(error);
    }
};

export const updatePost = async (req, res, next) => {
    try {
        const { content, mediaUrl, mediaType, username } = req.body;
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ success: false, error: "Post not found" });

        // check if the username matches the post author (case-insensitive)
        if (username && post.author.toLowerCase() !== username.toLowerCase()) {
            return res.status(403).json({ success: false, error: "403 Forbidden: You are not authorized to edit this post" });
        }

        if (content !== undefined) post.content = content;
        if (mediaUrl !== undefined) post.mediaUrl = mediaUrl;
        if (mediaType !== undefined) {
            post.mediaType = mediaType;
            post.postType = mediaType || "text";
        }

        await post.save();
        return res.status(200).json({ success: true, post });
    } catch (error) {
        next(error);
    }
};

export const deletePost = async (req, res, next) => {
    try {
        const { username } = req.body || req.query;
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ success: false, error: "Post not found" });

        // check ownership on the server side - return 403 if the user is not the owner
        if (username && post.author.toLowerCase() !== username.toLowerCase()) {
            return res.status(403).json({ success: false, error: "403 Forbidden: You are not authorized to delete this post" });
        }

        await Post.findByIdAndDelete(req.params.postId);
        return res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};