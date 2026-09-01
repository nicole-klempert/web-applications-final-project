// --- Search & Filter Logic (Server-side integrated) ---
document.addEventListener("DOMContentLoaded", () => {
    const filterBox = document.getElementById("custom-filter");
    const searchInput = document.getElementById("feed-search-input");
    const authorInput = document.getElementById("feed-author-input");
    const groupInput = document.getElementById("feed-group-input");
    const dateStartInput = document.getElementById("filter-date-start");
    const dateEndInput = document.getElementById("filter-date-end");
    const filterTextDisplay = document.getElementById("filter-selected-text");
    const filterOptions = document.querySelectorAll(".filter-option");

    let searchTimeout = null;
    let activeTypeFilter = "all";
    let activeFeedScopes = ["all"]; // Array to allow multiple selections

    // --- Handling Multi-Select Top Tabs (All / Friends / Groups) ---
    const scopeTabs = document.querySelectorAll("#feed-scope-tabs .tab");

    // Initialize the active state based on the default selection
    if (scopeTabs.length > 0) {
        scopeTabs.forEach(tab => {
            tab.addEventListener("click", () => {
                const scope = tab.dataset.scope;

                if (scope === "all") {
                    // Reset to just 'all'
                    activeFeedScopes = ["all"];
                } else {
                    // Remove 'all' if it's currently there
                    activeFeedScopes = activeFeedScopes.filter(s => s !== "all");

                    // Toggle the clicked scope (Friends / Groups)
                    if (activeFeedScopes.includes(scope)) {
                        activeFeedScopes = activeFeedScopes.filter(s => s !== scope);
                    } else {
                        activeFeedScopes.push(scope);
                    }

                    // If everything was deselected, revert to 'all'
                    if (activeFeedScopes.length === 0) {
                        activeFeedScopes = ["all"];
                    }
                }

                // Update UI classes
                scopeTabs.forEach(t => {
                    if (activeFeedScopes.includes(t.dataset.scope)) {
                        t.classList.add("active");
                    } else {
                        t.classList.remove("active");
                    }
                });

                triggerReload();
            });
        });
    }

    // Function to get current filter values, accessible globally
    window.getPostFilters = () => ({
        search: searchInput ? searchInput.value.trim() : "",
        author: authorInput ? authorInput.value.trim() : "",
        group: groupInput ? groupInput.value.trim() : "",
        startDate: dateStartInput ? dateStartInput.value : "",
        endDate: dateEndInput ? dateEndInput.value : "",
        type: activeTypeFilter,
        feedScopes: activeFeedScopes.join(","), // send as "friends,groups"
        currentUser: localStorage.getItem("loggedInUser") || ""
    });

    // update the filter display text based on current selections
    const updateFilterDisplayUI = () => {

        // if no filter display element, exit early
        if (!filterTextDisplay) return;
        const activeFilter = document.querySelector(".filter-option.selected");
        let displayText = activeFilter ? activeFilter.innerText : "All Posts";

        // if author or group inputs have values, append them to the display text
        if (authorInput && authorInput.value.trim()) {
            displayText += ` • Author: ${authorInput.value.trim()}`;
        }

        // if group input has a value, append it to the display text
        if (groupInput && groupInput.value.trim()) {
            displayText += ` • Group: ${groupInput.value.trim()}`;
        }

        // if date inputs have values, append them to the display text
        if (dateStartInput && dateStartInput.value && dateEndInput && dateEndInput.value) {
            displayText += ` • ${dateStartInput.value} to ${dateEndInput.value}`;

            // else if only one of the date inputs has a value, append that to the display text
        } else if (dateStartInput && dateStartInput.value) {
            displayText += ` • From ${dateStartInput.value}`;

            // else if only the end date input has a value, append that to the display text
        } else if (dateEndInput && dateEndInput.value) {
            displayText += ` • Until ${dateEndInput.value}`;
        }

        filterTextDisplay.innerText = displayText;
    };

    // apply the current filters and trigger a reload of the posts feed
    const triggerReload = () => {
        const startVal = dateStartInput ? dateStartInput.value : "";
        const endVal = dateEndInput ? dateEndInput.value : "";

        // validate that the start date is not later than the end date
        if (startVal && endVal && new Date(startVal) > new Date(endVal)) {
            alert("Filter Start date cannot be later than End date.");
            if (dateEndInput) dateEndInput.value = "";
            return;
        }

        updateFilterDisplayUI();

        // if a global function to reload the posts feed exists, call it
        if (typeof window.reloadPostsFeed === "function") {
            window.reloadPostsFeed();
        }
    };

    // manage filter box interactions and option selections
    if (filterBox) {
        const filterSelected = filterBox.querySelector(".filter-selected");

        // toggle the filter dropdown when the selected filter is clicked
        filterSelected.addEventListener("click", () => {
            filterBox.classList.toggle("open");
        });

        // handle filter option selection and update the active filter type
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

        // prevent the date inputs from closing the filter dropdown when clicked and trigger reload on change
        if (dateStartInput) {
            dateStartInput.addEventListener("click", (e) => e.stopPropagation());
            dateStartInput.addEventListener("change", triggerReload);
        }

        //  prevent the date inputs from closing the filter dropdown when clicked and trigger reload on change
        if (dateEndInput) {
            dateEndInput.addEventListener("click", (e) => e.stopPropagation());
            dateEndInput.addEventListener("change", triggerReload);
        }

        // close the filter dropdown if a click occurs outside of it
        document.addEventListener("click", (e) => {
            if (!filterBox.contains(e.target)) {
                filterBox.classList.remove("open");
            }
        });

        // filter reset button logic
        document.addEventListener("click", (e) => {

            // check if the clicked element is the reset button
            if (e.target.id === "reset-filters-btn") {
                // reset all filter inputs and selections to their default states
                if (searchInput) searchInput.value = "";
                if (authorInput) authorInput.value = "";
                if (groupInput) groupInput.value = "";
                if (dateStartInput) dateStartInput.value = "";
                if (dateEndInput) dateEndInput.value = "";
                activeTypeFilter = "all";
                filterOptions.forEach(o => o.classList.remove("selected"));
                document.querySelector('.filter-option[data-value="all"]')?.classList.add("selected");
                triggerReload();
            }
        });
    }

    // debounce function to limit the frequency of reloads during rapid input changes
    const triggerDebouncedReload = () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            triggerReload();
        }, 300);
    };

    // text input search logic with debounce to reduce reload frequency
    if (searchInput) {
        searchInput.addEventListener("input", triggerDebouncedReload);
    }

    // text input author filter logic with debounce to reduce reload frequency
    if (authorInput) {
        authorInput.addEventListener("input", triggerDebouncedReload);
    }

    // text input group filter logic with debounce to reduce reload frequency
    if (groupInput) {
        groupInput.addEventListener("input", triggerDebouncedReload);
    }
});