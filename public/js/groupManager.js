// Single group page management
document.addEventListener("DOMContentLoaded", () => {
    const groupId = new URLSearchParams(window.location.search).get("id");
    const currentUser = (localStorage.getItem("loggedInUser") || "").trim();

    if (!groupId) {
        window.location.href = "groups.html";
        return;
    }

    let group = null;
    let selectedPostLocation = null;

    // Helper to read selected media file as Base64 Data URL
    const fileToDataURL = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // Helper to check if the current user has manager privileges
    const isManager = () => group && (group.isOwner || group.isAdmin);

    const renderUserAvatar = user => {
        const picture = user.profilePicture && user.profilePicture.trim() !== "" && user.profilePicture !== "undefined" && user.profilePicture !== "null"
            ? user.profilePicture
            : "";

        if (picture) {
            return `<span class="avatar avatar-sm" style="background-image: url('${picture}'); background-size: cover; background-position: center;"></span>`;
        }

        return `<span class="avatar avatar-purple avatar-sm">${user.username.substring(0, 2).toUpperCase()}</span>`;
    };

    const showDeleteConfirmation = onConfirm => {
        const modal = document.getElementById("delete-confirm-modal");
        if (!modal) return;

        modal.classList.add("active");
        const confirmBtn = document.getElementById("confirm-delete-btn");
        const newConfirm = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);

        newConfirm.addEventListener("click", async () => {
            modal.classList.remove("active");
            await onConfirm();
        });

        document.getElementById("cancel-delete-btn").onclick = () => modal.classList.remove("active");
    };

    const postModal = document.getElementById("group-post-modal-overlay");
    const postTextarea = document.getElementById("group-post-text");
    const postPublishBtn = document.getElementById("group-post-publish");
    const mediaInput = document.getElementById("group-post-media");
    const previewContainer = document.getElementById("group-media-preview-container");
    const imgPreview = document.getElementById("group-media-preview");
    const videoPreview = document.getElementById("group-video-preview");

    // Initialize location picker plugin if available
    const postLocationPicker = window.PostLocationPicker?.createPicker({
        buttonId: "group-location-btn",
        panelId: "group-location-panel",
        mapId: "group-location-map",
        searchInputId: "group-location-search",
        searchButtonId: "group-location-search-btn",
        clearButtonId: "group-location-clear",
        labelId: "group-location-selected",
        onChange: location => {
            selectedPostLocation = location;
        }
    });

    const updatePublishButton = () => {
        postPublishBtn.disabled = !(postTextarea.value.trim() || mediaInput.files.length);
    };

    const closePostModal = () => {
        postModal.classList.remove("active");
        postTextarea.value = "";
        mediaInput.value = "";
        previewContainer.style.display = "none";
        imgPreview.style.display = "none";
        videoPreview.style.display = "none";
        imgPreview.src = "";
        videoPreview.src = "";
        postPublishBtn.disabled = true;
        postLocationPicker?.clear();
        selectedPostLocation = null;

        const locationPanel = document.getElementById("group-location-panel");
        if (locationPanel) locationPanel.hidden = true;
    };

    /**
     * Load group details from the server
     */
    const loadGroup = async () => {
        try {
            const res = await fetch(`/groups/${groupId}`, {
                headers: { Accept: "application/json" }
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Group not found");
            }

            group = data.group;
            renderGroup();
            await loadPosts();
        } catch (error) {
            document.getElementById("group-loading").textContent = error.message;
        }
    };

    /**
     * Render the group metadata and settings panels
     */
    const renderGroup = () => {
        document.getElementById("group-loading").hidden = true;
        document.getElementById("group-page").hidden = false;
        document.title = group.name;

        // Group Header Image
        const image = document.getElementById("group-image");
        image.innerHTML = group.image
            ? `<img src="${group.image}" alt="${group.name}">`
            : '<i class="bi bi-people-fill"></i>';

        // Set text properties
        document.getElementById("group-name").textContent = group.name;
        document.getElementById("group-description").textContent = group.description || "No description yet.";
        document.getElementById("group-category").innerHTML = `<i class="bi bi-tag"></i> ${group.category || "General"}`;
        document.getElementById("group-owner").innerHTML = `<i class="bi bi-person-badge"></i> ${group.owner?.username || "Unknown"}`;
        document.getElementById("group-members-count").innerHTML = `<i class="bi bi-people"></i> ${group.memberCount} members`;

        // User role badge
        const role = document.getElementById("group-role");
        role.textContent = group.isOwner ? "Owner" : group.isAdmin ? "Admin" : group.isMember ? "Member" : "";
        role.hidden = !role.textContent;

        // Membership actions
        const membership = document.getElementById("membership-btn");
        membership.hidden = group.isOwner;

        if (group.isMember) {
            membership.textContent = "Leave Group";
            membership.disabled = false;
        } else if (group.isRequested) {
            membership.textContent = "Requested";
            membership.disabled = true;
        } else {
            membership.textContent = "Join Group";
            membership.disabled = false;
        }

        // Admin panel toggle visibility
        document.getElementById("edit-group-btn").hidden = !isManager();
        document.getElementById("group-statistics-btn").hidden = !isManager();
        document.getElementById("delete-group-btn").hidden = !isManager();
        document.getElementById("group-composer").hidden = !group.isMember;
        document.getElementById("admin-panel").hidden = !group.isOwner;

        // Render Join Requests panel if manager
        const requestsPanel = document.getElementById("join-requests-panel");

        if (isManager() && group.isPrivateContentHidden !== true && group.joinRequests && group.joinRequests.length > 0) {
            requestsPanel.hidden = false;
            document.getElementById("group-join-requests").innerHTML = group.joinRequests.map(req => `
                <div class="pending-request-item">
                    <div class="friend-info">
                        ${renderUserAvatar(req)}
                        <a href="profile.html?user=${encodeURIComponent(req.username)}" class="friend-name-link">${req.username}</a>
                    </div>
                    <div class="friend-info">
                        <button class="btn btn-primary btn-sm accept-request-btn" data-userid="${req._id}" title="Approve"><i class="bi bi-check-lg"></i></button>
                        <button class="btn btn-secondary btn-sm reject-request-btn" data-userid="${req._id}" title="Reject"><i class="bi bi-x-lg"></i></button>
                    </div>
                </div>
            `).join("");
        } else {
            requestsPanel.hidden = true;
        }

        // Render member cards
        document.getElementById("group-members").innerHTML = (group.members || []).map(member => {
            const admin = (group.admins || []).some(a => String(a._id) === String(member._id));
            const owner = String(group.owner?._id) === String(member._id);
            const canRemove = isManager() && !owner && (!admin || group.isOwner);

            return `
                <div class="group-member">
                    <a href="profile.html?user=${encodeURIComponent(member.username)}">
                        ${renderUserAvatar(member)}
                        <span>${member.username}</span>
                    </a>
                    <div>
                        ${owner ? '<span class="member-badge">Owner</span>' : admin ? '<span class="member-badge">Admin</span>' : ''}
                        ${group.isOwner && admin && !owner ? `<button class="mini-btn remove-admin" data-username="${member.username}">Remove Admin</button>` : ''}
                        ${canRemove ? `<button class="delete-comment-btn group-remove-member-btn remove-member" data-id="${member._id}" title="Remove member"><i class="bi bi-trash3"></i></button>` : ''}
                    </div>
                </div>`;
        }).join("");
    };

    /**
     * Load group posts from the feed and display them
     */
    const loadPosts = async () => {
        const container = document.getElementById("group-posts");

        if (group.isPrivateContentHidden) {
            container.innerHTML = `
                <div class="private-group-notice">
                    <i class="bi bi-lock"></i>
                    <h3>This Group is Private</h3>
                    <p>Join the group to see its posts and members.</p>
                </div>`;
            return;
        }

        const res = await fetch(`/posts?group=${encodeURIComponent(group.name)}&limit=50`, {
            headers: { Accept: "application/json" }
        });
        const data = await res.json();

        if (!data.success) return;

        container.innerHTML = data.posts.length
            ? data.posts.map(post => window.createPostCardHTML
                ? window.createPostCardHTML(post)
                : `<article class="post-card" data-post-id="${post._id}"><strong>${post.author}</strong><p>${post.content || ""}</p></article>`
            ).join("")
            : '<p class="group-empty">No posts in this group yet.</p>';

        // Inject deletion controls for manager roles
        if (isManager()) {
            container.querySelectorAll(".post-card").forEach(card => {
                if (card.querySelector(".delete-post-btn")) return;

                const header = card.querySelector(".post-card-header");
                if (header) {
                    header.insertAdjacentHTML("beforeend", `
                        <div class="post-actions-right">
                            <button class="delete-post-btn" title="Delete"><i class="bi bi-trash3"></i></button>
                        </div>
                    `);
                }
            });
        }
    };

    window.reloadPostsFeed = loadPosts;

    // Navigation statistics page
    document.getElementById("group-statistics-btn").onclick = () => {
        window.location.href = `statistics.html?groupId=${encodeURIComponent(groupId)}`;
    };

    // Join/Leave membership click handler
    document.getElementById("membership-btn").onclick = async () => {
        const action = group.isMember ? "leave" : "join";
        const res = await fetch(`/groups/${groupId}/${action}`, {
            method: "POST",
            headers: { Accept: "application/json" }
        });
        const data = await res.json();

        if (!res.ok) return alert(data.error || "Action failed");

        if (action === "leave") {
            window.location.href = "groups.html";
        } else {
            await loadGroup();
        }
    };

    // Open group post modal
    document.getElementById("group-composer").onclick = () => {
        postModal.classList.add("active");
        postTextarea.focus();
    };

    document.getElementById("group-post-close-modal-btn").onclick = closePostModal;

    postModal.addEventListener("click", e => {
        if (e.target === postModal) closePostModal();
    });

    postTextarea.addEventListener("input", updatePublishButton);

    // Open media file picker
    document.getElementById("group-media-btn").onclick = () => mediaInput.click();

    // Clear selected media
    document.getElementById("group-clear-media").onclick = () => {
        mediaInput.value = "";
        previewContainer.style.display = "none";
        imgPreview.style.display = "none";
        videoPreview.style.display = "none";
        imgPreview.src = "";
        videoPreview.src = "";
        updatePublishButton();
    };

    // Show selected media preview
    mediaInput.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;

        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if (!isImage && !isVideo) {
            alert("Please select a valid image or video file.");
            this.value = "";
            previewContainer.style.display = "none";
            updatePublishButton();
            return;
        }

        const maxImgSize = 5 * 1024 * 1024;
        const maxVidSize = 10 * 1024 * 1024;

        if (isImage && file.size > maxImgSize) {
            alert("The selected image is too large! Maximum allowed size is 5MB.");
            this.value = "";
            previewContainer.style.display = "none";
            updatePublishButton();
            return;
        }

        if (isVideo && file.size > maxVidSize) {
            alert("The selected video is too large! Maximum allowed size is 10MB.");
            this.value = "";
            previewContainer.style.display = "none";
            updatePublishButton();
            return;
        }

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

        updatePublishButton();
    });

    // Publish post to group handler
    postPublishBtn.onclick = async () => {
        const error = document.getElementById("group-post-error");
        error.textContent = "";
        postPublishBtn.disabled = true;

        const file = mediaInput.files[0];
        let mediaUrl = "";
        let mediaType = "";

        if (file) {
            mediaUrl = await fileToDataURL(file);
            mediaType = file.type.startsWith("video/") ? "video" : "image";
        }

        const body = {
            content: postTextarea.value.trim(),
            mediaUrl,
            mediaType,
            authorProfilePic: localStorage.getItem("userProfilePic") || "",
            groupId,
            ...(selectedPostLocation ? { location: selectedPostLocation } : {})
        };

        const res = await fetch("/posts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(body)
        });

        if (res.status === 413) {
            postPublishBtn.disabled = false;
            alert("File exceeds 50mb limit!");
            return;
        }

        const data = await res.json();

        if (!res.ok) {
            error.textContent = data.error || "Could not publish";
            postPublishBtn.disabled = false;
            return;
        }

        closePostModal();
        await loadPosts();

    };

    // Edit Modal handlers
    const modal = document.getElementById("edit-group-modal");
    const closeModal = () => modal.classList.remove("active");

    document.getElementById("edit-group-btn").onclick = () => {
        document.getElementById("edit-group-name").value = group.name;
        document.getElementById("edit-group-description").value = group.description || "";
        document.getElementById("edit-group-category").value = group.category || "";
        document.getElementById("edit-group-image").value = group.image || "";
        document.getElementById("edit-group-public").checked = group.isPublic !== false;
        modal.classList.add("active");
    };

    document.getElementById("close-edit-group").onclick = closeModal;
    document.getElementById("cancel-edit-group").onclick = closeModal;

    document.getElementById("edit-group-form").onsubmit = async e => {
        e.preventDefault();
        const error = document.getElementById("edit-group-error");

        const body = {
            name: document.getElementById("edit-group-name").value.trim(),
            description: document.getElementById("edit-group-description").value.trim(),
            category: document.getElementById("edit-group-category").value.trim(),
            image: document.getElementById("edit-group-image").value.trim(),
            isPublic: document.getElementById("edit-group-public").checked
        };

        const res = await fetch(`/groups/${groupId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (!res.ok) {
            error.textContent = data.error || "Could not save";
            return;
        }

        closeModal();
        await loadGroup();
    };

    // Delete group handler
    document.getElementById("delete-group-btn").onclick = () => {
        showDeleteConfirmation(async () => {
            const res = await fetch(`/groups/${groupId}`, {
                method: "DELETE",
                headers: { Accept: "application/json" }
            });
            const data = await res.json();

            if (!res.ok) return alert(data.error || "Could not delete group");
            window.location.href = "groups.html";
        });
    };

    // Admin member search
    const adminSearchInput = document.getElementById("admin-username");
    const adminSearchResults = document.getElementById("admin-search-results");
    const adminError = document.getElementById("admin-error");
    let adminSearchTimeout = null;

    const displayAdminSearchResults = users => {
        if (!adminSearchResults) return;

        adminSearchResults.innerHTML = "";

        const members = group?.members || [];
        const admins = group?.admins || [];

        const eligibleUsers = users.filter(user => {
            const isMember = members.some(member => member.username.toLowerCase() === user.username.toLowerCase());
            const isAdmin = admins.some(admin => admin.username.toLowerCase() === user.username.toLowerCase());
            const isOwner = group.owner?.username.toLowerCase() === user.username.toLowerCase();

            return isMember && !isAdmin && !isOwner;
        });

        if (eligibleUsers.length === 0) {
            adminSearchResults.innerHTML = `<div class="text-center text-muted p-2 small">No group members found.</div>`;
            return;
        }

        eligibleUsers.forEach(user => {
            const result = `
                <div class="admin-search-result account-card">
                    <a href="profile.html?user=${encodeURIComponent(user.username)}" class="admin-search-user">
                        ${renderUserAvatar(user)}
                        <div>
                            <span class="name">${user.username}</span>
                        </div>
                    </a>

                    <button class="btn btn-primary btn-sm add-admin-search-btn" data-username="${user.username}">
                        Add Admin
                    </button>
                </div>
            `;

            adminSearchResults.insertAdjacentHTML("beforeend", result);
        });
    };

    const searchAdminMembers = async () => {
        if (!adminSearchInput || !adminSearchResults) return;

        const username = adminSearchInput.value.trim();
        adminError.textContent = "";

        if (!username) {
            adminSearchResults.innerHTML = "";
            return;
        }

        adminSearchResults.innerHTML = `
            <div class="text-center text-muted p-2 small">
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Searching...
            </div>
        `;

        try {
            const params = new URLSearchParams({ username });
            const res = await fetch(`/users/search?${params}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                adminSearchResults.innerHTML = `<div class="text-center text-muted p-2 small">Error loading results.</div>`;
                return;
            }

            displayAdminSearchResults(data.users || []);
        } catch (error) {
            console.error("Admin user search error:", error);
            adminSearchResults.innerHTML = `<div class="text-center text-muted p-2 small">Error connecting to server.</div>`;
        }
    };

    adminSearchInput?.addEventListener("input", () => {
        clearTimeout(adminSearchTimeout);
        adminSearchTimeout = setTimeout(searchAdminMembers, 300);
    });

    // Delegate clicks for dynamic post/member list interactions
    document.addEventListener("click", async e => {
        const removeMember = e.target.closest(".remove-member");
        const removeAdmin = e.target.closest(".remove-admin");
        const addAdmin = e.target.closest(".add-admin-search-btn");
        const like = e.target.closest(".like-btn");
        const commentBtn = e.target.closest(".comment-submit-btn");
        const acceptReq = e.target.closest(".accept-request-btn");
        const rejectReq = e.target.closest(".reject-request-btn");

        if (acceptReq) {
            const userId = acceptReq.dataset.userid;
            const res = await fetch(`/groups/${groupId}/requests/${userId}/approve`, {
                method: "POST",
                headers: { Accept: "application/json" }
            });
            const data = await res.json();

            if (!res.ok) return alert(data.error || "Could not approve request");
            await loadGroup();
            return;
        }

        if (rejectReq) {
            const userId = rejectReq.dataset.userid;
            const res = await fetch(`/groups/${groupId}/requests/${userId}/reject`, {
                method: "POST",
                headers: { Accept: "application/json" }
            });
            const data = await res.json();

            if (!res.ok) return alert(data.error || "Could not reject request");
            await loadGroup();
            return;
        }

        if (addAdmin) {
            const res = await fetch(`/groups/${groupId}/admins`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({ username: addAdmin.dataset.username })
            });
            const data = await res.json();

            if (!res.ok) {
                adminError.textContent = data.error || "Could not add admin";
                return;
            }

            adminSearchInput.value = "";
            adminSearchResults.innerHTML = "";
            adminError.textContent = "";
            await loadGroup();
            return;
        }

        if (removeMember) {
            showDeleteConfirmation(async () => {
                const res = await fetch(`/groups/${groupId}/members/${removeMember.dataset.id}`, {
                    method: "DELETE",
                    headers: { Accept: "application/json" }
                });
                const data = await res.json();

                if (!res.ok) return alert(data.error || "Could not remove member");
                await loadGroup();
            });
            return;
        }

        if (removeAdmin) {
            const res = await fetch(`/groups/${groupId}/admins/${encodeURIComponent(removeAdmin.dataset.username)}`, {
                method: "DELETE",
                headers: { Accept: "application/json" }
            });
            const data = await res.json();

            if (!res.ok) return alert(data.error || "Could not remove admin");
            await loadGroup();
            return;
        }

        const postCard = e.target.closest(".post-card");
        const postId = postCard?.dataset.postId;

        if (like && postId) {
            await fetch(`/posts/${postId}/like`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: currentUser })
            });
            await loadPosts();
            return;
        }

        if (commentBtn && postId) {
            const input = postCard.querySelector(".comment-input");
            if (!input?.value.trim()) return;

            await fetch(`/posts/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    author: currentUser,
                    authorProfilePic: localStorage.getItem("userProfilePic") || "",
                    text: input.value.trim()
                })
            });
            await loadPosts();
        }
    });

    loadGroup();
});