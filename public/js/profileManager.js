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
    const cityContainerEl = document.getElementById("profile-city-container");
    const cityEl = document.getElementById("profile-city");
    const postsCountEl = document.getElementById("profile-posts-count");
    const editCityInput = document.getElementById("edit-city-input");

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

    let profileData = null;
    let finalCroppedBase64 = "";

    // Cropping internal states
    let img = new Image();
    let imgX = 0, imgY = 0, scale = 1, isDragging = false, startX = 0, startY = 0;

    // --- go to my profile ---
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

    // --- sync sidebar avatars ---
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

    // --- load profile data ---
    const loadProfileData = async () => {
        try {
            const res = await fetch(`/users/${encodeURIComponent(profileUsername)}?currentUser=${encodeURIComponent(currentUser)}`);
            const data = await res.json();
            if (data.success) {
                profileData = data.user;

                // sync profile picture to localStorage if it's the current user's profile
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
        if (profileData.city) {
            cityContainerEl.style.display = "block";
            cityEl.innerText = profileData.city;
        } else if (isMyProfile) {
            cityContainerEl.style.display = "block";
            cityEl.innerText = "No city specified";
        } else {
            // if viewing someone else's profile and they haven't set a city, hide the city container
            cityContainerEl.style.display = "none";
        }
        friendsCountEl.innerText = (profileData.friends || []).length;
        joinedDateEl.innerText = new Date(profileData.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });

        const picToUse = (profileData.profilePicture && profileData.profilePicture.trim() !== "" && profileData.profilePicture !== "undefined" && profileData.profilePicture !== "null")
            ? profileData.profilePicture
            : (isMyProfile ? (localStorage.getItem("userProfilePic") || "") : "");

        if (picToUse && picToUse.trim() !== "" && picToUse !== "undefined" && picToUse !== "null") {
            avatarEl.className = "avatar avatar-lg";
            avatarEl.style.backgroundImage = `url('${picToUse}')`;
            avatarEl.style.backgroundSize = "cover";
            avatarEl.style.backgroundPosition = "center";
            avatarEl.innerText = "";
        } else {
            avatarEl.className = "avatar avatar-purple avatar-lg";
            avatarEl.removeAttribute("style");
            avatarEl.innerText = profileData.username.substring(0, 2).toUpperCase();
        }

        actionBtn.style.display = "block";
        if (isMyProfile) {
            actionBtn.innerText = "Edit Profile";
            actionBtn.className = "btn btn-primary btn-sm";
            actionBtn.disabled = false;
            actionBtn.onclick = () => {
                finalCroppedBase64 = picToUse || "";
                editBioInput.value = profileData.bio || "";
                editCityInput.value = profileData.city || "";
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
            // Viewing someone else's profile 
            const isFriend = profileData.friends && profileData.friends.some(f => f.username.toLowerCase() === currentUser.toLowerCase());
            const hasSentRequest = profileData.hasSentRequest;

            if (isFriend) {
                actionBtn.innerHTML = '<i class="bi bi-person-dash"></i> Remove Friend';
                actionBtn.className = "btn btn-secondary btn-sm";
                actionBtn.disabled = false;
                actionBtn.onclick = () => showRemoveFriendModal(profileUsername);
            } else if (hasSentRequest) {
                actionBtn.innerHTML = 'Sent';
                actionBtn.className = "btn cancel-btn btn-sm";
                actionBtn.disabled = true;
                actionBtn.onclick = null;
            } else {
                actionBtn.innerHTML = '<i class="bi bi-person-plus"></i> Add Friend';
                actionBtn.className = "btn btn-primary btn-sm";
                actionBtn.disabled = false;
                actionBtn.onclick = () => toggleFriendStatus('request', profileUsername);
            }
        }

        renderFriendsList();
    };

    // --- Modal for Removing Friends ---
    const showRemoveFriendModal = (targetUser) => {
        let modal = document.getElementById("remove-friend-modal");
        if (!modal) {
            document.body.insertAdjacentHTML("beforeend", `
                <div id="remove-friend-modal" class="modal-overlay">
                    <div class="confirm-modal-content">
                        <h3>Remove Friend?</h3>
                        <p>Are you sure you want to remove this user from your friends list?</p>
                        <button id="confirm-remove-friend-btn" class="danger-btn">Remove</button>
                        <button id="cancel-remove-friend-btn" class="cancel-btn">Cancel</button>
                    </div>
                </div>
            `);
            modal = document.getElementById("remove-friend-modal");

            // Close modal on cancel or clicking outside
            modal.addEventListener("click", (e) => {
                if (e.target === modal) modal.classList.remove("active");
            });
            document.getElementById("cancel-remove-friend-btn").addEventListener("click", () => {
                modal.classList.remove("active");
            });
        }

        modal.classList.add("active");

        const confirmBtn = document.getElementById("confirm-remove-friend-btn");
        // Clone button to remove previous event listeners (prevents multiple deletes)
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener("click", () => {
            modal.classList.remove("active");
            toggleFriendStatus('remove', targetUser);
        });
    };

    const toggleFriendStatus = async (action, targetUser = profileUsername) => {
        try {
            // Update the button visually before the fetch even finishes
            if (actionBtn && action === 'request') {
                actionBtn.innerHTML = 'Sent';
                actionBtn.className = "btn cancel-btn btn-sm";
                actionBtn.disabled = true;
                actionBtn.onclick = null; // no double clicking
            }

            const res = await fetch(`/users/${encodeURIComponent(currentUser)}/friends`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUsername: targetUser, action })
            });
            if (res.ok) {
                loadProfileData(); // Reload UI to update buttons and lists
            }
        } catch (err) { console.error("Friend action failed", err); }
    };

    const renderFriendsList = () => {
        const container = document.getElementById("friends-list-container");
        if (!container) return;

        let html = "";

        // 1. Render Pending Requests (Only visible on My Profile)
        if (isMyProfile && profileData.friendRequests && profileData.friendRequests.length > 0) {
            html += `<div class="pending-requests-container">
                        <h4 style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 12px;"><i class="bi bi-person-exclamation"></i> Pending Requests</h4>`;

            html += profileData.friendRequests.map(reqUser => `
                <div class="pending-request-item">
                    <div class="friend-info">
                        <div class="avatar avatar-purple avatar-sm">${reqUser.substring(0, 2).toUpperCase()}</div>
                        <a href="profile.html?user=${encodeURIComponent(reqUser)}" style="color: var(--text-main); font-weight: 600; text-decoration: none;">${reqUser}</a>
                    </div>
                    <div class="friend-info">
                        <button class="btn btn-primary btn-sm accept-request-btn" data-user="${reqUser}" title="Accept"><i class="bi bi-check-lg"></i></button>
                        <button class="btn btn-secondary btn-sm reject-request-btn" data-user="${reqUser}" title="Reject"><i class="bi bi-x-lg"></i></button>
                    </div>
                </div>
            `).join("");
            html += `</div>`;
        }

        // 2. Render Active Friends
        html += `<h4 style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 12px;"><i class="bi bi-people"></i> All Friends</h4>`;

        if (!profileData.friends || profileData.friends.length === 0) {
            html += `
                <div class="empty-state-box empty-state-flat">
                    <i class="bi bi-person-x" style="font-size: 2rem; color: var(--border-color); margin-bottom: 10px;"></i>
                    <p style="margin:0; font-size: 0.9rem;">No friends added yet.</p>
                </div>`;
        } else {
            html += profileData.friends.map(friendObj => {
                const fName = friendObj.username;
                const fPic = friendObj.profilePicture;
                let avatarHtml = `<div class="avatar avatar-purple avatar-sm">${fName.substring(0, 2).toUpperCase()}</div>`;
                if (fPic && fPic.trim() !== "") {
                    avatarHtml = `<div class="avatar avatar-sm" style="background-image: url('${fPic}'); background-size: cover; background-position: center;"></div>`;
                }
                return `
                <div class="friend-list-item">
                    <div class="friend-info">
                        ${avatarHtml}
                        <a href="profile.html?user=${encodeURIComponent(fName)}" style="color: var(--text-main); font-weight: 600; text-decoration: none;">${fName}</a>
                    </div>
                    ${isMyProfile ? `<button class="btn btn-secondary btn-sm remove-friend-btn" data-user="${fName}" title="Remove Friend"><i class="bi bi-person-dash"></i></button>` : ''}
                </div>`;
            }).join("");
        }

        container.innerHTML = html;
    };

    // listen for friend action buttons (Accept/Reject/Remove) using event delegation
    document.addEventListener("click", (e) => {
        const acceptBtn = e.target.closest(".accept-request-btn");
        if (acceptBtn) {
            toggleFriendStatus('accept', acceptBtn.dataset.user);
            return;
        }

        const rejectBtn = e.target.closest(".reject-request-btn");
        if (rejectBtn) {
            toggleFriendStatus('reject', rejectBtn.dataset.user);
            return;
        }

        const removeBtn = e.target.closest(".remove-friend-btn");
        if (removeBtn) {
            showRemoveFriendModal(removeBtn.dataset.user);
            return;
        }
    });

    // --- load user posts ---
    const loadUserPosts = async () => {
        try {
            const res = await fetch(`/posts?search=${encodeURIComponent(profileUsername)}`);
            const data = await res.json();
            if (data.success) {
                const userPosts = (data.posts || []).filter(p => p.author && p.author.toLowerCase() === profileUsername.toLowerCase());

                if (postsCountEl) {
                    postsCountEl.innerText = userPosts.length;
                }

                if (userPosts.length === 0) {
                    userPostsContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">No posts found from this user.</div>`;
                    return;
                }

                userPostsContainer.innerHTML = "";
                userPosts.forEach(p => {
                    if (typeof window.createPostCardHTML === "function") {
                        userPostsContainer.insertAdjacentHTML("beforeend", window.createPostCardHTML(p));
                    }
                });
            }
        } catch (err) {
            console.error("Error loading user posts:", err);
        }
    };

    // Connect the shared actions reload to this specific page's reload function
    window.reloadPostsFeed = loadUserPosts;

    // --- draw image on canvas (crop profile picture) ---
    const drawImageOnCanvas = () => {
        if (!ctx) return;
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
                    // originally set scale to fit the image within the canvas
                    scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                    // update zoom slider min/max based on the initial scale
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

    if (canvas) {
        canvas.addEventListener("mousedown", (e) => { isDragging = true; startX = e.clientX - imgX; startY = e.clientY - imgY; });
        window.addEventListener("mousemove", (e) => { if (!isDragging) return; imgX = e.clientX - startX; imgY = e.clientY - startY; drawImageOnCanvas(); });
        window.addEventListener("mouseup", () => { isDragging = false; });
    }
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

    // --- save profile changes ---
    document.getElementById("save-profile-btn")?.addEventListener("click", async () => {
        const newBio = editBioInput.value.trim();
        const newCity = editCityInput.value.trim();

        try {
            const res = await fetch(`/users/${encodeURIComponent(currentUser)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentUser, bio: newBio, city: newCity, profilePicture: finalCroppedBase64 }) });
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
    editModal?.addEventListener("click", (e) => { if (e.target === editModal) editModal.classList.remove("active"); });

    // --- Delete Account Logic ---
    const deleteAccountBtn = document.getElementById("delete-account-btn");

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener("click", () => {
            // take global modal reference to avoid creating multiple modals
            const modal = document.getElementById("delete-confirm-modal");
            if (!modal) return;

            // texts for the modal
            modal.querySelector("h3").innerText = "Delete Account?";
            modal.querySelector("p").innerText = "WARNING: This action cannot be undone. All your data, including all posts, will be permanently deleted.";

            // show the modal
            modal.classList.add("active");

            // double click prevention: clone the confirm button to remove previous event listeners
            const confirmBtn = document.getElementById("confirm-delete-btn");
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

            // delete account logic
            newConfirmBtn.addEventListener("click", async () => {
                modal.classList.remove("active"); // close modal immediately to avoid double clicks

                try {
                    const res = await fetch(`/users/${encodeURIComponent(currentUser)}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentUser })
                    });

                    const data = await res.json();
                    if (data.success) {
                        localStorage.removeItem("loggedInUser");
                        localStorage.removeItem("userProfilePic");
                        window.location.href = "/logout";
                    } else {
                        alert(data.error || "Failed to delete account");
                    }
                } catch (err) {
                    console.error("Error deleting account:", err);
                    alert("Network error. Could not delete account.");
                }
            });

            // cencel button logic
            document.getElementById("cancel-delete-btn").onclick = () => {
                modal.classList.remove("active");
            };
        });
    }

    loadProfileData();
});