// ============================================
// GOOGLE CALENDAR INTEGRATION FUNCTIONS
// Add these to configuracion.html before </script>
// ============================================

async function loadGoogleCalendarStatus() {
    try {
        const response = await API.get('/admin/calendar/status');
        const { connected, lastSync } = response;

        const statusText = document.getElementById('gcal-status-text');
        const lastSyncEl = document.getElementById('gcal-last-sync');

        if (connected) {
            statusText.textContent = '✓ Conectado a Google Calendar';
            statusText.style.color = 'var(--success)';

            if (lastSync) {
                const date = new Date(lastSync);
                lastSyncEl.textContent = `Última sincronización: ${date.toLocaleString('es-MX')}`;
            } else {
                lastSyncEl.textContent = 'No se ha sincronizado aún';
            }

            document.getElementById('btn-connect-gcal').style.display = 'none';
            document.getElementById('btn-sync-gcal').style.display = 'inline-block';
            document.getElementById('btn-disconnect-gcal').style.display = 'inline-block';
        } else {
            statusText.textContent = '○ No conectado';
            statusText.style.color = 'var(--gold)';
            lastSyncEl.textContent = 'Conecta tu cuenta de Google para sincronizar';

            document.getElementById('btn-connect-gcal').style.display = 'inline-block';
            document.getElementById('btn-sync-gcal').style.display = 'none';
            document.getElementById('btn-disconnect-gcal').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading Google Calendar status:', error);
    }
}

async function connectGoogleCalendar() {
    try {
        const response = await API.get('/admin/calendar/auth-url');
        window.location.href = response.authUrl;
    } catch (error) {
        showToast('Error al conectar con Google Calendar', 'error');
        console.error(error);
    }
}

async function syncGoogleCalendar() {
    const btn = document.getElementById('btn-sync-gcal');
    const originalText = btn.innerHTML;

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';

        const response = await API.post('/admin/calendar/sync');
        showToast(response.message, 'success');
        await loadGoogleCalendarStatus();
    } catch (error) {
        showToast('Error al sincronizar: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function disconnectGoogleCalendar() {
    if (!confirm('¿Desconectar Google Calendar? Las citas ya sincronizadas permanecerán en tu calendario.')) {
        return;
    }

    try {
        await API.delete('/admin/calendar/disconnect');
        showToast('Google Calendar desconectado', 'info');
        await loadGoogleCalendarStatus();
    } catch (error) {
        showToast('Error al desconectar', 'error');
        console.error(error);
    }
}

// IMPORTANTE: Agregar esto en switchTab() cuando tab === 'gcalendar':
// if (tab === 'gcalendar') {
//     loadGoogleCalendarStatus();
// }
