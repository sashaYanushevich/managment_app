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
            url: 'http://188.124.59.90:8000/api/v1/packages/my',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (data) {
                packages = data;
                console.log(packages);
                packageSelect.empty();
                data.forEach(pkg => {
                    // Calculate free modems for each package
                    const usedModems = pkg.servers ? pkg.servers.reduce((sum, server) => sum + server.max_modems, 0) : 0;
                    const freeModems = pkg.max_modems - usedModems;
                    packageSelect.append(`<option value="${pkg.id}" data-free="${freeModems}">${pkg.comment}</option>`);
                });
                updatePackageInfo();
            },
            error: function (xhr, status, error) {
                console.error('Error load package', error);
                alert('Error load package');
            }
        });
    }

    // Обновление информации о выбранном пакете
    function updatePackageInfo() {
        const packageId = parseInt(packageSelect.val());
        const selectedOption = packageSelect.find('option:selected');
        const freeModems = selectedOption.data('free');
        
        $('#package-free-modems').text(`Free modems: ${freeModems}`);
        
        const selectedPackage = packages.find(pkg => pkg.id === packageId);
        if (selectedPackage) {
            packageInfo.html(`
                <p>Max modems in package: ${selectedPackage.max_modems}</p>
                <p>Free Modems: ${freeModems}</p>
            `);
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
            url: 'http://188.124.59.90:8000/api/v1/servers/',
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
                                <button class="btn btn-sm btn-info setup-link" data-id="${server.id}"><i class="fas fa-link"></i></button>
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
                    if (confirm('Delete this server?')) {
                        deleteServer(serverId);
                    }
                });

                $('.setup-link').on('click', function() {
                    const serverId = $(this).data('id');
                    $.ajax({
                        url: `http://188.124.59.90:8000/api/v1/servers/${serverId}`,
                        headers: {
                            'Authorization': 'Bearer ' + token
                        },
                        success: function(server) {
                            if (server.setup_link) {
                                const modalDiv = document.createElement('div');
                                modalDiv.className = 'modal fade';
                                modalDiv.innerHTML = `
                                    <div class="modal-dialog">
                                        <div class="modal-content">
                                            <div class="modal-header">
                                                <h5 class="modal-title">Setup Link</h5>
                                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                            </div>
                                            <div class="modal-body">
                                                <p>Setup Link for server "${server.name}":</p>
                                                <div class="input-group">
                                                    <input type="text" class="form-control" value="${server.setup_link}" readonly>
                                                    <button class="btn btn-outline-secondary copy-link" type="button">Copy</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                
                                document.body.appendChild(modalDiv);
                                const setupLinkModal = new bootstrap.Modal(modalDiv, {
                                    backdrop: false
                                });
                                setupLinkModal.show();

                                modalDiv.querySelector('.copy-link').addEventListener('click', function() {
                                    const input = modalDiv.querySelector('input');
                                    input.select();
                                    document.execCommand('copy');
                                    alert('Link copied to clipboard!');
                                });

                                modalDiv.addEventListener('hidden.bs.modal', function() {
                                    document.body.removeChild(modalDiv);
                                    const backdrop = document.querySelector('.modal-backdrop');
                                    if (backdrop) {
                                        backdrop.remove();
                                    }
                                });
                            } else {
                                alert('Setup link is not available for this server');
                            }
                        },
                        error: function(xhr, status, error) {
                            console.error('Error fetching setup link:', error);
                            alert('Error fetching setup link');
                        }
                    });
                });
            },
            error: function (xhr, status, error) {
                console.error('Error', error);
                alert('Error');
            }
        });
    }

    // Функция для открытия модального окна
    function openServerModal(serverId = null) {
        if (serverId) {
            // Edit server
            modalTitle.text('Edit Server');
            $.ajax({
                url: `http://188.124.59.90:8000/api/v1/servers/${serverId}`,
                headers: {
                    'Authorization': 'Bearer ' + token
                },
                success: function (server) {
                    $('#server-id').val(server.id);
                    $('#server-name').val(server.name);
                    $('#server-max-modems').val(server.max_modems);
                    $('#package-select').val(server.package_id);
                    updatePackageInfo();
    
                    // Set machine_data as a single string
                    $('#machine_data').val(server.machine_data);
    
                    serverModal.show();
                },
                error: function (xhr, status, error) {
                    console.error('Error loading server data:', error);
                    alert('Error loading server data');
                }
            });
        } else {
            // Add new server
            modalTitle.text('Add Server');
            serverForm.trigger('reset');
            $('#server-id').val('');
            
            // Set default machine_data format
            $('#machine_data').val(`n_cpu=4,rootfs=119110,mem=7796,bios_uuid=${generateBiosUuid()}`);
            
            $('#package-select').val(packageSelect.find('option:first').val());
            updatePackageInfo();
            serverModal.show();
        }
    }

    // Обработчик изменения выбранного пакета
    packageSelect.on('change', function () {
        updatePackageInfo();
    });

    serverForm.on('submit', function (e) {
        e.preventDefault();
    
        const serverId = $('#server-id').val();
        const packageId = parseInt($('#package-select').val());
        const selectedPackage = packages.find(pkg => pkg.id === packageId);
    
        const machineData = $('#machine_data').val();
        const parsedMachineData = parseMachineData(machineData); // Парсинг строки machine_data
    
        const data = {
            name: $('#server-name').val(),
            max_modems: parseInt($('#server-max-modems').val()),
            package_id: packageId,
            n_cpu: parseInt(parsedMachineData.n_cpu || 0), // Извлечение поля n_cpu
            rootfs: parseInt(parsedMachineData.rootfs || 0), // Извлечение поля rootfs
            mem: parseInt(parsedMachineData.mem || 0), // Извлечение поля mem
            bios_uuid: parsedMachineData.bios_uuid || '' // Извлечение поля bios_uuid
        };
    
        // Проверка доступности модемов в выбранном пакете
        $.ajax({
            url: 'http://188.124.59.90:8000/api/v1/servers/',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (servers) {
                const serversInPackage = servers.filter(srv => srv.package_id === packageId && srv.id !== parseInt(serverId));
                const usedModems = serversInPackage.reduce((sum, srv) => sum + srv.max_modems, 0);
                const remainingModems = selectedPackage.max_modems - usedModems;
    
                if (data.max_modems > remainingModems) {
                    alert('The number of available modems in the selected package has been exceeded.');
                    return;
                }
    
                const method = serverId ? 'PUT' : 'POST';
                const url = serverId ? `http://188.124.59.90:8000/api/v1/servers/${serverId}` : 'http://188.124.59.90:8000/api/v1/servers/';
    
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
                        alert('Server saved');
                        loadServers();
                    },
                    error: function (xhr, status, error) {
                        console.error('Server save error:', error);
                        alert(xhr.responseJSON.detail || 'Server save error:');
                    }
                });
            },
            error: function (xhr, status, error) {
                console.error('Modem check error:', error);
                alert('Modem check error');
            }
        });
    });
    
    // Функция для удаления сервера
    function deleteServer(serverId) {
        $.ajax({
            url: `http://188.124.59.90:8000/api/v1/servers/${serverId}`,
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function () {
                alert('Server delete');
                loadServers();
            },
            error: function (xhr, status, error) {
                console.error('Error when deleting a server:', error);
                alert('Error when deleting a server');
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

    // Загрузка пакетов и серверов при загрузке ��траницы
    loadPackages().then(loadServers);
});
