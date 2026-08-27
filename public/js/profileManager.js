document.addEventListener("DOMContentLoaded", () => {
    const currentUser = (localStorage.getItem("loggedInUser") || "").trim();
    if (!currentUser) {
        window.location.replace("login.html");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const profileUsername = urlParams.get("user") || currentUser;
    const isMyProfile = profileUsername.toLowerCase() === currentUser.toLowerCase();

    // DOM Elements
    const usernameEl = document.getElementById("profile-username");
    const handleEl = document.getElementById("profile-handle");
    const bioEl = document.getElementById("profile-bio");
    const avatarEl = document.getElementById("profile-avatar-container");
    const friendsCountEl = document.getElementById("profile-friends-count");
    const joinedDateEl = document.getElementById("profile-joined-date");
    const actionBtn = document.getElementById("profile-action-btn");
    const userPostsContainer = document.getElementById("user-posts-container");
    const friendsListContainer = document.getElementById("friends-list-container");
    const groupsCountEl = document.getElementById("profile-groups-count");
    const postsCountEl = document.getElementById("profile-posts-count");
    const managedGroupsCountEl = document.getElementById("managed-groups-count");
    const memberGroupsCountEl = document.getElementById("member-groups-count");
    const managedGroupsContainer = document.getElementById("managed-groups-container");
    const memberGroupsContainer = document.getElementById("member-groups-container");
    const groupsTitle = document.getElementById("profile-groups-title");

    // Edit Profile & Crop Elements
    const editModal = document.getElementById("edit-profile-modal");
    const editBioInput = document.getElementById("edit-bio-input");
    const editProfileFileInput = document.getElementById("edit-profile-file-input");
    const editAvatarLivePreview = document.getElementById("edit-avatar-live-preview");
    const editAvatarPlaceholder = document.getElementById("edit-avatar-placeholder");
    const editAvatarTrigger = document.getElementById("edit-avatar-trigger");

    const cropModal = document.getElementById("crop-modal");
    const canvas = document.getElementById("crop-canvas");
    const ctx = canvas.getContext("2d");
    const zoomSlider = document.getElementById("zoom-slider");

    // Edit Post Modal Elements
    const editPostModal = document.getElementById("edit-modal-overlay");
    const editPostTextarea = document.getElementById("edit-modal-textarea");
    const editPostMediaInput = document.getElementById("edit-modal-media-upload");
    const editPostPreviewContainer = document.getElementById("edit-modal-media-preview-container");
    const editPostImgPreview = document.getElementById("edit-modal-media-preview");
    const editPostVideoPreview = document.getElementById("edit-modal-video-preview");

    let profileData = null;
    let finalCroppedBase64 = "";
    let currentPostBeingEdited = null;
    let editMediaCleared = false;

    // Cropping internal states
    let img = new Image();
    let imgX = 0, imgY = 0, scale = 1, isDragging = false, startX = 0, startY = 0;

    const fileToDataURL = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // --- מעבר לפרופיל בלחיצה על כרטיס המשתמש בפינה השמאלית למטה ---
    const accountCard = document.querySelector(".account-card");
    const navAvatar = document.getElementById("nav-user-avatar");
    const navigateToMyProfile = () => {
        window.location.href = `profile.html?user=${encodeURIComponent(currentUser)}`;
    };
    if (accountCard) {
        accountCard.style.cursor = "pointer";
        accountCard.addEventListener("click", navigateToMyProfile);
    }
    if (navAvatar) {
        navAvatar.style.cursor = "pointer";
        navAvatar.addEventListener("click", (e) => {
            e.stopPropagation();
            navigateToMyProfile();
        });
    }

    // --- סנכרון תמונות אווטאר בסרגל הניווט ובכרטיס המשתמש למטה ---
    const syncSidebarAvatars = (newPic, username) => {
        const initials = username ? username.substring(0, 2).toUpperCase() : "US";
        const avatars = [
            document.getElementById("nav-user-avatar"),
            document.querySelector(".account-card .avatar")
        ];
        avatars.forEach(avatarElement => {
            if (!avatarElement) return;
            avatarElement.innerHTML = "";
            if (newPic && newPic.trim() !== "" && newPic !== "undefined" && newPic !== "null") {
                avatarElement.className = "avatar";
                avatarElement.style.backgroundImage = `url('${newPic}')`;
                avatarElement.style.backgroundSize = "cover";
                avatarElement.style.backgroundPosition = "center";
            } else {
                avatarElement.className = "avatar avatar-purple";
                avatarElement.removeAttribute("style");
                avatarElement.innerText = initials;
            }
        });
    };

    // --- פונקציות עזר עצמאיות ליצירת כרטיס הפוסט ---
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

    const getAvatarHTML = (dbPic, authorName, size = 40) => {
        const myPic = localStorage.getItem("userProfilePic") || "";
        const isMe = authorName && authorName.trim().toLowerCase() === currentUser.toLowerCase();
        const picToUse = (isMe && myPic.trim() !== "" && myPic !== "undefined" && myPic !== "null") ? myPic : dbPic;
        if (picToUse && picToUse.trim() !== "" && picToUse !== "undefined" && picToUse !== "null") {
            return `<div class="avatar" style="width:${size}px; height:${size}px; background-image: url('${picToUse}'); background-size: cover; background-position: center;"></div>`;
        }
        const initials = authorName ? authorName.substring(0, 2).toUpperCase() : "US";
        return `<div class="avatar avatar-purple" style="width:${size}px; height:${size}px;">${initials}</div>`;
    };

    // open group page when a group card is clicked
    document.addEventListener("click", event => {
        const groupCard = event.target.closest(".profile-group-card");
        if (!groupCard) return;
        const groupId = groupCard.dataset.groupId;
        if (!groupId) return;
        window.location.href = `group.html?id=${encodeURIComponent(groupId)}`;
    });
    // keyboard accessibility for group cards
    document.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const groupCard = event.target.closest(".profile-group-card");
        if (!groupCard) return;
        event.preventDefault();
        const groupId = groupCard.dataset.groupId;
        if (groupId) {
            window.location.href = `group.html?id=${encodeURIComponent(groupId)}`;
        }
    });
    // === PROFILE GROUPS ===
    const createGroupCardHTML = (group) => {
        const imageHTML = group.image
            ? `<img src="${group.image}" alt="${group.name}">`
            : `<i class="bi bi-people-fill"></i>`;
        const description = group.description || "No description available.";
        const categoryHTML = group.category
            ? `<span><i class="bi bi-tag"></i> ${group.category}</span>`
            : "";
        const cityHTML = group.city
            ? `<span><i class="bi bi-geo-alt"></i> ${group.city}</span>`
            : "";
        return `
        <article class="profile-group-card"
                 data-group-id="${group._id}"
                 tabindex="0"
                 role="button">
            <div class="profile-group-image">
                ${imageHTML}
            </div>
            <div class="profile-group-content">
                <div class="profile-group-title-row">
                    <h5>${group.name}</h5>
                    <span class="profile-group-role">${group.role}</span>
                </div>
                <p class="profile-group-description">${description}</p>
                <div class="profile-group-meta">
                    ${categoryHTML}
                    ${cityHTML}
                    <span>
                        <i class="bi bi-people"></i>
                        ${group.memberCount}
                    </span>
                </div>
            </div>
        </article>
    `;
    };
    const renderGroupList = (container, groups, emptyMessage) => {
        if (!container) return;
        if (!Array.isArray(groups) || groups.length === 0) {
            container.innerHTML = `
            <div class="profile-groups-message">
                ${emptyMessage}
            </div>
        `;
            return;
        }
        container.innerHTML = groups
            .map(createGroupCardHTML)
            .join("");
    };
    const loadProfileStats = async () => {
        try {
            const response = await fetch(
                `/users/${encodeURIComponent(profileUsername)}/profile-stats`,
                {
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(
                    data.error || "Failed to load profile statistics."
                );
            }
            if (groupsCountEl) {
                groupsCountEl.innerText = data.stats?.groupsCount || 0;
            }
            if (postsCountEl) {
                postsCountEl.innerText = data.stats?.postsCount || 0;
            }
            if (managedGroupsCountEl) {
                managedGroupsCountEl.innerText = data.managedGroups?.length || 0;
            }
            if (memberGroupsCountEl) {
                memberGroupsCountEl.innerText = data.memberGroups?.length || 0;
            }
            if (groupsTitle) {
                groupsTitle.innerText = isMyProfile
                    ? "My Groups"
                    : `${profileUsername}'s Groups`;
            }
            renderGroupList(
                managedGroupsContainer,
                data.managedGroups,
                isMyProfile
                    ? "You do not manage any groups yet."
                    : "No managed groups."
            );
            renderGroupList(
                memberGroupsContainer,
                data.memberGroups,
                isMyProfile
                    ? "You have not joined any other groups yet."
                    : "No joined groups."
            );
        } catch (error) {
            console.error("Error loading profile groups:", error);
            if (managedGroupsContainer) {
                managedGroupsContainer.innerHTML = `
                <div class="profile-groups-message">
                    Failed to load groups.
                </div>
            `;
            }
            if (memberGroupsContainer) {
                memberGroupsContainer.innerHTML = `
                <div class="profile-groups-message">
                    Failed to load groups.
                </div>
            `;
            }
        }
    };

    const createPostCardHTML = (post) => {
        const isOwner = post.author && (post.author.trim().toLowerCase() === currentUser.toLowerCase());
        const isLiked = Array.isArray(post.likedBy) && post.likedBy.includes(currentUser);
        const timeAgo = formatTimeAgo(post.createdAt);

        let mediaHTML = "";
        if (post.mediaUrl) {
            mediaHTML = post.mediaType === "video"
                ? `<video src="${post.mediaUrl}" controls preload="metadata" class="post-media-content"></video>`
                : `<img src="${post.mediaUrl}" alt="media" loading="lazy" class="post-media-content" />`;
        }

        // כפתורי עריכה ומחיקה מופיעים רק לבעל הפוסט
        const actionsHTML = isOwner ? `
            <div class="post-actions-right">
                <button class="edit-post-btn" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="delete-post-btn" title="Delete"><i class="bi bi-trash3"></i></button>
            </div>` : "";

        return `
            <article class="post-card" data-post-id="${post._id || ''}">
                <div class="post-card-header">
                    <div class="author-info-group">
                        <a href="profile.html?user=${encodeURIComponent(post.author || 'User')}" style="text-decoration:none;">
                            ${getAvatarHTML(post.authorProfilePic, post.author, 40)}
                        </a>
                        <div>
                            <a href="profile.html?user=${encodeURIComponent(post.author || 'User')}" class="post-author" style="text-decoration:none; color:inherit;">
                                ${post.author || "User"}
                            </a>
                            <span class="post-meta">@${(post.author || "user").toLowerCase().replace(/\s/g, '')} · ${timeAgo}</span>
                        </div>
                    </div>
                    ${actionsHTML}
                </div>
                <div class="post-text">${post.content || ""}</div>
                ${mediaHTML}
                <div class="post-stats">
                    <span class="stat-reply"><i class="bi bi-chat"></i> <span class="reply-count">${(post.comments || []).length}</span></span>
                    <span class="stat-like ${isLiked ? 'liked' : ''}"><i class="bi ${isLiked ? 'bi-heart-fill' : 'bi-heart'}"></i> <span class="like-count">${post.likes || 0}</span></span>
                </div>
            </article>`;
    };

    // --- טעינת נתוני הפרופיל ---
    const loadProfileData = async () => {
        try {
            const res = await fetch(`/users/${encodeURIComponent(profileUsername)}`);
            const data = await res.json();
            if (data.success) {
                profileData = data.user;

                // סנכרון תמונות חכם
                if (isMyProfile) {
                    const localPic = localStorage.getItem("userProfilePic") || "";
                    if (profileData.profilePicture && profileData.profilePicture.trim() !== "" && profileData.profilePicture !== "undefined" && profileData.profilePicture !== "null") {
                        localStorage.setItem("userProfilePic", profileData.profilePicture);
                        syncSidebarAvatars(profileData.profilePicture, currentUser);
                    } else if (localPic.trim() !== "" && localPic !== "undefined" && localPic !== "null") {
                        profileData.profilePicture = localPic;
                        syncSidebarAvatars(localPic, currentUser);
                    }
                }

                renderProfileUI();
                loadUserPosts();
                loadProfileStats();
            } else {
                alert("User not found");
                window.location.href = "feed.html";
            }
        } catch (err) {
            console.error("Error loading profile:", err);
        }
    };

    const renderProfileUI = () => {
        if (!profileData) return;

        usernameEl.innerText = profileData.username;
        handleEl.innerText = `@${profileData.username.toLowerCase().replace(/\s+/g, '')}`;
        bioEl.innerText = profileData.bio || "No bio provided yet.";
        friendsCountEl.innerText = (profileData.friends || []).length;
        joinedDateEl.innerText = new Date(profileData.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });

        const picToUse = (profileData.profilePicture && profileData.profilePicture.trim() !== "" && profileData.profilePicture !== "undefined" && profileData.profilePicture !== "null")
            ? profileData.profilePicture
            : (isMyProfile ? (localStorage.getItem("userProfilePic") || "") : "");

        if (picToUse && picToUse.trim() !== "" && picToUse !== "undefined" && picToUse !== "null") {
            avatarEl.className = "avatar";
            avatarEl.style.backgroundImage = `url('${picToUse}')`;
            avatarEl.style.backgroundSize = "cover";
            avatarEl.style.backgroundPosition = "center";
            avatarEl.innerText = "";
        } else {
            avatarEl.className = "avatar avatar-purple";
            avatarEl.removeAttribute("style");
            avatarEl.style.width = "90px";
            avatarEl.style.height = "90px";
            avatarEl.style.fontSize = "2rem";
            avatarEl.innerText = profileData.username.substring(0, 2).toUpperCase();
        }

        actionBtn.style.display = "block";
        if (isMyProfile) {
            actionBtn.innerText = "Edit Profile";
            actionBtn.className = "btn btn-primary";
            actionBtn.onclick = () => {
                finalCroppedBase64 = picToUse || "";
                editBioInput.value = profileData.bio || "";
                if (finalCroppedBase64) {
                    editAvatarLivePreview.src = finalCroppedBase64;
                    editAvatarLivePreview.style.display = "block";
                    editAvatarPlaceholder.style.display = "none";
                } else {
                    editAvatarLivePreview.style.display = "none";
                    editAvatarPlaceholder.style.display = "flex";
                }
                editModal.classList.add("active");
            };
        } else {
            // TODO for team: Implement "Add Friend" / "Remove Friend" button logic here
            actionBtn.style.display = "none";
        }

        // TODO for team: Render Friends list inside friendsListContainer
    };

    // --- טעינת הפוסטים של המשתמש ---
    const loadUserPosts = async () => {
        try {
            const res = await fetch(`/posts?search=${encodeURIComponent(profileUsername)}`);
            const data = await res.json();
            if (data.success) {
                const userPosts = (data.posts || []).filter(p => p.author && p.author.toLowerCase() === profileUsername.toLowerCase());

                if (userPosts.length === 0) {
                    userPostsContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">No posts found from this user.</div>`;
                    return;
                }

                userPostsContainer.innerHTML = "";
                userPosts.forEach(p => {
                    userPostsContainer.insertAdjacentHTML("beforeend", createPostCardHTML(p));
                });
            }
        } catch (err) {
            console.error("Error loading user posts:", err);
        }
    };

    // --- חיתוך תמונת פרופיל (Crop Canvas) מותאם דינמית למימדי התמונה כדי למנוע "זום מדי" ---
    const drawImageOnCanvas = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2 + imgX, canvas.height / 2 + imgY);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
    };

    editAvatarTrigger?.addEventListener("click", () => editProfileFileInput?.click());
    editProfileFileInput?.addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                img.onload = () => {
                    // חישוב קנה מידה התחלתי מאוזן שמתאים את התמונה לקנבס
                    scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                    // התאמת טווח הסליידר דינמית לתמונה הספציפית כך שלא ירגיש זום מוגזם
                    zoomSlider.min = (scale * 0.4).toFixed(4);
                    zoomSlider.max = (scale * 3).toFixed(4);
                    zoomSlider.value = scale;
                    imgX = 0; imgY = 0;
                    drawImageOnCanvas();
                    editModal.classList.remove("active");
                    cropModal.classList.add("active");
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    canvas.addEventListener("mousedown", (e) => { isDragging = true; startX = e.clientX - imgX; startY = e.clientY - imgY; });
    window.addEventListener("mousemove", (e) => { if (!isDragging) return; imgX = e.clientX - startX; imgY = e.clientY - startY; drawImageOnCanvas(); });
    window.addEventListener("mouseup", () => { isDragging = false; });
    zoomSlider?.addEventListener("input", (e) => { scale = parseFloat(e.target.value); drawImageOnCanvas(); });

    document.getElementById("cancel-crop-btn")?.addEventListener("click", () => { cropModal.classList.remove("active"); editModal.classList.add("active"); });
    document.getElementById("apply-crop-btn")?.addEventListener("click", () => {
        finalCroppedBase64 = canvas.toDataURL("image/png");
        editAvatarLivePreview.src = finalCroppedBase64;
        editAvatarLivePreview.style.display = "block";
        editAvatarPlaceholder.style.display = "none";
        cropModal.classList.remove("active");
        editModal.classList.add("active");
    });

    // --- שמירת עריכת פרופיל ---
    document.getElementById("save-profile-btn")?.addEventListener("click", async () => {
        const newBio = editBioInput.value.trim();
        try {
            const res = await fetch(`/users/${encodeURIComponent(currentUser)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentUser, bio: newBio, profilePicture: finalCroppedBase64 })
            });
            const data = await res.json();
            if (data.success) {
                if (finalCroppedBase64) {
                    localStorage.setItem("userProfilePic", finalCroppedBase64);
                    syncSidebarAvatars(finalCroppedBase64, currentUser);
                } else {
                    localStorage.removeItem("userProfilePic");
                    syncSidebarAvatars("", currentUser);
                }

                editModal.classList.remove("active");
                loadProfileData();
            } else {
                alert(data.error || "Failed to update profile");
            }
        } catch (err) {
            console.error("Error saving profile:", err);
        }
    });

    document.getElementById("close-edit-profile-btn")?.addEventListener("click", () => editModal.classList.remove("active"));
    document.getElementById("cancel-edit-profile-btn")?.addEventListener("click", () => editModal.classList.remove("active"));
    editModal.addEventListener("click", (e) => { if (e.target === editModal) editModal.classList.remove("active"); });

    // === האזנה לכפתורי מחיקה ועריכה של פוסטים בעמוד הפרופיל ===
    document.addEventListener("click", async (e) => {
        const target = e.target;
        const postCard = target.closest(".post-card");
        const postId = postCard?.dataset.postId;

        // מחיקת פוסט
        const deleteBtn = target.closest(".delete-post-btn");
        if (deleteBtn && postId) {
            const modal = document.getElementById("delete-confirm-modal");
            if (modal) {
                modal.classList.add("active");
                const confirmBtn = document.getElementById("confirm-delete-btn");
                const newConfirm = confirmBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
                newConfirm.addEventListener("click", async () => {
                    modal.classList.remove("active");
                    await fetch(`/posts/${postId}`, { method: "DELETE" });
                    loadUserPosts();
                });
                document.getElementById("cancel-delete-btn").onclick = () => modal.classList.remove("active");
            }
            return;
        }

        // עריכת פוסט
        if (target.closest(".edit-post-btn") && postCard) {
            currentPostBeingEdited = postCard;
            editMediaCleared = false;
            if (editPostTextarea) editPostTextarea.value = postCard.querySelector(".post-text")?.innerText || "";
            const existingImg = postCard.querySelector("img.post-media-content");
            const existingVid = postCard.querySelector("video.post-media-content");

            if (editPostPreviewContainer && editPostImgPreview && editPostVideoPreview) {
                editPostPreviewContainer.style.display = "none";
                editPostImgPreview.style.display = "none";
                editPostVideoPreview.style.display = "none";
                if (existingImg) {
                    editPostImgPreview.src = existingImg.src;
                    editPostImgPreview.style.display = "block";
                    editPostPreviewContainer.style.display = "flex";
                } else if (existingVid) {
                    editPostVideoPreview.src = existingVid.src;
                    editPostVideoPreview.style.display = "block";
                    editPostPreviewContainer.style.display = "flex";
                }
            }
            editPostModal?.classList.add("active");
        }
    });

    // --- לוגיקת חלון עריכת פוסט (Edit Post Modal) ---
    const closeEditPostModal = () => {
        editPostModal?.classList.remove("active");
        if (editPostMediaInput) editPostMediaInput.value = "";
        if (editPostPreviewContainer) editPostPreviewContainer.style.display = "none";
        editMediaCleared = false;
    };

    document.getElementById("edit-modal-image-btn")?.addEventListener("click", () => editPostMediaInput?.click());
    document.getElementById("edit-modal-clear-media")?.addEventListener("click", () => {
        if (editPostMediaInput) editPostMediaInput.value = "";
        if (editPostPreviewContainer) editPostPreviewContainer.style.display = "none";
        editMediaCleared = true;
    });

    if (editPostMediaInput) {
        editPostMediaInput.addEventListener("change", function () {
            const file = this.files[0];
            if (file && editPostPreviewContainer) {
                const url = URL.createObjectURL(file);
                editPostPreviewContainer.style.display = "flex";
                editMediaCleared = false;
                if (file.type.startsWith("video/")) {
                    editPostVideoPreview.src = url;
                    editPostVideoPreview.style.display = "block";
                    editPostImgPreview.style.display = "none";
                } else {
                    editPostImgPreview.src = url;
                    editPostImgPreview.style.display = "block";
                    editPostVideoPreview.style.display = "none";
                }
            }
        });
    }

    document.getElementById("edit-modal-publish-btn")?.addEventListener("click", async () => {
        if (!currentPostBeingEdited) return;
        const postId = currentPostBeingEdited.dataset.postId;
        const newText = editPostTextarea?.value.trim() || "";
        const newFile = editPostMediaInput?.files[0];

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
            closeEditPostModal();
            loadUserPosts();
        }
    });

    document.getElementById("close-edit-modal-btn")?.addEventListener("click", closeEditPostModal);

    loadProfileData();
});