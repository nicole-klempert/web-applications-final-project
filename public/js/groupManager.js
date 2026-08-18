document.addEventListener(
    "DOMContentLoaded",
    () => {
        const currentUser =
            (
                localStorage.getItem(
                    "loggedInUser"
                ) || ""
            ).trim();
        if (!currentUser) {
            window.location.replace(
                "login.html"
            );
            return;
        }
        const params =
            new URLSearchParams(
                window.location.search
            );
        const groupId =
            params.get("id");
        if (!groupId) {
            window.location.replace(
                "groups.html"
            );
            return;
        }
        // DOM
        const loading =
            document.getElementById(
                "group-loading"
            );
        const pageContent =
            document.getElementById(
                "group-page-content"
            );
        const cover =
            document.getElementById(
                "group-cover-image"
            );
        const title =
            document.getElementById(
                "group-title"
            );
        const description =
            document.getElementById(
                "group-description"
            );
        const categoryDisplay =
            document.getElementById(
                "group-category-display"
            );
        const locationDisplay =
            document.getElementById(
                "group-location-display"
            );
        const ownerDisplay =
            document.getElementById(
                "group-owner-display"
            );
        const membersCount =
            document.getElementById(
                "group-members-count"
            );
        const membersTotal =
            document.getElementById(
                "members-total"
            );
        const roleBadge =
            document.getElementById(
                "group-role-badge"
            );
        const membershipBtn =
            document.getElementById(
                "group-membership-btn"
            );
        const editBtn =
            document.getElementById(
                "edit-group-btn"
            );
        const deleteBtn =
            document.getElementById(
                "delete-group-btn"
            );
        const membersList =
            document.getElementById(
                "group-members-list"
            );
        const adminManagementCard =
            document.getElementById(
                "admin-management-card"
            );
        const adminUsernameInput =
            document.getElementById(
                "admin-username-input"
            );
        const addAdminBtn =
            document.getElementById(
                "add-admin-btn"
            );
        const adminError =
            document.getElementById(
                "admin-management-error"
            );
        let group = null;
        let editedImage = undefined;
        const isUserAdmin =
            userId => {
                return group.admins.some(
                    admin =>
                        admin._id === userId
                );
            };
        // === LOAD GROUP ===
        const loadGroup =
            async () => {
                try {
                    const response =
                        await fetch(
                            `/groups/${groupId}`,
                            {
                                headers: {
                                    "Accept":
                                        "application/json"
                                }
                            }
                        );
                    const data =
                        await response.json();
                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        throw new Error(
                            data.error ||
                            "Failed to load group"
                        );
                    }
                    group =
                        data.group;
                    renderGroup();
                } catch (error) {
                    console.error(
                        error
                    );
                    loading.innerText =
                        "Failed to load group.";
                }
            };
        // === RENDER GROUP ===
        const renderGroup =
            () => {
                loading.style.display =
                    "none";
                pageContent.style.display =
                    "block";
                title.innerText =
                    group.name;
                description.innerText =
                    group.description ||
                    "No description yet.";
                if (group.image) {
                    cover.innerHTML =
                        `<img src="${group.image}" alt="${group.name}">`;
                } else {
                    cover.innerHTML =
                        `<i class="bi bi-people-fill"></i>`;
                }
                categoryDisplay.innerHTML =
                    group.category
                        ? `<i class="bi bi-tag"></i> ${group.category}`
                        : "";
                const locationParts =
                    [
                        group.address,
                        group.city
                    ]
                        .filter(Boolean)
                        .join(", ");
                locationDisplay.innerHTML =
                    locationParts
                        ? `<i class="bi bi-geo-alt"></i> ${locationParts}`
                        : "";
                ownerDisplay.innerHTML =
                    `
                        <i class="bi bi-person-badge"></i>
                        Owner:
                        ${group.owner?.username ||
                    "User"
                    }
                    `;
                membersCount.innerHTML =
                    `
                        <i class="bi bi-people"></i>
                        ${group.memberCount}
                        member${group.memberCount === 1 ? "" : "s"}
                    `;
                membersTotal.innerText =
                    group.memberCount;
                // role badge
                if (group.isOwner) {
                    roleBadge.innerText =
                        "Owner";
                    roleBadge.style.display =
                        "inline-block";
                } else if (
                    group.isAdmin
                ) {
                    roleBadge.innerText =
                        "Admin";
                    roleBadge.style.display =
                        "inline-block";
                } else {
                    roleBadge.style.display =
                        "none";
                }
                // membership button
                if (group.isOwner) {
                    membershipBtn.innerText =
                        "Owner";
                    membershipBtn.disabled =
                        true;
                } else if (
                    group.isMember
                ) {
                    membershipBtn.innerText =
                        "Leave Group";
                    membershipBtn.disabled =
                        false;
                } else {
                    membershipBtn.innerText =
                        "Join Group";
                    membershipBtn.disabled =
                        false;
                }
                // management buttons:
                // owner OR admin
                const canManage =
                    group.isOwner ||
                    group.isAdmin;
                editBtn.style.display =
                    canManage
                        ? "inline-block"
                        : "none";
                deleteBtn.style.display =
                    canManage
                        ? "inline-block"
                        : "none";
                // only owner sees admin management
                adminManagementCard.style.display =
                    group.isOwner
                        ? "block"
                        : "none";
                renderMembers();
                // update group post publishing permissions
                renderPostPermissions();
            };
        // === MEMBERS ===
        const renderMembers =
            () => {
                if (
                    !group.members ||
                    group.members.length === 0
                ) {
                    membersList.innerHTML =
                        "<p>No members.</p>";
                    return;
                }
                membersList.innerHTML =
                    group.members
                        .map(member => {
                            const memberIsOwner =
                                member._id ===
                                group.owner?._id;
                            const memberIsAdmin =
                                isUserAdmin(
                                    member._id
                                );
                            let role = "";
                            if (memberIsOwner) {
                                role =
                                    `<span class="member-role">Owner</span>`;
                            } else if (
                                memberIsAdmin
                            ) {
                                role =
                                    `<span class="member-role">Admin</span>`;
                            }
                            let removeButton =
                                "";
                            const canManage =
                                group.isOwner ||
                                group.isAdmin;
                            if (
                                canManage &&
                                !memberIsOwner
                            ) {
                                /*
                                 * Admin cannot remove another admin.
                                 * Owner can.
                                 */
                                if (
                                    !memberIsAdmin ||
                                    group.isOwner
                                ) {
                                    removeButton = `
                                        <button
                                            class="remove-member-btn"
                                            data-user-id="${member._id}">
                                            Remove
                                        </button>
                                    `;
                                }
                            }
                            let adminButton =
                                "";
                            if (
                                group.isOwner &&
                                !memberIsOwner
                            ) {
                                if (memberIsAdmin) {
                                    adminButton = `
                                        <button
                                            class="remove-admin-btn"
                                            data-username="${member.username}">
                                            Remove Admin
                                        </button>
                                    `;
                                } else {
                                    adminButton = `
                                        <button
                                            class="make-admin-btn"
                                            data-username="${member.username}">
                                            Make Admin
                                        </button>
                                    `;
                                }
                            }
                            const initials =
                                (
                                    member.username ||
                                    "US"
                                )
                                    .substring(
                                        0,
                                        2
                                    )
                                    .toUpperCase();
                            const avatar =
                                member.profilePicture
                                    ? `
                                        <div
                                            class="member-avatar"
                                            style="
                                                background-image:
                                                url('${member.profilePicture}');
                                            ">
                                        </div>
                                    `
                                    : `
                                        <div class="member-avatar initials">
                                            ${initials}
                                        </div>
                                    `;
                            return `
                                <div class="member-row">
                                    <a
                                        href="profile.html?user=${encodeURIComponent(member.username)}"
                                        class="member-info">
                                        ${avatar}
                                        <div>
                                            <strong>
                                                ${member.username}
                                            </strong>
                                            ${role}
                                        </div>
                                    </a>
                                    <div class="member-actions">
                                        ${adminButton}
                                        ${removeButton}
                                    </div>
                                </div>
                            `;
                        })
                        .join("");
            };
        // === JOIN / LEAVE ===
        membershipBtn.addEventListener(
            "click",
            async () => {
                if (group.isOwner) {
                    return;
                }
                const action =
                    group.isMember
                        ? "leave"
                        : "join";
                const response =
                    await fetch(
                        `/groups/${groupId}/${action}`,
                        {
                            method:
                                "POST",
                            headers: {
                                "Accept":
                                    "application/json"
                            }
                        }
                    );
                const data =
                    await response.json();
                if (
                    !response.ok ||
                    !data.success
                ) {
                    alert(
                        data.error ||
                        "Action failed"
                    );
                    return;
                }
                await loadGroup();
            }
        );
        // === MEMBER ACTIONS ===
        membersList.addEventListener(
            "click",
            async event => {
                const removeMemberBtn =
                    event.target.closest(
                        ".remove-member-btn"
                    );
                const makeAdminBtn =
                    event.target.closest(
                        ".make-admin-btn"
                    );
                const removeAdminBtn =
                    event.target.closest(
                        ".remove-admin-btn"
                    );
                if (removeMemberBtn) {
                    const userId =
                        removeMemberBtn.dataset.userId;
                    if (
                        !confirm(
                            "Remove this member from the group?"
                        )
                    ) {
                        return;
                    }
                    const response =
                        await fetch(
                            `/groups/${groupId}/members/${userId}`,
                            {
                                method:
                                    "DELETE",
                                headers: {
                                    "Accept":
                                        "application/json"
                                }
                            }
                        );
                    const data =
                        await response.json();
                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        alert(
                            data.error ||
                            "Failed to remove member"
                        );
                        return;
                    }
                    await loadGroup();
                    return;
                }
                if (makeAdminBtn) {
                    await changeAdmin(
                        makeAdminBtn
                            .dataset
                            .username,
                        true
                    );
                    return;
                }
                if (removeAdminBtn) {
                    await changeAdmin(
                        removeAdminBtn
                            .dataset
                            .username,
                        false
                    );
                }
            }
        );
        const changeAdmin =
            async (
                username,
                makeAdmin
            ) => {
                const url =
                    makeAdmin
                        ? `/groups/${groupId}/admins`
                        : `/groups/${groupId}/admins/${encodeURIComponent(username)}`;
                const options =
                    makeAdmin
                        ? {
                            method:
                                "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                                "Accept":
                                    "application/json"
                            },
                            body:
                                JSON.stringify({
                                    username
                                })
                        }
                        : {
                            method:
                                "DELETE",
                            headers: {
                                "Accept":
                                    "application/json"
                            }
                        };
                const response =
                    await fetch(
                        url,
                        options
                    );
                const data =
                    await response.json();
                if (
                    !response.ok ||
                    !data.success
                ) {
                    alert(
                        data.error ||
                        "Failed to update admin"
                    );
                    return;
                }
                await loadGroup();
            };
        // manual admin username field
        addAdminBtn.addEventListener(
            "click",
            async () => {
                const username =
                    adminUsernameInput
                        .value
                        .trim();
                if (!username) {
                    adminError.innerText =
                        "Enter a username.";
                    return;
                }
                adminError.innerText =
                    "";
                const response =
                    await fetch(
                        `/groups/${groupId}/admins`,
                        {
                            method:
                                "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                                "Accept":
                                    "application/json"
                            },
                            body:
                                JSON.stringify({
                                    username
                                })
                        }
                    );
                const data =
                    await response.json();
                if (
                    !response.ok ||
                    !data.success
                ) {
                    adminError.innerText =
                        data.error ||
                        "Failed to add admin.";
                    return;
                }
                adminUsernameInput.value =
                    "";
                await loadGroup();
            }
        );
        // === EDIT ===
        const editModal =
            document.getElementById(
                "edit-group-modal"
            );
        const editForm =
            document.getElementById(
                "edit-group-form"
            );
        const closeEditBtn =
            document.getElementById(
                "close-edit-group-modal"
            );
        const cancelEditBtn =
            document.getElementById(
                "cancel-edit-group"
            );
        const editImageInput =
            document.getElementById(
                "edit-group-image"
            );
        const editImagePreview =
            document.getElementById(
                "edit-group-image-preview"
            );
        const editImagePreviewContainer =
            document.getElementById(
                "edit-group-image-preview-container"
            );
        const editError =
            document.getElementById(
                "edit-group-error"
            );
        const openEditModal =
            () => {
                // load current group name
                document.getElementById(
                    "edit-group-name"
                ).value =
                    group.name || "";
                // load current description
                document.getElementById(
                    "edit-group-description"
                ).value =
                    group.description || "";
                // load current category
                document.getElementById(
                    "edit-group-category"
                ).value =
                    group.category || "";
                // load current address
                document.getElementById(
                    "edit-group-address"
                ).value =
                    group.address || "";
                // load current city
                document.getElementById(
                    "edit-group-city"
                ).value =
                    group.city || "";
                /*
                 * Latitude and Longitude are intentionally
                 * not displayed in the edit form.
                 */
                editedImage =
                    undefined;
                // show existing group image
                if (group.image) {
                    editImagePreview.src =
                        group.image;
                    editImagePreviewContainer
                        .classList
                        .add("show");
                } else {
                    editImagePreview.src =
                        "";
                    editImagePreviewContainer
                        .classList
                        .remove("show");
                }
                editError.innerText =
                    "";
                editModal.classList.add(
                    "show"
                );
            };
        const closeEditModal =
            () => {
                editModal.classList.remove(
                    "show"
                );
                editForm.reset();
                editedImage =
                    undefined;
                editImagePreview.src =
                    "";
                editImagePreviewContainer
                    .classList
                    .remove("show");
                editError.innerText =
                    "";
            };
        editBtn.addEventListener(
            "click",
            openEditModal
        );
        closeEditBtn.addEventListener(
            "click",
            closeEditModal
        );
        cancelEditBtn.addEventListener(
            "click",
            closeEditModal
        );
        // === CHANGE GROUP IMAGE ===
        editImageInput.addEventListener(
            "change",
            () => {
                const file =
                    editImageInput.files[0];
                if (!file) {
                    return;
                }
                if (
                    !file.type.startsWith(
                        "image/"
                    )
                ) {
                    alert(
                        "Please select an image."
                    );
                    editImageInput.value =
                        "";
                    return;
                }
                const reader =
                    new FileReader();
                reader.onload =
                    () => {
                        editedImage =
                            reader.result;
                        editImagePreview.src =
                            editedImage;
                        editImagePreviewContainer
                            .classList
                            .add("show");
                    };
                reader.onerror =
                    () => {
                        alert(
                            "Failed to load image."
                        );
                    };
                reader.readAsDataURL(
                    file
                );
            }
        );
        // === SAVE GROUP CHANGES ===
        editForm.addEventListener(
            "submit",
            async event => {
                event.preventDefault();
                const payload = {
                    name:
                        document
                            .getElementById(
                                "edit-group-name"
                            )
                            .value
                            .trim(),
                    description:
                        document
                            .getElementById(
                                "edit-group-description"
                            )
                            .value
                            .trim(),
                    category:
                        document
                            .getElementById(
                                "edit-group-category"
                            )
                            .value
                            .trim(),
                    address:
                        document
                            .getElementById(
                                "edit-group-address"
                            )
                            .value
                            .trim(),
                    city:
                        document
                            .getElementById(
                                "edit-group-city"
                            )
                            .value
                            .trim()
                };
                // group name must not be empty
                if (!payload.name) {
                    editError.innerText =
                        "Group name is required.";
                    return;
                }
                /*
                 * Only send image if the user selected
                 * a new one.
                 */
                if (
                    editedImage !==
                    undefined
                ) {
                    payload.image =
                        editedImage;
                }
                editError.innerText =
                    "";
                try {
                    const response =
                        await fetch(
                            `/groups/${groupId}`,
                            {
                                method:
                                    "PUT",
                                headers: {
                                    "Content-Type":
                                        "application/json",
                                    "Accept":
                                        "application/json"
                                },
                                body:
                                    JSON.stringify(
                                        payload
                                    )
                            }
                        );
                    const data =
                        await response.json();
                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        editError.innerText =
                            data.error ||
                            "Failed to update group.";
                        return;
                    }
                    closeEditModal();
                    // reload group information
                    await loadGroup();
                } catch (error) {
                    console.error(
                        "Failed to update group:",
                        error
                    );
                    editError.innerText =
                        "Failed to update group.";
                }
            }
        );
        // === DELETE ===
        const deleteModal =
            document.getElementById(
                "group-delete-modal"
            );
        deleteBtn.addEventListener(
            "click",
            () => {
                deleteModal.classList.add(
                    "show"
                );
            }
        );
        document
            .getElementById(
                "cancel-delete-group"
            )
            .addEventListener(
                "click",
                () => {
                    deleteModal.classList.remove(
                        "show"
                    );
                }
            );
        document
            .getElementById(
                "confirm-delete-group"
            )
            .addEventListener(
                "click",
                async () => {
                    const response =
                        await fetch(
                            `/groups/${groupId}`,
                            {
                                method:
                                    "DELETE",
                                headers: {
                                    "Accept":
                                        "application/json"
                                }
                            }
                        );
                    const data =
                        await response.json();
                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        alert(
                            data.error ||
                            "Failed to delete group."
                        );
                        return;
                    }
                    window.location.href =
                        "groups.html";
                }
            );
        // ==================================================
        // === GROUP POSTS ===
        // ==================================================
        const groupPostComposer =
            document.getElementById("group-post-composer");
        const groupPostMembersOnly =
            document.getElementById("group-post-members-only");
        const groupPostText =
            document.getElementById("group-post-text");
        const groupPostMediaInput =
            document.getElementById("group-post-media");
        const groupPostMediaBtn =
            document.getElementById("group-post-media-btn");
        const groupPostClearMediaBtn =
            document.getElementById("group-post-clear-media");
        const groupPostMediaPreview =
            document.getElementById("group-post-media-preview");
        const publishGroupPostBtn =
            document.getElementById("publish-group-post-btn");
        const groupPostError =
            document.getElementById("group-post-error");
        const groupPostsContainer =
            document.getElementById("group-posts-container");
        const loadMoreGroupPostsBtn =
            document.getElementById("load-more-group-posts");
        let selectedPostMedia = "";
        let selectedPostMediaType = "";
        let groupPostsPage = 1;
        let loadingGroupPosts = false;
        // === ESCAPE USER TEXT ===
        const escapeHtml = value => {
            return String(value ?? "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#039;");
        };
        // === POST PERMISSIONS ===
        const renderPostPermissions = () => {
            if (
                !groupPostComposer ||
                !groupPostMembersOnly ||
                !group
            ) {
                return;
            }
            // only group members can publish posts
            if (group.isMember) {
                groupPostComposer.style.display =
                    "block";
                groupPostMembersOnly.style.display =
                    "none";
            } else {
                groupPostComposer.style.display =
                    "none";
                groupPostMembersOnly.style.display =
                    "block";
            }
        };
        // === ENABLE / DISABLE PUBLISH BUTTON ===
        const updatePublishButton = () => {
            if (!publishGroupPostBtn) {
                return;
            }
            const hasText =
                groupPostText &&
                groupPostText.value.trim().length > 0;
            const hasMedia =
                selectedPostMedia !== "";
            publishGroupPostBtn.disabled =
                !hasText && !hasMedia;
        };
        groupPostText?.addEventListener(
            "input",
            updatePublishButton
        );
        // === SELECT IMAGE / VIDEO ===
        groupPostMediaBtn?.addEventListener(
            "click",
            () => {
                groupPostMediaInput?.click();
            }
        );
        groupPostMediaInput?.addEventListener(
            "change",
            () => {
                const file =
                    groupPostMediaInput.files[0];
                if (!file) {
                    return;
                }
                const isImage =
                    file.type.startsWith("image/");
                const isVideo =
                    file.type.startsWith("video/");
                if (!isImage && !isVideo) {
                    alert(
                        "Please select an image or video."
                    );
                    groupPostMediaInput.value = "";
                    return;
                }
                const reader =
                    new FileReader();
                reader.onload = () => {
                    selectedPostMedia =
                        reader.result;
                    selectedPostMediaType =
                        isImage
                            ? "image"
                            : "video";
                    if (groupPostMediaPreview) {
                        if (isImage) {
                            groupPostMediaPreview.innerHTML = `
                                <img
                                    src="${selectedPostMedia}"
                                    alt="Post preview">
                            `;
                        } else {
                            groupPostMediaPreview.innerHTML = `
                                <video controls>
                                    <source
                                        src="${selectedPostMedia}"
                                        type="${file.type}">
                                </video>
                            `;
                        }
                        groupPostMediaPreview.style.display =
                            "block";
                    }
                    if (groupPostClearMediaBtn) {
                        groupPostClearMediaBtn.style.display =
                            "inline-block";
                    }
                    updatePublishButton();
                };
                reader.readAsDataURL(file);
            }
        );
        // === CLEAR SELECTED MEDIA ===
        groupPostClearMediaBtn?.addEventListener(
            "click",
            () => {
                selectedPostMedia = "";
                selectedPostMediaType = "";
                if (groupPostMediaInput) {
                    groupPostMediaInput.value = "";
                }
                if (groupPostMediaPreview) {
                    groupPostMediaPreview.innerHTML = "";
                    groupPostMediaPreview.style.display =
                        "none";
                }
                groupPostClearMediaBtn.style.display =
                    "none";
                updatePublishButton();
            }
        );
        // === CREATE COMMENT HTML ===
        const createCommentHtml =
            comment => {
                const commentAuthor =
                    comment.author || "User";
                return `
                    <div
                        class="group-comment"
                        data-comment-id="${comment._id || ""}">
                        <div>
                            <a
                                href="profile.html?user=${encodeURIComponent(commentAuthor)}">
                                <strong>
                                    ${escapeHtml(commentAuthor)}
                                </strong>
                            </a>
                            <span>
                                ${escapeHtml(comment.text || "")}
                            </span>
                        </div>
                    </div>
                `;
            };
        // === CREATE GROUP POST HTML ===
        const createGroupPostHtml =
            post => {
                const author =
                    post.author || "User";
                const initials =
                    author
                        .substring(0, 2)
                        .toUpperCase();
                const date =
                    post.createdAt
                        ? new Date(
                            post.createdAt
                        ).toLocaleString()
                        : "";
                let avatarHtml = `
                    <div class="group-post-avatar initials">
                        ${initials}
                    </div>
                `;
                if (post.authorProfilePic) {
                    avatarHtml = `
                        <div
                            class="group-post-avatar"
                            style="
                                background-image:
                                url('${post.authorProfilePic}');
                            ">
                        </div>
                    `;
                }
                let mediaHtml = "";
                if (
                    post.mediaUrl &&
                    post.mediaType === "image"
                ) {
                    mediaHtml = `
                        <div class="group-post-media">
                            <img
                                src="${post.mediaUrl}"
                                alt="Post image">
                        </div>
                    `;
                }
                if (
                    post.mediaUrl &&
                    post.mediaType === "video"
                ) {
                    mediaHtml = `
                        <div class="group-post-media">
                            <video controls>
                                <source
                                    src="${post.mediaUrl}">
                            </video>
                        </div>
                    `;
                }
                const contentHtml =
                    post.content
                        ? `
                            <div class="group-post-content">
                                ${escapeHtml(post.content)}
                            </div>
                        `
                        : "";
                const comments =
                    Array.isArray(post.comments)
                        ? post.comments
                        : [];
                const commentsHtml =
                    comments
                        .map(createCommentHtml)
                        .join("");
                const liked =
                    Array.isArray(post.likedBy) &&
                    post.likedBy.includes(currentUser);
                return `
                    <article
                        class="group-post"
                        data-post-id="${post._id}">
                        <div class="group-post-header">
                            <a
                                href="profile.html?user=${encodeURIComponent(author)}"
                                class="group-post-author">
                                ${avatarHtml}
                                <div>
                                    <strong>
                                        ${escapeHtml(author)}
                                    </strong>
                                    <small>
                                        ${date}
                                    </small>
                                </div>
                            </a>
                        </div>
                        ${contentHtml}
                        ${mediaHtml}
                        <div class="group-post-actions">
                            <button
                                type="button"
                                class="group-like-btn ${liked ? "liked" : ""}"
                                data-post-id="${post._id}">
                                <i class="bi bi-heart${liked ? "-fill" : ""}"></i>
                                <span>
                                    ${post.likes || 0}
                                </span>
                            </button>
                            <span>
                                <i class="bi bi-chat"></i>
                                ${comments.length}
                            </span>
                        </div>
                        <div class="group-post-comments">
                            <div class="group-comments-list">
                                ${commentsHtml}
                            </div>
                            <form
                                class="group-comment-form"
                                data-post-id="${post._id}">
                                <input
                                    type="text"
                                    maxlength="500"
                                    placeholder="Write a comment..."
                                    required>
                                <button type="submit">
                                    Comment
                                </button>
                            </form>
                        </div>
                    </article>
                `;
            };
        // === LOAD GROUP POSTS ===
        const loadGroupPosts =
            async (reset = false) => {
                if (
                    !groupPostsContainer ||
                    loadingGroupPosts
                ) {
                    return;
                }
                loadingGroupPosts = true;
                if (reset) {
                    groupPostsPage = 1;
                    groupPostsContainer.innerHTML = `
                        <p class="muted-text">
                            Loading posts...
                        </p>
                    `;
                }
                try {
                    const response =
                        await fetch(
                            `/posts?group=${encodeURIComponent(groupId)}&page=${groupPostsPage}&limit=5`,
                            {
                                headers: {
                                    "Accept":
                                        "application/json"
                                }
                            }
                        );
                    const data =
                        await response.json();
                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        throw new Error(
                            data.error ||
                            "Failed to load group posts."
                        );
                    }
                    if (reset) {
                        groupPostsContainer.innerHTML =
                            "";
                    }
                    if (
                        data.posts.length === 0 &&
                        groupPostsPage === 1
                    ) {
                        groupPostsContainer.innerHTML = `
                            <div class="group-no-posts">
                                <i class="bi bi-chat-square-text"></i>
                                <p>
                                    No posts in this group yet.
                                </p>
                            </div>
                        `;
                    } else {
                        data.posts.forEach(
                            post => {
                                groupPostsContainer
                                    .insertAdjacentHTML(
                                        "beforeend",
                                        createGroupPostHtml(post)
                                    );
                            }
                        );
                    }
                    if (loadMoreGroupPostsBtn) {
                        loadMoreGroupPostsBtn.style.display =
                            data.hasMore
                                ? "inline-block"
                                : "none";
                    }
                    if (data.hasMore) {
                        groupPostsPage++;
                    }
                } catch (error) {
                    console.error(
                        "Failed to load group posts:",
                        error
                    );
                    if (groupPostsPage === 1) {
                        groupPostsContainer.innerHTML = `
                            <p class="group-error">
                                Failed to load posts.
                            </p>
                        `;
                    }
                } finally {
                    loadingGroupPosts =
                        false;
                }
            };
        // === PUBLISH GROUP POST ===
        publishGroupPostBtn?.addEventListener(
            "click",
            async () => {
                const content =
                    groupPostText?.value.trim() ||
                    "";
                if (
                    !content &&
                    !selectedPostMedia
                ) {
                    return;
                }
                if (!group?.isMember) {
                    groupPostError.innerText =
                        "You must be a member of this group to publish.";
                    return;
                }
                groupPostError.innerText =
                    "";
                publishGroupPostBtn.disabled =
                    true;
                try {
                    const response =
                        await fetch(
                            "/posts",
                            {
                                method:
                                    "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json",
                                    "Accept":
                                        "application/json"
                                },
                                body:
                                    JSON.stringify({
                                        author:
                                            currentUser,
                                        authorProfilePic:
                                            localStorage.getItem(
                                                "userProfilePic"
                                            ) || "",
                                        content,
                                        mediaUrl:
                                            selectedPostMedia,
                                        mediaType:
                                            selectedPostMediaType,
                                        groupId
                                    })
                            }
                        );
                    if (
                        response.status === 413
                    ) {
                        throw new Error(
                            "File exceeds the upload limit."
                        );
                    }
                    const data =
                        await response.json();
                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        throw new Error(
                            data.error ||
                            "Failed to publish post."
                        );
                    }
                    // reset composer
                    if (groupPostText) {
                        groupPostText.value =
                            "";
                    }
                    selectedPostMedia =
                        "";
                    selectedPostMediaType =
                        "";
                    if (groupPostMediaInput) {
                        groupPostMediaInput.value =
                            "";
                    }
                    if (groupPostMediaPreview) {
                        groupPostMediaPreview.innerHTML =
                            "";
                        groupPostMediaPreview.style.display =
                            "none";
                    }
                    if (groupPostClearMediaBtn) {
                        groupPostClearMediaBtn.style.display =
                            "none";
                    }
                    updatePublishButton();
                    // reload posts from the beginning
                    await loadGroupPosts(
                        true
                    );
                } catch (error) {
                    console.error(
                        "Failed to publish group post:",
                        error
                    );
                    groupPostError.innerText =
                        error.message;
                } finally {
                    updatePublishButton();
                }
            }
        );
        // === GROUP POST LIKE ===
        groupPostsContainer?.addEventListener(
            "click",
            async event => {
                const likeBtn =
                    event.target.closest(
                        ".group-like-btn"
                    );
                if (!likeBtn) {
                    return;
                }
                const postId =
                    likeBtn.dataset.postId;
                try {
                    const response =
                        await fetch(
                            `/posts/${postId}/like`,
                            {
                                method:
                                    "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json",
                                    "Accept":
                                        "application/json"
                                },
                                body:
                                    JSON.stringify({
                                        username:
                                            currentUser
                                    })
                            }
                        );
                    const data =
                        await response.json();
                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        throw new Error(
                            data.error ||
                            "Failed to like post."
                        );
                    }
                    likeBtn.classList.toggle(
                        "liked",
                        data.isLiked
                    );
                    likeBtn.innerHTML = `
                        <i class="bi bi-heart${data.isLiked ? "-fill" : ""}"></i>
                        <span>
                            ${data.likes}
                        </span>
                    `;
                } catch (error) {
                    console.error(
                        "Failed to like post:",
                        error
                    );
                }
            }
        );
        // === ADD COMMENT TO GROUP POST ===
        groupPostsContainer?.addEventListener(
            "submit",
            async event => {
                const form =
                    event.target.closest(
                        ".group-comment-form"
                    );
                if (!form) {
                    return;
                }
                event.preventDefault();
                const input =
                    form.querySelector(
                        "input"
                    );
                const text =
                    input.value.trim();
                if (!text) {
                    return;
                }
                const postId =
                    form.dataset.postId;
                try {
                    const response =
                        await fetch(
                            `/posts/${postId}/comments`,
                            {
                                method:
                                    "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json",
                                    "Accept":
                                        "application/json"
                                },
                                body:
                                    JSON.stringify({
                                        author:
                                            currentUser,
                                        authorProfilePic:
                                            localStorage.getItem(
                                                "userProfilePic"
                                            ) || "",
                                        text
                                    })
                            }
                        );
                    const data =
                        await response.json();
                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        throw new Error(
                            data.error ||
                            "Failed to add comment."
                        );
                    }
                    input.value =
                        "";
                    await loadGroupPosts(
                        true
                    );
                } catch (error) {
                    console.error(
                        "Failed to add comment:",
                        error
                    );
                    alert(
                        error.message
                    );
                }
            }
        );
        // === LOAD MORE GROUP POSTS ===
        loadMoreGroupPostsBtn?.addEventListener(
            "click",
            () => {
                loadGroupPosts();
            }
        );
        // === INITIAL LOAD ===
        loadGroup();
        loadGroupPosts();
    }
);