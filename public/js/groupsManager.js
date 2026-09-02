// Groups page management
document.addEventListener("DOMContentLoaded", () => {
    // === state and DOM elements ===
    const grid = document.getElementById("groups-grid");
    const empty = document.getElementById("groups-empty");
    const sentinel = document.getElementById("groups-scroll-sentinel");
    const modal = document.getElementById("create-group-modal");
    const form = document.getElementById("create-group-form");
    const searchInput = document.getElementById("group-search");
    const categoryInput = document.getElementById("group-category");
    const categoryFilter = document.getElementById("category-filter");
    const categorySelected = categoryFilter.querySelector(".category-selected");
    const categorySelectedText = document.getElementById("category-selected-text");
    const categoryOptions = categoryFilter.querySelectorAll(".category-option");
    const imageTrigger = document.getElementById("group-image-trigger");
    const imageFileInput = document.getElementById("create-group-image-file");
    const imageInput = document.getElementById("create-group-image");
    const imagePreview = document.getElementById("group-image-preview");
    const imagePlaceholder = document.getElementById("group-image-placeholder");

    let page = 1;
    let loading = false;
    let hasMore = true;

    // === group search parameters ===
    // Build search query params
    const params = () => new URLSearchParams({
        page,
        limit: 6,
        search: searchInput.value.trim(),
        category: categoryInput.value
    });

    // === group card rendering ===
    // Template for rendering a group card
    const card = group => {
        // Display the group image or fallback placeholder
        const imgHTML = group.image
            ? `<img class="group-card-image" src="${group.image}" alt="${group.name}">`
            : `<div class="group-card-image group-card-placeholder"><i class="bi bi-people-fill"></i></div>`;

        // Display whether the group is public or private
        const badgeHTML = group.isPublic
            ? '<span class="group-public-badge">Public</span>'
            : '<span class="group-public-badge">Private</span>';

        let actionButtonHTML = "";

        // Display the correct membership action for the current user
        if (!group.isOwner) {
            if (group.isMember) {
                actionButtonHTML = `<button class="btn btn-secondary membership-btn" data-id="${group._id}" data-member="true">Leave</button>`;
            } else if (group.isRequested) {
                actionButtonHTML = `<button class="btn btn-secondary" disabled>Requested</button>`;
            } else {
                actionButtonHTML = `<button class="btn btn-secondary membership-btn" data-id="${group._id}" data-member="false">Join</button>`;
            }
        }

        return `
            <article class="group-card">
                ${imgHTML}
                <div class="group-card-body">
                    <div class="group-card-title-row">
                        <h3>${group.name}</h3>
                        ${badgeHTML}
                    </div>
                    <p>${group.description || "No description yet."}</p>
                    <div class="group-card-meta">
                        <span><i class="bi bi-tag"></i> ${group.category || "General"}</span>
                        <span><i class="bi bi-people"></i> ${group.memberCount}</span>
                    </div>
                    <small>Owner: ${group.owner?.username || "Unknown"}</small>
                    <div class="group-card-actions">
                        <a class="btn btn-primary" href="group.html?id=${group._id}">View</a>
                        ${actionButtonHTML}
                    </div>
                </div>
            </article>
        `;
    };

    // === fetch groups function ===
    const load = async (reset = false) => {
        // Prevent duplicate requests or loading after the last page
        if (loading) return;
        if (!reset && !hasMore) return;

        loading = true;

        // Reset pagination and existing cards when filters change
        if (reset) {
            page = 1;
            hasMore = true;
            grid.innerHTML = "";
        }

        try {
            const res = await fetch(`/groups?${params()}`, {
                headers: { Accept: "application/json" }
            });

            const data = await res.json();

            if (!data.success) return;

            // Append groups and update pagination state
            grid.insertAdjacentHTML("beforeend", data.groups.map(card).join(""));
            empty.hidden = grid.children.length > 0;
            hasMore = data.hasMore;

            if (data.hasMore) {
                page = data.currentPage + 1;
            }
        } finally {
            loading = false;

            // Continue loading if the page is not tall enough to reach the scroll trigger
            if (hasMore && sentinel.getBoundingClientRect().top <= window.innerHeight + 300) {
                setTimeout(() => load(false), 0);
            }
        }
    };

    // === group search and filtering ===
    // Search groups
    let timer;

    // Debounce search input before reloading groups
    searchInput.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => load(true), 250);
    });

    // Category dropdown
    categorySelected.addEventListener("click", e => {
        e.stopPropagation();
        categoryFilter.classList.toggle("open");
    });

    // Update selected category and reload the group list
    categoryOptions.forEach(option => {
        option.addEventListener("click", e => {
            e.stopPropagation();

            categoryOptions.forEach(item => item.classList.remove("selected"));
            option.classList.add("selected");

            categoryInput.value = option.dataset.value;
            categorySelectedText.textContent = option.textContent;

            categoryFilter.classList.remove("open");
            load(true);
        });
    });

    // Close category dropdown when clicking outside
    document.addEventListener("click", e => {
        if (!categoryFilter.contains(e.target)) {
            categoryFilter.classList.remove("open");
        }
    });

    // Reset group filters
    document.getElementById("reset-group-filters-btn").addEventListener("click", () => {
        searchInput.value = "";
        categoryInput.value = "";
        categorySelectedText.textContent = "All Categories";

        categoryOptions.forEach(option => {
            option.classList.toggle("selected", option.dataset.value === "");
        });

        categoryFilter.classList.remove("open");
        load(true);
    });

    // === infinite scroll functionality ===
    // Automatically load more groups when reaching the bottom
    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
            load(false);
        }
    }, {
        rootMargin: "300px 0px"
    });

    observer.observe(sentinel);

    // === group membership functionality ===
    // Handle join/leave button clicks
    document.addEventListener("click", async e => {
        const btn = e.target.closest(".membership-btn");
        if (!btn) return;

        const action = btn.dataset.member === "true" ? "leave" : "join";

        const res = await fetch(`/groups/${btn.dataset.id}/${action}`, {
            method: "POST",
            headers: { Accept: "application/json" }
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "Action failed");
            return;
        }

        // Reload groups to update membership state
        load(true);
    });

    // === group image picker ===
    // Group image picker
    const resetImagePicker = () => {
        imageFileInput.value = "";
        imageInput.value = "";
        imagePreview.src = "";
        imagePreview.style.display = "none";
        imagePlaceholder.style.display = "flex";
    };

    // Open the image file picker
    imageTrigger.addEventListener("click", () => {
        imageFileInput.click();
    });

    // Validate and preview the selected group image
    imageFileInput.addEventListener("change", () => {
        const file = imageFileInput.files[0];

        if (!file) return;

        const error = document.getElementById("create-group-error");

        // validate selected file type
        if (!file.type.startsWith("image/")) {
            error.textContent = "Please choose an image file";
            resetImagePicker();
            return;
        }

        // validate image size up to 5MB
        if (file.size > 5 * 1024 * 1024) {
            error.textContent = "Image cannot exceed 5MB";
            resetImagePicker();
            return;
        }

        const reader = new FileReader();

        // Convert image to Base64 and display the preview
        reader.onload = () => {
            imageInput.value = reader.result;
            imagePreview.src = reader.result;
            imagePreview.style.display = "block";
            imagePlaceholder.style.display = "none";
            error.textContent = "";
        };

        reader.readAsDataURL(file);
    });

    // === create group modal functionality ===
    // Create Group modal
    const close = () => {
        modal.classList.remove("active");
    };

    // Reset all create group form fields
    const resetCreateForm = () => {
        form.reset();
        document.getElementById("create-group-public").checked = true;
        document.getElementById("create-group-error").textContent = "";
        resetImagePicker();
    };

    // Open create group modal with an empty form
    document.getElementById("open-create-group").onclick = () => {
        resetCreateForm();
        modal.classList.add("active");
    };

    document.getElementById("close-create-group").onclick = close;

    // Close modal when clicking outside the content
    modal.addEventListener("click", e => {
        if (e.target === modal) close();
    });

    // Form submit for group creation
    form.addEventListener("submit", async e => {
        e.preventDefault();

        const error = document.getElementById("create-group-error");
        error.textContent = "";

        // Construct the new group data from the form
        const body = {
            name: document.getElementById("create-group-name").value.trim(),
            description: document.getElementById("create-group-description").value.trim(),
            category: document.getElementById("create-group-category").value,
            image: imageInput.value,
            isPublic: document.getElementById("create-group-public").checked
        };

        // Validate that the group has a name
        if (!body.name) {
            error.textContent = "Group name is required";
            return;
        }

        // Send the new group to the server
        const res = await fetch("/groups", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            error.textContent = data.error || "Could not create group";
            return;
        }

        // Reset the form and redirect to the newly created group
        resetCreateForm();
        close();

        window.location.href = `group.html?id=${data.group._id}`;
    });

    // Initial groups load
    load(true);
});