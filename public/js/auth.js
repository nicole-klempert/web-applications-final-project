// ===== LOGIN PAGE JS ====

// ---- Log in page password toggle ----
function toggleLoginPassword() {
    // Get the password input field
    const passField = document.getElementById("password");

    // if the password field is of type password, change it to text, else change it back to password
    if (passField.type === "password") {
        passField.type = "text";
    } else {
        passField.type = "password";
    }
}

// ===== SIGNUP PAGE JS ====

// toggle password visibility for signup page
function toggleRegPasswords() {
    const pass1 = document.getElementById("new-password");
    const pass2 = document.getElementById("confirm-password");

    // flip the type of both password fields between "password" and "text"
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

    // if the second password field is empty, clear the message and remove any classes
    if (pass2.value === "") {
        message.innerHTML = "";
        pass2.classList.remove("input-error", "input-success");
        return;
    }

    // if the passwords match, show a success message and add a success class, else show an error message and add an error class
    if (pass1.value === pass2.value) {
        message.innerHTML = "Passwords match!";
        message.className = "text-success";
        pass2.classList.remove("input-error");
        pass2.classList.add("input-success");

        // else present an error 
    } else {
        message.innerHTML = "Passwords do not match";
        message.className = "text-error";
        pass2.classList.remove("input-success");
        pass2.classList.add("input-error");
    }
}

// ==== GLOBAL ALERT MESSAGES HANDLER & FORM SYSTEM ====
// main function to handle alert messages and form submissions
// listens for DOMContentLoaded  event to ensure the DOM is fully loaded before executing
document.addEventListener("DOMContentLoaded", () => {
    // Set max date for birthday picker to today to prevent future date selection
    const birthdayInput = document.getElementById("birthday");

    // if the birthday input exists, set its max attribute to today's date in YYYY-MM-DD format
    if (birthdayInput) {
        birthdayInput.max = new Date().toISOString().split("T")[0];
    }

    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const success = params.get("success");
    const authAlert = sessionStorage.getItem("authAlert");

    let container = document.querySelector("form") || document.querySelector(".main-feed");

    // if there's an error, success, or authAlert message, create and display an alert message at the top of the form or main feed
    if (error || success || authAlert) {

        // if the container exists, create a new div element for the alert message
        // additionaly set alert message class and text content based on the type of message (error, success, or authAlert)
        if (container) {
            const alertDiv = document.createElement("div");
            alertDiv.className = "alert-message";

            // if there's an error or authAlert, display it as an error message
            if (error || authAlert) {
                alertDiv.innerText = error || authAlert;
                // remove the authAlert from sessionStorage after displaying it
                if (authAlert) sessionStorage.removeItem("authAlert");

                // else if there's a success message, display it as a success message
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

        // if either the input or warning element doesn't exist, exit the function
        if (!input || !warning) return;

        // define a function to check the input value against the allowed regex pattern
        const checkInput = () => {
            const val = input.value;

            // if the input value exists and doesn't match the allowed regex pattern, 
            //display the warning and add an error class to the input
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

    // setup real-time validation for username, email, and recovery answer fields
    setupRealTimeValidation("username", "username-warning", /^[a-z0-9_.-]*$/);
    setupRealTimeValidation("new-username", "username-warning", /^[a-z0-9_.-]*$/);
    setupRealTimeValidation("email", "email-warning", /^[a-z0-9@._-]*$/);
    setupRealTimeValidation("recovery-answer", "recovery-answer-warning", /^[a-z0-9 ]*$/);

    // setup real-time validation for password fields with a regex that allows letters, numbers, and special characters
    const passwordAllowedRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/;
    setupRealTimeValidation("new-password", "new-password-warning", passwordAllowedRegex);
    setupRealTimeValidation("confirm-password", "confirm-password-warning", passwordAllowedRegex);


    // --- Initialize Universal Image Cropper ---
    if (typeof window.initImageCropper === "function") {
        // Initialize the image cropper with the specified element IDs and a callback function to handle the cropped image data
        window.initImageCropper({
            triggerId: "avatar-trigger",
            fileInputId: "profile-picture-input",
            livePreviewId: "avatar-live-preview",
            placeholderId: "avatar-placeholder",
            onCropApply: (base64String) => {
                const hiddenCroppedData = document.getElementById("cropped-profile-data");
                if (hiddenCroppedData) hiddenCroppedData.value = base64String;
                localStorage.setItem("userProfilePic", base64String);
            }
        });
    }

    // submit form with ajax
    const form = document.querySelector("form");

    // if the form exists, add an event listener for the submit event
    if (form) {

        // prevent the default form submission and handle it with AJAX
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            // remove any existing alert messages before validating and submitting the form
            const oldAlerts = form.querySelectorAll(".alert-message");
            oldAlerts.forEach(el => el.remove());

            // check for any fields with invalid format and display an alert message if found
            const invalidFields = form.querySelectorAll("[data-invalid-format='true']");

            // if there are invalid fields, create and display an alert message at the top of the form
            if (invalidFields.length > 0) {
                const alertDiv = document.createElement("div");
                alertDiv.className = "alert-message text-error input-error";
                alertDiv.innerText = "Please correct the fields with format errors (only lowercase English allowed).";
                form.insertBefore(alertDiv, form.firstChild);
                alertDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                return;
            }

            // check if the current page is the signup page and if the cropped profile picture data is missing,
            // remove any stored profile picture from localStorage
            const isSignupPage = document.getElementById("profile-picture-input");
            const hiddenCroppedData = document.getElementById("cropped-profile-data"); 
            if (isSignupPage && (!hiddenCroppedData || !hiddenCroppedData.value)) {
                localStorage.removeItem("userProfilePic");
            }

            const formData = new URLSearchParams(new FormData(form)).toString();

            try {
                // send the form data to the server using fetch API
                const response = await fetch(form.action, {
                    method: form.method || 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: formData
                });

                const result = await response.json();

                // if the response is not ok, display an error message at the top of the form
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

                    // if the entered username is not empty, save it to localStorage
                    if (enteredUser && enteredUser.trim() !== "") {
                        localStorage.setItem("loggedInUser", enteredUser.trim());
                    }

                    // if the profile picture is not empty, save it to localStorage
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