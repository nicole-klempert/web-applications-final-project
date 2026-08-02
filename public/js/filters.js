// --- Search & Filter Logic (3 Parameters Requirement: Text, Type, Date Range) ---
document.addEventListener("DOMContentLoaded", () => {
    const filterBox = document.getElementById("custom-filter");
    const searchInput = document.getElementById("feed-search-input");
    const dateStartInput = document.getElementById("filter-date-start");
    const dateEndInput = document.getElementById("filter-date-end");
    const filterTextDisplay = document.getElementById("filter-selected-text");

    const updateFilterDisplayUI = () => {
        if (!filterTextDisplay) return;
        const activeFilter = document.querySelector(".filter-option.selected");
        let displayText = activeFilter ? activeFilter.innerText : "All Posts";

        // append date range to the display string if applicable
        if (dateStartInput && dateStartInput.value && dateEndInput && dateEndInput.value) {
            displayText += ` • ${dateStartInput.value} to ${dateEndInput.value}`;
        } else if (dateStartInput && dateStartInput.value) {
            displayText += ` • From ${dateStartInput.value}`;
        } else if (dateEndInput && dateEndInput.value) {
            displayText += ` • Until ${dateEndInput.value}`;
        }

        filterTextDisplay.innerText = displayText;
    };

    const filterPosts = () => {
        const activeOption = document.querySelector(".filter-option.selected");
        const activeFilter = activeOption ? activeOption.dataset.value : "all";
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
        const searchDateStart = dateStartInput ? dateStartInput.value : "";
        const searchDateEnd = dateEndInput ? dateEndInput.value : "";

        const posts = document.querySelectorAll(".post-card");

        posts.forEach(post => {
            const postType = post.dataset.postType || "text";
            const postDate = post.dataset.postDate || "";
            const postText = post.querySelector(".post-text")?.innerText.toLowerCase() || "";
            const postAuthor = post.querySelector(".post-author")?.innerText.toLowerCase() || "";

            const matchesFilter = (activeFilter === "all") || (activeFilter === postType);
            const matchesSearch = postText.includes(searchTerm) || postAuthor.includes(searchTerm);

            // simple string comparison works perfectly for standard ISO dates (YYYY-MM-DD)
            let matchesDate = true;
            if (searchDateStart && postDate < searchDateStart) matchesDate = false;
            if (searchDateEnd && postDate > searchDateEnd) matchesDate = false;

            if (matchesFilter && matchesSearch && matchesDate) {
                post.style.display = "flex";
            } else {
                post.style.display = "none";
            }
        });

        updateFilterDisplayUI();
    };

    // expose the filter function to the window so it can be called upon creating a new post
    window.forceFilterUpdate = filterPosts;

    if (filterBox) {
        const filterSelected = filterBox.querySelector(".filter-selected");
        const filterOptions = filterBox.querySelectorAll(".filter-option");

        filterSelected.addEventListener("click", () => {
            filterBox.classList.toggle("open");
        });

        filterOptions.forEach(option => {
            option.addEventListener("click", () => {
                filterOptions.forEach(opt => opt.classList.remove("selected"));
                option.classList.add("selected");
                filterBox.classList.remove("open");
                filterPosts();
            });
        });

        // ensure clicking inside date inputs doesn't close the menu
        if (dateStartInput) {
            dateStartInput.addEventListener("click", (e) => e.stopPropagation());
            dateStartInput.addEventListener("change", filterPosts);
        }
        if (dateEndInput) {
            dateEndInput.addEventListener("click", (e) => e.stopPropagation());
            dateEndInput.addEventListener("change", filterPosts);
        }

        document.addEventListener("click", (e) => {
            if (!filterBox.contains(e.target)) {
                filterBox.classList.remove("open");
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", filterPosts);
    }
});