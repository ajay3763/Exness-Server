// --- Admin Panel JavaScript (V3 - Improved UI) ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Basic Setup & Auth ---
    const password = sessionStorage.getItem('admin-password');
    if (!password) {
        window.location.href = '/index.html';
        return;
    }
    
    const apiHeaders = {
        'Content-Type': 'application/json',
        'x-admin-password': password
    };

    // --- Element Selectors ---
    const userModal = document.getElementById('user-modal');
    const addUserBtn = document.getElementById('add-user-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const cancelBtnX = document.getElementById('cancel-btn-x');
    const userForm = document.getElementById('user-form');
    const modalTitle = document.getElementById('modal-title');
    const tableBody = document.getElementById('user-table-body');
    const deviceIdSection = document.getElementById('device-id-section');
    const resetDeviceBtn = document.getElementById('reset-device-btn');
    const searchInput = document.getElementById('search-input');
    const logoutBtn = document.getElementById('logout-btn');

    let allUsers = []; // Store all users to filter locally

    // --- API & Data Functions ---
    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users', { headers: apiHeaders });
            if (response.status === 401) { // Unauthorized
                logout();
                return;
            }
            allUsers = await response.json();
            renderTable(allUsers);
            updateStats();
        } catch (error) {
            console.error('Error fetching users:', error);
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500">Failed to load user data.</td></tr>`;
        }
    };

    // --- UI Rendering ---
    const updateStats = () => {
        const total = allUsers.length;
        const now = new Date();
        const active = allUsers.filter(u => u.isActive && new Date(u.expiryDate) >= now).length;
        
        document.getElementById('total-users').textContent = total;
        document.getElementById('active-users').textContent = active;
        document.getElementById('expired-users').textContent = total - active;
    };

    const renderTable = (users) => {
        tableBody.innerHTML = '';
        if (!users || users.length === 0) {
            const searchText = searchInput.value;
            const message = searchText ? 'No users match your search.' : 'No users found. Add one to get started!';
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500">${message}</td></tr>`;
            return;
        }
        users.forEach(user => {
            const isExpired = new Date(user.expiryDate) < new Date();
            const statusClass = user.isActive && !isExpired ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800';
            const statusText = user.isActive && !isExpired ? 'Active' : (isExpired ? 'Expired' : 'Inactive');
            const lastSeen = user.lastSeen ? new Date(user.lastSeen).toLocaleString('en-IN') : 'Never';
            
            const row = `
                <tr class="border-b border-gray-200 hover:bg-gray-50">
                    <td class="py-3 px-6 text-left">
                        <div class="font-medium">${user.email}</div>
                        <div class="text-xs text-gray-500">${user.mobile || 'No mobile'}</div>
                    </td>
                    <td class="py-3 px-6 text-left"><code class="text-sm bg-gray-200 px-2 py-1 rounded">${user.licenseKey}</code></td>
                    <td class="py-3 px-6 text-left"><code class="text-xs">${user.deviceId || 'N/A'}</code></td>
                    <td class="py-3 px-6 text-left text-xs">${lastSeen}</td>
                    <td class="py-3 px-6 text-center">${user.expiryDate}</td>
                    <td class="py-3 px-6 text-center"><span class="px-2 py-1 font-semibold leading-tight ${statusClass} rounded-full text-xs">${statusText}</span></td>
                    <td class="py-3 px-6 text-center">
                        <div class="flex item-center justify-center space-x-2">
                            <button data-id="${user.id}" class="edit-btn p-1 text-blue-500 hover:text-blue-700" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z"/></svg></button>
                            <button data-id="${user.id}" class="delete-btn p-1 text-red-500 hover:text-red-700" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                        </div>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    };

    // --- Modal Logic ---
    const openModal = (user = null) => {
        userForm.reset();
        if (user) {
            modalTitle.textContent = 'Edit User';
            document.getElementById('user-id').value = user.id;
            document.getElementById('licenseKey').value = user.licenseKey;
            document.getElementById('email').value = user.email;
            document.getElementById('telegramId').value = user.telegramId || '';
            document.getElementById('mobile').value = user.mobile || '';
            document.getElementById('amount').value = user.amount || '';
            document.getElementById('expiryDate').value = user.expiryDate;
            document.getElementById('isActive').checked = user.isActive;
            if (user.deviceId) {
                document.getElementById('deviceId').value = user.deviceId;
                deviceIdSection.classList.remove('hidden');
            } else {
                deviceIdSection.classList.add('hidden');
            }
        } else {
            modalTitle.textContent = 'Add New User';
            document.getElementById('user-id').value = '';
            document.getElementById('isActive').checked = true;
            deviceIdSection.classList.add('hidden');
        }
        userModal.classList.remove('hidden');
    };
    const closeModal = () => userModal.classList.add('hidden');

    // --- Event Listeners ---
    const logout = () => {
        sessionStorage.removeItem('admin-password');
        window.location.href = '/index.html';
    };

    logoutBtn.addEventListener('click', logout);
    addUserBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    cancelBtnX.addEventListener('click', closeModal);

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredUsers = allUsers.filter(user => 
            user.email.toLowerCase().includes(searchTerm) ||
            user.licenseKey.toLowerCase().includes(searchTerm) ||
            (user.mobile && user.mobile.toLowerCase().includes(searchTerm))
        );
        renderTable(filteredUsers);
    });

    document.getElementById('generate-key-btn').addEventListener('click', () => {
        document.getElementById('licenseKey').value = `KEY-${self.crypto.randomUUID().toUpperCase().slice(0, 18)}`;
    });

    resetDeviceBtn.addEventListener('click', async () => {
        const userId = document.getElementById('user-id').value;
        if (!userId || !confirm('Are you sure you want to reset the Device ID?')) return;

        const response = await fetch(`/api/users/${userId}/reset-device`, { method: 'POST', headers: apiHeaders });
        if (response.ok) {
            alert('Device ID has been reset!');
            closeModal();
            fetchUsers();
        } else {
            alert('Failed to reset Device ID.');
        }
    });

    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('user-id').value;
        const userData = {
            licenseKey: document.getElementById('licenseKey').value,
            email: document.getElementById('email').value,
            telegramId: document.getElementById('telegramId').value,
            mobile: document.getElementById('mobile').value,
            amount: document.getElementById('amount').value,
            expiryDate: document.getElementById('expiryDate').value,
            isActive: document.getElementById('isActive').checked,
        };

        const url = id ? `/api/users/${id}` : '/api/users';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, { method, headers: apiHeaders, body: JSON.stringify(userData) });
        if (response.ok) {
            closeModal();
            fetchUsers();
        } else {
            alert('Failed to save user.');
        }
    });

    tableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const id = btn.dataset.id;
        if (btn.classList.contains('edit-btn')) {
            const userToEdit = allUsers.find(u => u.id === id);
            if (userToEdit) openModal(userToEdit);
        }

        if (btn.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to permanently delete this user?')) {
                const response = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: apiHeaders });
                if (response.ok) fetchUsers();
                else alert('Failed to delete user.');
            }
        }
    });

    // --- Initial Load ---
    fetchUsers();
});

