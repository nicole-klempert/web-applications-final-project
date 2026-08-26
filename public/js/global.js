document.addEventListener("DOMContentLoaded", () => {
    // = global utility functions =
    window.getCurrentUser = () => (localStorage.getItem("loggedInUser") || "").trim();

    // Convert a File object to a Data URL (base64)
    window.fileToDataURL = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // Format a date string into a "time ago" format
    window.formatTimeAgo = (dateString) => {
        if (!dateString) return "Just now";
        const diff = (new Date() - new Date(dateString)) / 1000;
        if (isNaN(diff) || diff < 60) return "Just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 172800) return "Yesterday";
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    // Update all sidebar avatars and names based on the new profile picture and username
    window.syncSidebarAvatars = (newPic, username) => {
        const initials = username ? username.substring(0, 2).toUpperCase() : "US";
        // Update avatar elements in the sidebar and other relevant places
        document.querySelectorAll("#nav-user-avatar, .account-card .avatar, .composer-placeholder .avatar").forEach(avatarEl => {
            avatarEl.innerHTML = "";
            if (newPic && newPic.trim() !== "" && newPic !== "undefined" && newPic !== "null") {
                avatarEl.className = "avatar";
                avatarEl.style.backgroundImage = `url('${newPic}')`;
                avatarEl.style.backgroundSize = "cover";
                avatarEl.style.backgroundPosition = "center";
            } else {
                avatarEl.className = "avatar avatar-purple";
                avatarEl.removeAttribute("style");
                avatarEl.innerText = initials;
            }
        });

        // Update name and handle in sidebar
        const userNameDisplay = document.getElementById("nav-user-name") || document.querySelector(".account-card .name");
        const userHandleDisplay = document.getElementById("nav-user-handle") || document.querySelector(".account-card .handle");
        if (userNameDisplay) userNameDisplay.textContent = username || window.getCurrentUser();
        if (userHandleDisplay && username) userHandleDisplay.textContent = "@" + username.toLowerCase().replace(/\s/g, '');
    };

    // Generate avatar HTML based on the provided profile picture URL, author name, and size
    window.getAvatarHTML = (dbPic, authorName, size = 40) => {
        const currentUser = window.getCurrentUser();
        const myPic = localStorage.getItem("userProfilePic") || "";
        const isMe = authorName && authorName.trim().toLowerCase() === currentUser.toLowerCase();
        const picToUse = (isMe && myPic && myPic !== "undefined" && myPic !== "null") ? myPic : dbPic;

        if (picToUse && picToUse !== "undefined" && picToUse !== "null") {
            return `<div class="avatar" style="width:${size}px; height:${size}px; background-image: url('${picToUse}'); background-size: cover; background-position: center;"></div>`;
        }
        return `<div class="avatar avatar-purple" style="width:${size}px; height:${size}px;">${authorName ? authorName.substring(0, 2).toUpperCase() : "US"}</div>`;
    };

    // image cropper for profile pic.
    window.initImageCropper = (config) => {
        const { triggerId, fileInputId, livePreviewId, placeholderId, hideModalId, onCropApply } = config;

        const trigger = document.getElementById(triggerId);
        const fileInput = document.getElementById(fileInputId);
        const livePreview = document.getElementById(livePreviewId);
        const placeholder = document.getElementById(placeholderId);
        const cropModal = document.getElementById("crop-modal");
        const canvas = document.getElementById("crop-canvas");
        const slider = document.getElementById("zoom-slider");

        // double buttons
        let cancelBtn = document.getElementById("cancel-crop-btn");
        let saveBtn = document.getElementById("save-crop-btn");
        const newCancelBtn = cancelBtn.cloneNode(true); cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn); cancelBtn = newCancelBtn;
        const newSaveBtn = saveBtn.cloneNode(true); saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn); saveBtn = newSaveBtn;

        if (!trigger || !fileInput || !cropModal || !canvas) return;

        const ctx = canvas.getContext("2d");
        let img = new Image(), imgX = 0, imgY = 0, scale = 1, isDragging = false, startX = 0, startY = 0;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(canvas.width / 2 + imgX, canvas.height / 2 + imgY);
            ctx.scale(scale, scale);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        };

        trigger.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                img.onload = () => {
                    scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                    if (slider) { slider.min = (scale * 0.4).toFixed(4); slider.max = (scale * 3).toFixed(4); slider.value = scale; }
                    imgX = 0; imgY = 0; draw();
                    if (hideModalId) document.getElementById(hideModalId)?.classList.remove("active");
                    cropModal.classList.add("active");
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        canvas.addEventListener("mousedown", (e) => { isDragging = true; startX = e.clientX - imgX; startY = e.clientY - imgY; });
        window.addEventListener("mousemove", (e) => { if (!isDragging) return; imgX = e.clientX - startX; imgY = e.clientY - startY; draw(); });
        window.addEventListener("mouseup", () => { isDragging = false; });
        if (slider) slider.addEventListener("input", (e) => { scale = parseFloat(e.target.value); draw(); });

        cancelBtn.addEventListener("click", () => {
            cropModal.classList.remove("active");
            fileInput.value = "";
            if (hideModalId) document.getElementById(hideModalId)?.classList.add("active");
        });

        saveBtn.addEventListener("click", () => {
            const smallCanvas = document.createElement("canvas");
            smallCanvas.width = 120; smallCanvas.height = 120;
            const smallCtx = smallCanvas.getContext("2d");
            smallCtx.drawImage(canvas, 0, 0, 120, 120);

            const base64 = smallCanvas.toDataURL("image/jpeg", 0.75);
            if (livePreview) { livePreview.src = base64; livePreview.style.display = "block"; }
            if (placeholder) placeholder.style.display = "none";
            if (trigger) trigger.style.borderStyle = "solid";

            cropModal.classList.remove("active");
            if (hideModalId) document.getElementById(hideModalId)?.classList.add("active");
            if (typeof onCropApply === "function") onCropApply(base64);
        });
    };

    const injectGlobalModals = () => {
        // Logout Confirmation Modal
        if (!document.getElementById("logout-confirm-modal")) {
            document.body.insertAdjacentHTML("beforeend", `
                <div id="logout-confirm-modal" class="modal-overlay">
                    <div class="confirm-modal-content">
                        <h3>Log Out?</h3>
                        <p>Are you sure you want to log out of your account?</p>
                        <button id="confirm-logout-btn" class="danger-btn">Log Out</button>
                        <button id="cancel-logout-btn" class="cancel-btn">Cancel</button>
                    </div>
                </div>
            `);
        }
        // Delete Confirmation Modal
        if (!document.getElementById("delete-confirm-modal")) {
            document.body.insertAdjacentHTML("beforeend", `
                <div id="delete-confirm-modal" class="modal-overlay">
                    <div class="confirm-modal-content">
                        <h3>Delete item?</h3>
                        <p>This action can’t be undone and the item will be removed permanently.</p>
                        <button id="confirm-delete-btn" class="danger-btn">Delete</button>
                        <button id="cancel-delete-btn" class="cancel-btn">Cancel</button>
                    </div>
                </div>
            `);
        }
        // Crop Modal (for profile pic.)
        if (!document.getElementById("crop-modal")) {
            document.body.insertAdjacentHTML("beforeend", `
                <div id="crop-modal" class="modal-overlay" style="z-index: 10000;">
                    <div class="crop-modal-content">
                        <h3>Adjust Profile Photo</h3>
                        <p>Position and zoom your photo to fit the circle</p>
                        <div class="crop-viewport-wrapper">
                            <canvas id="crop-canvas" width="220" height="220"></canvas>
                        </div>
                        <div class="zoom-slider-group">
                            <i class="bi bi-zoom-out"></i>
                            <input type="range" id="zoom-slider" min="1" max="3" step="0.05" value="1">
                            <i class="bi bi-zoom-in"></i>
                        </div>
                        <div class="crop-modal-actions">
                            <button type="button" class="btn btn-secondary cancel-btn" id="cancel-crop-btn">Cancel</button>
                            <button type="button" class="btn btn-primary" id="save-crop-btn">Save Avatar</button>
                        </div>
                    </div>
                </div>
            `);
        }
        // Edit Post Modal
        if (!document.getElementById("edit-modal-overlay")) {
            document.body.insertAdjacentHTML("beforeend", `
                <div id="edit-modal-overlay" class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Edit Post</h3>
                            <button id="close-edit-modal-btn" class="close-modal-btn">&times;</button>
                        </div>
                        <div class="modal-body">
                            <textarea id="edit-modal-textarea" class="modal-textarea-custom" rows="4"></textarea>
                            <input type="file" id="edit-modal-media-upload" accept="image/*,video/*" style="display: none;">
                            <div id="edit-modal-media-preview-container" class="modal-media-preview-container" style="display: none;">
                                <img id="edit-modal-media-preview" class="modal-preview-media" src="" style="display: none;">
                                <video id="edit-modal-video-preview" class="modal-preview-media" controls style="display: none;"></video>
                                <button id="edit-modal-clear-media" class="clear-media-btn">&times;</button>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="edit-modal-image-btn" class="media-trigger-btn">
                                <i class="bi bi-image"></i> Change Media
                            </button>
                            <button id="edit-modal-publish-btn" class="publish-btn">Save Changes</button>
                        </div>
                    </div>
                </div>
            `);
        }
    };
    injectGlobalModals();

    // post card HTML generator 
    window.createPostCardHTML = (post, isNew = false) => {
        const currentUser = window.getCurrentUser();
        const isOwner = post.author && (post.author.trim().toLowerCase() === currentUser.toLowerCase());
        const isLiked = Array.isArray(post.likedBy) && post.likedBy.includes(currentUser);
        const timeAgo = window.formatTimeAgo(post.createdAt);

        // Media HTML (image or video)
        const mediaHTML = post.mediaUrl ? (post.mediaType === "video"
            ? `<video src="${post.mediaUrl}" controls preload="metadata" class="post-media-content"></video>`
            : `<img src="${post.mediaUrl}" alt="media" loading="lazy" class="post-media-content" />`) : "";

        const commentsHTML = (post.comments || []).map(c => {
            const isCommOwner = c.author && (c.author.trim().toLowerCase() === currentUser.toLowerCase());
            return `
                <div class="comment-item" data-comment-id="${c._id || ''}">
                    ${window.getAvatarHTML(c.authorProfilePic, c.author, 32)}
                    <div class="comment-bubble">
                        ${isCommOwner ? `<button class="delete-comment-btn" title="Delete"><i class="bi bi-trash3"></i></button>` : ""}
                        <div class="comment-header">${c.author || "User"}</div>
                        <div class="comment-text">${c.text || ""}</div>
                    </div>
                </div>`;
        }).join("");

        // Post actions (edit/delete) for the owner
        const actionsHTML = isOwner ? `
            <div class="post-actions-right">
                <button class="edit-post-btn" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="delete-post-btn" title="Delete"><i class="bi bi-trash3"></i></button>
            </div>` : "";

        // Final post card HTML
        return `
            <article class="post-card ${isNew ? 'new-item-highlight' : ''}" data-post-id="${post._id || ''}">
                <div class="post-card-header">
                    <div class="author-info-group">
                        <a href="profile.html?user=${encodeURIComponent(post.author || 'User')}" style="text-decoration:none;">
                            ${window.getAvatarHTML(post.authorProfilePic, post.author, 40)}
                        </a>
                        <div>
                            <a href="profile.html?user=${encodeURIComponent(post.author || 'User')}" class="post-author" style="text-decoration:none; color:inherit;">
                                ${post.author || "User"}
                            </a>
                            <span class="post-meta view-single-post-trigger" style="cursor:pointer;">@${(post.author || "user").toLowerCase().replace(/\s/g, '')} · ${timeAgo}</span>
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
                        ${window.getAvatarHTML("", currentUser, 32)}
                        <input type="text" class="comment-input" placeholder="Post your comment...">
                        <button type="button" class="reply-btn" disabled>Reply</button>
                    </div>
                </div>
            </article>`;
    };

    // = theme toggle = 
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    const body = document.body;

    // Update the dark mode icon and text based on the current state
    const updateDarkModeUI = () => {
        const isDark = body.classList.contains("dark-mode");
        const icon = document.getElementById("dark-mode-icon");
        const text = document.getElementById("dark-mode-text");
        if (icon && text) {
            icon.className = isDark ? "bi bi-sun-fill nav-icon" : "bi bi-moon-stars nav-icon";
            text.innerText = isDark ? "Light Mode" : "Dark Mode";
        }
    };

    // Initialize dark mode based on localStorage
    if (localStorage.getItem("darkMode") === "enabled") body.classList.add("dark-mode");
    updateDarkModeUI();

    // Toggle dark mode on button click
    darkModeToggle?.addEventListener("click", (e) => {
        e.preventDefault();
        body.classList.toggle("dark-mode");
        updateDarkModeUI();
        localStorage.setItem("darkMode", body.classList.contains("dark-mode") ? "enabled" : "disabled");
    });

    // = back to top button =
    const backToTopBtn = document.getElementById("back-to-top");
    if (backToTopBtn) {
        window.addEventListener("scroll", () => {
            if ((window.scrollY || document.documentElement.scrollTop) > 250) backToTopBtn.classList.add("show");
            else backToTopBtn.classList.remove("show");
        });
        backToTopBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // = logout modal =
    const logoutBtnTrigger = document.getElementById("logout-btn-trigger");
    const logoutModal = document.getElementById("logout-confirm-modal");
    if (logoutBtnTrigger && logoutModal) {
        logoutBtnTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            logoutModal.classList.add("active");
        });
        document.getElementById("cancel-logout-btn")?.addEventListener("click", () => logoutModal.classList.remove("active"));
        document.getElementById("confirm-logout-btn")?.addEventListener("click", () => {
            localStorage.removeItem("loggedInUser");
            localStorage.removeItem("userProfilePic");
            window.location.href = "/logout";
        });
    }

    // profile navigation
    const navigateToMyProfile = () => {
        const user = window.getCurrentUser();
        if (user) window.location.href = `profile.html?user=${encodeURIComponent(user)}`;
    };
    document.querySelector(".account-card")?.addEventListener("click", navigateToMyProfile);
    document.getElementById("nav-user-avatar")?.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateToMyProfile();
    });

    // Ensure sidebar is synced on page load
    window.syncSidebarAvatars(localStorage.getItem("userProfilePic"), window.getCurrentUser());

    // = global posts interactions = 
    let currentPostBeingEdited = null;
    let editMediaCleared = false;

    document.addEventListener("click", async (e) => {
        const target = e.target;
        const postCard = target.closest(".post-card");
        const postId = postCard?.dataset.postId;
        const currentUser = window.getCurrentUser();

        // Single Post View
        if (target.closest(".view-single-post-trigger") && postId) {
            e.stopPropagation();
            if (typeof window.showSinglePostBlurModal === "function") {
                fetch(`/posts/${postId}`).then(r => r.json()).then(d => {
                    if (d.success && d.post) window.showSinglePostBlurModal(d.post);
                });
            }
            return;
        }

        // Share Link
        if (target.closest(".copy-link-btn") && postId) {
            e.stopPropagation();
            const btn = target.closest(".copy-link-btn");
            navigator.clipboard.writeText(`${window.location.origin}/feed.html?postId=${postId}`);
            btn.innerHTML = `<i class="bi bi-check2"></i> Copied!`;
            setTimeout(() => { btn.innerHTML = `<i class="bi bi-link-45deg"></i> Copy link`; }, 2000);
            return;
        }

        // Native Share
        if (target.closest(".native-share-btn") && postId) {
            e.stopPropagation();
            const url = `${window.location.origin}/feed.html?postId=${postId}`;
            navigator.share ? navigator.share({ title: "Check out this post", url }) : navigator.clipboard.writeText(url);
            return;
        }

        // Like Button
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
                if (d.success) {
                    document.querySelectorAll(`.post-card[data-post-id="${postId}"] .like-count`)
                        .forEach(el => el.innerText = d.likes);
                }
            });
            return;
        }

        // Toggle Comments
        if (target.closest(".stat-reply")) {
            const section = postCard?.querySelector(".comments-section");
            if (section) section.style.display = section.style.display === "none" ? "block" : "none";
            return;
        }

        // Add Comment (Reply Button)
        if (target.classList.contains("reply-btn") && postId) {
            const input = target.previousElementSibling;
            const text = input.value.trim();
            if (!text) return;

            const res = await fetch(`/posts/${postId}/comments`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ author: currentUser, authorProfilePic: localStorage.getItem("userProfilePic") || "", text })
            });
            const data = await res.json();

            if (data.success) {
                target.closest(".comments-section").querySelector(".comments-list").insertAdjacentHTML("beforeend", `
                    <div class="comment-item" data-comment-id="${data.comment._id}">
                        ${window.getAvatarHTML(data.comment.authorProfilePic, data.comment.author, 32)}
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

        // Delete Post / Comment
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
                        await fetch(`/posts/${postId}?username=${encodeURIComponent(currentUser)}`, { method: "DELETE" });
                        document.getElementById("single-post-blur-modal")?.remove();
                        if (typeof window.reloadPostsFeed === "function") window.reloadPostsFeed();
                    }
                });
                document.getElementById("cancel-delete-btn").onclick = () => modal.classList.remove("active");
            }
            return;
        }

        // Open Edit Post Modal
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

                if (existingImg || existingVid) {
                    const activePreview = existingImg ? editImgPreview : editVideoPreview;
                    activePreview.src = (existingImg || existingVid).src;
                    activePreview.style.display = "block";
                    editPreviewContainer.style.display = "flex";
                }
            }
            editModal?.classList.add("active");
        }
    });

    // Edit Post Modal Actions
    const editMediaInput = document.getElementById("edit-modal-media-upload");
    const editPreviewContainer = document.getElementById("edit-modal-media-preview-container");
    const editImgPreview = document.getElementById("edit-modal-media-preview");
    const editVideoPreview = document.getElementById("edit-modal-video-preview");

    const closeEditPostModal = () => {
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
            if (file && editPreviewContainer) {
                const url = URL.createObjectURL(file);
                editPreviewContainer.style.display = "flex";
                editMediaCleared = false;

                if (file.type.startsWith("video/")) {
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
        const newText = document.getElementById("edit-modal-textarea")?.value.trim() || "";
        const newFile = editMediaInput?.files[0];

        let finalMediaUrl = undefined, finalMediaType = undefined;
        if (newFile) {
            finalMediaUrl = await window.fileToDataURL(newFile);
            finalMediaType = newFile.type.startsWith("video/") ? "video" : "image";
        } else if (editMediaCleared) {
            finalMediaUrl = "";
            finalMediaType = "";
        }

        const payload = { content: newText, username: window.getCurrentUser() };
        if (finalMediaUrl !== undefined) payload.mediaUrl = finalMediaUrl;
        if (finalMediaType !== undefined) payload.mediaType = finalMediaType;

        const res = await fetch(`/posts/${postId}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeEditPostModal();
            document.getElementById("single-post-blur-modal")?.remove();
            if (typeof window.reloadPostsFeed === "function") window.reloadPostsFeed();
        }
    });

    document.getElementById("close-edit-modal-btn")?.addEventListener("click", closeEditPostModal);

    // Toggle disabled state on comment input
    document.addEventListener("input", (e) => {
        if (e.target.classList.contains("comment-input")) {
            e.target.nextElementSibling.disabled = !e.target.value.trim();
        }
    });
});