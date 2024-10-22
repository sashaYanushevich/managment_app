$(document).ready(function () {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Необходима авторизация');
        location.href = 'static/pages/login.html';
    }

    const serversTableBody = $('#servers-table tbody');
    const addServerButton = $('#add-server');
    const serverModalElement = document.getElementById('server-modal');
    const serverModal = new bootstrap.Modal(serverModalElement,{
        backdrop: false
    });
    const serverForm = $('#server-form');
    const modalTitle = $('#serverModalLabel');
    const packageSelect = $('#package-select');
    const packageInfo = $('#package-info');

    let packages = [];

    // Функция для загрузки пакетов
    function loadPackages() {
        return $.ajax({
            url: 'http://127.0.0.1:8000/api/v1/packages/my',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (data) {
                packages = data;
                console.log(packages);
                packageSelect.empty();
                data.forEach(pkg => {
                    packageSelect.append(`<option value="${pkg.id}">${pkg.comment}</option>`);
                });
                updatePackageInfo();
            },
            error: function (xhr, status, error) {
                console.error('Ошибка при загрузке пакетов:', error);
                alert('Ошибка при загрузке пакетов');
            }
        });
    }

    // Обновление информации о выбранном пакете
    function updatePackageInfo() {
        const packageId = parseInt(packageSelect.val());
        const selectedPackage = packages.find(pkg => pkg.id === packageId);

        if (selectedPackage) {
            // Получаем количество модемов, занятых серверами в этом пакете
            $.ajax({
                url: 'http://127.0.0.1:8000/api/v1/servers/',
                headers: {
                    'Authorization': 'Bearer ' + token
                },
                success: function (servers) {
                    const serversInPackage = servers.filter(srv => srv.package_id === packageId);
                    const usedModems = serversInPackage.reduce((sum, srv) => sum + srv.max_modems, 0);
                    const remainingModems = selectedPackage.max_modems - usedModems;

                    packageInfo.html(`
                        <p>Максимальное количество модемов в пакете: ${selectedPackage.max_modems}</p>
                        <p>Использовано модемов: ${usedModems}</p>
                        <p>Оставшееся количество модемов: ${remainingModems}</p>
                    `);
                },
                error: function (xhr, status, error) {
                    console.error('Ошибка при загрузке серверов:', error);
                    alert('Ошибка при загрузке серверов');
                }
            });
        } else {
            packageInfo.empty();
        }
    }

    // Генерация bios_uuid
    function generateBiosUuid() {
        let uuid = '4c';
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (let i = 0; i < 11; i++) {
            uuid += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        uuid += '-4710';
        return uuid;
    }

    // Функция для загрузки серверов
    function loadServers() {
        $.ajax({
            url: 'http://127.0.0.1:8000/api/v1/servers/',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (servers) {
                serversTableBody.empty();
                servers.forEach(server => {
                    const row = `
                        <tr>
                            <td>${server.id}</td>
                            <td>${server.name}</td>
                            <td>${server.package_id || ''}</td>
                            <td>${server.max_modems}</td>
                            <td class="action-buttons">
                                <button class="btn btn-sm btn-primary edit-server" data-id="${server.id}"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-danger delete-server" data-id="${server.id}"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                    serversTableBody.append(row);
                });

                // Обработчики для кнопок редактирования и удаления
                $('.edit-server').on('click', function () {
                    const serverId = $(this).data('id');
                    openServerModal(serverId);
                });

                $('.delete-server').on('click', function () {
                    const serverId = $(this).data('id');
                    if (confirm('Вы уверены, что хотите удалить сервер?')) {
                        deleteServer(serverId);
                    }
                });
            },
            error: function (xhr, status, error) {
                console.error('Ошибка при загрузке серверов:', error);
                alert('Ошибка при загрузке серверов');
            }
        });
    }

    // Функция для открытия модального окна
    function openServerModal(serverId = null) {
        if (serverId) {
            // Редактирование сервера
            modalTitle.text('Редактировать сервер');
            $.ajax({
                url: `http://127.0.0.1:8000/api/v1/servers/${serverId}`,
                headers: {
                    'Authorization': 'Bearer ' + token
                },
                success: function (server) {
                    $('#server-id').val(server.id);
                    $('#server-name').val(server.name);
                    $('#server-max-modems').val(server.max_modems);
                    $('#package-select').val(server.package_id);
                    updatePackageInfo();

                    // Разбираем machine_data
                    const machineDataParts = parseMachineData(server.machine_data);
                    $('#n_cpu').val(machineDataParts.n_cpu);
                    $('#rootfs').val(machineDataParts.rootfs);
                    $('#mem').val(machineDataParts.mem);
                    $('#bios_uuid').val(machineDataParts.bios_uuid);

                    serverModal.show();
                },
                error: function (xhr, status, error) {
                    console.error('Ошибка при загрузке данных сервера:', error);
                    alert('Ошибка при загрузке данных сервера');
                }
            });
        } else {
            // Добавление нового сервера
            modalTitle.text('Добавить сервер');
            serverForm.trigger('reset');
            $('#server-id').val('');
            // Генерируем новый bios_uuid
            $('#bios_uuid').val(generateBiosUuid());
            // Выбираем первый пакет по умолчанию и обновляем информацию
            $('#package-select').val(packageSelect.find('option:first').val());
            updatePackageInfo();
            serverModal.show();
        }
    }

    // Обработчик изменения выбранного пакета
    packageSelect.on('change', function () {
        updatePackageInfo();
    });

    // Обработчик формы добавления/редактирования сервера
    serverForm.on('submit', function (e) {
        e.preventDefault();

        const serverId = $('#server-id').val();
        const packageId = parseInt($('#package-select').val());
        const selectedPackage = packages.find(pkg => pkg.id === packageId);

        const data = {
            name: $('#server-name').val(),
            max_modems: parseInt($('#server-max-modems').val()),
            n_cpu: parseInt($('#n_cpu').val()),
            rootfs: parseInt($('#rootfs').val()),
            mem: parseInt($('#mem').val()),
            bios_uuid: $('#bios_uuid').val(),
            package_id: packageId
        };

        // Проверяем, что новый сервер не превышает оставшиеся слоты
        $.ajax({
            url: 'http://127.0.0.1:8000/api/v1/servers/',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (servers) {
                const serversInPackage = servers.filter(srv => srv.package_id === packageId && srv.id !== parseInt(serverId));
                const usedModems = serversInPackage.reduce((sum, srv) => sum + srv.max_modems, 0);
                const remainingModems = selectedPackage.max_modems - usedModems;

                if (data.max_modems > remainingModems) {
                    alert('Превышено доступное количество модемов в выбранном пакете.');
                    return;
                }

                const method = serverId ? 'PUT' : 'POST';
                const url = serverId ? `http://127.0.0.1:8000/api/v1/servers/${serverId}` : 'http://127.0.0.1:8000/api/v1/servers/';

                $.ajax({
                    url: url,
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    data: JSON.stringify(data),
                    success: function () {
                        serverModal.hide();
                        alert('Сервер сохранен');
                        loadServers();
                    },
                    error: function (xhr, status, error) {
                        console.error('Ошибка при сохранении сервера:', error);
                        alert(xhr.responseJSON.detail || 'Ошибка при сохранении сервера');
                    }
                });
            },
            error: function (xhr, status, error) {
                console.error('Ошибка при проверке модемов:', error);
                alert('Ошибка при проверке модемов');
            }
        });
    });

    // Функция для удаления сервера
    function deleteServer(serverId) {
        $.ajax({
            url: `http://127.0.0.1:8000/api/v1/servers/${serverId}`,
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function () {
                alert('Сервер удален');
                loadServers();
            },
            error: function (xhr, status, error) {
                console.error('Ошибка при удалении сервера:', error);
                alert('Ошибка при удалении сервера');
            }
        });
    }

    // Функция для парсинга machine_data
    function parseMachineData(machineData) {
        const parts = machineData.split(',');
        const data = {};
        parts.forEach(part => {
            const [key, value] = part.split('=');
            data[key.trim()] = value.trim();
        });
        return data;
    }

    // Обработчик кнопки добавления сервера
    addServerButton.on('click', function () {
        openServerModal();
    });

    // Загрузка пакетов и серверов при загрузке страницы
    loadPackages().then(loadServers);
});
