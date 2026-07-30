document.addEventListener("DOMContentLoaded", () => {
    // --- feed and popup elements ---
    const triggerBar = document.getElementById("trigger-modal-bar");
    const modalOverlay = document.getElementById("post-modal-overlay");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const modalTextarea = document.getElementById("modal-textarea");
    const modalPublishBtn = document.getElementById("modal-publish-btn");
    const mediaInput = document.getElementById("modal-media-upload");
    const mediaTriggerBtn = document.getElementById("modal-image-btn");
    const previewContainer = document.getElementById("modal-media-preview-container");
    const imgPreview = document.getElementById("modal-media-preview");
    const videoPreview = document.getElementById("modal-video-preview");
    const clearMediaBtn = document.getElementById("modal-clear-media");
    const postFeed = document.querySelector(".post-feed");
    const fbToggleBtn = document.getElementById("share-facebook-btn");

    // --- Create Post Modal Logic ---
    const openModal = (e) => {
        if (e) e.preventDefault();
        if (modalOverlay) {
            modalOverlay.classList.add("active");
            if (modalTextarea) modalTextarea.focus();
        }
    };

    const closeModal = () => {
        if (modalOverlay) {
            modalOverlay.classList.remove("active");
            if (modalTextarea) modalTextarea.value = "";
            if (fbToggleBtn) fbToggleBtn.classList.remove("active");
            resetMediaPreview();
            validatePublishButton();
        }
    };

    const validatePublishButton = () => {
        if (!modalTextarea || !modalPublishBtn) return;
        const hasText = modalTextarea.value.trim().length > 0;
        const hasMedia = mediaInput && mediaInput.files && mediaInput.files.length > 0;
        modalPublishBtn.disabled = !(hasText || hasMedia);
    };

    const resetMediaPreview = () => {
        if (!mediaInput) return;
        mediaInput.value = "";
        if (previewContainer) previewContainer.style.display = "none";
        if (imgPreview) { imgPreview.style.display = "none"; imgPreview.src = ""; }
        if (videoPreview) { videoPreview.style.display = "none"; videoPreview.src = ""; }
    };

    if (triggerBar) triggerBar.addEventListener("click", openModal);
    if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
    if (modalTextarea) modalTextarea.addEventListener("input", validatePublishButton);

    // handle facebook toggle switch
    if (fbToggleBtn) {
        fbToggleBtn.addEventListener("click", (e) => {
            e.preventDefault();
            fbToggleBtn.classList.toggle("active");
        });
    }

    if (mediaTriggerBtn && mediaInput) {
        mediaTriggerBtn.addEventListener("click", (e) => {
            e.preventDefault();
            mediaInput.click();
        });
    }

    if (mediaInput) {
        mediaInput.addEventListener("change", function () {
            const file = this.files[0];
            if (file && previewContainer && imgPreview && videoPreview) {
                const fileURL = URL.createObjectURL(file);
                previewContainer.style.display = "flex";

                if (file.type.startsWith("video/")) {
                    videoPreview.src = fileURL;
                    videoPreview.style.display = "block";
                    imgPreview.style.display = "none";
                } else {
                    imgPreview.src = fileURL;
                    imgPreview.style.display = "block";
                    videoPreview.style.display = "none";
                }
                validatePublishButton();
            }
        });
    }

    if (clearMediaBtn) {
        clearMediaBtn.addEventListener("click", (e) => {
            e.preventDefault();
            resetMediaPreview();
            validatePublishButton();
        });
    }

    // --- submit new post (CREATE) ---
    if (modalPublishBtn) {
        modalPublishBtn.addEventListener("click", () => {
            const textContent = modalTextarea.value.trim();
            const mediaFile = (mediaInput && mediaInput.files) ? mediaInput.files[0] : null;
            const currentUser = localStorage.getItem("loggedInUser") || "User";
            const userInitials = currentUser.substring(0, 2).toUpperCase();

            // get today's date in format YYYY-MM-DD for accurate search filtering later
            const today = new Date().toISOString().split('T')[0];

            let mediaHTML = "";
            let postType = "text";

            if (mediaFile) {
                const fileURL = URL.createObjectURL(mediaFile);
                if (mediaFile.type.startsWith("video/")) {
                    mediaHTML = `<video src="${fileURL}" controls class="post-media-content"></video>`;
                    postType = "video";
                } else {
                    mediaHTML = `<img src="${fileURL}" alt="Uploaded media" class="post-media-content" />`;
                    postType = "image";
                }
            }

            const postHTML = `
                <article class="post-card new-item-highlight" data-post-type="${postType}" data-post-date="${today}">
                    <div class="post-card-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="avatar avatar-purple">${userInitials}</div>
                            <div>
                                <span class="post-author">${currentUser}</span>
                                <span class="post-meta">@${currentUser.toLowerCase().replace(/\s/g, '')} · Just now</span>
                            </div>
                        </div>
                        <div class="post-actions-right">
                            <button class="edit-post-btn" title="Edit"><i class="bi bi-pencil"></i></button>
                            <button class="delete-post-btn" title="Delete"><i class="bi bi-trash3"></i></button>
                        </div>
                    </div>
                    <div class="post-text">${textContent}</div>
                    ${mediaHTML}
                    
                    <div class="post-stats">
                        <span class="stat-reply" title="Comment">
                            <i class="bi bi-chat"></i> <span class="reply-count">0</span>
                        </span>
                        <span class="stat-like" title="Like">
                            <i class="bi bi-heart"></i> <span class="like-count">0</span>
                        </span>
                        <span class="stat-share" title="Share">
                            <i class="bi bi-upload"></i>
                            <div class="share-dropdown">
                                <button class="share-item copy-link-btn"><i class="bi bi-link-45deg"></i> Copy link</button>
                                <button class="share-item native-share-btn"><i class="bi bi-share"></i> Share via...</button>
                            </div>
                        </span>
                    </div>

                    <div class="comments-section" style="display: none;">
                        <div class="comments-list"></div>
                        <div class="comment-input-wrapper">
                            <div class="avatar avatar-purple">${userInitials}</div>
                            <input type="text" class="comment-input" placeholder="Post your comment...">
                            <button type="button" class="reply-btn" disabled>Reply</button>
                        </div>
                    </div>
                </article>
            `;

            if (postFeed) {
                // Reset all filters when posting to ensure the new post is visible
                const searchInput = document.getElementById("feed-search-input");
                const dateStartInput = document.getElementById("filter-date-start");
                const dateEndInput = document.getElementById("filter-date-end");
                const allPostsOption = document.querySelector('.filter-option[data-value="all"]');

                if (searchInput) searchInput.value = "";
                if (dateStartInput) dateStartInput.value = "";
                if (dateEndInput) dateEndInput.value = "";
                document.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('selected'));
                if (allPostsOption) allPostsOption.classList.add('selected');

                // inject post
                postFeed.insertAdjacentHTML("afterbegin", postHTML);

                // force filter update
                if (typeof window.forceFilterUpdate === 'function') window.forceFilterUpdate();

                const newPost = postFeed.firstElementChild;
                setTimeout(() => {
                    if (newPost) newPost.classList.remove("new-item-highlight");
                }, 2500);
            }

            closeModal();
        });
    }

    // --- Edit Post Modal Logic (UPDATE) ---
    const editModalOverlay = document.getElementById("edit-modal-overlay");
    const closeEditModalBtn = document.getElementById("close-edit-modal-btn");
    const editModalTextarea = document.getElementById("edit-modal-textarea");
    const editModalPublishBtn = document.getElementById("edit-modal-publish-btn");
    const editMediaInput = document.getElementById("edit-modal-media-upload");
    const editMediaTriggerBtn = document.getElementById("edit-modal-image-btn");
    const editPreviewContainer = document.getElementById("edit-modal-media-preview-container");
    const editImgPreview = document.getElementById("edit-modal-media-preview");
    const editVideoPreview = document.getElementById("edit-modal-video-preview");
    const editClearMediaBtn = document.getElementById("edit-modal-clear-media");

    let currentPostBeingEdited = null;
    let editMediaCleared = false; // tracks if user manually cleared existing media

    const closeEditModal = () => {
        if (editModalOverlay) {
            editModalOverlay.classList.remove("active");
            currentPostBeingEdited = null;
            if (editMediaInput) editMediaInput.value = "";
        }
    };

    if (closeEditModalBtn) closeEditModalBtn.addEventListener("click", closeEditModal);

    if (editMediaTriggerBtn && editMediaInput) {
        editMediaTriggerBtn.addEventListener("click", (e) => {
            e.preventDefault();
            editMediaInput.click();
        });
    }

    if (editMediaInput) {
        editMediaInput.addEventListener("change", function () {
            const file = this.files[0];
            if (file && editPreviewContainer && editImgPreview && editVideoPreview) {
                const fileURL = URL.createObjectURL(file);
                editPreviewContainer.style.display = "flex";
                editMediaCleared = false;

                if (file.type.startsWith("video/")) {
                    editVideoPreview.src = fileURL;
                    editVideoPreview.style.display = "block";
                    editImgPreview.style.display = "none";
                } else {
                    editImgPreview.src = fileURL;
                    editImgPreview.style.display = "block";
                    editVideoPreview.style.display = "none";
                }
            }
        });
    }

    if (editClearMediaBtn) {
        editClearMediaBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (editMediaInput) editMediaInput.value = "";
            if (editPreviewContainer) editPreviewContainer.style.display = "none";
            editMediaCleared = true;// mark as cleared so we remove it on save
        });
    }

    if (editModalPublishBtn) {
        editModalPublishBtn.addEventListener("click", () => {
            if (!currentPostBeingEdited) return;

            const newText = editModalTextarea.value.trim();
            const textDiv = currentPostBeingEdited.querySelector(".post-text");
            if (textDiv) textDiv.innerText = newText;

            const existingMedia = currentPostBeingEdited.querySelector(".post-media-content");
            const newFile = (editMediaInput && editMediaInput.files) ? editMediaInput.files[0] : null;

            if (newFile) {
                // user uploaded new media
                const fileURL = URL.createObjectURL(newFile);
                if (existingMedia) existingMedia.remove();

                let mediaHTML = "";
                if (newFile.type.startsWith("video/")) {
                    mediaHTML = `<video src="${fileURL}" controls class="post-media-content"></video>`;
                    currentPostBeingEdited.dataset.postType = "video";
                } else {
                    mediaHTML = `<img src="${fileURL}" alt="Uploaded media" class="post-media-content" />`;
                    currentPostBeingEdited.dataset.postType = "image";
                }
                textDiv.insertAdjacentHTML('afterend', mediaHTML);
            } else if (editMediaCleared) {
                // user clicked X to remove existing media
                if (existingMedia) existingMedia.remove();
                currentPostBeingEdited.dataset.postType = "text";
            }

            // visually indicate edit success
            currentPostBeingEdited.classList.add("new-item-highlight");
            setTimeout(() => currentPostBeingEdited.classList.remove("new-item-highlight"), 2000);

            closeEditModal();
        });
    }

    // --- deletion system with popup (DELETE) ---
    let elementToDelete = null;
    const confirmModal = document.getElementById("delete-confirm-modal");
    const confirmBtn = document.getElementById("confirm-delete-btn");
    const cancelBtn = document.getElementById("cancel-delete-btn");

    if (confirmBtn && cancelBtn && confirmModal) {
        confirmBtn.addEventListener("click", () => {
            if (elementToDelete) {
                // decrease the comments counter if we deleted a comment
                if (elementToDelete.classList.contains("comment-item")) {
                    const post = elementToDelete.closest(".post-card");
                    if (post) {
                        const replyCountSpan = post.querySelector(".reply-count");
                        if (replyCountSpan) {
                            let count = parseInt(replyCountSpan.innerText) || 0;
                            replyCountSpan.innerText = Math.max(0, count - 1);
                        }
                    }
                }
                elementToDelete.remove();
                elementToDelete = null;
                confirmModal.classList.remove("active");
            }
        });

        cancelBtn.addEventListener("click", () => {
            elementToDelete = null;
            confirmModal.classList.remove("active");
        });
    }

    // --- dynamic events in the feed (Event Delegation) ---
    if (postFeed) {
        postFeed.addEventListener("click", (e) => {
            const target = e.target;

            // copy link from the menu
            const copyBtn = target.closest(".copy-link-btn");
            if (copyBtn) {
                e.stopPropagation();
                navigator.clipboard.writeText(window.location.href).then(() => {
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="bi bi-check2"></i> Copied!';
                    copyBtn.style.color = "#00ba7c";
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHTML;
                        copyBtn.style.color = "";
                        const shareParent = copyBtn.closest(".stat-share");
                        if (shareParent) shareParent.classList.remove("active");
                    }, 2000);
                });
                return;
            }

            // native share mechanism from the menu
            const nativeShareBtn = target.closest(".native-share-btn");
            if (nativeShareBtn) {
                e.stopPropagation();
                const urlToShare = window.location.href;
                if (navigator.share) {
                    navigator.share({
                        title: 'Check out this post!',
                        url: urlToShare
                    }).catch(console.error);
                } else {
                    alert("Sharing is not supported on this browser.");
                }
                const shareParent = nativeShareBtn.closest(".stat-share");
                if (shareParent) shareParent.classList.remove("active");
                return;
            }

            // delete button (DELETE)
            const deleteBtn = target.closest(".delete-post-btn, .delete-comment-btn");
            if (deleteBtn) {
                const item = deleteBtn.closest(".post-card, .comment-item");
                const authorElement = item.querySelector(".post-author, .comment-header");
                const authorName = authorElement ? authorElement.innerText.trim() : "";
                const currentUser = localStorage.getItem("loggedInUser") || "User";

                // check deletion permissions (only the creator can delete)
                if (authorName !== currentUser) {
                    alert("You can only delete your own content.");
                    return;
                }

                elementToDelete = item;
                if (confirmModal) confirmModal.classList.add("active");
                return;
            }

            // edit post button (UPDATE)
            const editBtn = target.closest(".edit-post-btn");
            if (editBtn) {
                const post = editBtn.closest(".post-card");
                const authorElement = post.querySelector(".post-author");
                const authorName = authorElement ? authorElement.innerText.trim() : "";
                const currentUser = localStorage.getItem("loggedInUser") || "User";

                if (authorName !== currentUser) {
                    alert("You can only edit your own content.");
                    return;
                }

                currentPostBeingEdited = post;
                editMediaCleared = false;

                // load text
                const textDiv = post.querySelector(".post-text");
                if (textDiv) editModalTextarea.value = textDiv.innerText;

                // load media if exists
                const existingImg = post.querySelector("img.post-media-content");
                const existingVid = post.querySelector("video.post-media-content");

                editPreviewContainer.style.display = "none";
                editImgPreview.style.display = "none";
                editVideoPreview.style.display = "none";

                if (existingImg) {
                    editImgPreview.src = existingImg.src;
                    editImgPreview.style.display = "block";
                    editPreviewContainer.style.display = "flex";
                } else if (existingVid) {
                    editVideoPreview.src = existingVid.src;
                    editVideoPreview.style.display = "block";
                    editPreviewContainer.style.display = "flex";
                }

                editModalOverlay.classList.add("active");
                return;
            }

            // likes
            const likeBtn = target.closest(".stat-like");
            if (likeBtn) {
                likeBtn.classList.toggle("liked");
                const icon = likeBtn.querySelector("i");
                const countSpan = likeBtn.querySelector(".like-count");
                let count = parseInt(countSpan.innerText) || 0;

                if (likeBtn.classList.contains("liked")) {
                    icon.classList.remove("bi-heart");
                    icon.classList.add("bi-heart-fill", "pop-animation");
                    countSpan.innerText = count + 1;
                    setTimeout(() => icon.classList.remove("pop-animation"), 400);
                } else {
                    icon.classList.remove("bi-heart-fill");
                    icon.classList.add("bi-heart");
                    countSpan.innerText = Math.max(0, count - 1);
                }
                return;
            }

            // open comments section
            const replyBtn = target.closest(".stat-reply");
            if (replyBtn) {
                const post = replyBtn.closest(".post-card");
                const commentsSection = post.querySelector(".comments-section");
                if (commentsSection) {
                    commentsSection.style.display = commentsSection.style.display === "none" ? "block" : "none";
                }
                return;
            }

            // open the share menu 
            const shareBtn = target.closest(".stat-share");
            if (shareBtn && !target.closest(".share-dropdown")) {
                shareBtn.classList.toggle("active");
                return;
            }
        });

        // enable the reply button when typing
        postFeed.addEventListener("input", (e) => {
            if (e.target.classList.contains("comment-input")) {
                const btn = e.target.nextElementSibling;
                if (btn && btn.classList.contains("reply-btn")) {
                    btn.disabled = e.target.value.trim().length === 0;
                }
            }
        });

        // add comment to post
        postFeed.addEventListener("click", (e) => {
            if (e.target.classList.contains("reply-btn")) {
                const input = e.target.previousElementSibling;
                const text = input.value.trim();
                const commentsList = e.target.closest(".comments-section").querySelector(".comments-list");
                const replyCountSpan = e.target.closest(".post-card").querySelector(".reply-count");

                if (text && commentsList) {
                    const currentUser = localStorage.getItem("loggedInUser") || "User";
                    const userInitials = currentUser.substring(0, 2).toUpperCase();

                    const commentHTML = `
                        <div class="comment-item">
                            <div class="avatar avatar-purple">${userInitials}</div>
                            <div class="comment-bubble new-item-highlight">
                                <button class="delete-comment-btn" title="Delete"><i class="bi bi-trash3"></i></button>
                                <div class="comment-header">${currentUser}</div>
                                <div class="comment-text">${text}</div>
                            </div>
                        </div>
                    `;
                    commentsList.insertAdjacentHTML("beforeend", commentHTML);
                    input.value = "";
                    e.target.disabled = true;

                    let count = parseInt(replyCountSpan.innerText) || 0;
                    replyCountSpan.innerText = count + 1;

                    // added new-item-highlight to the new comment, and we remove it after a short delay to show the highlight effect
                    const newComment = commentsList.lastElementChild.querySelector(".comment-bubble");
                    setTimeout(() => {
                        if (newComment) newComment.classList.remove("new-item-highlight");
                    }, 2500);
                }
            }
        });
    }

    // close share menus when clicking outside of them
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".stat-share")) {
            document.querySelectorAll(".stat-share.active").forEach(el => el.classList.remove("active"));
        }
    });

    // --- Back to Top Logic ---
    const backToTopBtn = document.getElementById("back-to-top");
    if (backToTopBtn) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 300) {
                backToTopBtn.style.opacity = "1";
                backToTopBtn.style.visibility = "visible";
                backToTopBtn.style.transform = "translateY(0)";
            } else {
                backToTopBtn.style.opacity = "0";
                backToTopBtn.style.visibility = "hidden";
                backToTopBtn.style.transform = "translateY(20px)";
            }
        });

        backToTopBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }
});