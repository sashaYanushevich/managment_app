// admin_packages.js

$(document).ready(function() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Authentication required');
        parent.location.href = '../pages/login.html';
    }

    const packagesTableBody = $('#packages-table tbody');
    const addPackageButton = $('#add-package');
    const packageModal = $('#package-modal');
    const packageForm = $('#package-form');
    const modalTitle = $('#modal-title');
    const closeButton = $('.close-button');
    const customerSelect = $('#customer_id');


    addPackageButton.click(function(e) {
        e.preventDefault();
        openPackageModal();
    });
    // Function to load users for the dropdown
    function loadUsers() {
        $.ajax({
            url: 'http://188.124.59.90:8000/api/v1/users/',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function(users) {
                customerSelect.empty();
                users.forEach(user => {
                    customerSelect.append(`<option value="${user.id}">${user.id} - ${user.login}</option>`);
                });
            },
            error: function(error) {
                console.error('Error loading users:', error);
            }
        });
    }

    // Load users when the page loads
    loadUsers();

    function calculateFreeModems(packages) {
        packages.forEach(pkg => {
            // Рассчитываем количество используемых модемов
            const usedModems = pkg.servers.reduce((sum, server) => sum + server.max_modems, 0);
            // Вычисляем свободные модемы
            pkg.free_modems = pkg.max_modems - usedModems;
        });
    }

    function formatDateForInput(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    }

    // Function to load packages
    function loadPackages() {
        fetch('http://188.124.59.90:8000/api/v1/packages/', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            })
            .then(response => response.json())
            .then(packages => {
                calculateFreeModems(packages);
                packagesTableBody.empty();
                packages.forEach(pkg => {
                    const userInfo = pkg.customer ? `${pkg.customer.login} [${pkg.customer.name || ''}]` : '';
                    const row = `
                    <tr>
                        <td>${pkg.id}</td>
                        <td>${userInfo}</td>
                        <td>${pkg.comment || ''}</td>
                        <td>${pkg.max_modems}</td>
                        <td>${pkg.free_modems}</td>
                        <td>${new Date(pkg.start_date).toLocaleDateString()}</td>
                        <td>${pkg.expiry ? new Date(pkg.expiry).toLocaleDateString() : ''}</td>
                        <td>
                            <button class="btn btn-sm btn-primary edit-package" data-id="${pkg.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-package" data-id="${pkg.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                    packagesTableBody.append(row);
                });

                // Add click handlers for the buttons
                $('.edit-package').on('click', function() {
                    const packageId = $(this).data('id');
                    openPackageModal(packageId);
                });

                $('.delete-package').on('click', function() {
                    const packageId = $(this).data('id');
                    if (confirm('Are you sure you want to delete this package?')) {
                        deletePackage(packageId);
                    }
                });
            });
    }

    // Load packages when the page loads
    loadPackages();

    function openPackageModal(packageId = null) {
        if (packageId) {
            // Edit existing package
            modalTitle.text('Edit Package');
            fetch(`http://188.124.59.90:8000/api/v1/packages/${packageId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json',
                    }
                })
                .then(response => response.json())
                .then(package => {
                    packageForm.find('[name="package-id"]').val(package.id);
                    packageForm.find('[name="customer_id"]').val(package.customer_id);
                    packageForm.find('[name="comment"]').val(package.comment || '');
                    packageForm.find('[name="max_modems"]').val(package.max_modems);
                    // Используйте функцию форматирования даты
                    packageForm.find('[name="expiry"]').val(formatDateForInput(package.expiry));
                });
        } else {
            // Add new package
            modalTitle.text('Add Package');
            packageForm.trigger('reset');
            packageForm.find('[name="package-id"]').val('');
            const today = new Date().toISOString().split('T')[0];
            packageForm.find('[name="expiry"]').attr('min', today);
        }
        packageModal.css('display', 'block');
    }

    // Function to close the modal
    function closePackageModal() {
        packageModal.css('display', 'none');
    }

    // Function to delete a package
    function deletePackage(packageId) {
        // First get all servers for this package
        fetch(`http://188.124.59.90:8000/api/v1/servers/by-package/${packageId}`, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            })
            .then(response => response.json())
            .then(servers => {
                if (confirm(`This will delete the package and associated servers. Are you sure?`)) {
                    // Delete the package (backend will handle server deletion)
                    return fetch(`http://188.124.59.90:8000/api/v1/packages/${packageId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    });
                }
                return Promise.reject('Cancelled by user');
            })
            .then(response => {
                if (response.ok) {
                    alert('Package and associated servers deleted successfully');
                    loadPackages();
                } else {
                    return response.json().then(errorData => {
                        throw new Error(errorData.detail || 'Error deleting package');
                    });
                }
            })
            .catch(error => {
                if (error.message !== 'Cancelled by user') {
                    console.error('Error deleting package:', error);
                    alert('Error deleting package: ' + error.message);
                }
            });
    }

    packageForm.on('submit', function(e) {
        e.preventDefault();

        const packageId = packageForm.find('[name="package-id"]').val();
        const data = {
            customer_id: parseInt(packageForm.find('[name="customer_id"]').val()),
            comment: packageForm.find('[name="comment"]').val(),
            max_modems: parseInt(packageForm.find('[name="max_modems"]').val()),
            expiry: packageForm.find('[name="expiry"]').val(),
        };

        // Проверка валидности даты
        const selectedDate = new Date(data.expiry);
        const today = new Date();
        if (selectedDate < today) {
            alert('Expiry date cannot be in the past');
            return;
        }

        const method = packageId ? 'PUT' : 'POST';
        const url = packageId ? `http://188.124.59.90:8000/api/v1/packages/${packageId}` : 'http://188.124.59.90:8000/api/v1/packages/';

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
                    closePackageModal();
                    alert('Package data saved');
                    loadPackages();
                } else {
                    return response.json().then(errorData => {
                        throw new Error(errorData.detail || 'Error saving data');
                    });
                }
            })
            .catch(error => {
                closePackageModal();
                alert('Package data saved');
                loadPackages();
            });
    });

    closeButton.on('click', closePackageModal);

    $(window).on('click', function(e) {
        if ($(e.target).is(packageModal)) {
            closePackageModal();
        }
    });
});