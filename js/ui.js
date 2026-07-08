// ui.js — DataHub España
// UI utilities, sidebar, clock, toast, mobile
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const wasCollapsed = sidebar.classList.contains('collapsed');
        sidebar.classList.toggle('collapsed');
        const fab = document.getElementById('mobile-map-toggle');
        if (wasCollapsed) {
            // Was collapsed, now opening sidebar
            if (fab) fab.classList.remove('visible');
        } else {
            // Was open, now closing sidebar
            if (fab && window.innerWidth <= 768) fab.classList.add('visible');
        }
        setTimeout(() => {
            map && map.invalidateSize();
            if (wasCollapsed && window.innerWidth <= 768) {
                showToast('Panel lateral abierto', 'info', 1500);
            }
        }, 300);
    }

    function initMobile() {
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.add('collapsed');
            const fab = document.getElementById('mobile-map-toggle');
            if (fab) fab.classList.add('visible');
        }
        // Show FAB when sidebar is collapsed on mobile
        const observer = new MutationObserver(() => {
            const sidebar = document.getElementById('sidebar');
            const fab = document.getElementById('mobile-map-toggle');
            if (!sidebar || !fab) return;
            if (window.innerWidth <= 768) {
                if (sidebar.classList.contains('collapsed')) {
                    fab.classList.add('visible');
                } else {
                    fab.classList.remove('visible');
                }
            } else {
                fab.classList.remove('visible');
            }
        });
        const sidebarEl = document.getElementById('sidebar');
        if (sidebarEl) observer.observe(sidebarEl, { attributes: true, attributeFilter: ['class'] });

        // Touch swipe: swipe up on sidebar handle area to close, swipe down on map to open
        let touchStartY = 0;
        let touchStartX = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
        }, { passive: true });
        document.addEventListener('touchend', (e) => {
            const deltaY = e.changedTouches[0].clientY - touchStartY;
            const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
            if (Math.abs(deltaY) < 50 || deltaX > Math.abs(deltaY)) return; // Ignore small or horizontal swipes
            if (window.innerWidth > 768) return;
            const sb = document.getElementById('sidebar');
            if (!sb) return;
            if (deltaY < -60 && !sb.classList.contains('collapsed')) {
                // Swipe up → close sidebar
                toggleSidebar();
            } else if (deltaY > 60 && sb.classList.contains('collapsed')) {
                // Swipe down → open sidebar
                toggleSidebar();
            }
        }, { passive: true });
    }

    function showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    function updateClock() {
        const now = new Date();
        const options = {
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        const str = now.toLocaleString('es-ES', options);
        document.getElementById('clock').textContent = str;
    }

    function restoreDefaultTabValues() {
        // Restore climate tab
        const climaTitle = document.querySelector('#tab-clima .section-title');
        if (climaTitle) climaTitle.textContent = 'Clima Actual — Madrid';

        // Restore economy tab
        document.getElementById('econ-unemp').textContent = '11,2%';
        document.getElementById('econ-gdp').textContent = '1.418.352M€';

        // Restore population tab
        document.getElementById('pop-total').textContent = '47.615.034';
        document.getElementById('pop-density').textContent = '94,7';
    }

    function getPopColor(pop) {
        if (pop > 5000000) return '#1e3a5f';
        if (pop > 2000000) return '#1e5090';
        if (pop > 1000000) return '#2563eb';
        if (pop > 500000) return '#3b82f6';
        if (pop > 250000) return '#60a5fa';
        if (pop > 100000) return '#93c5fd';
        return '#bfdbfe';
    }
