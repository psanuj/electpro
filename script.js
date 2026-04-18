
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}


document.addEventListener('click', function (e) {
  const sidebar = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger');
  if (sidebar && hamburger) {
    if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  }
});


function showToast(icon, message, duration = 3000) {
  const toast = document.getElementById('toast');
  const msg = document.getElementById('toast-msg');
  const ico = document.getElementById('toast-icon');
  if (!toast || !msg) return;

  if (ico) ico.textContent = icon;
  msg.textContent = message;
  toast.classList.add('show');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), duration);
}


document.addEventListener('DOMContentLoaded', function () {
  // Trigger fade-up animations
  document.querySelectorAll('.fade-up').forEach(el => {
    el.style.animationPlayState = 'running';
  });


  setTimeout(() => {
    document.querySelectorAll('.progress-fill').forEach(bar => {
      const target = bar.style.width;
      bar.style.width = '0%';
      requestAnimationFrame(() => {
        setTimeout(() => { bar.style.width = target; }, 50);
      });
    });
  }, 300);
});


(function () {
  const page = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === page) {
      link.classList.add('active');
    }
  });
})();
