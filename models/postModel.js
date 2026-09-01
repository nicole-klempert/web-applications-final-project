import mongoose from 'express'; 
import mongooseModule from 'mongoose';

const { Schema, model } = mongooseModule;

// Post comment schema definition
const commentSchema = new Schema({

    // comment author - can be a username or user ID (string)
    author: {
        type: String,
        required: true,
        default: "User"
    },

    // optional author profile picture URL for display purposes
    authorProfilePic: {
        type: String,
        default: ""
    },

    // optional author initials for display purposes
    authorInitials: {
        type: String,
        default: "US"
    },

    // comment text content
    text: {
        type: String,
        required: [true, "Comment text is required"],
        trim: true
    },

    // timestamp for when the comment was created
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Post schema definition
const postSchema = new Schema({

    // post author - can be a username or user ID (string)
    author: {
        type: String,
        required: [true, "Author is required"],
        index: true // index for searching by author
    },

    // optional author initials for display purposes
    authorProfilePic: {
        type: String,
        default: ""
    },

    // group id or name for future group filtering (optional)
    group: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        default: null,
        index: true
    },
    // optional location selected when publishing a post - can be a place name, address, or coordinates
    location: {

        // optional location name or address for display purposes
        name: {
            type: String,
            default: "",
            trim: true
        },

        // optional location address for display purposes
        address: {
            type: String,
            default: "",
            trim: true
        },

        // optional latitude and longitude for geolocation purposes
        latitude: {
            type: Number,
            default: null,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            default: null,
            min: -180,
            max: 180
        }
    },

    // post content - either text or media (image/video)
    content: {
        type: String,
        default: "",
        trim: true,
        index: true // index for searching text content
    },

    // post type: "text", "image", or "video" 
    postType: {
        type: String,
        default: "text"
    },

    // base64 address or URL of the media (image/video) associated with the post
    mediaUrl: {
        type: String,
        default: ""
    },

    // "image" or "video" - to differentiate between media types
    mediaType: {
        type: String,
        default: ""
    },

    // likes count and array of users who liked the post
    likes: {
        type: Number,
        default: 0
    },
    likedBy: [{
        type: String
    }],

    // comments array 
    comments: [commentSchema]
}, {

    // add timestamps for createdAt and updatedAt
    timestamps: true
});

// validation - post has to have either text or media (or both)
postSchema.pre('validate', function (next) {

    // check if the post has either text content
    const hasText = this.content && this.content.trim().length > 0;

    // check if the post has media URL
    const hasMedia = this.mediaUrl && this.mediaUrl.trim().length > 0;

    if (!hasText && !hasMedia) {
        next(new Error("Validation Error: Post cannot be empty. It must contain either text or media."));
    } else {
        next();
    }
});

// compound index for searching by author and content text
// index from newest to oldest for faster retrieval of recent posts
postSchema.index({ createdAt: -1 });
// index for searching posts by author and sorting by creation date
postSchema.index({ author: 1, createdAt: -1 });

const Post = model('Post', postSchema);

export default Post;