'use strict';

const app = {
  id: 'com.add0n.node',
  multiple: false
};

app.locale = {
  name: 'Microsoft Edge',
  current: 'Open Link in Microsoft Edge',
  all: 'Open all Tabs in Microsoft Edge',
  call: 'Open all Tabs in Microsoft Edge (Current window)',
  extract: 'Extract and Open Text Links in Microsoft Edge',
  example: 'example D:\\Microsoft\\edge.exe'
};

app.runtime = {
  linux: {
    name: 'microsoft-edge'
  },
  windows: {
    prgfiles: '%ProgramFiles%\\Microsoft\\edge.exe',
    name: 'cmd',
    args: ['/s/c', 'start', 'microsoft-edge:"%url;"']
  },
  mac: {
    args: ['-a', 'Microsoft Edge']
  }
};

const os = {
  mac: navigator.userAgent.indexOf('Mac') !== -1,
  linux: navigator.userAgent.indexOf('Linux') !== -1
};

function error(response) {
  alert(`Cannot transfer link to the Edge Browser.
Please make sure the native client is installed and the Edge is accesssible.


Details:
  -> Exit Code: ${response.code}
  -> Output: ${response.stdout || 'empty'}
  -> Error: ${response.stderr || 'empty'}`);
}

function response(res, success = () => {}) {
  // windows batch file returns 1
  if (res && (res.code !== 0 && (res.code !== 1 || res.stderr !== ''))) {
    error(res);
  }
  else if (!res) {
    chrome.tabs.query({
      url: chrome.runtime.getURL('data/edge-helper/index.html')
    }, tabs => {
      if (tabs && tabs.length) {
        chrome.tabs.update(tabs[0].id, {
          active: true
        }, () => {
          chrome.windows.update(tabs[0].windowId, {
            focused: true
          });
        });
      }
      else {
        chrome.tabs.create({
          url: 'data/edge-helper/index.html'
        });
      }
    });
  }
  else {
    success();
  }
}

function exec(command, args, callback, properties = {}) {
  if (command) {
    chrome.runtime.sendNativeMessage(app.id, {
      cmd: 'exec',
      command,
      arguments: args,
      properties
    }, res => (callback || response)(res));
  }
  else {
    alert(`Please set the Edge browser's executable path on the options page`);
    chrome.runtime.openOptionsPage();
  }
}

function find(cb) {
  chrome.runtime.sendNativeMessage(app.id, {
    cmd: 'env'
  }, res => {
    if (res && res.env && res.env.ProgramFiles) {
      const path = app.runtime.windows.prgfiles
        .replace('%LOCALAPPDATA%', res.env.LOCALAPPDATA)
        .replace('%ProgramFiles(x86)%', res.env['ProgramFiles(x86)'])
        .replace('%ProgramFiles%', res.env.ProgramFiles);
      chrome.storage.local.set({path}, cb);
    }
    else {
      response(res);
    }
  });
}

const open = (urls, closeIDs = []) => {
  chrome.storage.local.get({
    path: null,
    closeme: false
  }, prefs => {
    const close = () => {
      if (prefs.closeme && closeIDs.length) {
        chrome.tabs.remove(closeIDs);
      }
    };
    if (os.linux) {
      const path = prefs.path || app.runtime.linux.name;
      exec(path, urls, r => response(r, close));
    }
    if (os.mac) {
      if (prefs.path) {
        const length = app.runtime.mac.args.length;
        app.runtime.mac.args[length - 1] = prefs.path;
      }
      const args = [...app.runtime.mac.args, ...urls];
      exec('open', args, r => response(r, close));
    }
    else {
      if (prefs.path) {
        const args = [...(app.runtime.windows.args2 || []), ...urls];
        exec(prefs.path, args, r => response(r, close));
      }
      else {
        const args = app.runtime.windows.args
          .map(a => a.replace('%url;', urls.join(' ')))
          // Firefox is not detaching the process on Windows
          .map(s => s.replace('start', /Firefox/.test(navigator.userAgent) ? 'start /WAIT' : 'start'));
        const name = app.runtime.windows.name;
        exec(name, args, res => {
          if (res && res.code !== 0) { // fallback to the old method
            find(() => open(urls, closeIDs));
          }
          else {
            response(res, close);
          }
        }, {windowsVerbatimArguments: true});
      }
    }
  });
};

const delayOpen = tabs => chrome.storage.local.get({
  multiple: false
}, prefs => {
  if (prefs.multiple) {
    return open(tabs.map(t => t.url), tabs.map(t => t.id));
  }
  const tab = tabs.shift();
  if (tab) {
    open([tab.url], [tab.id]);
    window.setTimeout(delayOpen, 1000, tabs);
  }
});

chrome.browserAction.onClicked.addListener(() => chrome.tabs.query({
  active: true,
  currentWindow: true
}, tabs => open(tabs.map(t => t.url), tabs.map(t => t.id))));

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.cmd === 'open-in') {
    open([request.url], [sender.tab.id]);
  }
});

// context menu
{
  const add = chrome.contextMenus.create;
  const once = () => {
    add({
      title: app.locale.extract,
      id: 'extract-open',
      contexts: ['selection'],
      documentUrlPatterns: ['*://*/*']
    });
    add({
      title: app.locale.current,
      id: 'open-current',
      contexts: ['link'],
      documentUrlPatterns: ['*://*/*']
    });
    add({
      title: app.locale.all,
      id: 'open-all',
      contexts: ['browser_action']
    });
    add({
      title: app.locale.call,
      id: 'open-call',
      contexts: ['browser_action']
    });
  };
  chrome.runtime.onStartup.addListener(once);
  chrome.runtime.onInstalled.addListener(once);
}

chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === 'extract-open') {
    const urls = [];
    const re = /\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|]/ig;
    info.selectionText.replace(re, a => urls.push(a));
    if (urls.length) {
      delayOpen(urls.map(url => ({url})));
    }
  }
  else if (info.menuItemId === 'open-current') {
    open([info.linkUrl || info.pageUrl], []);
  }
  else if (info.menuItemId === 'open-call') {
    chrome.tabs.query({
      url: ['*://*/*'],
      currentWindow: true
    }, delayOpen);
  }
  else if (info.menuItemId === 'open-all') {
    chrome.tabs.query({
      url: ['*://*/*']
    }, delayOpen);
  }
  else {
    console.warn('This command is not supported!', info);
  }
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
