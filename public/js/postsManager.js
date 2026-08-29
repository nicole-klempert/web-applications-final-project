document.addEventListener("DOMContentLoaded", () => {
    // === authentication guard ===
    const currentUser = (localStorage.getItem("loggedInUser") || "").trim();
    if (!currentUser) {
        sessionStorage.setItem("authAlert", "You must be logged in to view this page.");
        window.location.replace("login.html");
        return;
    }

    // call syncSidebarAvatars to update the sidebar with the user's profile picture
    window.syncSidebarAvatars(localStorage.getItem("userProfilePic") || "", currentUser);

    // === state and DOM elements ===
    const postFeed = document.querySelector(".post-feed");
    let currentPage = 1;
    let hasMorePosts = false;
    let isLoading = false;

    // === fetch posts function ===
    const loadPosts = async (page = 1, append = false) => {
        if (!postFeed || isLoading) return;
        isLoading = true;

        const filters = window.getPostFilters ? window.getPostFilters() : { search: "", startDate: "", endDate: "", type: "all" };
        const params = new URLSearchParams({ page, limit: 5, ...filters });

        try {
            const res = await fetch(`/posts?${params}`);
            const data = await res.json();
            // if data exists process it and show posts, else show empty state
            if (data.success) {
                const myPostWithPic = (data.posts || []).find(p => p.author && p.author.trim().toLowerCase() === currentUser.toLowerCase() && p.authorProfilePic && p.authorProfilePic.trim() !== "");
                if (myPostWithPic && (!localStorage.getItem("userProfilePic") || localStorage.getItem("userProfilePic").trim() === "")) {
                    localStorage.setItem("userProfilePic", myPostWithPic.authorProfilePic);
                    window.syncSidebarAvatars(myPostWithPic.authorProfilePic, currentUser);
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
                            <button id="reset-filters-btn" type="button" class="btn btn-primary btn-padding">
                                <i class="bi bi-arrow-counterclockwise reset-filters-icon"></i> Reset Filters
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
                    data.posts.forEach(p => postFeed.insertAdjacentHTML("beforeend", window.createPostCardHTML(p)));
                }

                hasMorePosts = data.hasMore || false;
                currentPage = data.currentPage || 1;

                // --- Infinite Scroll Logic ---
                document.getElementById("infinite-scroll-trigger")?.remove();
                if (hasMorePosts) {
                    postFeed.insertAdjacentHTML("afterend", `<div id="infinite-scroll-trigger" class="infinite-scroll-trigger"></div>`);
                    const trigger = document.getElementById("infinite-scroll-trigger");
                    const observer = new IntersectionObserver((entries) => {
                        if (entries[0].isIntersecting && !isLoading) {
                            observer.disconnect();
                            loadPosts(currentPage + 1, true);
                        }
                    }, { rootMargin: "200px" });
                    observer.observe(trigger);
                }
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            isLoading = false;
        }
    };

    window.reloadPostsFeed = () => loadPosts(1, false);

    // === show single post blur modal ===
    const showSinglePostBlurModal = (post) => {
        document.getElementById("single-post-blur-modal")?.remove();
        document.body.insertAdjacentHTML("beforeend", `
            <div id="single-post-blur-modal" class="modal-overlay active">
                <div class="modal-content single-post-modal-content">
                    <button id="close-blur-modal-btn" class="single-post-close-btn" title="Close">&times;</button>
                    ${window.createPostCardHTML(post)}
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

    // === create post modal functionality ===
    const modalOverlay = document.getElementById("post-modal-overlay");
    const modalTextarea = document.getElementById("modal-textarea");
    const modalPublishBtn = document.getElementById("modal-publish-btn");
    const mediaInput = document.getElementById("modal-media-upload");
    const previewContainer = document.getElementById("modal-media-preview-container");
    const imgPreview = document.getElementById("modal-media-preview");
    const videoPreview = document.getElementById("modal-video-preview");
    const postTargetSelect = document.getElementById("post-target-select");
    let selectedPostLocation = null;
    const postLocationPicker = window.PostLocationPicker?.createPicker({
        buttonId: "modal-location-btn",
        panelId: "modal-location-panel",
        mapId: "modal-location-map",
        searchInputId: "modal-location-search",
        searchButtonId: "modal-location-search-btn",
        clearButtonId: "modal-location-clear",
        labelId: "modal-location-selected",
        onChange: location => { selectedPostLocation = location; }
    });
    const loadMemberGroups = async () => {
        if (!postTargetSelect) return;
        try {
            const response = await fetch("/groups?limit=50", { headers: { "Accept": "application/json" } });
            const data = await response.json();
            if (!response.ok || !data.success) return;
            postTargetSelect.innerHTML = `<option value="">My Feed</option>`;
            (data.groups || []).filter(group => group.isMember).forEach(group => {
                const option = document.createElement("option");
                option.value = group._id;
                option.textContent = group.name;
                postTargetSelect.appendChild(option);
            });
        } catch (error) { console.error("Failed to load user groups:", error); }
    };

    document.getElementById("trigger-modal-bar")?.addEventListener("click", async () => {
        await loadMemberGroups();
        modalOverlay?.classList.add("active");
        modalTextarea?.focus();
    });

    // close modal function to reset state
    const closeModal = () => {
        modalOverlay?.classList.remove("active");
        if (modalTextarea) modalTextarea.value = "";
        if (mediaInput) mediaInput.value = "";
        if (previewContainer) previewContainer.style.display = "none";
        if (modalPublishBtn) modalPublishBtn.disabled = true;
        document.getElementById("share-facebook-btn")?.classList.remove("active");
        if (postTargetSelect) postTargetSelect.value = "";
        postLocationPicker?.clear();
        selectedPostLocation = null;
        const locationPanel = document.getElementById("modal-location-panel");
        if (locationPanel) locationPanel.hidden = true;
    };

    document.getElementById("close-modal-btn")?.addEventListener("click", closeModal);

    // enable publish button only if there's text or media
    modalTextarea?.addEventListener("input", () => {
        modalPublishBtn.disabled = !(modalTextarea.value.trim() || (mediaInput && mediaInput.files.length));
    });

    document.getElementById("modal-image-btn")?.addEventListener("click", () => mediaInput?.click());

    // clear media button logic
    document.getElementById("modal-clear-media")?.addEventListener("click", () => {
        mediaInput.value = "";
        previewContainer.style.display = "none";
        modalPublishBtn.disabled = !modalTextarea.value.trim();
    });

    //if media is selected, show preview and enable publish button
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

    // publish button logic: send post data to server
    if (modalPublishBtn) {
        modalPublishBtn.addEventListener("click", async () => {
            modalPublishBtn.disabled = true;

            const file = mediaInput?.files[0];
            let mediaUrl = "", mediaType = "";
            if (file) {
                mediaUrl = await window.fileToDataURL(file);
                mediaType = file.type.startsWith("video/") ? "video" : "image";
            }

            const shareToFacebook = document.getElementById("share-facebook-btn")?.classList.contains("active") || false;

            const res = await fetch('/posts', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    author: currentUser,
                    authorProfilePic: localStorage.getItem("userProfilePic") || "",
                    content: modalTextarea.value.trim(), mediaUrl, mediaType, shareToFacebook,
                    ...(selectedPostLocation ? { location: selectedPostLocation } : {}),
                    ...(postTargetSelect?.value ? { groupId: postTargetSelect.value } : {})
                })
            });

            // file size limit check
            if (res.status === 413) {
                modalPublishBtn.disabled = false;
                return alert("File exceeds 50mb limit!");
            }

            // if response is ok, reload posts and close modal, else re-enable publish button
            if (res.ok) {
                const data = await res.json();
                loadPosts(1, false);
                closeModal();
                if (data.sharedToFacebook) {
                    alert("Post published successfully and shared to Facebook!");
                }
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

    // close Modals by clicking outside
    ["post-modal-overlay", "edit-modal-overlay", "delete-confirm-modal"].forEach(id => {
        const overlay = document.getElementById(id);
        overlay?.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.classList.remove("active");
        });
    });
});