// user.js

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Authentication required');
        parent.location.reload();
    }

    // Загрузка информации о пользователе
    const userInfoDiv = document.getElementById('user-info');
    if (userInfoDiv) {
        fetch('http://188.124.59.90:8000/api/v1/users/me', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(response => response.json())
        .then(user => {
            userInfoDiv.innerHTML = `
                <p><strong>Name:</strong> ${user.name}</p>
                <p><strong>Login:</strong> ${user.login}</p>
                <p><strong>Email:</strong> ${user.email}</p>
            `;
        });
    }
    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('token');
            parent.location.href = '/static/index.html';
        });
    }
    // Загрузка пакетов пользователя
    const packagesTableBody = document.querySelector('#packages-table tbody');
    if (packagesTableBody) {
        fetch('http://188.124.59.90:8000/api/v1/packages/my', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(response => response.json())
        .then(packages => {
            packagesTableBody.innerHTML = '';
            packages.forEach(pkg => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${pkg.id}</td>
                    <td>${pkg.comment || ''}</td>
                    <td>${pkg.max_modems}</td>
                    <td>${pkg.free_modems}</td>
                    <td>${new Date(pkg.start_date).toLocaleDateString()}</td>
                    <td>${new Date(pkg.expiry).toLocaleDateString()}</td>
                `;
                packagesTableBody.appendChild(row);
            });
        });
    }
});
