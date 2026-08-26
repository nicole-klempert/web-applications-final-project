document.addEventListener("DOMContentLoaded", () => {
    const currentUser = (localStorage.getItem("loggedInUser") || "").trim();
    if (!currentUser) {
        window.location.replace("login.html");
        return;
    }

    // Get the profile username from the URL query parameter, defaulting to the current user if not provided
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

    // cropping internal states
    let img = new Image();
    let imgX = 0, imgY = 0, scale = 1, isDragging = false, startX = 0, startY = 0;

    // --- go to my profile ---
    const navigateToMyProfile = () => window.location.href = `profile.html?user=${encodeURIComponent(currentUser)}`;

    // --- sidebar avatar click navigation ---
    const accountCard = document.querySelector(".account-card");
    if (accountCard) {
        accountCard.style.cursor = "pointer";
        accountCard.addEventListener("click", navigateToMyProfile);
    }

    // --- nav avatar click navigation ---
    const navAvatar = document.getElementById("nav-user-avatar");
    if (navAvatar) {
        navAvatar.style.cursor = "pointer";
        navAvatar.addEventListener("click", (e) => {
            e.stopPropagation();
            navigateToMyProfile();
        });
    }

    // --- load profile data ---
    const loadProfileData = async () => {
        try {
            // Fetch the profile data from the server
            const res = await fetch(`/users/${encodeURIComponent(profileUsername)}?currentUser=${encodeURIComponent(currentUser)}`);
            const data = await res.json();
            
            if (data.success) {
                profileData = data.user;

                // if it's my profile, sync the profile picture with localStorage and sidebar avatars
                if (isMyProfile) {
                    const localPic = localStorage.getItem("userProfilePic") || "";
                    if (profileData.profilePicture && profileData.profilePicture.trim() !== "" && profileData.profilePicture !== "undefined" && profileData.profilePicture !== "null") {
                        localStorage.setItem("userProfilePic", profileData.profilePicture);
                        window.syncSidebarAvatars(profileData.profilePicture, currentUser);
                    } else if (localPic.trim() !== "" && localPic !== "undefined" && localPic !== "null") {
                        profileData.profilePicture = localPic;
                        window.syncSidebarAvatars(localPic, currentUser);
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

    // --- render profile UI ---
    const renderProfileUI = () => {
        if (!profileData) return;

        usernameEl.innerText = profileData.username;
        handleEl.innerText = `@${profileData.username.toLowerCase().replace(/\s+/g, '')}`;
        bioEl.innerText = profileData.bio || "No bio provided yet.";

        // Show city if available, otherwise show "No city specified" for own profile, or hide for others
        if (profileData.city) {
            cityContainerEl.style.display = "block";
            cityEl.innerText = profileData.city;
        } else if (isMyProfile) {
            cityContainerEl.style.display = "block";
            cityEl.innerText = "No city specified";
        } else {
            cityContainerEl.style.display = "none";
        }

        // Update friends count and joined date
        friendsCountEl.innerText = (profileData.friends || []).length;
        joinedDateEl.innerText = new Date(profileData.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });

        // Determine which profile picture to use: the one from the server or the one from localStorage (if it's my profile)
        const picToUse = (profileData.profilePicture && profileData.profilePicture.trim() !== "" && profileData.profilePicture !== "undefined" && profileData.profilePicture !== "null")
            ? profileData.profilePicture
            : (isMyProfile ? (localStorage.getItem("userProfilePic") || "") : "");

        // Render the avatar according to the available picture or fallback to initials
        if (picToUse && picToUse.trim() !== "" && picToUse !== "undefined" && picToUse !== "null") {
            avatarEl.className = "avatar profile-avatar-lg";
            avatarEl.style.backgroundImage = `url('${picToUse}')`;
            avatarEl.style.backgroundSize = "cover";
            avatarEl.style.backgroundPosition = "center";
            avatarEl.innerText = "";
        } else {
            avatarEl.className = "avatar avatar-purple profile-avatar-lg";
            avatarEl.removeAttribute("style");
            avatarEl.innerText = profileData.username.substring(0, 2).toUpperCase();
        }

        // Render the action button based on whether it's my profile or someone else's
        actionBtn.style.display = "block";
        // if it's my profile, show "Edit Profile"
        if (isMyProfile) {
            actionBtn.innerText = "Edit Profile";
            actionBtn.className = "btn btn-primary modal-action-btn";
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
           // if it's someone else's, show "Add Friend" or "Remove Friend" based on friendship status
        } else {
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

    // --- remove friend modal ---
    const showRemoveFriendModal = (targetUser) => {
        const modal = document.getElementById("delete-confirm-modal");
        if (!modal) return;

        // Update modal content for removing a friend
        modal.querySelector("h3").innerText = "Remove Friend?";
        modal.querySelector("p").innerText = `Are you sure you want to remove ${targetUser} from your friends list?`;
        modal.classList.add("active");

        const confirmBtn = document.getElementById("confirm-delete-btn");
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        // Confirm removal of friend
        newConfirmBtn.addEventListener("click", () => {
            modal.classList.remove("active");
            toggleFriendStatus('remove', targetUser);
        });

        // Cancel removal of friend
        document.getElementById("cancel-delete-btn").onclick = () => {
            modal.classList.remove("active");
        };
    };

    // --- toggle friend status (request, accept, reject, remove) ---
    const toggleFriendStatus = async (action, targetUser = profileUsername) => {
        try {
            // check if requesting has already been sent, if so, disable the button and return early
            if (actionBtn && action === 'request') {
                actionBtn.innerHTML = 'Sent';
                actionBtn.className = "btn cancel-btn btn-sm";
                actionBtn.disabled = true;
                actionBtn.onclick = null;
            }

            // Send the friend action request to the server
            const res = await fetch(`/users/${encodeURIComponent(currentUser)}/friends`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUsername: targetUser, action })
            });
            if (res.ok) {
                loadProfileData();
            }
        } catch (err) { console.error("Friend action failed", err); }
    };

    // --- render friends list ---
    const renderFriendsList = () => {
        const container = document.getElementById("friends-list-container");
        if (!container) return;

        let html = "";

        // pending friend requests section (only for my profile)
        if (isMyProfile && profileData.friendRequests && profileData.friendRequests.length > 0) {
            html += `<div class="pending-requests-container">
                        <h4 class="section-header-sm"><i class="bi bi-person-exclamation"></i> Pending Requests</h4>`;

            html += profileData.friendRequests.map(reqUser => `
                <div class="pending-request-item">
                    <div class="friend-info">
                        <div class="avatar avatar-purple avatar-sm">${reqUser.substring(0, 2).toUpperCase()}</div>
                        <a href="profile.html?user=${encodeURIComponent(reqUser)}" class="friend-name-link">${reqUser}</a>
                    </div>
                    <div class="friend-info">
                        <button class="btn btn-primary btn-sm accept-request-btn" data-user="${reqUser}" title="Accept"><i class="bi bi-check-lg"></i></button>
                        <button class="btn btn-secondary btn-sm reject-request-btn" data-user="${reqUser}" title="Reject"><i class="bi bi-x-lg"></i></button>
                    </div>
                </div>
            `).join("");
            html += `</div>`;
        }

        // active friends section
        html += `<h4 class="section-header-sm"><i class="bi bi-people"></i> All Friends</h4>`;

        // if no friends, show empty state
        if (!profileData.friends || profileData.friends.length === 0) {
            html += `
                <div class="empty-state-box empty-state-flat">
                    <i class="bi bi-person-x empty-friends-icon"></i>
                    <p class="empty-friends-text">No friends added yet.</p>
                </div>`;
        } else {
            html += profileData.friends.map(friendObj => {
                const fName = friendObj.username;
                const fPic = friendObj.profilePicture;

                // use the global getAvatarHTML function if it exists, otherwise fallback to initials
                let avatarHtml = typeof window.getAvatarHTML === "function"
                    ? window.getAvatarHTML(fPic, fName, 32)
                    : `<div class="avatar avatar-purple avatar-sm">${fName.substring(0, 2).toUpperCase()}</div>`;

                return `
                <div class="friend-list-item">
                    <div class="friend-info">
                        ${avatarHtml}
                        <a href="profile.html?user=${encodeURIComponent(fName)}" class="friend-name-link">${fName}</a>
                    </div>
                    ${isMyProfile ? `<button class="btn btn-secondary btn-sm remove-friend-btn" data-user="${fName}" title="Remove Friend"><i class="bi bi-person-dash"></i></button>` : ''}
                </div>`;
            }).join("");
        }

        container.innerHTML = html;
    };

    // event delegation for friend buttons
    document.addEventListener("click", (e) => {
        const acceptBtn = e.target.closest(".accept-request-btn");
        if (acceptBtn) return toggleFriendStatus('accept', acceptBtn.dataset.user);

        const rejectBtn = e.target.closest(".reject-request-btn");
        if (rejectBtn) return toggleFriendStatus('reject', rejectBtn.dataset.user);

        const removeBtn = e.target.closest(".remove-friend-btn");
        if (removeBtn) return showRemoveFriendModal(removeBtn.dataset.user);
    });

    // --- load user posts ---
    const loadUserPosts = async () => {
        try {
            // fetch posts authored by the profile user
            const res = await fetch(`/posts?search=${encodeURIComponent(profileUsername)}`);
            const data = await res.json();
            // filter posts to only include those authored by the profile user (case-insensitive)
            if (data.success) {
                const userPosts = (data.posts || []).filter(p => p.author && p.author.toLowerCase() === profileUsername.toLowerCase());

                if (postsCountEl) {
                    postsCountEl.innerText = userPosts.length;
                }

                // if the profile picture is missing, try to find a post with a valid authorProfilePic and use it as the profile picture
                const postWithPic = userPosts.find(p => p.authorProfilePic && p.authorProfilePic.trim() !== "" && p.authorProfilePic !== "undefined");
                if (postWithPic && (!profileData.profilePicture || profileData.profilePicture.trim() === "" || profileData.profilePicture === "undefined")) {
                    profileData.profilePicture = postWithPic.authorProfilePic;
                    renderProfileUI(); // update the profile UI with the new profile picture
                }

                if (userPosts.length === 0) {
                    userPostsContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">No posts found from this user.</div>`;
                    return;
                }


                // clear existing posts and render the fetched posts
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

    window.reloadPostsFeed = loadUserPosts;

    // --- crop profile picture logic ---
    const drawImageOnCanvas = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2 + imgX, canvas.height / 2 + imgY);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
    };

    // --- event listeners for cropping ---
    editAvatarTrigger?.addEventListener("click", () => editProfileFileInput?.click());
    editProfileFileInput?.addEventListener("change", function (e) {
        const file = e.target.files[0];

        // reset the file input value to allow re-selecting the same file if needed
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                img.onload = () => {
                    scale = Math.max(canvas.width / img.width, canvas.height / img.height);
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

    // --- drag and zoom logic ---
    if (canvas) {
        canvas.addEventListener("mousedown", (e) => { isDragging = true; startX = e.clientX - imgX; startY = e.clientY - imgY; });
        window.addEventListener("mousemove", (e) => { if (!isDragging) return; imgX = e.clientX - startX; imgY = e.clientY - startY; drawImageOnCanvas(); });
        window.addEventListener("mouseup", () => { isDragging = false; });
    }
    zoomSlider?.addEventListener("input", (e) => { scale = parseFloat(e.target.value); drawImageOnCanvas(); });

    // --- crop modal buttons ---
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

        // send the updated profile data to the server
        try {
            const res = await fetch(`/users/${encodeURIComponent(currentUser)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentUser, bio: newBio, city: newCity, profilePicture: finalCroppedBase64 })
            });
            const data = await res.json();

            // if the update was successful, update localStorage and sidebar avatars, then reload profile data
            if (data.success) {
                if (finalCroppedBase64) {
                    localStorage.setItem("userProfilePic", finalCroppedBase64);
                    window.syncSidebarAvatars(finalCroppedBase64, currentUser);
                } else {
                    localStorage.removeItem("userProfilePic");
                    window.syncSidebarAvatars("", currentUser);
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

    // --- close edit profile modal ---
    document.getElementById("close-edit-profile-btn")?.addEventListener("click", () => editModal.classList.remove("active"));
    document.getElementById("cancel-edit-profile-btn")?.addEventListener("click", () => editModal.classList.remove("active"));
    editModal?.addEventListener("click", (e) => { if (e.target === editModal) editModal.classList.remove("active"); });

    // --- delete account logic ---
    const deleteAccountBtn = document.getElementById("delete-account-btn");
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener("click", () => {
            const modal = document.getElementById("delete-confirm-modal");
            if (!modal) return;

            // update modal content for deleting account
            modal.querySelector("h3").innerText = "Delete Account?";
            modal.querySelector("p").innerText = "WARNING: This action cannot be undone. All your data, including all posts, will be permanently deleted.";
            modal.classList.add("active");

            const confirmBtn = document.getElementById("confirm-delete-btn");
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

            // confirm deletion of account
            newConfirmBtn.addEventListener("click", async () => {
                modal.classList.remove("active");
                try {
                    const res = await fetch(`/users/${encodeURIComponent(currentUser)}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentUser })
                    });
                    const data = await res.json();

                    // if deletion was successful, clear localStorage and redirect to logout
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

            document.getElementById("cancel-delete-btn").onclick = () => modal.classList.remove("active");
        });
    }

    loadProfileData();
});