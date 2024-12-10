$(document).ready(function () {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Authentication required');
        parent.location.href = '../pages/login.html';
    }

    const usersTableBody = $('#users-table tbody');
    const addUserButton = $('#add-user');
    const userModal = $('#user-modal');
    const userForm = $('#user-form');
    const modalTitle = $('#modal-title');
    const closeButton = $('.close-button');
    const changePasswordModal = $('#change-password-modal');
    const changePasswordForm = $('#change-password-form');

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
                            <td>${user.name || ''}</td>
                            <td>${user.email || ''}</td>
                            <td>${user.is_active ? 'Active' : 'Deactive'}</td>
                            <td class="d-flex gap-1">
                                <button class="btn btn-sm btn-primary edit-user" data-id="${user.id}" style="width: 32px; height: 32px; padding: 0;">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-warning change-password" data-id="${user.id}" style="width: 32px; height: 32px; padding: 0;">
                                    <i class="fas fa-key"></i>
                                </button>
                                <button class="btn btn-sm btn-info import-data" data-id="${user.id}" style="width: 32px; height: 32px; padding: 0;">
                                    <i class="fas fa-file-import"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}" style="width: 32px; height: 32px; padding: 0;">
                                    <i class="fas fa-trash"></i>
                                </button>
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

                // Add click handlers for the buttons
                $('.change-password').on('click', function() {
                    const userId = $(this).data('id');
                    openChangePasswordModal(userId);
                });

                $('.import-data').on('click', function() {
                    const userId = $(this).data('id');
                    $('#import-user-id').val(userId);
                    
                    // Устанавливаем пример данных с правильными отступами
                    const exampleData = 
`package_id: pkg316babc0
start_date: 2024-12-04
expiry: 2025-12-04
max_modems: 100
servers:
  - name: nim
    modems: 50
    MachineData: n_cpu=2,rootfs=51340,mem=3798,bios_uuid=03aa02fc-0414-059d-e006-2a0700080009
  - name: nim2
    modems: 40
    MachineData: n_cpu=2,rootfs=51340,mem=3798,bios_uuid=03aa02fc-0414-059d-e006-2a0700080009`;

                    // Устанавливаем данные в поле ввода
                    $('#import-data').val(exampleData);
                    
                    $('#import-modal').css('display', 'block');
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
            // Edit user
            modalTitle.text('Edit User');
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
                userForm.find('[name="login"]').val(user.login); // Set login field for editing
                userForm.find('[name="email"]').val(user.email || '');
                userForm.find('[name="name"]').val(user.name || '');
                userForm.find('[name="status"]').val(user.is_active ? 'active' : 'inactive'); // Set status correctly
                userForm.find('[name="password"]').val(''); // Clear password field
            });
        } else {
            // Add new user
            modalTitle.text('Add User');
            userForm.trigger('reset');
            userForm.find('[name="user-id"]').val('');
            userForm.find('[name="status"]').val('active'); // Set default status for new user
        }
        userModal.css('display', 'block');
    }
    
    // Handling form submission to ensure login is set only for new users
    userForm.on('submit', function(e) {
        e.preventDefault();
    
        const userId = userForm.find('[name="user-id"]').val();
        const data = {
            login: userForm.find('[name="login"]').val(),
            email: userForm.find('[name="email"]').val(),
            name: userForm.find('[name="name"]').val(),
            is_active: userForm.find('[name="status"]').val() === 'active' // Correctly set status
        };
    
        if (!userId) {
            // Include login only when creating a new user
            data.login = userForm.find('[name="login"]').val();
        }
    
        if (userForm.find('[name="password"]').val()) {
            data.password = userForm.find('[name="password"]').val();
        }
    
        const method = userId ? 'PUT' : 'POST';
        const url = userId ? `http://188.124.59.90:8000/api/v1/users/${userId}` : 'http://188.124.59.90:8000/api/v1/users/';
    
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
                return response.json();
            } else {
                return response.json().then(errorData => {
                    throw new Error(errorData.detail || 'Error saving data');
                });
            }
        })
        .then(userData => {
            closeUserModal();
            alert('User data saved');
            loadUsers();
        })
        .catch(error => {
            console.error('Error saving user:', error);
            alert(error.message);
        });
    });
    

    // Функция для закрытия модального окна
    function closeUserModal() {
        userModal.css('display', 'none');
    }

    // Function to delete a user
    function deleteUser(userId) {
        fetch(`http://188.124.59.90:8000/api/v1/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(() => {
            alert('User deleted');
            loadUsers();
        })
        .catch(error => {
            console.error('Error deleting user:', error);
            alert('Error deleting user');
        });
    }

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

    // Add new function to handle opening the change password modal
    function openChangePasswordModal(userId) {
        $('#password-user-id').val(userId);
        changePasswordModal.css('display', 'block');
    }

    // Add form handler for password change
    changePasswordForm.on('submit', function(e) {
        e.preventDefault();
        const userId = $('#password-user-id').val();
        const newPassword = $('#new-password').val();

        $.ajax({
            url: `http://188.124.59.90:8000/api/v1/users/${userId}/change-password`,
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                new_password: newPassword
            }),
            success: function() {
                alert('Password changed successfully');
                changePasswordModal.css('display', 'none');
                changePasswordForm[0].reset();
            },
            error: function(xhr, status, error) {
                console.error('Error changing password:', error);
                alert('Error changing password');
            }
        });
    });

    // Add close handler for the change password modal
    changePasswordModal.find('.close-button').on('click', function() {
        changePasswordModal.css('display', 'none');
    });

    $(window).on('click', function(e) {
        if ($(e.target).is(changePasswordModal)) {
            changePasswordModal.css('display', 'none');
        }
    });

    // Добавляем обработчик закрытия модального окна импорта
    $(document).on('click', '#import-modal .close-button', function() {
        $('#import-modal').css('display', 'none');
    });

    // Очищаем поле ввода при закрытии модального окна
    $('#import-modal').on('hidden.bs.modal', function () {
        $('#import-data').val('');
    });

    $('#import-form').on('submit', function(e) {
        e.preventDefault();
        
        const userId = $('#import-user-id').val();
        let importData = $('#import-data').val();
        
        // Убедимся, что у нас есть данные
        if (!importData.trim()) {
            alert('Please enter YAML data');
            return;
        }

        // Очищаем данные от лишних пробелов и табуляций в начале строк, сохраняя отступы
        importData = importData.split('\n')
            .map(line => {
                const trimmed = line.trimEnd(); // Удаляем только пробелы в конце
                return trimmed;
            })
            .filter(line => line) // Удаляем пустые строки
            .join('\n');

        console.log('Sending data:', importData); // Для отладки

        $.ajax({
            url: `http://188.124.59.90:8000/api/v1/users/${userId}/import`,
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                import_data: importData
            }),
            success: function(response) {
                alert('Data imported successfully');
                $('#import-modal').css('display', 'none');
                $('#import-data').val(''); // Очищаем поле ввода
                loadUsers(); // Обновляем список пользователей
            },
            error: function(xhr, status, error) {
                console.error('Import error:', xhr.responseJSON); // Для отладки
                alert('Error importing data: ' + (xhr.responseJSON?.detail || error));
            }
        });
    });
});


