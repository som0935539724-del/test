// ============================================================
// OTA 热更新管理器
// 修改 UPDATE_SERVER 指向你的服务器地址
// ============================================================
var CURRENT_VERSION = '3';
var UPDATE_SERVER = 'https://som0935539724-del.github.io/test';

(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    var cap = window.Capacitor;
    if (!cap || !cap.Plugins) {
      // 浏览器开发模式
      showApp();
      return;
    }

    var Preferences = cap.Plugins.Preferences;
    var Filesystem = cap.Plugins.Filesystem;

    if (!Preferences || !Filesystem) {
      showApp();
      return;
    }

    // 第一步：检查本地是否有已下载的待更新版本
    Preferences.get({ key: 'pending-version' })
      .then(function (result) {
        var pendingVer = result.value;
        if (pendingVer && compareVer(pendingVer, CURRENT_VERSION) > 0) {
          return Filesystem.getUri({
            path: 'update.html',
            directory: 'DATA',
          }).then(function (uriResult) {
            return Preferences.remove({ key: 'pending-version' }).then(
              function () {
                window.location.href = uriResult.uri;
              }
            );
          });
        }
      })
      .catch(function () {})
      .then(function () {
        showApp();
        checkRemoteUpdate(Preferences, Filesystem);
      });
  }

  function showApp() {
    document.getElementById('app-container').style.display = '';
  }

  function checkRemoteUpdate(Preferences, Filesystem) {
    fetch(UPDATE_SERVER + '/version.json', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then(function (resp) {
        if (!resp.ok) throw new Error('Server error ' + resp.status);
        return resp.json();
      })
      .then(function (manifest) {
        return Preferences.get({ key: 'app-version' }).then(function (result) {
          var localVer = result.value || CURRENT_VERSION;
          if (compareVer(manifest.version, localVer) > 0) {
            return downloadUpdate(manifest, Filesystem, Preferences);
          }
        });
      })
      .catch(function (e) {
        console.log('Update check:', e.message);
      });
  }

  function downloadUpdate(manifest, Filesystem, Preferences) {
    showToast('发现新版本 v' + manifest.version + '，正在下载...');

    fetch(UPDATE_SERVER + '/' + manifest.file, {
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then(function (resp) {
        if (!resp.ok) throw new Error('Download failed');
        return resp.text();
      })
      .then(function (html) {
        if (!html.includes('<html')) throw new Error('无效的更新文件');

        return Filesystem.writeFile({
          path: 'update.html',
          data: html,
          directory: 'DATA',
          recursive: true,
        }).then(function () {
          return Preferences.set({
            key: 'pending-version',
            value: manifest.version,
          }).then(function () {
            return Preferences.set({
              key: 'app-version',
              value: manifest.version,
            });
          });
        });
      })
      .then(function () {
        showToast('v' + manifest.version + ' 已下载，重启应用生效');
      })
      .catch(function (e) {
        console.log('Download:', e.message);
      });
  }

  function compareVer(a, b) {
    var pa = a.split('.').map(Number);
    var pb = b.split('.').map(Number);
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var na = pa[i] || 0;
      var nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }

  function showToast(msg) {
    var toast = document.getElementById('_ota_toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = '_ota_toast';
      toast.style.cssText =
        'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);' +
        'background:#333;color:#fff;padding:12px 24px;border-radius:24px;' +
        'font-size:14px;z-index:99999;opacity:0;transition:opacity .3s;' +
        'pointer-events:none;white-space:nowrap;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toast.style.opacity = '0';
    }, 3000);
  }
})();
