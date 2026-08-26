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
                    data.posts.forEach(p => postFeed.insertAdjacentHTML("beforeend", window.createPostCardHTML(p)));
                }

                hasMorePosts = data.hasMore || false;
                currentPage = data.currentPage || 1;

                // --- Infinite Scroll Logic ---
                document.getElementById("infinite-scroll-trigger")?.remove();

                if (hasMorePosts) {
                    // Create an invisible trigger element at the bottom of the feed
                    postFeed.insertAdjacentHTML("afterend", `<div id="infinite-scroll-trigger" style="height: 20px; width: 100%;"></div>`);

                    const trigger = document.getElementById("infinite-scroll-trigger");
                    const observer = new IntersectionObserver((entries) => {
                        if (entries[0].isIntersecting && !isLoading) {
                            observer.disconnect(); // Stop observing this trigger to prevent duplicate calls
                            loadPosts(currentPage + 1, true); // Load next page
                        }
                    }, { rootMargin: "200px" }); // Load 200px before reaching the exact bottom

                    observer.observe(trigger);
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
            if (file && previewContainer) {
                const url = URL.createObjectURL(file);
                previewContainer.style.display = "flex";
                if (file.type.startsWith("video/")) {
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