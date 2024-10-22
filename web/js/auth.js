document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotPasswordLink = document.getElementById('forgot-password');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const data = new URLSearchParams();
            data.append('username', loginForm.login.value);
            data.append('password', loginForm.password.value);

            fetch('http://188.124.59.90:8000/api/v1/auth/login/access-token', {
                method: 'POST',
                body: data
            })
            .then(response => response.json())
            .then(result => {
                if (result.access_token) {
                    localStorage.setItem('token', result.access_token);
                    parent.location.href = '/static/index.html'; // Redirect after login
                } else {
                    alert('Invalid login or password');
                }
            });
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const data = {
                name: registerForm.name.value,
                email: registerForm.email.value,
                login: registerForm.login.value,
                password: registerForm.password.value
            };

            fetch('http://188.124.59.90:8000/api/v1/users/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.id) {
                    alert('Registration successful. You can now log in.');
                    parent.location.href = '/static/pages/login.html'; // Redirect to login page
                } else {
                    alert('Error during registration', true);
                }
            });
        });
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const email = prompt("Enter your email for password recovery:");
            if (email) {
                fetch(`http://188.124.59.90:8000/api/v1/users/password-recovery/${email}`, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(result => {
                    if (result.msg) {
                        alert(result.msg);
                    } else {
                        alert('An error occurred while sending password recovery instructions.');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while sending a password recovery request.');
                });
            }
        });
    }
});
