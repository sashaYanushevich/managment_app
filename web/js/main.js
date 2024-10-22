$(document).ready(function () {
    const token = localStorage.getItem('token');

    if (token) {
        // Получаем информацию о пользователе
        $.ajax({
            url: 'http://188.124.59.90:8000/api/v1/users/me',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (user) {
                buildSidebar(user);
                $('iframe').attr('src', '/static/pages/user_profile.html');
            },
            error: function () {
                localStorage.removeItem('token');
                location.href = '/static/pages/login.html';
            }
        });
    } else {
        // Если пользователь не авторизован
        location.href = '/static/pages/login.html';
    }

    function buildSidebar(user) {
        const sidebar = $('#sidebar');
        sidebar.empty();

        sidebar.append(`
            <div class="sidebar-header">
                <h3>${user.name || user.login}</h3>
            </div>
            <ul class="nav flex-column">
                <li class="nav-item">
                    <a href="/static/pages/user_profile.html" class="nav-link" target="content-frame"><i class="fas fa-user"></i> Профиль</a>
                </li>
        `);

        if (user.is_admin) {
            sidebar.append(`
                <li class="nav-item">
                    <a href="#adminSubmenu" data-bs-toggle="collapse" class="nav-link"><i class="fas fa-user-shield"></i> Админ панель</a>
                    <ul class="collapse list-unstyled" id="adminSubmenu">
                        <li>
                            <a href="/static/pages/admin_dashboard.html" class="nav-link" target="content-frame"><i class="fas fa-users"></i> Пользователи</a>
                        </li>
                        <li>
                            <a href="/static/pages/admin_packages.html" class="nav-link" target="content-frame"><i class="fas fa-box"></i> Пакеты</a>
                        </li>
                    </ul>
                    <a href="/static/pages/user_packages.html" class="nav-link" target="content-frame"><i class="fas fa-box-open"></i> Мои пакеты</a>
                    <a href="/static/pages/servers.html" class="nav-link" target="content-frame"><i class="fas fa-box-open"></i> Мои сервера</a>
                </li>
            `);
        } else {
            sidebar.append(`
                <li class="nav-item">
                    <a href="/static/pages/user_packages.html" class="nav-link" target="content-frame"><i class="fas fa-box-open"></i> Мои пакеты</a>
                    <a href="/static/pages/servers.html" class="nav-link" target="content-frame"><i class="fas fa-box-open"></i> Мои сервера</a>
                </li>
            `);
        }

        sidebar.append(`
                <li class="nav-item">
                    <a href="#" id="logout" class="nav-link"><i class="fas fa-sign-out-alt"></i> Выйти</a>
                </li>
            </ul>
        `);

        $('#logout').on('click', function () {
            localStorage.removeItem('token');
            location.href = '/static/pages/login.html';
        });

        // Обработка кликов на пункты меню для установки активного класса
        sidebar.find('.nav-link').on('click', function () {
            sidebar.find('.nav-link').removeClass('active');
            $(this).addClass('active');
        });
    }
});
