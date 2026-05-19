// ============================================================
// OTA 热更新管理器
// 修改 UPDATE_SERVER 指向你的服务器地址
// ============================================================
var CURRENT_VERSION = (function () {
  var meta = document.querySelector('meta[name="app-version"]');
  return (meta && meta.content) || '3';
})();
var UPDATE_SERVER = 'https://som0935539724-del.github.io/test'; // 改成你的服务器地址

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
                return 'NAVIGATING';
              }
            );
          });
        }
        return 'CONTINUE';
      })
      .catch(function () {
        return 'CONTINUE';
      })
      .then(function (action) {
        if (action === 'NAVIGATING') return;
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
        if (!html.includes('<html') || !html.includes('</html>'))
          throw new Error('无效的更新文件');

        // 如果服务器提供了完整性校验哈希，则校验
        if (manifest.integrity) {
          return sha256(html).then(function (hash) {
            if (hash !== manifest.integrity)
              throw new Error('更新文件校验失败，可能已损坏');
            return html;
          });
        }
        return html;
      })
      .then(function (html) {
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
        showToast('下载失败: ' + e.message);
      });
  }

  function compareVer(a, b) {
    a = String(a).replace(/-.*$/, '');
    b = String(b).replace(/-.*$/, '');
    var pa = a.split('.').map(function (v) { var n = Number(v); return isNaN(n) ? 0 : n; });
    var pb = b.split('.').map(function (v) { var n = Number(v); return isNaN(n) ? 0 : n; });
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var na = pa[i] || 0;
      var nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }

  function sha256(text) {
    var encoder = new TextEncoder();
    var data = encoder.encode(text);
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ('00' + b.toString(16)).slice(-2);
      }).join('');
    });
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
