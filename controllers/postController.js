import Post from '../models/postModel.js';
import Group from '../models/groupModel.js';


// helper function for comparing MongoDB ObjectIds
const sameId = (firstId, secondId) => {
    if (!firstId || !secondId) {
        return false;
    }

    return firstId.toString() === secondId.toString();
};


// GET /posts 
export const getPosts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;
        const query = {};


        /*
         * GROUP FILTER
         *
         * if a group id is provided:
         * return only posts that belong to that group.
         *
         * if no group id is provided:
         * return only regular feed posts.
         */
        if (req.query.group && req.query.group.trim() !== "") {

            query.group = req.query.group.trim();

        } else {

            /*
             * Regular feed posts.
             *
             * New regular posts are saved with group: null.
             *
             * $exists also supports older posts that were created
             * before the group feature was implemented.
             *
             * $expr supports older documents where group was saved
             * as an empty string.
             */
            query.$and = [
                {
                    $or: [
                        { group: null },
                        { group: { $exists: false } }
                    ]
                }
            ];
        }


        // text search across content and author fields (case-insensitive)
        if (req.query.search && req.query.search.trim() !== "") {
            const regex = new RegExp(req.query.search.trim(), "i");

            /*
             * if we already have an $and array because of the regular
             * feed filter, add the search condition into that array.
             *
             * this prevents the search $or from overriding the group filter.
             */
            if (query.$and) {
                query.$and.push({
                    $or: [
                        { content: { $regex: regex } },
                        { author: { $regex: regex } }
                    ]
                });
            } else {
                query.$or = [
                    { content: { $regex: regex } },
                    { author: { $regex: regex } }
                ];
            }
        }


        // filter by date range if startDate or endDate is provided
        if (req.query.startDate || req.query.endDate) {
            query.createdAt = {};

            if (req.query.startDate) {
                query.createdAt.$gte = new Date(req.query.startDate);
            }

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
                const textPostCondition = {
                    $or: [
                        { mediaUrl: "" },
                        { mediaUrl: { $exists: false } },
                        { mediaUrl: null }
                    ]
                };


                /*
                 * preserve existing filters instead of replacing them
                 */
                if (!query.$and) {
                    query.$and = [];
                }

                query.$and.push(
                    textPostCondition
                );

            } else if (req.query.type === "image") {

                query.mediaType = "image";

            } else if (req.query.type === "video") {

                query.mediaType = "video";
            }
        }


        const totalPosts = await Post.countDocuments(query);

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);


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


// GET /posts/:postId
export const getPostById = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        return res.status(200).json({
            success: true,
            post
        });

    } catch (error) {
        next(error);
    }
};


// POST /posts
export const createPost = async (req, res, next) => {
    try {

        const {
            author,
            authorProfilePic,
            content,
            mediaUrl,
            mediaType,

            // optional - only sent when creating a post inside a group
            groupId
        } = req.body;


        let group = null;


        /*
         * GROUP POST
         *
         * if groupId exists, this post belongs to a group.
         * only members of the group are allowed to publish.
         */
        if (groupId) {

            group = await Group.findById(groupId);


            if (!group) {
                return res.status(404).json({
                    success: false,
                    error: "Group not found"
                });
            }


            const currentUserId =
                req.session.user.id;


            const isMember =
                group.members.some(
                    member =>
                        sameId(
                            member,
                            currentUserId
                        )
                );


            if (!isMember) {
                return res.status(403).json({
                    success: false,
                    error:
                        "You must be a member of this group to publish a post."
                });
            }
        }


        /*
         * use the authenticated username when possible.
         *
         * the browser username is still kept as a fallback
         * to preserve the existing post creation behaviour.
         */
        const postAuthor =
            req.session?.user?.username ||
            author ||
            "Anonymous";


        const newPost = new Post({

            author:
                postAuthor,

            authorProfilePic:
                authorProfilePic || "",

            /*
             * null = regular feed post
             * ObjectId = group post
             */
            group:
                group
                    ? group._id
                    : null,

            content:
                content || "",

            mediaUrl:
                mediaUrl || "",

            mediaType:
                mediaType || "",

            postType:
                mediaType || "text",

            likedBy: [],

            comments: []
        });


        const savedPost =
            await newPost.save();


        return res.status(201).json({
            success: true,
            post: savedPost
        });

    } catch (error) {
        next(error);
    }
};


// POST /posts/:postId/comments
export const addComment = async (req, res, next) => {
    try {
        const {
            author,
            authorProfilePic = "",
            text
        } = req.body;


        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                error: "Comment text is required"
            });
        }


        const post =
            await Post.findById(
                req.params.postId
            );


        if (!post) {
            return res.status(404).json({
                success: false,
                error: "Post not found"
            });
        }


        post.comments.push({
            author:
                author || "User",

            authorProfilePic:
                authorProfilePic || "",

            authorInitials:
                author
                    ? author.substring(0, 2).toUpperCase()
                    : "US",

            text:
                text.trim(),

            createdAt:
                new Date()
        });


        await post.save();


        return res.status(201).json({
            success: true,
            comment:
                post.comments[
                post.comments.length - 1
                ]
        });

    } catch (error) {
        next(error);
    }
};


// DELETE /posts/:postId/comments/:commentId
export const deleteComment = async (req, res, next) => {
    try {

        const post =
            await Post.findById(
                req.params.postId
            );


        if (!post) {
            return res.status(404).json({
                success: false,
                error: "Post not found"
            });
        }


        post.comments =
            post.comments.filter(
                c =>
                    c._id.toString() !==
                    req.params.commentId
            );


        await post.save();


        return res.status(200).json({
            success: true
        });

    } catch (error) {
        next(error);
    }
};


// POST /posts/:postId/like
export const toggleLike = async (req, res, next) => {
    try {

        const { username } =
            req.body;


        const post =
            await Post.findById(
                req.params.postId
            );


        if (!post) {
            return res.status(404).json({
                success: false,
                error: "Post not found"
            });
        }


        const idx =
            post.likedBy.indexOf(
                username
            );


        const isLiked =
            idx === -1;


        isLiked
            ? post.likedBy.push(username)
            : post.likedBy.splice(idx, 1);


        post.likes =
            post.likedBy.length;


        await post.save();


        return res.status(200).json({
            success: true,
            likes: post.likes,
            likedBy: post.likedBy,
            isLiked
        });

    } catch (error) {
        next(error);
    }
};


// PUT /posts/:postId
export const updatePost = async (req, res, next) => {
    try {

        const {
            content,
            mediaUrl,
            mediaType,
            username
        } = req.body;


        /*
         * isPostOwner middleware already loads the post
         * and checks that the logged-in user owns it.
         *
         * req.post is therefore used when available.
         */
        const post =
            req.post ||
            await Post.findById(
                req.params.postId
            );


        if (!post) {
            return res.status(404).json({
                success: false,
                error: "Post not found"
            });
        }


        // check if the username matches the post author (case-insensitive)
        // keep this check for compatibility with the existing application
        if (
            username &&
            post.author.toLowerCase() !==
            username.toLowerCase()
        ) {

            return res.status(403).json({
                success: false,
                error:
                    "403 Forbidden: You are not authorized to edit this post"
            });
        }


        if (content !== undefined) {
            post.content = content;
        }


        if (mediaUrl !== undefined) {
            post.mediaUrl = mediaUrl;
        }


        if (mediaType !== undefined) {

            post.mediaType =
                mediaType;

            post.postType =
                mediaType || "text";
        }


        await post.save();


        return res.status(200).json({
            success: true,
            post
        });

    } catch (error) {
        next(error);
    }
};


// DELETE /posts/:postId
export const deletePost = async (req, res, next) => {
    try {

        /*
         * ownership is already checked by
         * isPostOwner middleware before this controller runs.
         */

        const post =
            req.post ||
            await Post.findById(
                req.params.postId
            );


        if (!post) {
            return res.status(404).json({
                success: false,
                error: "Post not found"
            });
        }


        await Post.findByIdAndDelete(
            req.params.postId
        );


        return res.status(200).json({
            success: true
        });

    } catch (error) {
        next(error);
    }
};