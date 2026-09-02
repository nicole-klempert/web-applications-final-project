// Groups page management
document.addEventListener("DOMContentLoaded", () => {
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

    // Build search query params
    const params = () => new URLSearchParams({
        page,
        limit: 6,
        search: searchInput.value.trim(),
        category: categoryInput.value
    });

    // Template for rendering a group card
    const card = group => {
        const imgHTML = group.image
            ? `<img class="group-card-image" src="${group.image}" alt="${group.name}">`
            : `<div class="group-card-image group-card-placeholder"><i class="bi bi-people-fill"></i></div>`;

        const badgeHTML = group.isPublic
            ? '<span class="group-public-badge">Public</span>'
            : '<span class="group-public-badge">Private</span>';

        let actionButtonHTML = "";

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

    const load = async (reset = false) => {
        if (loading) return;
        if (!reset && !hasMore) return;

        loading = true;

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

            grid.insertAdjacentHTML("beforeend", data.groups.map(card).join(""));
            empty.hidden = grid.children.length > 0;
            hasMore = data.hasMore;

            if (data.hasMore) {
                page = data.currentPage + 1;
            }
        } finally {
            loading = false;

            if (hasMore && sentinel.getBoundingClientRect().top <= window.innerHeight + 300) {
                setTimeout(() => load(false), 0);
            }
        }
    };

    // Search groups
    let timer;

    searchInput.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => load(true), 250);
    });

    // Category dropdown
    categorySelected.addEventListener("click", e => {
        e.stopPropagation();
        categoryFilter.classList.toggle("open");
    });

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

    // Automatically load more groups when reaching the bottom
    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
            load(false);
        }
    }, {
        rootMargin: "300px 0px"
    });

    observer.observe(sentinel);

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

        load(true);
    });

    // Group image picker
    const resetImagePicker = () => {
        imageFileInput.value = "";
        imageInput.value = "";
        imagePreview.src = "";
        imagePreview.style.display = "none";
        imagePlaceholder.style.display = "flex";
    };

    imageTrigger.addEventListener("click", () => {
        imageFileInput.click();
    });

    imageFileInput.addEventListener("change", () => {
        const file = imageFileInput.files[0];

        if (!file) return;

        const error = document.getElementById("create-group-error");

        if (!file.type.startsWith("image/")) {
            error.textContent = "Please choose an image file";
            resetImagePicker();
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            error.textContent = "Image cannot exceed 5MB";
            resetImagePicker();
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            imageInput.value = reader.result;
            imagePreview.src = reader.result;
            imagePreview.style.display = "block";
            imagePlaceholder.style.display = "none";
            error.textContent = "";
        };

        reader.readAsDataURL(file);
    });

    // Create Group modal
    const close = () => {
        modal.classList.remove("active");
    };

    const resetCreateForm = () => {
        form.reset();
        document.getElementById("create-group-public").checked = true;
        document.getElementById("create-group-error").textContent = "";
        resetImagePicker();
    };

    document.getElementById("open-create-group").onclick = () => {
        resetCreateForm();
        modal.classList.add("active");
    };

    document.getElementById("close-create-group").onclick = close;

    modal.addEventListener("click", e => {
        if (e.target === modal) close();
    });

    // Form submit for group creation
    form.addEventListener("submit", async e => {
        e.preventDefault();

        const error = document.getElementById("create-group-error");
        error.textContent = "";

        const body = {
            name: document.getElementById("create-group-name").value.trim(),
            description: document.getElementById("create-group-description").value.trim(),
            category: document.getElementById("create-group-category").value,
            image: imageInput.value,
            isPublic: document.getElementById("create-group-public").checked
        };

        if (!body.name) {
            error.textContent = "Group name is required";
            return;
        }

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

        resetCreateForm();
        close();

        window.location.href = `group.html?id=${data.group._id}`;
    });

    load(true);
});