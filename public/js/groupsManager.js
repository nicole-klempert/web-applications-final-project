document.addEventListener(
    "DOMContentLoaded",
    () => {
        // === AUTH ===
        const currentUser =
            (
                localStorage.getItem(
                    "loggedInUser"
                ) || ""
            ).trim();
        if (!currentUser) {
            sessionStorage.setItem(
                "authAlert",
                "You must be logged in to view this page."
            );
            window.location.replace(
                "login.html"
            );
            return;
        }
        // === DOM ===
        const groupsContainer =
            document.getElementById(
                "groups-container"
            );
        const myGroupsContainer =
            document.getElementById(
                "my-groups-container"
            );
        const searchInput =
            document.getElementById(
                "groups-search-input"
            );
        const categoryFilter =
            document.getElementById(
                "groups-category-filter"
            );
        const cityFilter =
            document.getElementById(
                "groups-city-filter"
            );
        const resetFiltersBtn =
            document.getElementById(
                "reset-group-filters"
            );
        const loadMoreBtn =
            document.getElementById(
                "groups-load-more-btn"
            );
        const createGroupBtn =
            document.getElementById(
                "create-group-btn"
            );
        const createGroupModal =
            document.getElementById(
                "create-group-modal"
            );
        const closeCreateGroupModal =
            document.getElementById(
                "close-create-group-modal"
            );
        const cancelCreateGroup =
            document.getElementById(
                "cancel-create-group"
            );
        const createGroupForm =
            document.getElementById(
                "create-group-form"
            );
        const createGroupError =
            document.getElementById(
                "create-group-error"
            );
        const groupImageInput =
            document.getElementById(
                "group-image"
            );
        const groupImagePreview =
            document.getElementById(
                "group-image-preview"
            );
        const groupImagePreviewContainer =
            document.getElementById(
                "group-image-preview-container"
            );
        // === STATE ===
        let allGroups = [];
        let currentPage = 1;
        let hasMore = false;
        let isLoading = false;
        let selectedGroupImage = "";
        let searchTimeout = null;
        // === CARD ===
        const createGroupCardHTML =
            group => {
                let badge = "";
                if (group.isOwner) {
                    badge = `
                        <span class="group-role-badge">
                            Owner
                        </span>
                    `;
                } else if (
                    group.isAdmin
                ) {
                    badge = `
                        <span class="group-role-badge">
                            Admin
                        </span>
                    `;
                }
                let membershipButton = "";
                if (group.isOwner) {
                    membershipButton = `
                        <button
                            class="group-member-btn"
                            disabled>
                            Owner
                        </button>
                    `;
                } else if (
                    group.isMember
                ) {
                    membershipButton = `
                        <button
                            class="group-leave-btn"
                            data-group-id="${group._id}">
                            Leave
                        </button>
                    `;
                } else {
                    membershipButton = `
                        <button
                            class="group-join-btn"
                            data-group-id="${group._id}">
                            Join
                        </button>
                    `;
                }
                const imageHTML =
                    group.image
                        ? `
                            <img
                                src="${group.image}"
                                alt="${group.name}">
                        `
                        : `
                            <div class="group-image-placeholder">
                                <i class="bi bi-people-fill"></i>
                            </div>
                        `;
                return `
                    <article
                        class="group-card"
                        data-group-id="${group._id}">
                        <div class="group-card-image">
                            ${imageHTML}
                        </div>
                        <div class="group-card-body">
                            <div class="group-card-title-row">
                                <h3>
                                    ${group.name}
                                </h3>
                                ${badge}
                            </div>
                            <p class="group-description">
                                ${group.description ||
                    "No description yet."
                    }
                            </p>
                            <div class="group-meta-info">
                                ${group.category
                        ? `
                                            <span>
                                                <i class="bi bi-tag"></i>
                                                ${group.category}
                                            </span>
                                        `
                        : ""
                    }
                                ${group.city
                        ? `
                                            <span>
                                                <i class="bi bi-geo-alt"></i>
                                                ${group.city}
                                            </span>
                                        `
                        : ""
                    }
                                <span>
                                    <i class="bi bi-person-badge"></i>
                                    ${group.ownerName || "Unknown User"}
                                </span>
                            </div>
                            <div class="group-card-footer">
                                <span class="group-members-count">
                                    <i class="bi bi-people"></i>
                                    ${group.members?.length || 0
                    }
                                    member${group.members?.length === 1
                        ? ""
                        : "s"
                    }
                                </span>
                                <div class="group-card-actions">
                                    <button
                                        class="group-view-btn"
                                        data-group-id="${group._id}">
                                        View
                                    </button>
                                    ${membershipButton}
                                </div>
                            </div>
                        </div>
                    </article>
                `;
            };
        // === RENDER ===
        const renderGroups =
            () => {
                if (!groupsContainer) {
                    return;
                }
                if (
                    allGroups.length === 0
                ) {
                    groupsContainer.innerHTML = `
                        <div class="groups-empty-state">
                            <i class="bi bi-people"></i>
                            <h3>
                                No groups found
                            </h3>
                            <p>
                                Try another search or create a new group.
                            </p>
                        </div>
                    `;
                    return;
                }
                groupsContainer.innerHTML =
                    allGroups
                        .map(
                            createGroupCardHTML
                        )
                        .join("");
            };
        const renderMyGroups =
            () => {
                if (!myGroupsContainer) {
                    return;
                }
                const myGroups =
                    allGroups.filter(
                        group =>
                            group.isMember
                    );
                if (
                    myGroups.length === 0
                ) {
                    myGroupsContainer.innerHTML = `
                        <p class="no-my-groups">
                            You haven't joined any loaded groups yet.
                        </p>
                    `;
                    return;
                }
                myGroupsContainer.innerHTML =
                    myGroups
                        .map(
                            group => `
                                <div
                                    class="my-group-item"
                                    data-group-id="${group._id}">
                                    <div class="my-group-icon">
                                        <i class="bi bi-people-fill"></i>
                                    </div>
                                    <div>
                                        <strong>
                                            ${group.name}
                                        </strong>
                                        <span>
                                            ${group.members?.length || 0}
                                            members
                                        </span>
                                    </div>
                                </div>
                            `
                        )
                        .join("");
            };
        // === FILTER VALUES ===
        const getFilters =
            () => ({
                search:
                    searchInput
                        ?.value
                        .trim() || "",
                category:
                    categoryFilter
                        ?.value
                        .trim() || "",
                city:
                    cityFilter
                        ?.value
                        .trim() || ""
            });
        // === LOAD GROUPS ===
        const loadGroups =
            async (
                reset = false
            ) => {
                if (isLoading) {
                    return;
                }
                if (reset) {
                    currentPage = 1;
                    allGroups = [];
                }
                isLoading = true;
                if (loadMoreBtn) {
                    loadMoreBtn.disabled =
                        true;
                }
                try {
                    const filters =
                        getFilters();
                    const params =
                        new URLSearchParams({
                            page:
                                currentPage,
                            limit:
                                6
                        });
                    if (filters.search) {
                        params.set(
                            "search",
                            filters.search
                        );
                    }
                    if (filters.category) {
                        params.set(
                            "category",
                            filters.category
                        );
                    }
                    if (filters.city) {
                        params.set(
                            "city",
                            filters.city
                        );
                    }
                    const response =
                        await fetch(
                            `/groups?${params.toString()}`,
                            {
                                headers: {
                                    "Accept":
                                        "application/json"
                                }
                            }
                        );
                    if (
                        response.status === 401
                    ) {
                        window.location.replace(
                            "login.html"
                        );
                        return;
                    }
                    const data =
                        await response.json();
                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        throw new Error(
                            data.error ||
                            "Failed to load groups"
                        );
                    }
                    if (reset) {
                        allGroups =
                            data.groups || [];
                    } else {
                        allGroups.push(
                            ...(data.groups || [])
                        );
                    }
                    hasMore =
                        Boolean(
                            data.hasMore
                        );
                    renderGroups();
                    renderMyGroups();
                    if (loadMoreBtn) {
                        loadMoreBtn.style.display =
                            hasMore
                                ? "inline-block"
                                : "none";
                        loadMoreBtn.disabled =
                            false;
                    }
                } catch (error) {
                    console.error(
                        "Failed to load groups:",
                        error
                    );
                    if (
                        allGroups.length === 0
                    ) {
                        groupsContainer.innerHTML = `
                            <div class="groups-empty-state">
                                <p>
                                    Failed to load groups.
                                </p>
                            </div>
                        `;
                    }
                } finally {
                    isLoading =
                        false;
                }
            };
        // === SEARCH / FILTERS ===
        const reloadWithFilters =
            () => {
                clearTimeout(
                    searchTimeout
                );
                searchTimeout =
                    setTimeout(
                        () => {
                            loadGroups(
                                true
                            );
                        },
                        300
                    );
            };
        searchInput?.addEventListener(
            "input",
            reloadWithFilters
        );
        categoryFilter?.addEventListener(
            "change",
            () => loadGroups(true)
        );
        cityFilter?.addEventListener(
            "input",
            reloadWithFilters
        );
        resetFiltersBtn?.addEventListener(
            "click",
            () => {
                if (searchInput) {
                    searchInput.value =
                        "";
                }
                if (categoryFilter) {
                    categoryFilter.value =
                        "";
                }
                if (cityFilter) {
                    cityFilter.value =
                        "";
                }
                loadGroups(true);
            }
        );
        // === LOAD MORE ===
        loadMoreBtn?.addEventListener(
            "click",
            async () => {
                if (!hasMore) {
                    return;
                }
                currentPage++;
                await loadGroups(
                    false
                );
            }
        );
        // === MODAL ===
        const openCreateModal =
            () => {
                createGroupModal
                    ?.classList
                    .add("show");
                if (createGroupError) {
                    createGroupError.innerText =
                        "";
                }
            };
        const closeCreateModal =
            () => {
                createGroupModal
                    ?.classList
                    .remove("show");
                createGroupForm
                    ?.reset();
                selectedGroupImage =
                    "";
                if (groupImagePreview) {
                    groupImagePreview.src =
                        "";
                }
                groupImagePreviewContainer
                    ?.classList
                    .remove("show");
                if (createGroupError) {
                    createGroupError.innerText =
                        "";
                }
            };
        createGroupBtn?.addEventListener(
            "click",
            openCreateModal
        );
        closeCreateGroupModal?.addEventListener(
            "click",
            closeCreateModal
        );
        cancelCreateGroup?.addEventListener(
            "click",
            closeCreateModal
        );
        // === IMAGE UPLOAD ===
        groupImageInput?.addEventListener(
            "change",
            () => {
                const file =
                    groupImageInput.files[0];
                if (!file) {
                    selectedGroupImage =
                        "";
                    return;
                }
                if (
                    !file.type.startsWith(
                        "image/"
                    )
                ) {
                    alert(
                        "Please select an image file."
                    );
                    return;
                }
                const maxSize =
                    5 * 1024 * 1024;
                if (
                    file.size > maxSize
                ) {
                    alert(
                        "Image must be smaller than 5 MB."
                    );
                    groupImageInput.value =
                        "";
                    return;
                }
                const reader =
                    new FileReader();
                reader.onload =
                    () => {
                        selectedGroupImage =
                            reader.result;
                        groupImagePreview.src =
                            selectedGroupImage;
                        groupImagePreviewContainer
                            ?.classList
                            .add("show");
                    };
                reader.readAsDataURL(
                    file
                );
            }
        );
        // === CREATE GROUP ===
        createGroupForm?.addEventListener(
            "submit",
            async (event) => {
                event.preventDefault();
                const name =
                    document
                        .getElementById(
                            "group-name"
                        )
                        .value
                        .trim();
                const description =
                    document
                        .getElementById(
                            "group-description"
                        )
                        .value
                        .trim();
                const category =
                    document
                        .getElementById(
                            "group-category"
                        )
                        .value
                        .trim();
                const address =
                    document
                        .getElementById(
                            "group-address"
                        )
                        .value
                        .trim();
                const city =
                    document
                        .getElementById(
                            "group-city"
                        )
                        .value
                        .trim();
                // group name is required
                if (!name) {
                    if (createGroupError) {
                        createGroupError.innerText =
                            "Group name is required.";
                    }
                    return;
                }
                // clear previous error
                if (createGroupError) {
                    createGroupError.innerText =
                        "";
                }
                try {
                    const response =
                        await fetch(
                            "/groups",
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
                                        name,
                                        description,
                                        category,
                                        image:
                                            selectedGroupImage,
                                        address,
                                        city
                                    })
                            }
                        );
                    const data =
                        await response.json();
                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        if (createGroupError) {
                            createGroupError.innerText =
                                data.error ||
                                "Failed to create group.";
                        }
                        return;
                    }
                    closeCreateModal();
                    /*
                     * Reload the group list from page 1
                     * so the newly-created group appears.
                     */
                    await loadGroups(
                        true
                    );
                } catch (error) {
                    console.error(
                        "Failed to create group:",
                        error
                    );
                    if (createGroupError) {
                        createGroupError.innerText =
                            "Failed to create group.";
                    }
                }
            }
        );
        // === GROUP BUTTONS ===
        groupsContainer?.addEventListener(
            "click",
            async event => {
                // VIEW
                const viewButton =
                    event.target.closest(
                        ".group-view-btn"
                    );
                if (viewButton) {
                    const groupId =
                        viewButton.dataset.groupId;
                    window.location.href =
                        `group.html?id=${encodeURIComponent(groupId)}`;
                    return;
                }
                // JOIN / LEAVE
                const joinButton =
                    event.target.closest(
                        ".group-join-btn"
                    );
                const leaveButton =
                    event.target.closest(
                        ".group-leave-btn"
                    );
                if (
                    !joinButton &&
                    !leaveButton
                ) {
                    return;
                }
                const button =
                    joinButton ||
                    leaveButton;
                const groupId =
                    button.dataset.groupId;
                const action =
                    joinButton
                        ? "join"
                        : "leave";
                button.disabled =
                    true;
                try {
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
                            `Failed to ${action} group.`
                        );
                        button.disabled =
                            false;
                        return;
                    }
                    await loadGroups(
                        true
                    );
                } catch (error) {
                    console.error(
                        `Failed to ${action} group:`,
                        error
                    );
                    button.disabled =
                        false;
                }
            }
        );
        // sidebar group click
        myGroupsContainer?.addEventListener(
            "click",
            event => {
                const groupItem =
                    event.target.closest(
                        ".my-group-item"
                    );
                if (!groupItem) {
                    return;
                }
                window.location.href =
                    `group.html?id=${encodeURIComponent(
                        groupItem.dataset.groupId
                    )}`;
            }
        );
        // === INITIAL LOAD ===
        loadGroups(
            true
        );
    }
);