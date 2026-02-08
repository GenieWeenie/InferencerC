export default function register(api) {
  api.ui.showNotification('Hello Plugin loaded', 'success');

  return {
    name: 'sample.hello-plugin',
    commands: {
      'hello-command': async () => {
        const existingCount = await api.storage.get('run-count');
        const nextCount = (Number(existingCount) || 0) + 1;
        await api.storage.set('run-count', nextCount);
        api.ui.showNotification(`Hello from sample plugin (run ${nextCount})`, 'info');
      }
    }
  };
}
