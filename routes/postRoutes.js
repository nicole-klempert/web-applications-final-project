import express from 'express';
import { getPosts, getPostById, createPost, addComment, deleteComment, toggleLike, updatePost, deletePost } from '../controllers/postController.js';

const router = express.Router();

// routes for fetching all posts and creating a new post
router.get('/', getPosts);
router.post('/', createPost);

// route for fetching a single post by its ID
router.get('/:postId', getPostById);

// routes for adding and deleting comments on a post
router.post('/:postId/comments', addComment);
router.delete('/:postId/comments/:commentId', deleteComment);

// route for toggling likes on a post
router.post('/:postId/like', toggleLike);

// routes for updating and deleting posts
router.put('/:postId', updatePost);
router.delete('/:postId', deletePost);

export default router;