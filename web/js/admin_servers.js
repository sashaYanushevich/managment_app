$(document).ready(function () {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Authentication required');
        parent.location.href = '../pages/login.html';
    }

    const serversTableBody = $('#servers-table tbody');
    const addServerButton = $('#add-server');
    const serverModal = $('#server-modal');
    const serverForm = $('#server-form');
    const modalTitle = $('#modal-title');
    const closeButton = $('.close-button');
    const packageSelect = $('#package_id');
    const userSelect = $('#user_id');

    // Function to load users for the dropdown
    function loadUsers() {
        $.ajax({
            url: 'http://188.124.59.90:8000/api/v1/users/',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (users) {
                userSelect.empty();
                users.forEach(user => {
                    userSelect.append(`<option value="${user.id}">${user.id} - ${user.login}</option>`);
                });
                loadPackages();
            },
            error: function (error) {
                console.error('Error loading users:', error);
            }
        });
    }

    // Load users when the page loads
    loadUsers();

    // Function to load packages for the dropdown
    function loadPackages(userId) {
        $.ajax({
            url: 'http://188.124.59.90:8000/api/v1/packages/',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (packages) {
                packageSelect.empty();
                packages.forEach(pkg => {
                    if (!userId || pkg.customer_id === parseInt(userId)) {
                        const usedModems = pkg.servers ? pkg.servers.reduce((sum, server) => sum + server.max_modems, 0) : 0;
                        const freeModems = pkg.max_modems - usedModems;
                        packageSelect.append(`<option value="${pkg.id}" data-free="${freeModems}">${pkg.comment}</option>`);
                    }
                });
                updatePackageFreeModems();
            }
        });
    }

    // Add new function to update free modems display
    function updatePackageFreeModems() {
        const selectedOption = packageSelect.find('option:selected');
        const freeModems = selectedOption.data('free');
        $('#admin-package-free-modems').text(`Free modems: ${freeModems}`);
    }

    // Add event listener for package select change
    packageSelect.on('change', function() {
        updatePackageFreeModems();
    });

    // Function to load servers
    function loadServers() {
        $.ajax({
            url: 'http://188.124.59.90:8000/api/v1/servers/all',
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
                            <td>${server.max_modems}</td>
                            <td>${server.package_id}</td>
                            <td>${server.package ? server.package.customer_id : ''}</td>
                            <td>${server.license_hash || ''}</td>
                            <td>${server.created_at}</td>
                            <td>${server.updated_at}</td>
                            <td>
                                <button class="btn btn-sm btn-primary edit-server" data-id="${server.id}"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-danger delete-server" data-id="${server.id}"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                    serversTableBody.append(row);
                });

                // Add handlers for edit and delete buttons
                $('.edit-server').on('click', function () {
                    const serverId = $(this).data('id');
                    openServerModal(serverId);
                });

                $('.delete-server').on('click', function () {
                    const serverId = $(this).data('id');
                    if (confirm('Are you sure you want to delete this server?')) {
                        deleteServer(serverId);
                    }
                });
            },
            error: function (error) {
                console.error('Error loading servers:', error);
            }
        });
    }

    // Load servers when the page loads
    loadServers();

    function openServerModal(serverId = null) {
        if (serverId) {
            modalTitle.text('Edit Server');
            fetch(`http://188.124.59.90:8000/api/v1/servers/${serverId}`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                }
            })
                .then(response => response.json())
                .then(server => {
                    serverForm.find('[name="server-id"]').val(server.id);
                    serverForm.find('[name="name"]').val(server.name);
                    serverForm.find('[name="max_modems"]').val(server.max_modems);
                    serverForm.find('[name="user_id"]').val(server.package.customer_id);
                    loadPackagesForUser(server.package.customer_id, server.package_id);

                    // Populate Machine Parameters string
                    const machineData = server.machine_data || '';
                    serverForm.find('[name="machine_data"]').val(machineData);
                });
        } else {
            modalTitle.text('Add Server');
            serverForm.trigger('reset');
            serverForm.find('[name="server-id"]').val('');
            serverForm.find('[name="user_id"]').val(userSelect.val());
            loadPackages();
        }
        serverModal.css('display', 'block');
    }

    function parseMachineData(machineData) {
        if (!machineData) return {};
        const data = {};
        const pairs = machineData.split(',');
        pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key && value) {
                data[key.trim()] = value.trim();
            }
        });
        return data;
    }

    function loadPackagesForUser(userId, selectedPackageId) {
        $.ajax({
            url: `http://188.124.59.90:8000/api/v1/packages/user/${userId}`,
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (packages) {
                packageSelect.empty();
                packages.forEach(pkg => {
                    packageSelect.append(`<option value="${pkg.id}">${pkg.id} - ${pkg.comment || ''}</option>`);
                });
                packageSelect.val(selectedPackageId);
            },
            error: function (error) {
                console.error('Error loading packages:', error);
            }
        });
    }

    function closeServerModal() {
        serverModal.css('display', 'none');
    }

    function deleteServer(serverId) {
        fetch(`http://188.124.59.90:8000/api/v1/servers/${serverId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
            .then(response => {
                if (response.ok) {
                    alert('Server deleted');
                    loadServers();
                } else {
                    return response.json().then(errorData => {
                        throw new Error(errorData.detail || 'Error deleting server');
                    });
                }
            })
            .catch(error => {
                console.error('Error deleting server:', error);
                alert(error.message);
            });
    }

    serverForm.on('submit', function (e) {
        e.preventDefault();

        const serverId = serverForm.find('[name="server-id"]').val();
        const machineDataString = serverForm.find('[name="machine_data"]').val();
        const machineData = parseMachineData(machineDataString);

        const data = {
            name: serverForm.find('[name="name"]').val(),
            max_modems: parseInt(serverForm.find('[name="max_modems"]').val()),
            package_id: parseInt(serverForm.find('[name="package_id"]').val()),
            n_cpu: parseInt(machineData.n_cpu) || null,
            rootfs: parseInt(machineData.rootfs) || null,
            mem: parseInt(machineData.mem) || null,
            bios_uuid: machineData.bios_uuid || null,
        };

        let method, url;

        if (serverId) {
            method = 'PUT';
            url = `http://188.124.59.90:8000/api/v1/servers/${serverId}`;
        } else {
            method = 'POST';
            url = 'http://188.124.59.90:8000/api/v1/servers/';
        }

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
                    closeServerModal();
                    alert('Server data saved');
                    loadServers();
                }else {
                    return response.json().then(errorData => {
                        if (errorData.detail === 'Превышен лимит модемов в пакете.') {
                            alert('max_modems is over limit, server is not created');
                        } else {
                            closeServerModal();
                            alert('Server data saved');
                            loadServers();
                        }
                    });
                }
            })
            .catch(error => {
                console.error('Error saving server:', error);
                alert(error.message);
            });
    });

    addServerButton.on('click', function () {
        openServerModal();
    });

    closeButton.on('click', closeServerModal);

    $(window).on('click', function (e) {
        if ($(e.target).is(serverModal)) {
            closeServerModal();
        }
    });
});
