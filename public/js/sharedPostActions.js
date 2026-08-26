document.addEventListener("DOMContentLoaded", () => {
    // === Helper Functions ===
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

    // === Global Avatar Sync ===
    window.syncSidebarAvatars = (newPic, username) => {
        const initials = username ? username.substring(0, 2).toUpperCase() : "US";
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
    };

    // === Avatar HTML Generator ===
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

    // === Post Card HTML Generator ===
    window.createPostCardHTML = (post, isNew = false) => {
        const currentUser = window.getCurrentUser();
        const isOwner = post.author && (post.author.trim().toLowerCase() === currentUser.toLowerCase());
        const isLiked = Array.isArray(post.likedBy) && post.likedBy.includes(currentUser);
        const timeAgo = window.formatTimeAgo(post.createdAt);

        // Media HTML (image or video)
        const mediaHTML = post.mediaUrl ? (post.mediaType === "video"
            ? `<video src="${post.mediaUrl}" controls preload="metadata" class="post-media-content"></video>`
            : `<img src="${post.mediaUrl}" alt="media" loading="lazy" class="post-media-content" />`) : "";

        // Comments HTML - if the post has comments, generate the HTML for each comment
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

        // Post Actions HTML (Edit/Delete buttons for the owner)
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

    // === Global Click Event Listener for Post Interactions ===
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

        // Share actions
        if (target.closest(".copy-link-btn") && postId) {
            e.stopPropagation();
            const btn = target.closest(".copy-link-btn");
            navigator.clipboard.writeText(`${window.location.origin}/feed.html?postId=${postId}`);
            btn.innerHTML = `<i class="bi bi-check2"></i> Copied!`;
            setTimeout(() => { btn.innerHTML = `<i class="bi bi-link-45deg"></i> Copy link`; }, 2000);
            return;
        }

        // Native Share API
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

        // Reply Button
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

            // Store the item and type in the modal for later reference
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

        // Edit Post
        if (target.closest(".edit-post-btn") && postCard) {
            currentPostBeingEdited = postCard;
            editMediaCleared = false;

            // Populate the edit modal with existing post data
            const editModal = document.getElementById("edit-modal-overlay");
            const textarea = document.getElementById("edit-modal-textarea");
            if (textarea) textarea.value = postCard.querySelector(".post-text")?.innerText || "";

            const existingImg = postCard.querySelector("img.post-media-content");
            const existingVid = postCard.querySelector("video.post-media-content");
            const editPreviewContainer = document.getElementById("edit-modal-media-preview-container");
            const editImgPreview = document.getElementById("edit-modal-media-preview");
            const editVideoPreview = document.getElementById("edit-modal-video-preview");

            // Reset and show existing media in the edit modal
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

    // === Edit Post Modal Logic ===
    const editMediaInput = document.getElementById("edit-modal-media-upload");
    const editPreviewContainer = document.getElementById("edit-modal-media-preview-container");
    const editImgPreview = document.getElementById("edit-modal-media-preview");
    const editVideoPreview = document.getElementById("edit-modal-video-preview");

    // Function to close the edit post modal and reset its state
    const closeEditPostModal = () => {
        document.getElementById("edit-modal-overlay")?.classList.remove("active");
        if (editMediaInput) editMediaInput.value = "";
        if (editPreviewContainer) editPreviewContainer.style.display = "none";
        editMediaCleared = false;
    };

    // Trigger file input when the "Upload Media" button is clicked
    document.getElementById("edit-modal-image-btn")?.addEventListener("click", () => editMediaInput?.click());

    document.getElementById("edit-modal-clear-media")?.addEventListener("click", () => {
        if (editMediaInput) editMediaInput.value = "";
        if (editPreviewContainer) editPreviewContainer.style.display = "none";
        editMediaCleared = true;
    });

    // Handle media file selection and preview in the edit modal
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

    // Handle the "Publish" button click in the edit modal
    document.getElementById("edit-modal-publish-btn")?.addEventListener("click", async () => {
        if (!currentPostBeingEdited) return;
        const postId = currentPostBeingEdited.dataset.postId;
        const newText = document.getElementById("edit-modal-textarea")?.value.trim() || "";
        const newFile = editMediaInput?.files[0];

        // Determine the final media URL and type based on user actions
        let finalMediaUrl = undefined, finalMediaType = undefined;
        if (newFile) {
            finalMediaUrl = await window.fileToDataURL(newFile);
            finalMediaType = newFile.type.startsWith("video/") ? "video" : "image";
        } else if (editMediaCleared) {
            finalMediaUrl = "";
            finalMediaType = "";
        }

        // Prepare the payload for the PUT request
        const payload = { content: newText, username: window.getCurrentUser() };
        if (finalMediaUrl !== undefined) payload.mediaUrl = finalMediaUrl;
        if (finalMediaType !== undefined) payload.mediaType = finalMediaType;

        // Send the PUT request to update the post
        const res = await fetch(`/posts/${postId}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        // If the update is successful, close the modal and refresh the post feed
        if (res.ok) {
            closeEditPostModal();
            document.getElementById("single-post-blur-modal")?.remove();
            if (typeof window.reloadPostsFeed === "function") window.reloadPostsFeed();
        }
    });

    document.getElementById("close-edit-modal-btn")?.addEventListener("click", closeEditPostModal);

    // Toggle disabled state on reply button based on input length
    document.addEventListener("input", (e) => {
        if (e.target.classList.contains("comment-input")) {
            e.target.nextElementSibling.disabled = !e.target.value.trim();
        }
    });
});