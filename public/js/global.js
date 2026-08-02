// --- Main App Logic (Dark Mode, User, Logout) ---
document.addEventListener("DOMContentLoaded", () => {
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    const body = document.body;

    const updateDarkModeUI = () => {
        const isDark = body.classList.contains("dark-mode");
        const icon = document.getElementById("dark-mode-icon");
        const text = document.getElementById("dark-mode-text");

        if (icon && text) {
            if (isDark) {
                icon.classList.replace("bi-moon-stars", "bi-sun-fill");
                text.innerText = "Light Mode";
            } else {
                icon.classList.replace("bi-sun-fill", "bi-moon-stars");
                text.innerText = "Dark Mode";
            }
        }
    };

    // check if the user saved a previous choice in local storage
    if (localStorage.getItem("darkMode") === "enabled") {
        body.classList.add("dark-mode");
    }
    updateDarkModeUI();

    if (darkModeToggle) {
        darkModeToggle.addEventListener("click", (e) => {
            e.preventDefault();
            body.classList.toggle("dark-mode");
            updateDarkModeUI();

            // save the choice
            if (body.classList.contains("dark-mode")) {
                localStorage.setItem("darkMode", "enabled");
            } else {
                localStorage.setItem("darkMode", "disabled");
            }
        });
    }

    // --- User Display Logic ---
    const userNameDisplay = document.getElementById("nav-user-name");
    const userHandleDisplay = document.getElementById("nav-user-handle");
    const userAvatarDisplay = document.getElementById("nav-user-avatar");

    if (userNameDisplay) {
        // fetch user data (to be replaced later with actual fetch from the server)
        const loggedInUser = localStorage.getItem("loggedInUser") || "User";
        userNameDisplay.textContent = loggedInUser;
        userHandleDisplay.textContent = "@" + loggedInUser.toLowerCase().replace(/\s/g, '');
        userAvatarDisplay.textContent = loggedInUser.substring(0, 2).toUpperCase();
    }

    // --- Logout Confirmation Logic (Custom Modal) ---
    const logoutBtnTrigger = document.getElementById("logout-btn-trigger");
    const logoutModal = document.getElementById("logout-confirm-modal");
    const confirmLogoutBtn = document.getElementById("confirm-logout-btn");
    const cancelLogoutBtn = document.getElementById("cancel-logout-btn");

    if (logoutBtnTrigger && logoutModal) {
        logoutBtnTrigger.addEventListener("click", (e) => {
            // prevent immediate navigation
            e.preventDefault();
            logoutModal.classList.add("active");
        });

        if (cancelLogoutBtn) {
            cancelLogoutBtn.addEventListener("click", () => {
                logoutModal.classList.remove("active");
            });
        }

        if (confirmLogoutBtn) {
            confirmLogoutBtn.addEventListener("click", () => {
                // clear the saved username
                localStorage.removeItem("loggedInUser");
                // redirect back to the login screen (url can be changed if needed)
                window.location.href = "login.html";
            });
        }
    }
});