// Groups page management
document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("groups-grid");
    const empty = document.getElementById("groups-empty");
    const loadMore = document.getElementById("load-more-groups");
    const modal = document.getElementById("create-group-modal");
    const form = document.getElementById("create-group-form");

    let page = 1;
    let loading = false;

    // Build search query params
    const params = () => new URLSearchParams({
        page,
        limit: 6,
        search: document.getElementById("group-search").value.trim(),
        category: document.getElementById("group-category").value
    });

    // Template for rendering a group card
    const card = group => {
        const imgHTML = group.image 
            ? `<img class="group-card-image" src="${group.image}" alt="${group.name}">` 
            : `<div class="group-card-image group-card-placeholder"><i class="bi bi-people-fill"></i></div>`;
        
        const badgeHTML = group.isPublic 
            ? '<span class="group-public-badge">Public</span>' 
            : '<span class="group-public-badge">Private</span>';
            
        let actionButtonHTML = '';
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

    /**
     * Fetch groups from the server
     */
    const load = async (reset = false) => {
        if (loading) return;
        loading = true;

        if (reset) {
            page = 1;
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
            loadMore.hidden = !data.hasMore;

            if (data.hasMore) {
                page = data.currentPage + 1;
            }
        } finally {
            loading = false;
        }
    };

    // Debounced search input handler
    let timer;
    document.getElementById("group-search").addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => load(true), 250);
    });

    // Reset pagination on category change
    document.getElementById("group-category").addEventListener("change", () => load(true));
    
    // Load more handler
    loadMore.addEventListener("click", () => load(false));

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

        if (!res.ok) return alert(data.error || "Action failed");
        load(true);
    });

    // Create Group modal show/hide triggers
    const close = () => modal.classList.remove("active");
    document.getElementById("open-create-group").onclick = () => modal.classList.add("active");
    document.getElementById("close-create-group").onclick = close;
    document.getElementById("cancel-create-group").onclick = close;
    
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
            image: document.getElementById("create-group-image").value.trim(),
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

        form.reset();
        document.getElementById("create-group-public").checked = true;
        close();
        
        // Redirect to single group page
        window.location.href = `group.html?id=${data.group._id}`;
    });

    load(true);
});
