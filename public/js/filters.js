// --- Search & Filter Logic (Server-side integrated) ---
document.addEventListener("DOMContentLoaded", () => {
    const filterBox = document.getElementById("custom-filter");
    const searchInput = document.getElementById("feed-search-input");
    const dateStartInput = document.getElementById("filter-date-start");
    const dateEndInput = document.getElementById("filter-date-end");
    const filterTextDisplay = document.getElementById("filter-selected-text");
    const filterOptions = document.querySelectorAll(".filter-option");

    let searchTimeout = null;
    let activeTypeFilter = "all";

    // Function to get current filter values, accessible globally
    window.getPostFilters = () => ({
        search: searchInput ? searchInput.value.trim() : "",
        startDate: dateStartInput ? dateStartInput.value : "",
        endDate: dateEndInput ? dateEndInput.value : "",
        type: activeTypeFilter
    });

    // update the filter display text based on current selections
    const updateFilterDisplayUI = () => {
        if (!filterTextDisplay) return;
        const activeFilter = document.querySelector(".filter-option.selected");
        let displayText = activeFilter ? activeFilter.innerText : "All Posts";

        if (dateStartInput && dateStartInput.value && dateEndInput && dateEndInput.value) {
            displayText += ` • ${dateStartInput.value} to ${dateEndInput.value}`;
        } else if (dateStartInput && dateStartInput.value) {
            displayText += ` • From ${dateStartInput.value}`;
        } else if (dateEndInput && dateEndInput.value) {
            displayText += ` • Until ${dateEndInput.value}`;
        }

        filterTextDisplay.innerText = displayText;
    };

    // apply the current filters and trigger a reload of the posts feed
    const triggerReload = () => {
        updateFilterDisplayUI();
        if (typeof window.reloadPostsFeed === "function") {
            window.reloadPostsFeed();
        }
    };

    // manage filter box interactions and option selections
    if (filterBox) {
        const filterSelected = filterBox.querySelector(".filter-selected");

        filterSelected.addEventListener("click", () => {
            filterBox.classList.toggle("open");
        });

        filterOptions.forEach(option => {
            option.addEventListener("click", (e) => {
                e.preventDefault();
                filterOptions.forEach(opt => opt.classList.remove("selected"));
                option.classList.add("selected");
                filterBox.classList.remove("open");
                activeTypeFilter = option.dataset.value || "all";
                triggerReload();
            });
        });

        if (dateStartInput) {
            dateStartInput.addEventListener("click", (e) => e.stopPropagation());
            dateStartInput.addEventListener("change", triggerReload);
        }
        if (dateEndInput) {
            dateEndInput.addEventListener("click", (e) => e.stopPropagation());
            dateEndInput.addEventListener("change", triggerReload);
        }

        document.addEventListener("click", (e) => {
            if (!filterBox.contains(e.target)) {
                filterBox.classList.remove("open");
            }
        });

        // filter reset button logic
        document.addEventListener("click", (e) => {
            if (e.target.id === "reset-filters-btn") {
                if (searchInput) searchInput.value = "";
                if (dateStartInput) dateStartInput.value = "";
                if (dateEndInput) dateEndInput.value = "";
                activeTypeFilter = "all";
                filterOptions.forEach(o => o.classList.remove("selected"));
                document.querySelector('.filter-option[data-value="all"]')?.classList.add("selected");
                triggerReload();
            }
        });
    }

    // text input search logic with debounce to reduce reload frequency
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                triggerReload();
            }, 300);
        });
    }
});