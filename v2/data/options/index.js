/* globals Behave */
'use strict';

const toast = document.getElementById('toast');

const app = {
  id: 'com.add0n.node',
  tag: 'edge',
  multiple: false
};

app.locale = {
  name: 'Microsoft Edge',
  current: 'Open Link in Microsoft Edge',
  all: 'Open all Tabs in Microsoft Edge',
  call: 'Open all Tabs in Microsoft Edge (Current window)',
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
document.getElementById('path').placeholder = app.locale.example;
document.getElementById('l3').textContent = app.runtime.linux.name;
document.getElementById('l4').textContent = app.runtime.mac.args[1];
document.getElementById('l2').textContent = app.runtime.windows.prgfiles;

app.runtime = {
  mac: {
    args: ['-a', 'Microsoft Edge']
  },
  linux: {
    name: 'microsoft-edge'
  },
  windows: {
    name: 'cmd',
    args: ['/s/c', 'start', 'microsoft-edge:"%url;"'],
    prgfiles: '%ProgramFiles%\\Microsoft\\edge.exe'
  }
};

function restore() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.local.get({
    path: '',
    enabled: false,
    altKey: true,
    shiftKey: true,
    ctrlKey: false,
    metaKey: false,
    button: 0,
    faqs: true,
    closeme: false,
    multiple: app.multiple,
    hosts: [],
    urls: [],
    reverse: false,
    topRedict: false
  }, ({path, enabled, altKey, shiftKey, ctrlKey, metaKey, button, faqs, closeme, multiple, hosts, urls, reverse, topRedict}) => {
    document.getElementById('path').value = path;
    document.getElementById('enabled').checked = enabled;
    document.getElementById('altKey').checked = altKey;
    document.getElementById('shiftKey').checked = shiftKey;
    document.getElementById('ctrlKey').checked = ctrlKey;
    document.getElementById('metaKey').checked = metaKey;
    document.getElementById('button').selectedIndex = button;
    document.getElementById('faqs').checked = faqs;
    document.getElementById('closeme').checked = closeme;
    document.getElementById('multiple').checked = multiple;
    document.getElementById('hosts').value = hosts.join(', ');
    document.getElementById('urls').value = urls.join(', ');
    document.getElementById('reverse').checked = reverse;
    document.getElementById('topRedict').checked = topRedict;
  });
}
document.addEventListener('DOMContentLoaded', restore);

new Behave({textarea: document.getElementById('rules')});
new Behave({textarea: document.getElementById('hosts')});

function save() {
  const enabled = document.getElementById('enabled').checked;
  const button = document.getElementById('button').selectedIndex;
  const closeme = document.getElementById('closeme').checked;
  const multiple = document.getElementById('multiple').checked;
  const reverse = document.getElementById('reverse').checked;
  const topRedict = document.getElementById('topRedict').checked;

  const urls = document.getElementById('urls').value.split(/\s*,\s*/)
    .filter(s => s.startsWith('http') || s.startsWith('file'))
    .filter((h, i, l) => h && l.indexOf(h) === i);
  const hosts = document.getElementById('hosts').value.split(/\s*,\s*/)
    .map(s => s.replace('http://', '').replace('https://', '').split('/')[0].trim())
    .filter((h, i, l) => h && l.indexOf(h) === i);
  chrome.storage.local.set({
    path: document.getElementById('path').value,
    enabled,
    altKey: document.getElementById('altKey').checked,
    shiftKey: document.getElementById('shiftKey').checked,
    ctrlKey: document.getElementById('ctrlKey').checked,
    metaKey: document.getElementById('metaKey').checked,
    button,
    faqs: document.getElementById('faqs').checked,
    closeme,
    multiple,
    hosts,
    urls,
    reverse,
    topRedict
  }, () => {
    restore();
    toast.textContent = 'Options saved.';
    setTimeout(() => toast.textContent = '', 750);
  });
}
document.getElementById('save').addEventListener('click', save);
// support
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    window.setTimeout(() => toast.textContent = '', 750);
    toast.textContent = 'Double-click to reset!';
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});
// reset
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '&rd=donate'
}));
