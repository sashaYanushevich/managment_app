// admin_packages.js

$(document).ready(function () {
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

    // Function to load users for the dropdown
    function loadUsers() {
        $.ajax({
            url: 'http://188.124.59.90:8000/api/v1/users/',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (users) {
                customerSelect.empty();
                users.forEach(user => {
                    customerSelect.append(`<option value="${user.id}">${user.id} - ${user.login}</option>`);
                });
            },
            error: function (error) {
                console.error('Error loading users:', error);
            }
        });
    }

    // Load users when the page loads
    loadUsers();

    // Function to load packages
    function loadPackages() {
        $.ajax({
            url: 'http://188.124.59.90:8000/api/v1/packages/',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (packages) {
                packagesTableBody.empty();
                packages.forEach(package => {
                    const row = `
                        <tr>
                            <td>${package.id}</td>
                            <td>${package.customer_id}</td>
                            <td>${package.comment || ''}</td>
                            <td>${package.max_modems}</td>
                            <td>${package.free_modems}</td>
                            <td>${package.start_date}</td>
                            <td>${package.expiry}</td>
                            <td>
                                <button class="btn btn-sm btn-primary edit-package" data-id="${package.id}"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-danger delete-package" data-id="${package.id}"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                    packagesTableBody.append(row);
                });

                // Add handlers for edit and delete buttons
                $('.edit-package').on('click', function () {
                    const packageId = $(this).data('id');
                    openPackageModal(packageId);
                });

                $('.delete-package').on('click', function () {
                    const packageId = $(this).data('id');
                    if (confirm('Are you sure you want to delete this package?')) {
                        deletePackage(packageId);
                    }
                });
            }
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
                packageForm.find('[name="expiry"]').val(package.expiry_date);
            });
        } else {
            // Add new package
            modalTitle.text('Add Package');
            packageForm.trigger('reset');
            packageForm.find('[name="package-id"]').val('');
        }
        packageModal.css('display', 'block');
    }

    // Function to close the modal
    function closePackageModal() {
        packageModal.css('display', 'none');
    }

    // Function to delete a package
    function deletePackage(packageId) {
        fetch(`http://188.124.59.90:8000/api/v1/packages/${packageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(() => {
            alert('Package deleted');
            loadPackages();
        })
        .catch(error => {
            console.error('Error deleting package:', error);
            alert('Error deleting package');
        });
    }

    packageForm.on('submit', function(e) {
        e.preventDefault();

        const packageId = packageForm.find('[name="package-id"]').val();
        const data = {
            customer_id: parseInt(packageForm.find('[name="customer_id"]').val()),
            comment: packageForm.find('[name="comment"]').val(),
            max_modems: parseInt(packageForm.find('[name="max_modems"]').val()),
            expiry: packageForm.find('[name="expiry"]').val(), // Изменено с expiry_date на expiry
        };

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
            console.error('Error saving package:', error);
            alert(error.message);
        });
    });
    
    // Handlers for opening and closing the modal
    addPackageButton.on('click', function() {
        openPackageModal();
    });

    closeButton.on('click', closePackageModal);

    $(window).on('click', function(e) {
        if ($(e.target).is(packageModal)) {
            closePackageModal();
        }
    });
});
