$(document).ready(function () {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Необходима авторизация');
        parent.location.href = '../pages/login.html';
    }

    const usersTableBody = $('#users-table tbody');
    const addUserButton = $('#add-user');
    const userModal = $('#user-modal');
    const userForm = $('#user-form');
    const modalTitle = $('#modal-title');
    const closeButton = $('.close-button');

    // Функция для загрузки пользователей
    function loadUsers(query = '') {
        $.ajax({
            url: 'http://188.124.59.90:8000/api/v1/users/',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            data: {
                search: query
            },
            success: function (users) {
                usersTableBody.empty();
                users.forEach(user => {
                    const row = `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.login}</td>
                            <td>${user.email || ''}</td>
                            <td>${user.name || ''}</td>
                            <td>${user.is_active ? 'Active' : 'Deactive'}</td>
                            <td>
                                <button class="btn btn-sm btn-primary edit-user" data-id="${user.id}"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                    usersTableBody.append(row);
                });

                // Добавляем обработчики для кнопок редактирования и удаления
                $('.edit-user').on('click', function () {
                    const userId = $(this).data('id');
                    openUserModal(userId);
                });

                $('.delete-user').on('click', function () {
                    const userId = $(this).data('id');
                    if (confirm('Вы уверены, что хотите удалить пользователя?')) {
                        deleteUser(userId);
                    }
                });
            }
        });
    }

    // Поиск
    $('#search-button').on('click', function () {
        const query = $('#search-input').val();
        loadUsers(query);
    });

    // Нагрузка пользователей при загрузке страницы
    loadUsers();

    function openUserModal(userId = null) {
        if (userId) {
            // Редактирование пользователя
            modalTitle.text('Редактировать пользователя');
            fetch(`http://188.124.59.90:8000/api/v1/users/get?id=${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(user => {
                userForm.find('[name="user-id"]').val(user.id);
                userForm.find('[name="login"]').val(user.login);
                userForm.find('[name="email"]').val(user.email || '');
                userForm.find('[name="name"]').val(user.name || '');
                userForm.find('[name="is_active"]').prop('checked', user.is_active);
                userForm.find('[name="password"]').val(''); // Очищаем поле пароля
            });
        } else {
            // Добавление нового пользователя
            modalTitle.text('Добавить пользователя');
            userForm.trigger('reset');
            userForm.find('[name="user-id"]').val('');
            userForm.find('[name="is_active"]').prop('checked', true); // Устанавливаем статус по умолчанию
        }
        userModal.css('display', 'block');
    }

    // Функция для закрытия модального окна
    function closeUserModal() {
        userModal.css('display', 'none');
    }

    // Функция для удаления пользователя
    function deleteUser(userId) {
        fetch(`http://188.124.59.90:8000/api/v1/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(() => {
            alert('Пользователь удален');
            loadUsers();
        })
        .catch(error => {
            console.error('Ошибка при удалении пользователя:', error);
            alert('Ошибка при удалении пользователя');
        });
    }

    userForm.on('submit', function(e) {
        e.preventDefault();
    
        const userId = userForm.find('[name="user-id"]').val();
        const data = {
            login: userForm.find('[name="login"]').val(),
            email: userForm.find('[name="email"]').val(),
            name: userForm.find('[name="name"]').val(),
            is_active: userForm.find('[name="is_active"]').is(':checked'),
        };
    
        if (userForm.find('[name="password"]').val()) {
            data.password = userForm.find('[name="password"]').val();
        }
    
        const method = userId ? 'PUT' : 'POST';
        const url = userId ? `http://188.124.59.90:8000/api/v1/users/${userId}` : 'http://188.124.59.90:8000/api/v1/users/';
    
        console.log('Метод запроса:', method);
        console.log('URL запроса:', url);
    
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (response.ok) {
                closeUserModal();
                alert('Данные пользователя сохранены');
                loadUsers();
            } else {
                return response.json().then(errorData => {
                    throw new Error(errorData.detail || 'Ошибка при сохранении данных');
                });
            }
        })
        .catch(error => {
            console.error('Ошибка при сохранении пользователя:', error);
            alert(error.message);
        });
    });
    
    // Обработчики для открытия и закрытия модального окна
    addUserButton.on('click', function() {
        openUserModal();
    });

    closeButton.on('click', closeUserModal);

    $(window).on('click', function(e) {
        if ($(e.target).is(userModal)) {
            closeUserModal();
        }
    });
});
