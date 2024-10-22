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

            fetch('http://127.0.0.1:8000/api/v1/auth/login/access-token', {
                method: 'POST',
                body: data
            })
            .then(response => response.json())
            .then(result => {
                if (result.access_token) {
                    localStorage.setItem('token', result.access_token);
                    parent.location.href = '/static/index.html'; // Перенаправляем после входа
                } else {
                    alert('Неверный логин или пароль');
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

            fetch('http://127.0.0.1:8000/api/v1/users/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.id) {
                    alert('Регистрация успешна. Теперь вы можете войти.');
                    parent.location.href = '/static/pages/login.html'; // Перенаправляем на страницу входа
                } else {
                    alert('Ошибка при регистрации', true);
                }
            });
        });
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const email = prompt("Введите ваш email для восстановления пароля:");
            if (email) {
                fetch(`http://127.0.0.1:8000/api/v1/users/password-recovery/${email}`, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(result => {
                    if (result.msg) {
                        alert(result.msg);
                    } else {
                        alert('Произошла ошибка при отправке инструкций по восстановлению пароля.');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Произошла ошибка при отправке запроса на восстановление пароля.');
                });
            }
        });
    }
});
