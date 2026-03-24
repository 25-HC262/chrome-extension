export default {
  manifest_version: 3,
  name: 'Sign Translator',
  version: '1.0.0',
  description: 'Sign translator for sign language user',
  host_permissions: ['https://meet.google.com/*'],
  permissions: ['activeTab', 'scripting', 'desktopCapture', 'storage'],
  background: {
    service_worker: 'src/app/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://meet.google.com/*'],
      js: ['src/app/index.ts'],
      run_at: 'document_idle',
    },
  ],
}

