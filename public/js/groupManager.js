// Single group page management
document.addEventListener("DOMContentLoaded", () => {
    const groupId = new URLSearchParams(window.location.search).get("id");
    const currentUser = (localStorage.getItem("loggedInUser") || "").trim();

    if (!groupId) {
        window.location.href = "groups.html";
        return;
    }

    let group = null;

    // Helper to read selected media file as Base64 Data URL
    const fileToDataURL = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // Helper to check if the current user has manager privileges
    const isManager = () => group && (group.isOwner || group.isAdmin);

    let selectedPostLocation = null;

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
        membership.textContent = group.isMember ? "Leave Group" : "Join Group";

        // Admin panel toggle visibility
        document.getElementById("edit-group-btn").hidden = !isManager();
        document.getElementById("group-statistics-btn").hidden = !isManager();
        document.getElementById("delete-group-btn").hidden = !isManager();
        document.getElementById("group-composer").hidden = !group.isMember;
        document.getElementById("admin-panel").hidden = !group.isOwner;

        // Render member cards
        document.getElementById("group-members").innerHTML = (group.members || []).map(member => {
            const admin = (group.admins || []).some(a => String(a._id) === String(member._id));
            const owner = String(group.owner?._id) === String(member._id);
            const canRemove = isManager() && !owner && (!admin || group.isOwner);

            return `
                <div class="group-member">
                    <a href="profile.html?user=${encodeURIComponent(member.username)}">
                        <span class="avatar avatar-purple avatar-sm">${member.username.substring(0, 2).toUpperCase()}</span>
                        <span>${member.username}</span>
                    </a>
                    <div>
                        ${owner ? '<span class="member-badge">Owner</span>' : admin ? '<span class="member-badge">Admin</span>' : ''}
                        ${group.isOwner && admin && !owner ? `<button class="mini-btn remove-admin" data-username="${member.username}">Remove Admin</button>` : ''}
                        ${canRemove ? `<button class="mini-btn remove-member" data-id="${member._id}">Remove</button>` : ''}
                    </div>
                </div>`;
        }).join("");
    };

    /**
     * Load group posts from the feed and display them
     */
    const loadPosts = async () => {
        const container = document.getElementById("group-posts");
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
        await loadGroup();
    };

    // Publish post to group handler
    document.getElementById("group-post-publish").onclick = async () => {
        const text = document.getElementById("group-post-text");
        const file = document.getElementById("group-post-media").files[0];
        const error = document.getElementById("group-post-error");
        error.textContent = "";

        if (!text.value.trim() && !file) {
            error.textContent = "Post cannot be empty";
            return;
        }

        let mediaUrl = "";
        let mediaType = "";
        if (file) {
            mediaUrl = await fileToDataURL(file);
            mediaType = file.type.startsWith("video/") ? "video" : "image";
        }

        const body = {
            content: text.value.trim(),
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
        const data = await res.json();

        if (!res.ok) {
            error.textContent = data.error || "Could not publish";
            return;
        }

        text.value = "";
        document.getElementById("group-post-media").value = "";
        postLocationPicker?.clear();
        selectedPostLocation = null;

        const locationPanel = document.getElementById("group-location-panel");
        if (locationPanel) locationPanel.hidden = true;

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
    document.getElementById("delete-group-btn").onclick = async () => {
        if (!confirm(`Delete ${group.name}? All group posts will also be deleted.`)) return;
        
        const res = await fetch(`/groups/${groupId}`, {
            method: "DELETE",
            headers: { Accept: "application/json" }
        });
        const data = await res.json();

        if (!res.ok) return alert(data.error || "Could not delete group");
        window.location.href = "groups.html";
    };

    // Add admin handler
    document.getElementById("add-admin-btn").onclick = async () => {
        const input = document.getElementById("admin-username");
        const error = document.getElementById("admin-error");
        
        const res = await fetch(`/groups/${groupId}/admins`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({ username: input.value.trim() })
        });
        const data = await res.json();

        if (!res.ok) {
            error.textContent = data.error || "Could not add admin";
            return;
        }

        input.value = "";
        error.textContent = "";
        await loadGroup();
    };

    // Delegate clicks for dynamic post/member list interactions
    document.addEventListener("click", async e => {
        const removeMember = e.target.closest(".remove-member");
        const removeAdmin = e.target.closest(".remove-admin");
        const deletePost = e.target.closest(".delete-post-btn");
        const like = e.target.closest(".like-btn");
        const commentBtn = e.target.closest(".comment-submit-btn");

        if (removeMember) {
            if (!confirm("Remove this member?")) return;
            const res = await fetch(`/groups/${groupId}/members/${removeMember.dataset.id}`, {
                method: "DELETE",
                headers: { Accept: "application/json" }
            });
            const data = await res.json();

            if (!res.ok) return alert(data.error || "Could not remove member");
            await loadGroup();
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

        if (deletePost && postId) {
            if (!confirm("Delete this post?")) return;
            const res = await fetch(`/posts/${postId}`, {
                method: "DELETE",
                headers: { Accept: "application/json" }
            });

            if (!res.ok) {
                const data = await res.json();
                return alert(data.error || "Could not delete post");
            }
            await loadPosts();
            return;
        }

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
