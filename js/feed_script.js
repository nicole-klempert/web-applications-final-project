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

    // functions to open and close the new post popup
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

    // --- create post ---
    if (modalPublishBtn) {
        modalPublishBtn.addEventListener("click", () => {
            const textContent = modalTextarea.value.trim();
            const mediaFile = (mediaInput && mediaInput.files) ? mediaInput.files[0] : null;
            const currentUser = localStorage.getItem("loggedInUser") || "User";
            const userInitials = currentUser.substring(0, 2).toUpperCase();

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

            // added new-item-highlight to the new post
            const postHTML = `
                <article class="post-card new-item-highlight" data-post-type="${postType}">
                    <div class="post-card-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="avatar avatar-purple">${userInitials}</div>
                            <div>
                                <span class="post-author">${currentUser}</span>
                                <span class="post-meta">@${currentUser.toLowerCase().replace(/\s/g, '')} · Just now</span>
                            </div>
                        </div>
                        <button class="delete-post-btn" title="Delete"><i class="bi bi-trash3"></i></button>
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
                postFeed.insertAdjacentHTML("afterbegin", postHTML);

                // remove the highlight class after the animation ends (2.5 seconds)
                const newPost = postFeed.firstElementChild;
                setTimeout(() => {
                    if (newPost) newPost.classList.remove("new-item-highlight");
                }, 2500);
            }

            closeModal();
        });
    }

    // --- deletion system with popup (Restricted to owner) ---
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

    // --- dynamic events in the feed (likes, comments, deletions, shares) ---
    if (postFeed) {
        postFeed.addEventListener("click", (e) => {
            const target = e.target;
            const copyBtn = target.closest(".copy-link-btn");
            if (copyBtn) {
                e.stopPropagation(); // prevent the menu from closing automatically by mistake
                navigator.clipboard.writeText(window.location.href).then(() => {
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="bi bi-check2"></i> Copied!';
                    copyBtn.style.color = "#00ba7c";
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHTML;
                        copyBtn.style.color = "";
                        // close the menu after 2 seconds
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

            // delete button
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
                if (confirmModal) {
                    confirmModal.classList.add("active");
                }
                return;
            }

            //likes
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

            // open the share menu itself
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

                    // added new-item-highlight to the new comment
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

                    // remove the highlight class after the animation
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

    // --- Search & Filter Logic ---
    const filterBox = document.getElementById("custom-filter");
    const searchInput = document.getElementById("feed-search-input");

    const filterPosts = () => {
        const activeFilter = document.querySelector(".filter-option.selected").dataset.value;
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
        const posts = document.querySelectorAll(".post-card");

        posts.forEach(post => {
            const postType = post.dataset.postType || "text";
            const postText = post.querySelector(".post-text")?.innerText.toLowerCase() || "";
            const postAuthor = post.querySelector(".post-author")?.innerText.toLowerCase() || "";

            const matchesFilter = (activeFilter === "all") || (activeFilter === postType);
            const matchesSearch = postText.includes(searchTerm) || postAuthor.includes(searchTerm);

            if (matchesFilter && matchesSearch) {
                post.style.display = "flex";
            } else {
                post.style.display = "none";
            }
        });
    };

    if (filterBox) {
        const filterSelected = filterBox.querySelector(".filter-selected");
        const filterOptions = filterBox.querySelectorAll(".filter-option");
        const filterText = document.getElementById("filter-selected-text");

        filterSelected.addEventListener("click", () => {
            filterBox.classList.toggle("open");
        });

        filterOptions.forEach(option => {
            option.addEventListener("click", () => {
                filterOptions.forEach(opt => opt.classList.remove("selected"));
                option.classList.add("selected");
                filterText.innerText = option.innerText;
                filterBox.classList.remove("open");
                filterPosts();
            });
        });

        document.addEventListener("click", (e) => {
            if (!filterBox.contains(e.target)) {
                filterBox.classList.remove("open");
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", filterPosts);
    }
});