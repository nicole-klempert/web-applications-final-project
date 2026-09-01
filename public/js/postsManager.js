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

    // Toggle disabled state on comment input
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