(function () {
    var localHosts = ['localhost', '127.0.0.1', '::1'];
    var isLocal = localHosts.indexOf(window.location.hostname) !== -1;

    window.AANM_API_BASE = isLocal
        ? 'http://localhost:3001'
        : 'https://api.yourdomain.com';
})();
