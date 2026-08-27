document.addEventListener("DOMContentLoaded", () => {
    // ===  AUTHENTICATION GUARD ===
    const currentUser = (localStorage.getItem("loggedInUser") || "").trim();
    if (!currentUser) {
        sessionStorage.setItem("authAlert", "You must be logged in to view this page.");
        window.location.replace("login.html");
        return;
    }

    // === SIDEBAR USER PROFILE SYN ===
    const syncSidebarUserProfile = () => {
        const myPic = localStorage.getItem("userProfilePic") || "";
        const initials = currentUser.substring(0, 2).toUpperCase();
        const navName = document.getElementById("nav-user-name");
        if (navName) navName.innerText = currentUser;
        const navHandle = document.getElementById("nav-user-handle");
        if (navHandle) navHandle.innerText = `@${currentUser.toLowerCase().replace(/\s+/g, '')}`;

        // update all avatar elements in the sidebar and account card
        const avatars = [
            document.getElementById("nav-user-avatar"),
            document.querySelector(".account-card .avatar"),
            document.querySelector(".composer-placeholder .avatar")
        ];

        avatars.forEach(avatarEl => {
            if (!avatarEl) return;
            avatarEl.innerHTML = "";
            if (myPic.trim() !== "" && myPic !== "undefined" && myPic !== "null") {
                avatarEl.className = "avatar";
                avatarEl.style.backgroundImage = `url('${myPic}')`;
                avatarEl.style.backgroundSize = "cover";
                avatarEl.style.backgroundPosition = "center";
            } else {
                avatarEl.className = "avatar avatar-purple";
                avatarEl.removeAttribute("style");
                avatarEl.innerText = initials;
            }
        });
    };
    syncSidebarUserProfile();

    // === STATE AND DOM ELEMENTS ===
    const postFeed = document.querySelector(".post-feed");
    let currentPage = 1;
    let hasMorePosts = false;
    let isLoading = false;
    let currentPostBeingEdited = null;
    let editMediaCleared = false;

    // === HELPER FUNCTIONS ===
    const fileToDataURL = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // Format date to "time ago" string
    const formatTimeAgo = (dateString) => {
        if (!dateString) return "Just now";
        const diff = (new Date() - new Date(dateString)) / 1000;
        if (isNaN(diff) || diff < 60) return "Just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 172800) return "Yesterday";
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    // Generate avatar HTML based on profile picture or initials
    const getAvatarHTML = (dbPic, authorName, size = 40) => {
        const myPic = localStorage.getItem("userProfilePic") || "";
        const isMe = authorName && authorName.trim().toLowerCase() === currentUser.toLowerCase();
        const picToUse = (isMe && myPic.trim() !== "") ? myPic : dbPic;
        if (picToUse && picToUse.trim() !== "" && picToUse !== "undefined" && picToUse !== "null") {
            return `<div class="avatar" style="background-image: url('${picToUse}'); background-size: cover; background-position: center;"></div>`;
        }
        const initials = authorName ? authorName.substring(0, 2).toUpperCase() : "US";
        return `<div class="avatar avatar-purple">${initials}</div>`;
    };

    // Generate HTML for a single post card
    const createPostCardHTML = (post, isNew = false) => {
        const isOwner = post.author && (post.author.trim().toLowerCase() === currentUser.toLowerCase());
        const isLiked = Array.isArray(post.likedBy) && post.likedBy.includes(currentUser);
        const timeAgo = formatTimeAgo(post.createdAt);

        let mediaHTML = "";
        if (post.mediaUrl) {
            mediaHTML = post.mediaType === "video"
                ? `<video src="${post.mediaUrl}" controls preload="metadata" class="post-media-content"></video>`
                : `<img src="${post.mediaUrl}" alt="media" loading="lazy" class="post-media-content" />`;
        }

        let commentsHTML = "";
        (post.comments || []).forEach(c => {
            const isCommOwner = c.author && (c.author.trim().toLowerCase() === currentUser.toLowerCase());
            commentsHTML += `
                <div class="comment-item" data-comment-id="${c._id || ''}">
                    ${getAvatarHTML(c.authorProfilePic, c.author, 32)}
                    <div class="comment-bubble">
                        ${isCommOwner ? `<button class="delete-comment-btn" title="Delete"><i class="bi bi-trash3"></i></button>` : ""}
                        <div class="comment-header">${c.author || "User"}</div>
                        <div class="comment-text">${c.text || ""}</div>
                    </div>
                </div>`;
        });

        const actionsHTML = isOwner ? `
            <div class="post-actions-right">
                <button class="edit-post-btn" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="delete-post-btn" title="Delete"><i class="bi bi-trash3"></i></button>
            </div>` : "";

        return `
            <article class="post-card ${isNew ? 'new-item-highlight' : ''}" data-post-id="${post._id || ''}">
                <div class="post-card-header">
                    <div class="author-info-group">
                        <a href="profile.html?user=${encodeURIComponent(post.author || 'User')}" style="text-decoration:none;">
                            ${getAvatarHTML(post.authorProfilePic, post.author, 40)}
                        </a>
                        <div>
                            <a href="profile.html?user=${encodeURIComponent(post.author || 'User')}" class="post-author" style="text-decoration:none; color:inherit;">
                                ${post.author || "User"}
                            </a>
                            <span class="post-meta view-single-post-trigger">@${(post.author || "user").toLowerCase().replace(/\s/g, '')} · ${timeAgo}</span>
                        </div>
                    </div>
                    ${actionsHTML}
                </div>
                <div class="post-text">${post.content || ""}</div>
                ${mediaHTML}
                <div class="post-stats">
                    <span class="stat-reply"><i class="bi bi-chat"></i> <span class="reply-count">${(post.comments || []).length}</span></span>
                    <span class="stat-like ${isLiked ? 'liked' : ''}"><i class="bi ${isLiked ? 'bi-heart-fill' : 'bi-heart'}"></i> <span class="like-count">${post.likes || 0}</span></span>
                    <span class="stat-share"><i class="bi bi-upload"></i>
                        <div class="share-dropdown">
                            <button class="share-item copy-link-btn"><i class="bi bi-link-45deg"></i> Copy link</button>
                            <button class="share-item native-share-btn"><i class="bi bi-share"></i> Share via...</button>
                        </div>
                    </span>
                </div>
                <div class="comments-section" style="display:none;">
                    <div class="comments-list">${commentsHTML}</div>
                    <div class="comment-input-wrapper">
                        ${getAvatarHTML("", currentUser, 32)}
                        <input type="text" class="comment-input" placeholder="Post your comment...">
                        <button type="button" class="reply-btn" disabled>Reply</button>
                    </div>
                </div>
            </article>`;
    };

    // === FETCH POSTS FUNCTION ===
    const loadPosts = async (page = 1, append = false) => {
        if (!postFeed || isLoading) return;
        isLoading = true;

        // take filters from the global function if it exists, otherwise use default values
        const filters = window.getPostFilters ? window.getPostFilters() : { search: "", startDate: "", endDate: "", type: "all" };

        const params = new URLSearchParams({
            page, limit: 5,
            ...filters
        });

        try {
            const res = await fetch(`/posts?${params}`);
            const data = await res.json();
            if (data.success) {
                const myPostWithPic = (data.posts || []).find(p => p.author && p.author.trim().toLowerCase() === currentUser.toLowerCase() && p.authorProfilePic && p.authorProfilePic.trim() !== "");
                if (myPostWithPic && (!localStorage.getItem("userProfilePic") || localStorage.getItem("userProfilePic").trim() === "")) {
                    localStorage.setItem("userProfilePic", myPostWithPic.authorProfilePic);
                    syncSidebarUserProfile();
                }

                if (!append) postFeed.innerHTML = "";

                if (data.posts.length === 0 && !append) {
                    postFeed.innerHTML = `
                        <div class="empty-state-box">
                            <div class="empty-state-icon-wrapper">
                                <i class="bi bi-search"></i>
                            </div>
                            <h3>No posts found</h3>
                            <p>We couldn't find any posts matching your criteria. Try adjusting your search or resetting your filters.</p>
                            <button id="reset-filters-btn" type="button">
                                <i class="bi bi-arrow-counterclockwise" style="margin-right: 6px;"></i> Reset Filters
                            </button>
                        </div>`;
                    document.getElementById("reset-filters-btn")?.addEventListener("click", () => {
                        const searchEl = document.getElementById("feed-search-input");
                        const startEl = document.getElementById("filter-date-start");
                        const endEl = document.getElementById("filter-date-end");
                        if (searchEl) searchEl.value = "";
                        if (startEl) startEl.value = "";
                        if (endEl) endEl.value = "";

                        document.querySelectorAll(".filter-option").forEach(o => o.classList.remove("selected"));
                        document.querySelector('.filter-option[data-value="all"]')?.classList.add("selected");
                        loadPosts(1, false);
                    });
                } else {
                    data.posts.forEach(p => postFeed.insertAdjacentHTML("beforeend", createPostCardHTML(p)));
                }

                hasMorePosts = data.hasMore || false;
                currentPage = data.currentPage || 1;
                document.getElementById("pagination-container")?.remove();
                if (hasMorePosts) {
                    postFeed.insertAdjacentHTML("afterend", `
                        <div id="pagination-container" class="pagination-container">
                            <button id="load-more-posts-btn" class="btn btn-primary">Load More Posts &darr;</button>
                        </div>`);
                    document.getElementById("load-more-posts-btn").addEventListener("click", () => loadPosts(currentPage + 1, true));
                }
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            isLoading = false;
        }
    };

    // === GLOBAL FUNCTION TO RELOAD POSTS FEED ===
    window.reloadPostsFeed = () => loadPosts(1, false);

    const showSinglePostBlurModal = (post) => {
        document.getElementById("single-post-blur-modal")?.remove();
        document.body.insertAdjacentHTML("beforeend", `
            <div id="single-post-blur-modal" class="modal-overlay active">
                <div class="modal-content" style="position: relative; padding: 48px 24px 24px; max-width: 600px;">
                    <button id="close-blur-modal-btn" class="close-modal-btn" style="position: absolute; top: 10px; right: 16px; font-size: 1.8rem; line-height: 1; background: none; border: none; cursor: pointer; color: var(--text-muted, #766f7d); z-index: 10;">&times;</button>
                    ${createPostCardHTML(post)}
                </div>
            </div>`);
        const m = document.getElementById("single-post-blur-modal");
        const close = () => {
            m.remove();
            if (window.history.replaceState) window.history.replaceState({}, document.title, window.location.pathname);
        };
        document.getElementById("close-blur-modal-btn").addEventListener("click", close);
        m.addEventListener("click", (e) => { if (e.target === m) close(); });
    };

    loadPosts(1, false);

    const urlPostId = new URLSearchParams(window.location.search).get("postId");
    if (urlPostId) fetch(`/posts/${urlPostId}`).then(r => r.json()).then(d => { if (d.success && d.post) showSinglePostBlurModal(d.post); });

    // === CREATE POST MODAL FUNCTIONALITY ===
    const modalOverlay = document.getElementById("post-modal-overlay");
    const modalTextarea = document.getElementById("modal-textarea");
    const modalPublishBtn = document.getElementById("modal-publish-btn");
    const mediaInput = document.getElementById("modal-media-upload");
    const previewContainer = document.getElementById("modal-media-preview-container");
    const imgPreview = document.getElementById("modal-media-preview");
    const videoPreview = document.getElementById("modal-video-preview");

    document.getElementById("trigger-modal-bar")?.addEventListener("click", () => {
        modalOverlay?.classList.add("active");
        modalTextarea?.focus();
    });

    const closeModal = () => {
        modalOverlay?.classList.remove("active");
        if (modalTextarea) modalTextarea.value = "";
        if (mediaInput) mediaInput.value = "";
        if (previewContainer) previewContainer.style.display = "none";
        if (modalPublishBtn) modalPublishBtn.disabled = true;
    };

    document.getElementById("close-modal-btn")?.addEventListener("click", closeModal);
    modalTextarea?.addEventListener("input", () => {
        modalPublishBtn.disabled = !(modalTextarea.value.trim() || (mediaInput && mediaInput.files.length));
    });

    document.getElementById("modal-image-btn")?.addEventListener("click", () => mediaInput?.click());
    document.getElementById("modal-clear-media")?.addEventListener("click", () => {
        mediaInput.value = "";
        previewContainer.style.display = "none";
        modalPublishBtn.disabled = !modalTextarea.value.trim();
    });

    if (mediaInput) {
        mediaInput.addEventListener("change", function () {
            const file = this.files[0];
            if (!file) return;

            // validate file type (image or video)
            const isImage = file.type.startsWith("image/");
            const isVideo = file.type.startsWith("video/");
            if (!isImage && !isVideo) {
                alert("Please select a valid image or video file.");
                this.value = "";
                if (previewContainer) previewContainer.style.display = "none";
                modalPublishBtn.disabled = !modalTextarea.value.trim();
                return;
            }

            // validate file size (max 5MB for image, 10MB for video)
            const maxImgSize = 5 * 1024 * 1024;
            const maxVidSize = 10 * 1024 * 1024;
            if (isImage && file.size > maxImgSize) {
                alert("The selected image is too large! Maximum allowed size is 5MB.");
                this.value = "";
                if (previewContainer) previewContainer.style.display = "none";
                modalPublishBtn.disabled = !modalTextarea.value.trim();
                return;
            }
            if (isVideo && file.size > maxVidSize) {
                alert("The selected video is too large! Maximum allowed size is 10MB.");
                this.value = "";
                if (previewContainer) previewContainer.style.display = "none";
                modalPublishBtn.disabled = !modalTextarea.value.trim();
                return;
            }

            if (previewContainer) {
                const url = URL.createObjectURL(file);
                previewContainer.style.display = "flex";
                if (isVideo) {
                    videoPreview.src = url;
                    videoPreview.style.display = "block";
                    imgPreview.style.display = "none";
                } else {
                    imgPreview.src = url;
                    imgPreview.style.display = "block";
                    videoPreview.style.display = "none";
                }
                modalPublishBtn.disabled = false;
            }
        });
    }

    if (modalPublishBtn) {
        modalPublishBtn.addEventListener("click", async () => {
            modalPublishBtn.disabled = true; // stop multiple clicks while processing

            const file = mediaInput?.files[0];
            let mediaUrl = "", mediaType = "";
            if (file) {
                mediaUrl = await fileToDataURL(file);
                mediaType = file.type.startsWith("video/") ? "video" : "image";
            }
            const res = await fetch('/posts', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    author: currentUser,
                    authorProfilePic: localStorage.getItem("userProfilePic") || "",
                    content: modalTextarea.value.trim(), mediaUrl, mediaType
                })
            });
            if (res.status === 413) {
                modalPublishBtn.disabled = false;
                return alert("File exceeds 50mb limit!");
            }
            if (res.ok) {
                loadPosts(1, false);
                closeModal();
            } else {
                modalPublishBtn.disabled = false; // let the user try again if there was an error
            }
        });
    }

    // === GLOBAL CLICK EVENT LISTENER FOR POST INTERACTIONS ===
    document.addEventListener("click", async (e) => {
        // Handle clicks on post cards and their child elements
        const target = e.target;
        const postCard = target.closest(".post-card");
        const postId = postCard?.dataset.postId;

        if (target.closest(".view-single-post-trigger") && postId) {
            e.stopPropagation();
            fetch(`/posts/${postId}`).then(r => r.json()).then(d => {
                if (d.success && d.post) showSinglePostBlurModal(d.post);
            });
            return;
        }

        // Share button functionality
        const copyLinkBtn = target.closest(".copy-link-btn");
        if (copyLinkBtn && postId) {
            e.stopPropagation();
            const url = `${window.location.origin}/feed.html?postId=${postId}`;
            navigator.clipboard.writeText(url);
            copyLinkBtn.innerHTML = `<i class="bi bi-check2"></i> Copied!`;
            setTimeout(() => {
                copyLinkBtn.innerHTML = `<i class="bi bi-link-45deg"></i> Copy link`;
            }, 2000);
            return;
        }

        const nativeShareBtn = target.closest(".native-share-btn");
        if (nativeShareBtn && postId) {
            e.stopPropagation();
            const url = `${window.location.origin}/feed.html?postId=${postId}`;
            if (navigator.share) {
                navigator.share({ title: "Check out this post", url });
            } else {
                navigator.clipboard.writeText(url);
                alert("Link copied to clipboard!");
            }
            return;
        }

        // Like button functionality
        const likeBtn = target.closest(".stat-like");
        if (likeBtn && postId) {
            likeBtn.classList.toggle("liked");
            const icon = likeBtn.querySelector("i"), countSpan = likeBtn.querySelector(".like-count");
            let count = parseInt(countSpan.innerText) || 0;
            const isLiked = likeBtn.classList.contains("liked");
            icon.className = `bi ${isLiked ? 'bi-heart-fill pop-animation' : 'bi-heart'}`;
            countSpan.innerText = isLiked ? count + 1 : Math.max(0, count - 1);
            fetch(`/posts/${postId}/like`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: currentUser })
            }).then(r => r.json()).then(d => {
                if (d.success && typeof d.likes === "number") {
                    // update all like counts for this post across the page
                    document.querySelectorAll(`.post-card[data-post-id="${postId}"] .like-count`)
                        .forEach(el => el.innerText = d.likes);
                }
            });
            return;
        }

        // Toggle comments section visibility
        if (target.closest(".stat-reply")) {
            const section = postCard?.querySelector(".comments-section");
            if (section) section.style.display = section.style.display === "none" ? "block" : "none";
            return;
        }

        if (target.classList.contains("reply-btn") && postId) {
            const input = target.previousElementSibling;
            const text = input.value.trim();
            if (!text) return;
            const res = await fetch(`/posts/${postId}/comments`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    author: currentUser,
                    authorProfilePic: localStorage.getItem("userProfilePic") || "", text
                })
            });
            const data = await res.json();
            if (data.success) {
                target.closest(".comments-section").querySelector(".comments-list").insertAdjacentHTML("beforeend", `
                    <div class="comment-item" data-comment-id="${data.comment._id}">
                        ${getAvatarHTML(data.comment.authorProfilePic, data.comment.author, 32)}
                        <div class="comment-bubble"><button class="delete-comment-btn"><i class="bi bi-trash3"></i></button>
                        <div class="comment-header">${data.comment.author}</div><div class="comment-text">${text}</div></div>
                    </div>`);
                input.value = "";
                target.disabled = true;
                const replyCount = postCard.querySelector(".reply-count");
                if (replyCount) replyCount.innerText = (parseInt(replyCount.innerText) || 0) + 1;
            }
            return;
        }

        // delete post or comment functionality
        const deleteBtn = target.closest(".delete-post-btn, .delete-comment-btn");
        if (deleteBtn) {
            const isComment = deleteBtn.classList.contains("delete-comment-btn");
            const item = deleteBtn.closest(isComment ? ".comment-item" : ".post-card");
            const modal = document.getElementById("delete-confirm-modal");
            if (modal) {
                modal.classList.add("active");
                const confirmBtn = document.getElementById("confirm-delete-btn");
                const newConfirm = confirmBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
                newConfirm.addEventListener("click", async () => {
                    modal.classList.remove("active");
                    if (isComment && postId) {
                        await fetch(`/posts/${postId}/comments/${item.dataset.commentId}`, { method: "DELETE" });
                        item.remove();
                        const rc = postCard.querySelector(".reply-count");
                        if (rc) rc.innerText = Math.max(0, (parseInt(rc.innerText) || 0) - 1);
                    } else if (postId) {
                        await fetch(`/posts/${postId}`, { method: "DELETE" });
                        document.getElementById("single-post-blur-modal")?.remove();
                        loadPosts(1, false);
                    }
                });
                document.getElementById("cancel-delete-btn").onclick = () => modal.classList.remove("active");
            }
            return;
        }

        //  Edit post functionality
        if (target.closest(".edit-post-btn") && postCard) {
            currentPostBeingEdited = postCard;
            editMediaCleared = false;
            const editModal = document.getElementById("edit-modal-overlay");
            const textarea = document.getElementById("edit-modal-textarea");
            if (textarea) textarea.value = postCard.querySelector(".post-text")?.innerText || "";
            const existingImg = postCard.querySelector("img.post-media-content");
            const existingVid = postCard.querySelector("video.post-media-content");
            const editPreviewContainer = document.getElementById("edit-modal-media-preview-container");
            const editImgPreview = document.getElementById("edit-modal-media-preview");
            const editVideoPreview = document.getElementById("edit-modal-video-preview");

            if (editPreviewContainer && editImgPreview && editVideoPreview) {
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
            }
            editModal.classList.add("active");
        }
    });

    // === EDIT POST MODAL FUNCTIONALITY ===
    const editMediaInput = document.getElementById("edit-modal-media-upload");
    const editPreviewContainer = document.getElementById("edit-modal-media-preview-container");
    const editImgPreview = document.getElementById("edit-modal-media-preview");
    const editVideoPreview = document.getElementById("edit-modal-video-preview");

    // close edit modal and reset its state function
    const closeEditModal = () => {
        document.getElementById("edit-modal-overlay")?.classList.remove("active");
        if (editMediaInput) editMediaInput.value = "";
        if (editPreviewContainer) editPreviewContainer.style.display = "none";
        editMediaCleared = false;
    };

    document.getElementById("edit-modal-image-btn")?.addEventListener("click", () => editMediaInput?.click());
    document.getElementById("edit-modal-clear-media")?.addEventListener("click", () => {
        if (editMediaInput) editMediaInput.value = "";
        if (editPreviewContainer) editPreviewContainer.style.display = "none";
        editMediaCleared = true;
    });

    if (editMediaInput) {
        editMediaInput.addEventListener("change", function () {
            const file = this.files[0];
            if (!file) return;

            // validate file type (image or video)
            const isImage = file.type.startsWith("image/");
            const isVideo = file.type.startsWith("video/");
            if (!isImage && !isVideo) {
                alert("Please select a valid image or video file.");
                this.value = "";
                if (editPreviewContainer) editPreviewContainer.style.display = "none";
                return;
            }

            // validate file size (max 5MB for image, 10MB for video)
            const maxImgSize = 5 * 1024 * 1024;
            const maxVidSize = 10 * 1024 * 1024;
            if (isImage && file.size > maxImgSize) {
                alert("The selected image is too large! Maximum allowed size is 5MB.");
                this.value = "";
                if (editPreviewContainer) editPreviewContainer.style.display = "none";
                return;
            }
            if (isVideo && file.size > maxVidSize) {
                alert("The selected video is too large! Maximum allowed size is 10MB.");
                this.value = "";
                if (editPreviewContainer) editPreviewContainer.style.display = "none";
                return;
            }

            if (editPreviewContainer) {
                const url = URL.createObjectURL(file);
                editPreviewContainer.style.display = "flex";
                editMediaCleared = false;
                if (isVideo) {
                    editVideoPreview.src = url;
                    editVideoPreview.style.display = "block";
                    editImgPreview.style.display = "none";
                } else {
                    editImgPreview.src = url;
                    editImgPreview.style.display = "block";
                    editVideoPreview.style.display = "none";
                }
            }
        });
    }

    document.getElementById("edit-modal-publish-btn")?.addEventListener("click", async () => {
        if (!currentPostBeingEdited) return;
        const postId = currentPostBeingEdited.dataset.postId;
        const newText = document.getElementById("edit-modal-textarea").value.trim();
        const newFile = editMediaInput?.files[0];

        let finalMediaUrl = undefined, finalMediaType = undefined;
        if (newFile) {
            finalMediaUrl = await fileToDataURL(newFile);
            finalMediaType = newFile.type.startsWith("video/") ? "video" : "image";
        } else if (editMediaCleared) {
            finalMediaUrl = "";
            finalMediaType = "";
        }

        const payload = { content: newText };
        if (finalMediaUrl !== undefined) payload.mediaUrl = finalMediaUrl;
        if (finalMediaType !== undefined) payload.mediaType = finalMediaType;

        const res = await fetch(`/posts/${postId}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeEditModal();
            document.getElementById("single-post-blur-modal")?.remove();
            loadPosts(1, false);
        }
    });

    document.getElementById("close-edit-modal-btn")?.addEventListener("click", closeEditModal);

    document.addEventListener("input", (e) => {
        if (e.target.classList.contains("comment-input")) {
            e.target.nextElementSibling.disabled = !e.target.value.trim();
        }
    });

    // Toggle facebook share button active state
    document.getElementById("share-facebook-btn")?.addEventListener("click", function () {
        this.classList.toggle("active");
    });

    // Close modals when clicking outside of them
    ["post-modal-overlay", "edit-modal-overlay", "delete-confirm-modal"].forEach(id => {
        const overlay = document.getElementById(id);
        overlay?.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.classList.remove("active");
        });
    });
});