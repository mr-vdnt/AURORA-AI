document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('aurora_token');
    const role = localStorage.getItem('aurora_role');
    const loginOverlay = document.getElementById('admin-login-overlay');
    const adminContent = document.getElementById('admin-content');
    
    if (!token || role !== 'Administrator') {
        loginOverlay.style.display = 'flex';
        return;
    }
    
    loginOverlay.style.display = 'none';
    adminContent.style.display = 'block';

    // Fetch System Status
    fetch('/admin/status', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if(res.status === 401 || res.status === 403) throw new Error('Unauthorized');
        return res.json();
    })
    .then(data => {
        document.getElementById('system-status').textContent = JSON.stringify(data, null, 2);
    })
    .catch(e => {
        document.getElementById('system-status').textContent = 'Error fetching status: ' + e.message;
    });

    // Fetch Audit Logs
    fetch('/admin/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('audit-logs').textContent = data.logs.join('');
    })
    .catch(e => {
        document.getElementById('audit-logs').textContent = 'Error fetching logs: ' + e.message;
    });

    // Logout
    document.getElementById('admin-logout').addEventListener('click', () => {
        localStorage.removeItem('aurora_token');
        localStorage.removeItem('aurora_role');
        localStorage.removeItem('aurora_user_id');
        window.location.href = '/';
    });
});
