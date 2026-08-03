// ===== LOGIN PAGE JS ====

// ---- Log in page password toggle ----
function toggleLoginPassword() {
    const passField = document.getElementById("password");
    if (passField.type === "password") {
        passField.type = "text";
    } else {
        passField.type = "password";
    }
}

// ===== SIGNUP PAGE JS ====
function toggleRegPasswords() {
    const pass1 = document.getElementById("new-password");
    const pass2 = document.getElementById("confirm-password");

    if (pass1.type === "password") {
        pass1.type = "text";
        pass2.type = "text";
    } else {
        pass1.type = "password";
        pass2.type = "password";
    }
}

// check if passwords match
function checkPasswordsMatch() {
    const pass1 = document.getElementById("new-password");
    const pass2 = document.getElementById("confirm-password");
    const message = document.getElementById("password-match-message");

    if (pass2.value === "") {
        message.innerHTML = "";
        pass2.classList.remove("input-error", "input-success");
        return;
    }

    if (pass1.value === pass2.value) {
        message.innerHTML = "Passwords match!";
        message.className = "text-success";
        pass2.classList.remove("input-error");
        pass2.classList.add("input-success");
    } else {
        message.innerHTML = "Passwords do not match";
        message.className = "text-error";
        pass2.classList.remove("input-success");
        pass2.classList.add("input-error");
    }
}

// ==== GLOBAL ALERT MESSAGES HANDLER & FORM SYSTEM ====
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const success = params.get("success");
    const authAlert = sessionStorage.getItem("authAlert");

    let container = document.querySelector("form") || document.querySelector(".main-feed");

    if (error || success || authAlert) {
        if (container) {
            const alertDiv = document.createElement("div");
            alertDiv.className = "alert-message";

            if (error || authAlert) {
                alertDiv.innerText = error || authAlert;
                if (authAlert) sessionStorage.removeItem("authAlert");
            } else if (success) {
                alertDiv.classList.add("success");
                alertDiv.innerText = success;
            }

            container.insertBefore(alertDiv, container.firstChild);
        }
    }

    // real-time input validators for lowercase english patterns
    const setupRealTimeValidation = (inputId, warningId, allowedRegex) => {
        const input = document.getElementById(inputId);
        const warning = document.getElementById(warningId);
        if (!input || !warning) return;

        const checkInput = () => {
            const val = input.value;
            if (val && !allowedRegex.test(val)) {
                warning.style.display = "block";
                input.classList.add("input-error");
                input.dataset.invalidFormat = "true";
            } else {
                warning.style.display = "none";
                input.classList.remove("input-error");
                delete input.dataset.invalidFormat;
            }
        };

        input.addEventListener("input", checkInput);
        input.addEventListener("blur", checkInput);
    };

    setupRealTimeValidation("username", "username-warning", /^[a-z0-9_.-]*$/);
    setupRealTimeValidation("new-username", "username-warning", /^[a-z0-9_.-]*$/);
    setupRealTimeValidation("email", "email-warning", /^[a-z0-9@._-]*$/);
    setupRealTimeValidation("recovery-answer", "recovery-answer-warning", /^[a-z0-9 ]*$/);

    const passwordAllowedRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/;
    setupRealTimeValidation("new-password", "new-password-warning", passwordAllowedRegex);
    setupRealTimeValidation("confirm-password", "confirm-password-warning", passwordAllowedRegex);

    // Avatar upload and cropping functionality
    const avatarTrigger = document.getElementById("avatar-trigger");
    const fileInput = document.getElementById("profile-picture-input");
    const cropModal = document.getElementById("crop-modal-overlay");
    const cropCanvas = document.getElementById("crop-canvas");
    const zoomSlider = document.getElementById("zoom-slider");
    const cancelCropBtn = document.getElementById("cancel-crop-btn");
    const saveCropBtn = document.getElementById("save-crop-btn");
    const livePreviewImg = document.getElementById("avatar-live-preview");
    const avatarPlaceholder = document.getElementById("avatar-placeholder");
    const hiddenCroppedData = document.getElementById("cropped-profile-data");

    let sourceImage = null;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    if (avatarTrigger && fileInput) {
        avatarTrigger.addEventListener("click", () => {
            fileInput.click();
        });

        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    sourceImage = img;
                    offsetX = 0;
                    offsetY = 0;
                    if (zoomSlider) zoomSlider.value = "1";
                    drawCropCanvas();
                    if (cropModal) cropModal.style.display = "flex";
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        const drawCropCanvas = () => {
            if (!cropCanvas || !sourceImage) return;
            const ctx = cropCanvas.getContext("2d");
            const width = cropCanvas.width;
            const height = cropCanvas.height;

            ctx.clearRect(0, 0, width, height);

            const zoom = parseFloat(zoomSlider ? zoomSlider.value : 1);
            const baseScale = Math.max(width / sourceImage.width, height / sourceImage.height);
            const finalScale = baseScale * zoom;

            const drawWidth = sourceImage.width * finalScale;
            const drawHeight = sourceImage.height * finalScale;

            const x = (width - drawWidth) / 2 + offsetX;
            const y = (height - drawHeight) / 2 + offsetY;

            ctx.save();
            ctx.drawImage(sourceImage, x, y, drawWidth, drawHeight);
            ctx.restore();
        };

        if (zoomSlider) {
            zoomSlider.addEventListener("input", drawCropCanvas);
        }

        if (cropCanvas) {
            cropCanvas.addEventListener("mousedown", (e) => {
                isDragging = true;
                startX = e.clientX - offsetX;
                startY = e.clientY - offsetY;
            });

            window.addEventListener("mousemove", (e) => {
                if (!isDragging) return;
                offsetX = e.clientX - startX;
                offsetY = e.clientY - startY;
                drawCropCanvas();
            });

            window.addEventListener("mouseup", () => {
                isDragging = false;
            });
        }

        if (cancelCropBtn) {
            cancelCropBtn.addEventListener("click", () => {
                cropModal.style.display = "none";
                fileInput.value = "";
            });
        }

        // save cropped avatar and display live preview
        if (saveCropBtn) {
            saveCropBtn.addEventListener("click", () => {
                if (!cropCanvas) return;

                // create a smaller canvas to resize the cropped image to 120x120
                const smallCanvas = document.createElement("canvas");
                smallCanvas.width = 120;
                smallCanvas.height = 120;
                const smallCtx = smallCanvas.getContext("2d");
                smallCtx.drawImage(cropCanvas, 0, 0, 120, 120);

                // downscale the image to reduce file size and convert to base64
                const croppedBase64 = smallCanvas.toDataURL("image/jpeg", 0.75);

                // show inside the circular trigger button
                if (livePreviewImg && avatarPlaceholder) {
                    livePreviewImg.src = croppedBase64;
                    livePreviewImg.style.display = "block";
                    avatarPlaceholder.style.display = "none";
                    avatarTrigger.style.borderStyle = "solid";
                }

                if (hiddenCroppedData) {
                    hiddenCroppedData.value = croppedBase64;
                }

                localStorage.setItem("userProfilePic", croppedBase64);
                cropModal.style.display = "none";
            });
        }
    }

    // submit form with ajax
    const form = document.querySelector("form");
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const oldAlerts = form.querySelectorAll(".alert-message");
            oldAlerts.forEach(el => el.remove());

            const invalidFields = form.querySelectorAll("[data-invalid-format='true']");
            if (invalidFields.length > 0) {
                const alertDiv = document.createElement("div");
                alertDiv.className = "alert-message text-error input-error";
                alertDiv.innerText = "Please correct the fields with format errors (only lowercase English allowed).";
                form.insertBefore(alertDiv, form.firstChild);
                alertDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                return;
            }

            const isSignupPage = document.getElementById("profile-picture-input");
            if (isSignupPage && (!hiddenCroppedData || !hiddenCroppedData.value)) {
                localStorage.removeItem("userProfilePic");
            }

            const formData = new URLSearchParams(new FormData(form)).toString();

            try {
                const response = await fetch(form.action, {
                    method: form.method || 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: formData
                });

                const result = await response.json();

                if (!response.ok) {
                    const alertDiv = document.createElement("div");
                    alertDiv.className = "alert-message text-error input-error";
                    alertDiv.innerText = result.error || "An error occurred. Please try again.";
                    form.insertBefore(alertDiv, form.firstChild);
                    alertDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else if (result.redirect) {
                    // save username and profile picture to localStorage for later use
                    const enteredUser = (result.username || result.user || "") ||
                        (document.getElementById("username")?.value ||
                            document.getElementById("new-username")?.value ||
                            document.getElementById("email")?.value ||
                            form.querySelector("input[type='text'], input[type='email']")?.value ||
                            "User");

                    if (enteredUser && enteredUser.trim() !== "") {
                        localStorage.setItem("loggedInUser", enteredUser.trim());
                    }

                    if (result.profilePicture && result.profilePicture.trim() !== "") {
                        localStorage.setItem("userProfilePic", result.profilePicture);
                    }

                    window.location.href = result.redirect;
                }
            } catch (err) {
                console.error("AJAX submission failed:", err);
                const alertDiv = document.createElement("div");
                alertDiv.className = "alert-message text-error input-error";
                alertDiv.innerText = "Network connection error. Please try again later.";
                form.insertBefore(alertDiv, form.firstChild);
            }
        });
    }
});