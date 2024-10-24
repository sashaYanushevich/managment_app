// user_profile.js

$(document).ready(function () {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Необходима авторизация');
        parent.location.href = 'static/pages/login.html';
    }

    const userName = $('#user-name');
    const userLogin = $('#user-login');
    const userEmail = $('#user-email');
    const avatar = $('#avatar');
    const packagesCount = $('#packages-count');
    const modemsCount = $('#modems-count');

    let currentUser = null; // Переменная для хранения данных пользователя

    // Загрузка информации о пользователе
    $.ajax({
        url: 'http://127.0.0.1:8000/api/v1/users/me',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function (user) {
            currentUser = user; // Сохраняем данные пользователя
            userName.text(user.name || user.login);
            userLogin.text(user.login);
            userEmail.text(user.email || 'Не указано');
            avatar.attr('src', user.avatar_url || '/static/img/avatar.png');

            // Загрузка статистики
            loadStatistics();
        }
    });

    function loadStatistics() {
        // Получаем количество пакетов
        $.ajax({
            url: 'http://127.0.0.1:8000/api/v1/packages/my',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (packages) {
                packagesCount.text(packages.length);

                // Считаем общее количество модемов
                let totalModems = 0;
                packages.forEach(pkg => {
                    totalModems += pkg.max_modems;
                });
                modemsCount.text(totalModems);
            }
        });
    }

    // Инициализация модального окна
    const profileModalElement = document.getElementById('profile-modal');
    const profileModal = new bootstrap.Modal(profileModalElement,{
        backdrop: false
    });

    // Обработчик кнопки "Редактировать профиль"
    $('#edit-profile').on('click', function () {
        // Заполняем форму текущими данными
        $('#profile-name').val(currentUser.name || '');
        $('#profile-email').val(currentUser.email || '');

        // Открываем модальное окно
        profileModal.show();
    });

    // Обработчик формы редактирования профиля
    $('#profile-form').on('submit', function (e) {
        e.preventDefault();


        const data = {
            email: $('#profile-email').val(),
            name: $('#profile-name').val(),
            password: $('#profile-password').val()
        };
        const avatarFile = $('#profile-avatar')[0].files[0];
        // if (avatarFile) {
        //     formData.append('avatar', avatarFile);
        // }

        $.ajax({
            url: 'http://127.0.0.1:8000/api/v1/users/me',
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(data),
            success: function () {
                alert('Профиль обновлен');
                profileModal.hide();
                location.reload();
            },
            error: function (xhr, status, error) {
                console.error('Ошибка при обновлении профиля:', error);
                alert('Ошибка при обновлении профиля');
            }
        });
    });
});
