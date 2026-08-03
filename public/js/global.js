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

    // --- User Display Logic (Dynamic Avatar & Profile Picture Anywhere in App) ---
    const loggedInUser = localStorage.getItem("loggedInUser") || "Guest User";
    const savedProfilePic = localStorage.getItem("userProfilePic");

    // update the user name and handle in the navbar and account card
    const userNameDisplay = document.getElementById("nav-user-name") || document.querySelector(".account-card .name");
    const userHandleDisplay = document.getElementById("nav-user-handle") || document.querySelector(".account-card .handle");

    if (userNameDisplay) {
        userNameDisplay.textContent = loggedInUser;
    }
    if (userHandleDisplay) {
        userHandleDisplay.textContent = "@" + loggedInUser.toLowerCase().replace(/\s/g, '');
    }

    // function to update the avatar element based on saved profile picture or initials
    const updateAvatarElement = (avatarEl) => {
        if (!avatarEl) return;

        if (savedProfilePic && savedProfilePic.trim() !== "") {
            // if there's a saved profile picture, display it
            avatarEl.innerHTML = `<img src="${savedProfilePic}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`;
            avatarEl.style.background = "transparent";
            avatarEl.style.border = "1px solid var(--border-color)";
        } else {
            // if no profile picture, display initials with a purple background
            const names = loggedInUser.trim().split(" ");
            let initials = names.length >= 2 ? (names[0][0] + names[1][0]).toUpperCase() : loggedInUser.substring(0, 2).toUpperCase();
            avatarEl.textContent = initials;

            avatarEl.classList.remove("avatar-blue", "avatar-muted");
            avatarEl.classList.add("avatar-purple");
        }
    };

    // update all avatar elements in the app (navbar, account card, composer placeholder)
    updateAvatarElement(document.getElementById("nav-user-avatar"));
    updateAvatarElement(document.querySelector(".account-card .avatar"));
    updateAvatarElement(document.querySelector(".composer-placeholder .avatar"));

    // --- Back to Top Button Logic ---
    const backToTopBtn = document.getElementById("back-to-top");
    if (backToTopBtn) {
        window.addEventListener("scroll", () => {
            // check the scroll position and toggle the visibility of the back-to-top button
            const scrollPosition = window.scrollY || document.documentElement.scrollTop;
            if (scrollPosition > 250) {
                backToTopBtn.classList.add("show");
            } else {
                backToTopBtn.classList.remove("show");
            }
        });

        backToTopBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
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
                // clear saved username and profile picture on logout
                localStorage.removeItem("loggedInUser");
                localStorage.removeItem("userProfilePic");
                // redirect back to the login screen
                window.location.href = "login.html";
            });
        }
    }
});