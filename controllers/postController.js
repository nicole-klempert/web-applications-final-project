import Post from '../models/postModel.js';

// GET /posts 
export const getPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;
        const query = {};

        // text search across content and author fields (case-insensitive)
        if (req.query.search && req.query.search.trim() !== "") {
            const regex = new RegExp(req.query.search.trim(), "i");
            query.$or = [{ content: { $regex: regex } }, { author: { $regex: regex } }];
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

        // filter by post type (text, image, video) if specified
        if (req.query.type && req.query.type !== "all") {
            if (req.query.type === "text") {
                // posts with no mediaUrl or mediaUrl is empty string or null
                query.$and = [
                    { $or: [{ mediaUrl: "" }, { mediaUrl: { $exists: false } }, { mediaUrl: null }] }
                ];
            } else if (req.query.type === "image") {
                query.mediaType = "image";
            } else if (req.query.type === "video") {
                query.mediaType = "video";
            }
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
        console.error('Error fetching posts:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch posts' });
    }
};

export const getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
        return res.status(200).json({ success: true, post });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to fetch post' });
    }
};

export const createPost = async (req, res) => {
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
        return res.status(500).json({ success: false, error: 'Failed to create post' });
    }
};

export const addComment = async (req, res) => {
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
        return res.status(500).json({ success: false, error: "Failed to add comment" });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ success: false, error: "Post not found" });
        post.comments = post.comments.filter(c => c._id.toString() !== req.params.commentId);
        await post.save();
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Failed to delete comment" });
    }
};

export const toggleLike = async (req, res) => {
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
        return res.status(500).json({ success: false, error: "Failed to update likes" });
    }
};

export const updatePost = async (req, res) => {
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
        return res.status(500).json({ success: false, error: "Failed to update post" });
    }
};

export const deletePost = async (req, res) => {
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
        return res.status(500).json({ success: false, error: "Failed to delete post" });
    }
};