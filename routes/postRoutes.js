import express from 'express';
import { getPosts, getMapPosts, getPostById, createPost, addComment, deleteComment, toggleLike, updatePost, deletePost } from '../controllers/postController.js';
import { isAuthenticated, isPostOwner, canDeletePost } from '../middleware/authMiddleware.js';

const router = express.Router();

// all post routes require the user to be logged in
router.use(isAuthenticated);

// routes for fetching all posts and creating a new post
router.get('/', getPosts);
router.post('/', createPost);

// route for posts shown on the map
router.get('/map', getMapPosts);

// route for fetching a single post by its ID
router.get('/:postId', getPostById);

// routes for adding and deleting comments on a post
router.post('/:postId/comments', addComment);
router.delete('/:postId/comments/:commentId', deleteComment);

// route for toggling likes on a post
router.post('/:postId/like', toggleLike);

// routes for updating and deleting posts (restricted to the post owner)
router.put('/:postId', isPostOwner, updatePost);

// route for deleting a post (restricted to the post owner)
router.delete('/:postId', canDeletePost, deletePost);

export default router;